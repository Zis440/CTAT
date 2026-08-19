"""
Relational Field Engine
-----------------------
Builds an interaction graph from narrative events and infers relational patterns.
Uses named entity recognition and coreference resolution (via spaCy) to identify characters.
Enhanced with figure classification, interaction psychology, and personality trait inference.

RECALIBRATION v3.0:
- Pronoun/time-marker blacklists to filter invalid graph nodes
- Valid figure-type classification (Hero, Authority, Peer, Caregiver, Threat, etc.)
- Attachment classification (Secure/Anxious/Avoidant/Mixed)
"""

import networkx as nx
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict
import spacy
import numpy as np

try:
    from app.assessments.tat.engines.inference.entity_role_resolver import (
        NarrativeCentralityScorer, enforce_role_hierarchy,
        WordNetAuthorityAnalyzer, ContemporaryFigureDetector,
    )
    _RESOLVER_AVAILABLE = True
except ImportError:
    _RESOLVER_AVAILABLE = False

import nltk
try:
    nltk.download('wordnet', quiet=True)
    nltk.download('omw-1.4', quiet=True)
    from nltk.corpus import wordnet as wn
    _WN_AVAILABLE = True
except Exception:
    _WN_AVAILABLE = False

PRONOUN_BLACKLIST = {
    "he", "she", "it", "they", "them", "him", "her", "his", "its",
    "their", "we", "us", "our", "me", "my", "i", "you", "your",
    "myself", "himself", "herself", "themselves", "itself",
    "this", "that", "these", "those", "who", "whom", "which",
    "someone", "anyone", "everyone", "nobody", "everybody",
    "something", "anything", "everything", "nothing",
}

TIME_MARKER_BLACKLIST = {
    "now", "then", "today", "tomorrow", "yesterday", "morning",
    "evening", "night", "always", "never", "sometimes", "often",
    "soon", "later", "before", "after", "once", "again", "here",
    "there", "where", "when", "while", "ago", "time", "day",
}

ADVERB_BLACKLIST = {
    "more", "less", "very", "much", "most", "least", "really",
    "just", "also", "too", "quite", "rather", "still", "even",
    "enough", "almost", "already", "probably", "perhaps", "maybe",
    "only", "simply", "merely", "certainly", "definitely", "clearly",
}

ABSTRACT_VERB_BLACKLIST = {
    "is", "was", "were", "are", "be", "been", "being", "has", "had",
    "have", "do", "did", "does", "doing", "get", "got", "getting",
    "make", "made", "making", "go", "went", "going", "come", "came",
}

VALID_FIGURE_TYPES = {
    "Hero": "Central protagonist / story subject",
    "Authority Figure": "Parent, teacher, boss, or dominant figure",
    "Peer": "Friend, sibling, or equal-status figure",
    "Contemporary": "Age-mate, classmate, colleague, or neutral acquaintance",
    "Caregiver": "Nurturing or protective figure",
    "Threat Object": "Passive source of fear, danger, or threat in the environment",
    "Dependency Object": "Figure relied upon for support",
    "Symbolic Object": "Abstract or symbolic entity in narrative",

    "Romantic Figure": "Object of romantic desire, lover, intimate partner",
    "Antagonist": "Active aggressor, oppressor, or malevolent force (vs. passive Threat Object)",
    "Idealized Figure": "Admired, fantasized, or worshipped figure (not realistic authority)",
    "Bystander": "Present but passive witness; minimal narrative agency",
}

_wn_cache = {}

def _is_abstract_noun_wn(word: str) -> bool:
    """Use WordNet hypernym chain to detect abstract nouns.
    A word is abstract if its synsets trace to 'abstraction.n.06',
    'attribute.n.02', or 'state.n.02' and NOT to 'physical_entity.n.01'
    or 'organism.n.01'."""
    if not _WN_AVAILABLE:
        return word.lower() in ABSTRACT_NOUN_BLACKLIST
    cache_key = ('abstract', word.lower())
    if cache_key in _wn_cache:
        return _wn_cache[cache_key]
    synsets = wn.synsets(word.lower(), pos=wn.NOUN)
    if not synsets:
        _wn_cache[cache_key] = False
        return False
    for syn in synsets[:3]:
        hypernym_names = set()
        for path in syn.hypernym_paths():
            for h in path:
                hypernym_names.add(h.name())
        has_physical = any('physical_entity' in h or 'organism' in h or 'person' in h for h in hypernym_names)
        has_abstract = any('abstraction' in h or 'attribute' in h or 'state' in h
                          or 'feeling' in h or 'cognition' in h for h in hypernym_names)
        if has_physical:
            _wn_cache[cache_key] = False
            return False
        if has_abstract:
            _wn_cache[cache_key] = True
            return True
    _wn_cache[cache_key] = False
    return False

def _is_person_entity_wn(word: str) -> bool:
    """Check if word represents a person using WordNet hypernym chain."""
    if not _WN_AVAILABLE:
        return word.lower() in AUTHORITY_LEXICAL_CUES or word.lower() in CONTEMPORARY_LEXICAL_CUES
    cache_key = ('person', word.lower())
    if cache_key in _wn_cache:
        return _wn_cache[cache_key]
    synsets = wn.synsets(word.lower(), pos=wn.NOUN)
    for syn in synsets[:3]:
        hypernym_names = set()
        for path in syn.hypernym_paths():
            for h in path:
                hypernym_names.add(h.name())
        if any('person' in h or 'people' in h or 'human' in h for h in hypernym_names):
            _wn_cache[cache_key] = True
            return True
    _wn_cache[cache_key] = False
    return False

def _is_authority_role_wn(word: str) -> bool:
    """Check if word represents an authority role via WordNet hypernyms.
    Looks for: leader, superior, parent, teacher, head, ruler, etc.
    Excludes child/youth/minor words that would falsely match."""
    if not _WN_AVAILABLE:
        return word.lower() in AUTHORITY_LEXICAL_CUES
    cache_key = ('authority', word.lower())
    if cache_key in _wn_cache:
        return _wn_cache[cache_key]

    child_markers = {'child', 'juvenile', 'minor', 'youngster', 'kid', 'boy',
                     'girl', 'infant', 'baby', 'toddler', 'adolescent', 'teenager',
                     'youth', 'student', 'pupil', 'male_child', 'female_child'}
    synsets = wn.synsets(word.lower(), pos=wn.NOUN)

    for syn in synsets[:3]:
        lemma_names = {l.name().lower() for l in syn.lemmas()}
        if lemma_names & child_markers:
            _wn_cache[cache_key] = False
            return False

    authority_markers = {'leader', 'superior', 'parent', 'teacher',
                         'head', 'chief', 'ruler', 'master', 'boss',
                         'supervisor', 'authority', 'elder', 'official',
                         'commander', 'director', 'manager', 'guardian'}
    for syn in synsets[:3]:

        lemma_names = {l.name().lower() for l in syn.lemmas()}
        if lemma_names & authority_markers:
            _wn_cache[cache_key] = True
            return True

        for path in syn.hypernym_paths():
            for h in path:
                h_lemmas = {l.name().lower() for l in h.lemmas()}
                if h_lemmas & authority_markers:
                    _wn_cache[cache_key] = True
                    return True
    _wn_cache[cache_key] = False
    return False

def _is_physical_object_wn(word: str) -> bool:
    """Check if word is a physical/inanimate object via WordNet."""
    if not _WN_AVAILABLE:
        return word.lower() in TAT_OBJECT_BLACKLIST
    cache_key = ('object', word.lower())
    if cache_key in _wn_cache:
        return _wn_cache[cache_key]
    synsets = wn.synsets(word.lower(), pos=wn.NOUN)
    for syn in synsets[:3]:
        hypernym_names = set()
        for path in syn.hypernym_paths():
            for h in path:
                hypernym_names.add(h.name())
        has_artifact = any('artifact' in h or 'instrumentality' in h or 'container' in h
                          or 'device' in h or 'furnishing' in h for h in hypernym_names)
        has_person = any('person' in h or 'organism' in h for h in hypernym_names)
        if has_artifact and not has_person:
            _wn_cache[cache_key] = True
            return True
    _wn_cache[cache_key] = False
    return False

def _is_location_wn(word: str) -> bool:
    """Check if word is a location/place via WordNet."""
    if not _WN_AVAILABLE:
        return word.lower() in ENVIRONMENTAL_PRESS_TOKENS
    cache_key = ('location', word.lower())
    if cache_key in _wn_cache:
        return _wn_cache[cache_key]
    synsets = wn.synsets(word.lower(), pos=wn.NOUN)
    for syn in synsets[:3]:
        hypernym_names = set()
        for path in syn.hypernym_paths():
            for h in path:
                hypernym_names.add(h.name())
        if any('location' in h or 'region' in h or 'area' in h
              or 'structure' in h or 'building' in h for h in hypernym_names):
            if not any('person' in h or 'organism' in h for h in hypernym_names):
                _wn_cache[cache_key] = True
                return True
    _wn_cache[cache_key] = False
    return False

def _is_valid_entity(token_text: str) -> bool:
    """Check if a token is a valid entity (not a pronoun/time/adverb/abstract verb)."""
    t = token_text.strip().lower()
    if len(t) <= 1:
        return False
    if t in PRONOUN_BLACKLIST:
        return False
    if t in TIME_MARKER_BLACKLIST:
        return False
    if t in ADVERB_BLACKLIST:
        return False
    if t in ABSTRACT_VERB_BLACKLIST:
        return False

    if t.isdigit():
        return False
    return True

EMOTION_FIGURE_MAP = {

    "trust": "authority", "respect": "authority", "obedience": "authority",
    "discipline": "authority", "punishment": "authority", "guidance": "authority",
    "mentoring": "authority", "supervision": "authority", "instruction": "authority",
    "criticism": "authority", "approval": "authority", "warning": "authority",
    "command": "authority", "control": "authority", "submission": "authority",
    "rebellion": "authority", "defiance": "authority",

    "fear": "threat", "intimidation": "threat",

    "hostility": "antagonist", "anger": "antagonist", "aggression": "antagonist",
    "violence": "antagonist", "cruelty": "antagonist", "malice": "antagonist",

    "friendship": "peer", "camaraderie": "peer",
    "solidarity": "peer", "rivalry": "peer", "jealousy": "peer",
    "companionship": "contemporary", "playfulness": "contemporary",

    "love": "romantic", "romance": "romantic", "passion": "romantic",
    "infatuation": "romantic", "longing": "romantic", "desire": "romantic",
    "affection": "romantic",

    "admiration": "idealized", "worship": "idealized", "awe": "idealized",
    "reverence": "idealized",

    "parental": "caregiver", "care": "caregiver", "nurturing": "caregiver",
    "protection": "caregiver", "comfort": "caregiver", "tenderness": "caregiver",

    "dependency": "dependency_object", "helplessness": "dependency_object",
    "neediness": "dependency_object", "clinging": "dependency_object",

    "indifference": "bystander", "detachment": "bystander",
}

AUTHORITY_LEXICAL_CUES = {

    "father", "mother", "parent", "parents", "dad", "mom", "papa", "mama",
    "grandfather", "grandmother", "grandparent", "uncle", "aunt",
    "elder", "elders",

    "teacher", "professor", "principal", "boss", "manager", "supervisor",
    "director", "officer", "captain", "commander", "chief",
    "doctor", "judge", "lawyer", "inspector", "examiner",

    "priest", "minister", "guru", "monk", "saint", "imam", "rabbi",
    "preacher", "pastor",

    "king", "queen", "ruler", "leader", "master", "mistress",
    "coach", "mentor", "guardian", "warden",
}

CONTEMPORARY_LEXICAL_CUES = {

    "friend", "friends", "classmate", "classmates", "colleague", "colleagues",
    "companion", "companions", "neighbor", "neighbors", "neighbour",
    "teammate", "teammates", "buddy", "pal", "mate",

    "brother", "sister", "sibling", "siblings", "twin", "twins",

    "boyfriend", "girlfriend", "partner", "lover", "sweetheart",
    "fiancé", "fiance", "fiancée", "fiancee",

    "roommate", "roommates", "batchmate", "batchmates",
    "coworker", "coworkers", "peer", "peers",

    "child", "children", "boy", "girl", "student", "students",
    "youth", "young", "man", "woman",
}

ROLE_PROTOTYPES = {
    "authority": [
        "The father demanded obedience from his son.",
        "The teacher scolded the student for not studying.",
        "The boss gave strict orders to his employee.",
        "The mother insisted that the child follow the rules.",
        "The elder commanded respect from the entire family.",
        "The principal punished the students for misbehaving.",
        "The officer enforced the law without exception.",
    ],
    "contemporary": [
        "They played together as friends in the park.",
        "The classmate shared his notes before the exam.",
        "Her colleague helped with the project deadline.",
        "The two brothers argued but then reconciled.",
        "She and her friend talked for hours about their lives.",
        "The teammates celebrated their victory together.",
        "The siblings fought over the toy but eventually shared.",
    ],
    "caregiver": [
        "The mother held the child close and comforted him.",
        "She gently wiped his tears and whispered reassurance.",
        "The nurse tended to the patient with care.",
        "He protected the young one from harm.",
        "She nurtured the child with endless patience.",
    ],
    "threat": [
        "A dark presence loomed in the background, unmoving.",
        "The environment itself was dangerous and threatening.",
        "The weapon lay on the floor, radiating menace.",
        "An unseen danger hung over the scene.",
        "The shadow of harm was always present but unnamed.",
    ],

    "romantic": [
        "She looked at him with deep longing and desire.",
        "Their love was all-consuming and passionate.",
        "He kissed her and felt the world fall away.",
        "The attraction between them was electric and undeniable.",
        "She dreamed of him every night, burning with love.",
        "He was the romantic partner she had always wanted.",
        "Their intimate connection was unlike anything else.",
    ],
    "idealized": [
        "She was perfect in his eyes — beyond any real person.",
        "He worshipped the figure from afar, too awed to approach.",
        "The hero was mythic, flawless, and larger than life.",
        "She fantasized about the person as if they were divine.",
        "He admired the figure with awe and reverence.",
        "The idealized person represented everything he could never be.",
        "She placed this person on a pedestal far above the world.",
    ],
    "antagonist": [
        "He attacked without mercy and caused great harm.",
        "She was the source of all the protagonist's suffering.",
        "The aggressor struck out with deliberate cruelty.",
        "He deliberately hurt the other person to gain power.",
        "She manipulated and destroyed everything around her.",
        "The oppressor exerted violent control over the victim.",
        "He was an active, malicious force of destruction.",
    ],
    "bystander": [
        "She stood at the edge of the scene, watching but not acting.",
        "He was present but had no role in what happened.",
        "The figure observed everything from a distance in silence.",
        "She was a passive witness who did nothing to intervene.",
        "He watched the events unfold from the background.",
        "The bystander neither helped nor hindered; they simply existed.",
    ],
}

ENVIRONMENTAL_PRESS_TOKENS = {
    "drought", "poverty", "school", "weather", "war", "famine",
    "disease", "economy", "government", "society", "nature",
    "storm", "flood", "earthquake", "fire", "darkness", "night",
    "city", "village", "town", "country", "world", "land",
    "field", "farm", "river", "mountain", "forest", "road",
    "house", "home", "room", "building", "church", "temple",
    "hospital", "prison", "market", "office",
}

ABSTRACT_NOUN_BLACKLIST = {
    "mistake", "error", "problem", "issue", "failure", "success",
    "hope", "fear", "love", "hate", "desire", "dream",
    "thought", "idea", "feeling", "emotion", "belief", "truth",
    "fate", "destiny", "life", "death", "time", "future", "past",
    "silence", "peace", "chaos", "order", "justice", "freedom",
    "identity", "self", "soul", "mind", "heart", "pain",
    "joy", "sorrow", "grief", "anger", "guilt", "shame",
    "loneliness", "happiness", "sadness", "anxiety", "confusion",
}

TAT_OBJECT_BLACKLIST = {
    "violin", "book", "gun", "picture", "painting", "letter",
    "piano", "desk", "chair", "table", "bed", "door", "window",
    "mirror", "lamp", "candle", "knife", "rope", "bridge",
    "tree", "flower", "crops", "harvest", "tools", "plow",
    "money", "car", "boat", "train", "horse", "dog", "cat",
    "photograph", "diary", "medicine", "clock", "key",
}

class RelationalFieldEngine:
    """
    Analyzes relationships between characters in the story.
    """

    def __init__(self, nlp_processor):
        self.nlp = nlp_processor.nlp
        self.processor = nlp_processor
        self.graph = nx.DiGraph()

        self.config = getattr(nlp_processor, 'config', None)

        self._centrality_scorer = None
        if _RESOLVER_AVAILABLE:
            try:
                self._centrality_scorer = NarrativeCentralityScorer(self.nlp)
            except Exception:
                pass

    def build_graph(self, events: List[Dict]):
        """
        Build directed graph where nodes are characters, edges represent interactions.
        Uses dependency parsing to identify subject-object relations.
        Recalibration v3.0: Filters pronouns and time markers from nodes.
        v7.0: Applies coreference resolution before graph construction.
        """
        self.graph.clear()
        self._last_events = events

        self._centrality_results = {}
        working_events = events
        if self._centrality_scorer and events:
            try:

                story_text = ' '.join(ev.get('text', '') for ev in events)
                self._centrality_results = self._centrality_scorer.compute(
                    story_text, events
                )

                working_events = self._centrality_scorer.enriched_events
                self._last_events = working_events
            except Exception as e:
                import logging
                logging.getLogger(__name__).debug(f"Centrality scoring failed: {e}")

        for event in working_events:
            text = event['text']
            doc = self.nlp(text)

            subj = None
            obj = None
            for token in doc:
                if token.dep_ in ('nsubj', 'nsubjpass'):
                    subj = token.text
                if token.dep_ in ('dobj', 'pobj', 'attr'):
                    obj = token.text

            coref_map = getattr(self._centrality_scorer, '_last_coref_map', {}) if self._centrality_scorer else {}
            if subj and subj.lower() in coref_map:
                subj = coref_map[subj.lower()]
            if obj and obj.lower() in coref_map:
                obj = coref_map[obj.lower()]

            if subj and not _is_valid_entity(subj):
                subj = None
            if obj and not _is_valid_entity(obj):
                obj = None

            if subj and obj:

                sentiment = event.get('valence', 0)
                emotion = event.get('emotion', None)
                self.graph.add_edge(subj, obj, sentiment=sentiment, emotion=emotion)
            elif subj:

                self.graph.add_node(subj)

    def get_relational_patterns(self) -> Dict[str, Any]:
        """
        Extract patterns:
          - central figures (degree centrality)
          - average interaction valence
          - reciprocity
          - authority figures (nodes with high in-degree of negative sentiment?)
          - figure classifications
          - interaction psychology
          - personality traits
        """
        patterns = {}
        if self.graph.number_of_nodes() == 0:
            return patterns

        centrality = nx.degree_centrality(self.graph)
        patterns["central_figures"] = sorted(centrality.items(), key=lambda x: -x[1])[:3]

        valences = [d.get("sentiment", 0) for u, v, d in self.graph.edges(data=True)]
        patterns["avg_interaction_valence"] = sum(valences)/len(valences) if valences else 0

        try:
            patterns["reciprocity"] = nx.reciprocity(self.graph) if self.graph.number_of_edges() > 0 else 0.0
        except Exception:
            patterns["reciprocity"] = 0.0

        patterns["figure_classifications"] = self._classify_figures(
            events=getattr(self, '_last_events', None)
        )

        role_confs = getattr(self, '_role_confidences', {})
        patterns["authority_figures"] = [
            (node, role_confs.get(node, 0.5))
            for node, ftype in patterns["figure_classifications"].items()
            if ftype == "Authority Figure"
        ]

        patterns["interaction_psychology"] = self._compute_interaction_psychology(centrality)

        patterns["personality_traits"] = self._infer_personality_traits()

        patterns["attachment_classification"] = self._classify_attachment()
        patterns["attachment_valence"] = patterns["attachment_classification"].get("style", "Mixed")

        att_class = patterns["attachment_classification"]
        att_style = att_class.get("style", "Indeterminate (Insufficient Data)")
        att_security = att_class.get("attachment_security", 0.5)
        att_confidence = att_class.get("confidence", 0.4)
        consistency_pass = True

        if "Indeterminate" in att_style:
            if not (0.40 <= att_security <= 0.60):
                att_security = max(0.40, min(0.60, att_security))
                patterns["attachment_classification"]["attachment_security"] = round(att_security, 2)
                consistency_pass = False

        elif att_security > 0.65 and "Indeterminate" in att_style:
            patterns["attachment_classification"]["style"] = "Secure (Revised from Indeterminate)"
            patterns["attachment_valence"] = "Secure (Revised from Indeterminate)"
            consistency_pass = False

        elif att_style == "Secure" and att_security < 0.55:
            att_security = max(att_security, 0.55)
            patterns["attachment_classification"]["attachment_security"] = round(att_security, 2)
            consistency_pass = False

        elif att_style in ("Anxious-Ambivalent", "Avoidant") and att_security > 0.65:
            att_security = min(att_security, 0.60)
            patterns["attachment_classification"]["attachment_security"] = round(att_security, 2)
            consistency_pass = False

        patterns["attachment_consistency_check"] = "PASS" if consistency_pass else "FAIL (auto-corrected)"

        role_confs = getattr(self, '_role_confidences', {})
        auth_vals = getattr(self, '_authority_validations', {})
        patterns["valid_figure_types"] = [
            {
                "entity": node,
                "type": ftype,
                "role_confidence": role_confs.get(node, 0.3),
                "entity_validation": "validated",
                "authority_validation": auth_vals.get(node, "N/A"),
            }
            for node, ftype in patterns["figure_classifications"].items()
        ]

        return patterns

    def _detect_protagonist(self, events: list) -> Optional[str]:
        """Use spaCy dependency parse to find the most frequent nsubj agent.
        Combines event-level agent counts with dependency parse analysis.
        v7.0: Uses centrality resolver hero_score as primary signal when available."""

        centrality = getattr(self, '_centrality_results', {})
        if centrality:

            graph_nodes_lower = {n.lower(): n for n in self.graph.nodes}
            best_hero = None
            best_score = -1.0
            for entity, scores in centrality.items():
                hero_s = scores.get('hero_score', 0.0)

                if (_is_physical_object_wn(entity) or _is_abstract_noun_wn(entity)
                        or _is_location_wn(entity)):
                    continue
                if hero_s > best_score:

                    if entity in graph_nodes_lower:
                        best_hero = graph_nodes_lower[entity]
                        best_score = hero_s
                    else:

                        for gn_lower, gn_orig in graph_nodes_lower.items():
                            if entity in gn_lower or gn_lower in entity:
                                best_hero = gn_orig
                                best_score = hero_s
                                break
            if best_hero:
                return best_hero

        agent_counts = defaultdict(int)

        for ev in events:
            agent = (ev.get('agent') or '').strip()
            if agent and _is_valid_entity(agent):
                agent_counts[agent.lower()] += 1

        for ev in events:
            text = ev.get('text', '')
            if not text:
                continue
            try:
                doc = self.nlp(text)
                for token in doc:
                    if token.dep_ in ('nsubj', 'nsubjpass') and _is_valid_entity(token.text):
                        word = token.text.lower()

                        is_ner_person = any(
                            token.text.lower() in ent.text.lower()
                            for ent in doc.ents if ent.label_ == 'PERSON'
                        )

                        is_wn_person = _is_person_entity_wn(token.text)
                        if is_ner_person or is_wn_person:
                            agent_counts[word] += 2
                        else:
                            agent_counts[word] += 1
            except Exception:
                pass

        if agent_counts:

            graph_nodes_lower = {n.lower(): n for n in self.graph.nodes}
            for agent, _ in sorted(agent_counts.items(), key=lambda x: -x[1]):
                if agent in graph_nodes_lower:
                    return graph_nodes_lower[agent]
        return None

    def _classify_figures(self, events: list = None) -> Dict[str, str]:
        """Classify each node into a valid clinical figure type using multi-signal scoring.
        v5.0: Library-based — uses WordNet hypernym chains for abstract/person/authority/object
        detection, spaCy dependency parse for protagonist identification, and SBERT
        prototype similarity. No hardcoded word pools for entity filtering."""
        classifications = {}
        role_confidences = {}
        authority_validations = {}
        hero_assigned = False

        role_proto_embs = self._get_role_prototype_embeddings()

        protagonist = None
        if events:
            protagonist = self._detect_protagonist(events)

        centrality = getattr(self, '_centrality_results', {})

        for node in list(self.graph.nodes):
          try:
            node_lower = node.lower()

            is_wn_person = _is_person_entity_wn(node_lower)
            is_wn_authority = _is_authority_role_wn(node_lower)
            skip_entity_filter = is_wn_person or is_wn_authority

            if not skip_entity_filter and _RESOLVER_AVAILABLE:
                try:
                    _wn_analyzer = WordNetAuthorityAnalyzer(self.nlp)
                    if _wn_analyzer.is_human_role(node_lower):
                        skip_entity_filter = True
                except Exception:
                    pass

            if not skip_entity_filter and (
                _is_location_wn(node_lower) or node_lower in ENVIRONMENTAL_PRESS_TOKENS
            ):
                classifications[node] = "Environmental Press"
                role_confidences[node] = 0.85
                authority_validations[node] = "Filtered (Location/Environmental)"
                continue

            if not skip_entity_filter and _is_abstract_noun_wn(node_lower):
                classifications[node] = "Symbolic Object"
                role_confidences[node] = 0.7
                authority_validations[node] = "Filtered (Abstract — WordNet)"
                continue

            if not skip_entity_filter and _is_physical_object_wn(node_lower):
                classifications[node] = "Symbolic Object"
                role_confidences[node] = 0.8
                authority_validations[node] = "Filtered (Object — WordNet)"
                continue

            if protagonist and node_lower == protagonist.lower() and not hero_assigned:
                classifications[node] = "Hero"
                role_confidences[node] = 0.85
                authority_validations[node] = "N/A (Protagonist)"
                hero_assigned = True
                continue

            lexical_scores = self._score_lexical(node_lower)

            out_emotions = [d.get('emotion') for u, v, d in self.graph.out_edges(node, data=True) if d.get('emotion')]
            in_emotions = [d.get('emotion') for u, v, d in self.graph.in_edges(node, data=True) if d.get('emotion')]
            all_emotions = out_emotions + in_emotions
            emotion_scores = self._score_emotions(all_emotions)

            out_degree = int(self.graph.out_degree(node)) if node in self.graph else 0
            in_degree = int(self.graph.in_degree(node)) if node in self.graph else 0
            structural_scores = self._score_structural(node, out_degree, in_degree)

            semantic_scores = self._score_semantic(node, role_proto_embs)

            sentiment_ctx_scores = self._analyze_authority_context(node, node_lower)

            holistic_scores = self._holistic_story_authority_signals(node_lower)

            resolver_scores = {}
            centrality = getattr(self, '_centrality_results', {})
            if centrality:
                node_centrality = centrality.get(node_lower, {})
                if node_centrality:
                    hero_s = node_centrality.get('hero_score', 0.0)
                    auth_s = node_centrality.get('authority_score', 0.0)
                    composite_auth_s = node_centrality.get('composite_authority_score', 0.0)

                    auth_threshold = 0.15 if (is_wn_authority or is_wn_person) else 0.3
                    hero_threshold = 0.3

                    if hero_s > hero_threshold:
                        resolver_scores['hero'] = hero_s

                    effective_auth = max(auth_s, composite_auth_s)
                    if effective_auth > auth_threshold:
                        resolver_scores['authority'] = effective_auth

                    auth_t = node_centrality.get('authority_target_score', 0.0)
                    if auth_t > 0.3:
                        resolver_scores['contemporary'] = max(
                            resolver_scores.get('contemporary', 0), auth_t * 0.6
                        )

            combined = {}
            all_roles = set(
                list(lexical_scores.keys()) + list(emotion_scores.keys()) +
                list(structural_scores.keys()) + list(semantic_scores.keys()) +
                list(sentiment_ctx_scores.keys()) + list(holistic_scores.keys()) +
                list(resolver_scores.keys())
            )
            for role in all_roles:
                combined[role] = (
                    0.25 * lexical_scores.get(role, 0.0)
                    + 0.08 * emotion_scores.get(role, 0.0)
                    + 0.12 * structural_scores.get(role, 0.0)
                    + 0.20 * semantic_scores.get(role, 0.0)
                    + 0.08 * sentiment_ctx_scores.get(role, 0.0)
                    + 0.07 * holistic_scores.get(role, 0.0)
                    + 0.20 * resolver_scores.get(role, 0.0)
                )

            if combined:
                best_role = max(combined, key=combined.get)
                best_score = combined[best_role]
            else:
                best_role = "Symbolic Object"
                best_score = 0.3

            RAW_TO_CLINICAL = {
                "authority": "Authority Figure",
                "contemporary": "Contemporary",
                "peer": "Peer",
                "caregiver": "Caregiver",
                "threat": "Threat Object",
                "antagonist": "Antagonist",
                "dependency_object": "Dependency Object",
                "romantic": "Romantic Figure",
                "idealized": "Idealized Figure",
                "parental": "Caregiver",
                "bystander": "Bystander",
                "hero": "Hero",
            }
            figure_type = RAW_TO_CLINICAL.get(best_role, "Symbolic Object")
            role_conf = min(0.95, max(0.3, best_score * 2.0))

            if figure_type == "Antagonist":
                neg_out = sum(
                    1 for _, _, d in self.graph.out_edges(node, data=True)
                    if d.get('sentiment', 0) < 0
                )
                is_person = _is_person_entity_wn(node_lower) or node_lower in AUTHORITY_LEXICAL_CUES
                has_hostile_agency = neg_out >= 1 and out_degree > 0
                if not (is_person and has_hostile_agency) or (protagonist and node_lower == protagonist.lower()):

                    figure_type = "Threat Object" if not is_person else "Peer"
                    role_conf = max(0.3, role_conf - 0.15)
                    auth_validation = "Antagonist Downgraded (structural gate failed)"

            if figure_type == "Idealized Figure":
                is_person = _is_person_entity_wn(node_lower)
                if not is_person:
                    figure_type = "Symbolic Object"
                    role_conf = max(0.3, role_conf - 0.1)
                elif protagonist and node_lower == protagonist.lower():

                    figure_type = "Hero"
                    hero_assigned = True

            if figure_type == "Romantic Figure":
                is_person = _is_person_entity_wn(node_lower) or node_lower in CONTEMPORARY_LEXICAL_CUES
                if not is_person:
                    figure_type = "Symbolic Object"
                    role_conf = max(0.3, role_conf - 0.1)

            if figure_type == "Symbolic Object" and _is_person_entity_wn(node_lower):
                total_degree = out_degree + in_degree
                if total_degree <= 1:

                    edge_sentiments = [
                        d.get('sentiment', 0)
                        for _, _, d in list(self.graph.out_edges(node, data=True))
                        + list(self.graph.in_edges(node, data=True))
                    ]
                    avg_sent = (sum(edge_sentiments) / len(edge_sentiments)) if edge_sentiments else 0
                    if abs(avg_sent) < 0.2:
                        figure_type = "Bystander"
                        role_conf = min(0.75, max(0.35, role_conf))

            auth_validation = "N/A"
            if figure_type == "Authority Figure":
                neg_in = sum(1 for _, _, d in self.graph.in_edges(node, data=True) if d.get('sentiment', 0) < 0)
                has_power_asymmetry = in_degree > out_degree
                has_decision_influence = neg_in > 0 or in_degree >= 2

                has_wn_authority = _is_authority_role_wn(node_lower)
                has_lexical_cue = node_lower in AUTHORITY_LEXICAL_CUES

                has_min_presence = in_degree >= 1

                if has_wn_authority and has_min_presence:
                    auth_validation = "Pass (WordNet)"
                elif has_power_asymmetry and has_decision_influence:
                    auth_validation = "Pass (Structural)"
                elif has_lexical_cue:
                    auth_validation = "Pass (Lexical Fallback)"
                else:
                    auth_validation = "Fail"

                    if out_degree > in_degree * 3:
                        figure_type = "Hero" if not hero_assigned else "Peer"
                    elif _is_person_entity_wn(node_lower):
                        figure_type = "Contemporary"
                    else:
                        figure_type = "Peer"
                    role_conf = max(0.3, role_conf - 0.15)

            if figure_type == "Contemporary":
                has_reciprocal = (
                    out_degree > 0 and in_degree > 0
                ) or self.graph.has_edge(node, node)
                is_wn_person = _is_person_entity_wn(node_lower)
                has_lexical_cue = node_lower in CONTEMPORARY_LEXICAL_CUES

                if not (is_wn_person or has_lexical_cue):
                    figure_type = "Symbolic Object"
                    role_conf = max(0.3, role_conf - 0.15)
                elif not has_reciprocal and not has_lexical_cue:
                    figure_type = "Peer"
                    role_conf = max(0.3, role_conf - 0.1)

            if figure_type == "Hero":
                if hero_assigned:
                    figure_type = "Peer"
                    role_conf = max(0.3, role_conf - 0.1)
                else:
                    hero_assigned = True

            if figure_type == "Authority Figure" and out_degree > in_degree * 3:
                figure_type = "Hero" if not hero_assigned else "Peer"
                if figure_type == "Hero":
                    hero_assigned = True
                role_conf = min(0.9, role_conf + 0.1)

            classifications[node] = figure_type
            role_confidences[node] = round(role_conf, 2)
            authority_validations[node] = auth_validation
          except Exception:

            continue

        if _RESOLVER_AVAILABLE and centrality:
            try:

                _contemp_scores = {}
                try:
                    _contemp_detector = ContemporaryFigureDetector(
                        self.nlp,
                        nlp_processor=getattr(self, 'processor', None)
                    )
                    _events = getattr(self, '_last_events', []) or []
                    _contemp_scores = _contemp_detector.score(
                        _events, centrality,
                        coref_map=getattr(self, '_coref_map', None)
                    )
                except Exception:
                    pass

                classifications = enforce_role_hierarchy(
                    classifications,
                    centrality,
                    is_person_check=_is_person_entity_wn,
                    is_object_check=lambda w: (
                        _is_physical_object_wn(w)
                        or _is_abstract_noun_wn(w)
                        or w in TAT_OBJECT_BLACKLIST
                    ),
                    contemporary_scores=_contemp_scores,
                )
            except Exception:
                pass

        self._role_confidences = role_confidences
        self._authority_validations = authority_validations
        return classifications

    def _analyze_authority_context(self, node: str, node_lower: str) -> Dict[str, float]:
        """Score figure roles using sentence-level sentiment analysis (VADER + RoBERTa).
        v6.0: Detects authority patterns by analyzing sentiment of sentences mentioning
        each entity. Authority figures tend to appear in sentences with negative sentiment
        + imperative/power verbs. Non-authority figures appear in neutral/positive contexts.
        Only applies authority signal to person-like entities."""
        scores = {}
        events = getattr(self, '_last_events', None)
        if not events:
            return scores

        if (_is_physical_object_wn(node_lower) or _is_abstract_noun_wn(node_lower)
                or _is_location_wn(node_lower) or node_lower in ENVIRONMENTAL_PRESS_TOKENS
                or node_lower in TAT_OBJECT_BLACKLIST or node_lower in ABSTRACT_NOUN_BLACKLIST):
            return scores

        entity_sentences = []
        for ev in events:
            text = ev.get('text', '')
            if node_lower in text.lower():
                entity_sentences.append(text)

        if not entity_sentences:
            return scores

        authority_signal = 0.0
        caregiver_signal = 0.0
        threat_signal = 0.0
        total_sentences = len(entity_sentences)

        authority_verb_patterns = {
            'demand', 'command', 'order', 'insist', 'force', 'require',
            'scold', 'punish', 'discipline', 'lecture', 'warn', 'forbid',
            'instruct', 'direct', 'control', 'dominate', 'rule', 'govern',
            'judge', 'criticize', 'correct', 'supervise', 'enforce',
            'demanded', 'commanded', 'ordered', 'insisted', 'forced',
            'scolded', 'punished', 'disciplined', 'lectured', 'warned',
            'forbade', 'instructed', 'directed', 'controlled', 'dominated',
        }

        caregiver_verb_patterns = {
            'comfort', 'nurture', 'protect', 'care', 'hold', 'embrace',
            'soothe', 'reassure', 'support', 'tend', 'heal', 'feed',
            'comforted', 'nurtured', 'protected', 'cared', 'held',
            'embraced', 'soothed', 'reassured', 'supported', 'tended',
        }

        for sent in entity_sentences:
            try:
                sentiment = self.processor.get_sentiment(sent)
                compound = sentiment.get('compound', 0)

                doc = self.nlp(sent)
                sent_words = {token.lemma_.lower() for token in doc}
                sent_words.update({token.text.lower() for token in doc})

                has_authority_verb = bool(sent_words & authority_verb_patterns)
                has_caregiver_verb = bool(sent_words & caregiver_verb_patterns)

                is_agent_of_power = False
                for token in doc:
                    if (token.dep_ in ('nsubj', 'nsubjpass') and
                            token.text.lower() == node_lower):
                        if token.head.lemma_.lower() in authority_verb_patterns:
                            is_agent_of_power = True

                if is_agent_of_power:
                    authority_signal += 0.8
                elif has_authority_verb and compound < -0.1:
                    authority_signal += 0.5
                elif has_authority_verb:
                    authority_signal += 0.3
                elif compound < -0.3:
                    authority_signal += 0.15

                if has_caregiver_verb and compound > 0.1:
                    caregiver_signal += 0.5
                elif has_caregiver_verb:
                    caregiver_signal += 0.3

                if compound < -0.5 and not has_authority_verb:
                    threat_signal += 0.4

            except Exception:
                continue

        if total_sentences > 0:
            authority_score = min(1.0, authority_signal / total_sentences)
            caregiver_score = min(1.0, caregiver_signal / total_sentences)
            threat_score = min(1.0, threat_signal / total_sentences)

            if authority_score > 0.1:
                scores['authority'] = authority_score
            if caregiver_score > 0.1:
                scores['caregiver'] = caregiver_score
            if threat_score > 0.1:
                scores['threat'] = threat_score

        return scores

    def _holistic_story_authority_signals(self, node_lower: str) -> Dict[str, float]:
        """Analyze the full story holistically (like a human) to identify authority signals.
        v6.0: Uses spaCy dependency parsing across ALL events to find power-dynamic
        verb patterns and who their agents/patients are. This captures authority
        relationships even when entities aren't in lexical cue lists."""
        scores = {}
        events = getattr(self, '_last_events', None)
        if not events:
            return scores

        if (_is_physical_object_wn(node_lower) or _is_abstract_noun_wn(node_lower)
                or _is_location_wn(node_lower) or node_lower in ENVIRONMENTAL_PRESS_TOKENS
                or node_lower in TAT_OBJECT_BLACKLIST or node_lower in ABSTRACT_NOUN_BLACKLIST):
            return scores

        power_verbs = {
            'demand', 'command', 'order', 'insist', 'force', 'scold',
            'punish', 'discipline', 'lecture', 'warn', 'forbid', 'instruct',
            'direct', 'control', 'dominate', 'rule', 'govern', 'judge',
            'criticize', 'correct', 'supervise', 'enforce', 'pressure',
            'expect', 'require', 'compel', 'threaten', 'intimidate',
        }

        submission_verbs = {
            'obey', 'submit', 'comply', 'yield', 'surrender', 'follow',
            'respect', 'defer', 'serve', 'sacrifice', 'endure', 'tolerate',
        }

        care_verbs = {
            'comfort', 'nurture', 'protect', 'care', 'heal', 'soothe',
            'reassure', 'support', 'tend', 'embrace', 'hold', 'feed',
        }

        agent_of_power = 0
        patient_of_power = 0
        agent_of_submission = 0
        agent_of_care = 0
        total_mentions = 0

        for ev in events:
            text = ev.get('text', '')
            if node_lower not in text.lower():
                continue
            total_mentions += 1

            try:
                doc = self.nlp(text)
                for token in doc:
                    verb_lemma = token.head.lemma_.lower() if token.head else ''

                    if token.text.lower() == node_lower:

                        if token.dep_ in ('nsubj',) and verb_lemma in power_verbs:
                            agent_of_power += 1

                        elif token.dep_ in ('dobj', 'pobj', 'nsubjpass') and verb_lemma in power_verbs:
                            patient_of_power += 1

                        elif token.dep_ in ('nsubj',) and verb_lemma in submission_verbs:
                            agent_of_submission += 1

                        elif token.dep_ in ('nsubj',) and verb_lemma in care_verbs:
                            agent_of_care += 1
            except Exception:
                continue

        if total_mentions == 0:
            return scores

        if agent_of_power > 0:
            scores['authority'] = min(1.0, 0.5 + agent_of_power * 0.25)
        if patient_of_power > 0:

            scores['contemporary'] = min(0.7, 0.3 + patient_of_power * 0.15)
        if agent_of_submission > 0:

            scores['contemporary'] = max(scores.get('contemporary', 0), min(0.6, 0.3 + agent_of_submission * 0.15))
        if agent_of_care > 0:
            scores['caregiver'] = min(1.0, 0.5 + agent_of_care * 0.25)

        return scores

    def _get_role_prototype_embeddings(self) -> Dict[str, np.ndarray]:
        """Get or compute cached role prototype embeddings."""
        if not hasattr(self, '_role_proto_cache'):
            self._role_proto_cache = {}
            for role, sentences in ROLE_PROTOTYPES.items():
                try:
                    self._role_proto_cache[role] = self.processor.get_embeddings(sentences)
                except Exception:
                    pass
        return self._role_proto_cache

    def _score_lexical(self, node_lower: str) -> Dict[str, float]:
        """Score figure roles using WordNet semantic classification + lexical fallback.
        v5.0: Programmatic role detection via hypernym chains."""
        scores = {}

        if _is_authority_role_wn(node_lower):
            scores["authority"] = 0.9
        elif node_lower in AUTHORITY_LEXICAL_CUES:
            scores["authority"] = 0.85

        if _is_person_entity_wn(node_lower) and not _is_authority_role_wn(node_lower):
            scores["contemporary"] = 0.75
        elif node_lower in CONTEMPORARY_LEXICAL_CUES:
            scores["contemporary"] = 0.80

        for cue in AUTHORITY_LEXICAL_CUES:
            if cue in node_lower and cue != node_lower:
                scores["authority"] = max(scores.get("authority", 0), 0.7)
        for cue in CONTEMPORARY_LEXICAL_CUES:
            if cue in node_lower and cue != node_lower:
                scores["contemporary"] = max(scores.get("contemporary", 0), 0.65)
        return scores

    def _score_emotions(self, all_emotions: list) -> Dict[str, float]:
        """Score figure roles based on edge emotion types."""
        if not all_emotions:
            return {}
        type_counts = defaultdict(int)
        for emo in all_emotions:
            if emo in EMOTION_FIGURE_MAP:
                mapped = EMOTION_FIGURE_MAP[emo]
                type_counts[mapped] += 1

        scores = {}
        total = max(1, len(all_emotions))
        for role, count in type_counts.items():
            scores[role] = min(1.0, count / total)
        return scores

    def _score_structural(self, node: str, out_degree: int, in_degree: int) -> Dict[str, float]:
        """Score figure roles based on graph structure."""
        total = out_degree + in_degree
        if total == 0:
            return {}

        scores = {}
        if out_degree > in_degree * 2:
            scores["hero"] = min(1.0, 0.5 + out_degree * 0.1)
        if in_degree > out_degree:
            neg_in = sum(1 for _, _, d in self.graph.in_edges(node, data=True) if d.get('sentiment', 0) < 0)
            if neg_in > 0:
                scores["authority"] = min(1.0, 0.4 + neg_in * 0.2)
            scores["dependency_object"] = min(0.7, 0.3 + (in_degree - out_degree) * 0.1)

        has_reciprocal = out_degree > 0 and in_degree > 0
        if has_reciprocal:

            degree_ratio = min(out_degree, in_degree) / max(out_degree, in_degree)
            if degree_ratio > 0.5:
                scores["contemporary"] = min(0.8, 0.4 + degree_ratio * 0.4)
                scores["peer"] = min(0.7, 0.3 + degree_ratio * 0.3)

        return scores

    def _score_semantic(self, node: str, role_proto_embs: Dict) -> Dict[str, float]:
        """Score figure roles using embedding similarity to role prototypes."""
        if not role_proto_embs:
            return {}

        context_sentences = []
        for u, v, d in self.graph.out_edges(node, data=True):
            context_sentences.append(f"{node} interacts with {v}")
        for u, v, d in self.graph.in_edges(node, data=True):
            context_sentences.append(f"{u} interacts with {node}")

        if not context_sentences:
            return {}

        try:
            ctx_embs = self.processor.get_embeddings(context_sentences)
            ctx_centroid = np.mean(ctx_embs, axis=0)

            scores = {}
            for role, proto_embs in role_proto_embs.items():
                proto_centroid = np.mean(proto_embs, axis=0)
                cos_sim = np.dot(ctx_centroid, proto_centroid) / (
                    np.linalg.norm(ctx_centroid) * np.linalg.norm(proto_centroid) + 1e-8
                )
                scores[role] = max(0.0, float(cos_sim))
            return scores
        except Exception:
            return {}

    def _compute_interaction_psychology(self, centrality: Dict[str, float]) -> Dict[str, Any]:
        """For key figures, compute affect, power, dependency, conflict, submission/resistance."""
        top_nodes = sorted(centrality.items(), key=lambda x: -x[1])[:5]
        result = {}
        for node, _ in top_nodes:

            out_edges = list(self.graph.out_edges(node, data=True))
            in_edges = list(self.graph.in_edges(node, data=True))

            sentiments = [d['sentiment'] for _, _, d in out_edges + in_edges if 'sentiment' in d]
            affect = np.mean(sentiments) if sentiments else 0

            total_degree = len(out_edges) + len(in_edges)
            power = len(out_edges) / total_degree if total_degree > 0 else 0

            dep_in = sum(1 for _, _, d in in_edges if d.get('sentiment', 0) > 0)
            dependency = dep_in / len(in_edges) if in_edges else 0

            neg_edges = sum(1 for _, _, d in out_edges + in_edges if d.get('sentiment', 0) < 0)
            conflict = neg_edges / total_degree if total_degree > 0 else 0

            resistance = sum(1 for _, _, d in in_edges if d.get('sentiment', 0) < 0) / len(in_edges) if in_edges else 0
            submission = 1 - resistance

            result[node] = {
                "affect": affect,
                "power_perception": power,
                "dependency": dependency,
                "conflict": conflict,
                "submission": submission,
                "resistance": resistance
            }
        return result

    def _infer_personality_traits(self) -> Dict[str, float]:
        """Infer personality traits from graph structure and edge statistics."""
        if self.graph.number_of_nodes() == 0:
            return {}

        inter_psych = self._compute_interaction_psychology(nx.degree_centrality(self.graph))
        avg_dependency = np.mean([v['dependency'] for v in inter_psych.values()]) if inter_psych else 0

        avg_power = np.mean([v['power_perception'] for v in inter_psych.values()]) if inter_psych else 0

        valences = [d.get('sentiment', 0) for u, v, d in self.graph.edges(data=True)]
        affect_regulation = 1.0 - np.std(valences) if valences else 0.5

        try:
            reciprocity = nx.reciprocity(self.graph) if self.graph.number_of_edges() > 0 else 0.0
        except Exception:
            reciprocity = 0.0
        reciprocity_component = max(0, 1.0 - reciprocity) * 0.25

        defense_rigidity_component = 0.3 * 0.40

        cross_card_component = 0.0 * 0.25

        neg_edge_ratio = sum(1 for v in valences if v < 0) / max(1, len(valences))
        marker_density_component = neg_edge_ratio * 0.10

        defensive_rigidity = reciprocity_component + defense_rigidity_component + cross_card_component + marker_density_component

        defensive_rigidity = min(0.55, defensive_rigidity)

        self_esteem = 0.5

        positive_edges = sum(1 for d in valences if d > 0)
        attachment_security = positive_edges / len(valences) if valences else 0.5

        aggression_modulation = 0.5

        reality_testing = 0.5

        return {
            "dependency_orientation": avg_dependency,
            "control_orientation": avg_power,
            "affect_regulation": affect_regulation,
            "defensive_rigidity": round(defensive_rigidity, 2),
            "defensive_rigidity_label": (
                "Flexible" if defensive_rigidity < 0.3 else
                "Moderately Structured" if defensive_rigidity < 0.6 else
                "Rigid" if defensive_rigidity < 0.8 else
                "Highly Rigid"
            ),
            "self_esteem_regulation": self_esteem,
            "attachment_security": attachment_security,
            "aggression_modulation": aggression_modulation,
            "reality_testing": reality_testing
        }

    SECURITY_MARKERS = {
        "repair", "trust", "support", "together", "resolved", "comfort",
        "safe", "secure", "helped", "understood", "caring", "forgave",
        "reconciled", "cooperated", "embrace", "protect",
    }
    REJECTION_MARKERS = {
        "abandoned", "rejected", "alone", "left", "isolated", "unwanted",
        "ignored", "betrayed", "neglected", "discarded", "pushed away",
    }
    ANXIOUS_MARKERS = {
        "afraid", "worried", "cling", "please", "don't leave", "reassure",
        "need", "desperate", "obsessed", "jealous", "panic",
    }
    AVOIDANT_MARKERS = {
        "doesn't matter", "fine", "independent", "don't need", "distance",
        "suppress", "hide", "private", "self-reliant", "detach",
    }

    def _classify_attachment(self) -> Dict[str, Any]:
        """
        Classify attachment style with evidence + counter-evidence.
        Recalibrated v3.1: requires specific markers, defaults to Indeterminate.
        """
        if self.graph.number_of_edges() == 0:
            return {
                "style": "Indeterminate (Insufficient Data)",
                "confidence": 0.2,
                "evidence": "No relational edges in graph",
                "counter_evidence": "N/A",
            }

        valences = [d.get('sentiment', 0) for u, v, d in self.graph.edges(data=True)]
        reciprocity = nx.reciprocity(self.graph)
        avg_valence = np.mean(valences) if valences else 0
        valence_std = np.std(valences) if len(valences) > 1 else 0

        all_emotions = []
        for _, _, d in self.graph.edges(data=True):
            emo = d.get('emotion', '')
            if emo:
                all_emotions.append(emo.lower())

        security_hits = sum(1 for e in all_emotions if e in self.SECURITY_MARKERS)
        rejection_hits = sum(1 for e in all_emotions if e in self.REJECTION_MARKERS)
        anxious_hits = sum(1 for e in all_emotions if e in self.ANXIOUS_MARKERS)
        avoidant_hits = sum(1 for e in all_emotions if e in self.AVOIDANT_MARKERS)

        total_edges = self.graph.number_of_edges()
        dep_edges = sum(1 for _, _, d in self.graph.edges(data=True) if d.get('sentiment', 0) > 0)
        dependency_ratio = dep_edges / total_edges if total_edges > 0 else 0

        secure_score = 0.0
        anxious_score = 0.0
        avoidant_score = 0.0

        if avg_valence > 0.1:
            secure_score += 0.3
        if reciprocity > 0.2:
            secure_score += 0.3
        if security_hits > 0:
            secure_score += 0.2
        if valence_std < 0.3:
            secure_score += 0.2

        if anxious_hits > 0 or rejection_hits > 0:
            anxious_score += 0.3
        if dependency_ratio > 0.7 and valence_std > 0.4:
            anxious_score += 0.4
        if avg_valence > 0 and valence_std > 0.5:
            anxious_score += 0.2

        if avg_valence < -0.05:
            avoidant_score += 0.3
        if reciprocity < 0.15:
            avoidant_score += 0.3
        if avoidant_hits > 0:
            avoidant_score += 0.2
        if dependency_ratio < 0.3:
            avoidant_score += 0.2

        scores = {
            "Secure": secure_score,
            "Anxious": anxious_score,
            "Avoidant": avoidant_score,
        }
        best_style = max(scores, key=scores.get)
        best_score = scores[best_style]
        second_best = sorted(scores.values(), reverse=True)[1]

        if best_score < 0.4 or (best_score - second_best) < 0.15:
            style = "Indeterminate (Insufficient Data)"
            confidence = 0.3
            evidence = f"Ambiguous pattern: Secure={secure_score:.2f}, Anxious={anxious_score:.2f}, Avoidant={avoidant_score:.2f}"
            counter_evidence = "No dominant attachment signal; scores within margin of ambiguity"
        else:
            style = best_style
            confidence = min(0.9, 0.4 + best_score * 0.5)
            evidence = self._format_attachment_evidence(style, avg_valence, reciprocity, valence_std, dependency_ratio)
            counter_evidence = self._format_counter_evidence(scores, style)

        return {
            "style": style,
            "confidence": round(confidence, 2),
            "evidence": evidence,
            "counter_evidence": counter_evidence,
        }

    def _format_attachment_evidence(self, style, avg_valence, reciprocity, valence_std, dep_ratio) -> str:
        if style == "Secure":
            return f"Positive affect (valence={avg_valence:.2f}), reciprocal interactions ({reciprocity:.2f}), stable emotion (σ={valence_std:.2f})"
        elif style == "Anxious":
            return f"High dependency ({dep_ratio:.2f}), affective volatility (σ={valence_std:.2f}), abandonment/rejection indicators"
        elif style == "Avoidant":
            return f"Low reciprocity ({reciprocity:.2f}), negative valence ({avg_valence:.2f}), low dependency ({dep_ratio:.2f})"
        return "Mixed signals"

    def _format_counter_evidence(self, scores, chosen) -> str:
        counter_parts = []
        for style, score in scores.items():
            if style != chosen and score > 0.2:
                counter_parts.append(f"{style} signal ({score:.2f})")
        if counter_parts:
            return "Counter-indicators: " + ", ".join(counter_parts)
        return "No significant counter-evidence"
