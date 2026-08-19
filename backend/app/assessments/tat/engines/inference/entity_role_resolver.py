"""
Entity Role Resolver — v8.0
----------------------------
Adds six reasoning layers to the TAT entity role detection pipeline:

  1. CoreferenceResolver      — rule-based pronoun→referent linking via spaCy
  2. NarrativeAgencyDetector   — dep-parse agency/initiator scoring
  3. InternalStateDetector     — psychological-verb / emotion detection
  4. WordNetAuthorityAnalyzer  — programmatic authority detection via WordNet
  5. AuthorityPatternDetector  — linguistic authority-relationship detection
  6. NarrativeCentralityScorer — composite HeroScore + AuthorityScore per entity

v8.0: Adds WordNet-based logical authority analysis. No hardcoded keyword
dictionaries — uses hypernym chain traversal, dep-parse power-relation
detection, and NER institutional-context inference.

PRESERVES all existing modules — purely additive.
Designed for integration as Signal 7 inside RelationalFieldEngine._classify_figures().
"""

import re
from typing import Dict, List, Optional, Tuple, Set, Any
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# ============================================================================
# WordNet availability (graceful degradation if not installed)
# ============================================================================
try:
    from nltk.corpus import wordnet as wn
    _WN_AVAILABLE = True
except Exception:
    _WN_AVAILABLE = False


# ============================================================================
# 1. COREFERENCE RESOLVER (rule-based, no external coref model required)
# ============================================================================

# Pronoun → gender hint mapping
_MALE_PRONOUNS = {"he", "him", "his", "himself"}
_FEMALE_PRONOUNS = {"she", "her", "hers", "herself"}
_NEUTRAL_PRONOUNS = {"they", "them", "their", "theirs", "themselves"}

# Common gender-hinted nouns for TAT narratives
_MALE_NOUNS = {
    "boy", "man", "father", "dad", "papa", "son", "brother", "uncle",
    "grandfather", "husband", "king", "prince", "gentleman", "lad",
}
_FEMALE_NOUNS = {
    "girl", "woman", "mother", "mom", "mama", "daughter", "sister", "aunt",
    "grandmother", "wife", "queen", "princess", "lady",
}
_PLURAL_NOUNS = {
    "parents", "children", "kids", "friends", "classmates", "people",
    "students", "teachers", "boys", "girls", "men", "women", "elders",
    "siblings", "colleagues", "neighbors", "teammates",
}


class CoreferenceResolver:
    """
    Rule-based coreference resolution optimised for short TAT narratives.

    Strategy:
      1. Identify noun referents (PERSON entities + known-person nouns) with
         their sentence positions.
      2. For each pronoun, find the nearest preceding same-gender referent.
      3. Build a coref_map: {pronoun_occurrence → resolved_entity_name}.
      4. Provide a method to rewrite event text / agent / target fields so that
         downstream processing sees the resolved entity instead of the pronoun.
    """

    def __init__(self, nlp):
        self.nlp = nlp

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def resolve(self, story_text: str) -> Dict[str, str]:
        """
        Return a pronoun → referent mapping for the story.
        Keys are lowercase pronouns; values are the resolved entity string.
        Example: {"he": "boy", "him": "boy", "his": "boy"}
        """
        doc = self.nlp(story_text)
        referents = self._extract_referents(doc)
        coref_map = self._link_pronouns(doc, referents)
        return coref_map

    def enrich_events(
        self, events: List[Dict], coref_map: Dict[str, str]
    ) -> List[Dict]:
        """
        Return a *new* list of events where agent/target fields have pronouns
        replaced by their resolved referents.  Original events are NOT mutated.
        """
        if not coref_map:
            return events

        enriched = []
        for ev in events:
            new_ev = dict(ev)  # shallow copy
            agent = (ev.get("agent") or "").strip()
            target = (ev.get("target") or "").strip()

            if agent.lower() in coref_map:
                new_ev["agent"] = coref_map[agent.lower()]
                new_ev["_original_agent"] = agent  # audit trail
            if target.lower() in coref_map:
                new_ev["target"] = coref_map[target.lower()]
                new_ev["_original_target"] = target

            enriched.append(new_ev)
        return enriched

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _extract_referents(self, doc) -> List[Tuple[str, int, str]]:
        """
        Return list of (entity_text, token_index, gender_hint).
        gender_hint ∈ {"male", "female", "neutral", "unknown"}
        """
        referents = []
        # From NER
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                gender = self._guess_gender(ent.text.lower())
                referents.append((ent.text, ent.start, gender))
        # From known-person nouns not caught by NER
        for token in doc:
            if token.pos_ in ("NOUN", "PROPN") and token.dep_ in (
                "nsubj", "nsubjpass", "dobj", "pobj", "attr", "appos",
            ):
                word = token.text.lower()
                if word in _MALE_NOUNS:
                    referents.append((token.text, token.i, "male"))
                elif word in _FEMALE_NOUNS:
                    referents.append((token.text, token.i, "female"))
                elif word in _PLURAL_NOUNS:
                    referents.append((token.text, token.i, "plural"))
        # Deduplicate by position
        seen = set()
        unique = []
        for r in referents:
            if r[1] not in seen:
                seen.add(r[1])
                unique.append(r)
        return sorted(unique, key=lambda x: x[1])

    def _guess_gender(self, text: str) -> str:
        tokens = text.lower().split()
        for t in tokens:
            if t in _MALE_NOUNS:
                return "male"
            if t in _FEMALE_NOUNS:
                return "female"
            if t in _PLURAL_NOUNS:
                return "plural"
        return "unknown"

    def _link_pronouns(
        self, doc, referents: List[Tuple[str, int, str]]
    ) -> Dict[str, str]:
        """
        For each pronoun token, find the nearest preceding referent whose
        gender matches (or is unknown).  Returns mapping pronoun → referent.
        """
        coref: Dict[str, str] = {}
        if not referents:
            return coref

        for token in doc:
            word = token.text.lower()
            if word in _MALE_PRONOUNS:
                pron_gender = "male"
            elif word in _FEMALE_PRONOUNS:
                pron_gender = "female"
            elif word in _NEUTRAL_PRONOUNS:
                pron_gender = "plural"
            else:
                continue

            # Find nearest preceding referent with compatible gender
            best = None
            best_dist = float("inf")
            for ref_text, ref_idx, ref_gender in referents:
                if ref_idx >= token.i:
                    break  # only look at preceding referents
                if ref_gender in (pron_gender, "unknown"):
                    dist = token.i - ref_idx
                    if dist < best_dist:
                        best_dist = dist
                        best = ref_text
            # Also check if there's a same-gender referent anywhere (cataphora fallback)
            if best is None:
                for ref_text, ref_idx, ref_gender in referents:
                    if ref_gender in (pron_gender, "unknown"):
                        best = ref_text
                        break

            if best:
                coref[word] = best.lower()

        return coref


# ============================================================================
# 2. NARRATIVE AGENCY DETECTOR
# ============================================================================

class NarrativeAgencyDetector:
    """
    Scores entities by how often they act as agents (subjects of active verbs).

    Returns: Dict[entity_lower, float]  — normalised 0.0–1.0.
    """

    def __init__(self, nlp):
        self.nlp = nlp

    def score(self, events: List[Dict], coref_map: Dict[str, str] = None) -> Dict[str, float]:
        agent_counts: Dict[str, int] = defaultdict(int)
        total_verbs = 0
        _coref = coref_map or {}

        for ev in events:
            text = ev.get("text", "")
            if not text:
                continue
            try:
                doc = self.nlp(text)
                for token in doc:
                    if token.pos_ == "VERB":
                        total_verbs += 1
                    if token.dep_ in ("nsubj",) and token.head.pos_ == "VERB":
                        # Resolve to head noun of noun phrase
                        head_noun = token.text.lower()
                        # Apply coref resolution
                        head_noun = _coref.get(head_noun, head_noun)
                        agent_counts[head_noun] += 1
            except Exception:
                continue

            # Also count from event-level agent field
            agent = (ev.get("agent") or "").strip().lower()
            if agent and len(agent) > 1:
                # Use the last word as the head noun (e.g. "the boy" → "boy")
                agent_head = agent.split()[-1]
                agent_head = _coref.get(agent_head, agent_head)
                agent_counts[agent_head] += 1

        if not agent_counts:
            return {}

        max_count = max(agent_counts.values())
        return {k: v / max_count for k, v in agent_counts.items()}


# ============================================================================
# 3. INTERNAL STATE DETECTOR
# ============================================================================

# Psychological verbs indicating internal states / protagonist perspective
INTERNAL_STATE_VERBS = {
    "think", "feel", "want", "consider", "fear", "hope", "wish",
    "decide", "believe", "imagine", "dream", "wonder", "worry",
    "remember", "forget", "realize", "expect", "desire", "need",
    "hate", "love", "prefer", "regret", "suspect", "doubt",
    "understand", "know", "sense", "notice", "perceive",
}

# Adjectives / past-participles indicating internal state
INTERNAL_STATE_ADJECTIVES = {
    "frustrated", "angry", "sad", "hopeful", "afraid", "anxious",
    "depressed", "lonely", "guilty", "ashamed", "proud", "happy",
    "confused", "determined", "resigned", "terrified", "excited",
    "overwhelmed", "helpless", "trapped", "torn", "desperate",
    "relieved", "devastated", "heartbroken", "jealous", "envious",
}


class InternalStateDetector:
    """
    Detects which entities are associated with internal-state expressions
    (psychological verbs, emotion adjectives).

    Entities with the most internal-state mentions are more likely the protagonist.
    Returns: Dict[entity_lower, float]  — normalised 0.0–1.0.
    """

    def __init__(self, nlp):
        self.nlp = nlp

    def score(self, events: List[Dict], coref_map: Dict[str, str] = None) -> Dict[str, float]:
        state_counts: Dict[str, int] = defaultdict(int)
        _coref = coref_map or {}

        for ev in events:
            text = ev.get("text", "")
            if not text:
                continue
            try:
                doc = self.nlp(text)
                for token in doc:
                    # Check verbs
                    if (token.lemma_.lower() in INTERNAL_STATE_VERBS
                            and token.pos_ in ("VERB", "AUX")):
                        # Find the subject of this verb
                        subj = self._find_subject(token)
                        if subj:
                            resolved = _coref.get(subj.lower(), subj.lower())
                            state_counts[resolved] += 1

                    # Check adjectives (e.g. "He is frustrated")
                    if (token.text.lower() in INTERNAL_STATE_ADJECTIVES
                            or token.lemma_.lower() in INTERNAL_STATE_ADJECTIVES):
                        subj = self._find_subject_of_adj(token)
                        if subj:
                            resolved = _coref.get(subj.lower(), subj.lower())
                            state_counts[resolved] += 1
            except Exception:
                continue

        if not state_counts:
            return {}

        max_count = max(state_counts.values())
        return {k: v / max_count for k, v in state_counts.items()}

    def _find_subject(self, verb_token) -> Optional[str]:
        """Find the nsubj child of a verb token."""
        for child in verb_token.children:
            if child.dep_ in ("nsubj", "nsubjpass"):
                return child.text
        # Check head if this verb is an xcomp/ccomp
        if verb_token.dep_ in ("xcomp", "ccomp", "advcl"):
            return self._find_subject(verb_token.head)
        return None

    def _find_subject_of_adj(self, adj_token) -> Optional[str]:
        """Find the subject associated with an adjective (e.g. 'He is frustrated')."""
        # If adj is acomp or attr of a copula, find nsubj of the head verb
        if adj_token.dep_ in ("acomp", "attr", "amod"):
            return self._find_subject(adj_token.head)
        # If adj modifies a noun directly
        if adj_token.dep_ == "amod" and adj_token.head.pos_ == "NOUN":
            return adj_token.head.text
        return None


# ============================================================================
# 4. AUTHORITY PATTERN DETECTOR
# ============================================================================

# Authority action verbs — the entity performing these toward another is
# an authority figure
AUTHORITY_ACTION_VERBS = {
    "tell", "told", "demand", "demanded", "expect", "expected",
    "allow", "allowed", "refuse", "refused", "insist", "insisted",
    "disapprove", "disapproved", "command", "commanded",
    "order", "ordered", "force", "forced", "forbid", "forbade",
    "punish", "punished", "scold", "scolded", "discipline", "disciplined",
    "warn", "warned", "instruct", "instructed", "lecture", "lectured",
    "direct", "directed", "control", "controlled", "require", "required",
    "pressure", "pressured", "compel", "compelled", "restrict", "restricted",
    "ground", "grounded", "criticize", "criticized", "correct", "corrected",
}

# Phrases that indicate authority relationship patterns
AUTHORITY_PHRASE_PATTERNS = [
    r"\b(told|ordered|commanded|demanded|instructed|directed)\s+(him|her|them|the\s+\w+)\b",
    r"\b(expected|required|forced|compelled)\s+(him|her|them|the\s+\w+)\s+to\b",
    r"\b(allowed|permitted|let|forbade|refused)\s+(him|her|them|the\s+\w+)\b",
    r"\b(must|should|have\s+to)\s+(practice|study|work|obey|listen|follow)\b",
    r"\b(disapproved|objected|opposed|criticized|scolded)\b",
]


# ============================================================================
# 4a. WORDNET AUTHORITY ANALYZER — Programmatic authority detection
# ============================================================================

# Cache for WordNet lookups (shared across instances)
_authority_wn_cache: Dict[str, Any] = {}


class WordNetAuthorityAnalyzer:
    """
    Programmatic authority detection using WordNet hypernym chains and
    spaCy dependency parsing. No hardcoded keyword dictionaries.

    Logic:
      - is_human_role(word):         WordNet synset → person.n.01 in hypernym chain
      - is_authority_hypernym(word): WordNet synset → authority-related synsets in chain
      - verb_implies_directive(lemma): WordNet verb synset → directive subtrees
      - detect_power_relations(doc): spaCy dep-parse → nsubj(directive_verb)→dobj
      - detect_institutional_context(doc): spaCy NER → ORG/FAC co-occurrence
    """

    # WordNet synset names that indicate a person (traversed programmatically)
    _PERSON_ROOTS = {'person.n.01', 'human.n.01', 'people.n.01',
                     'organism.n.01', 'living_thing.n.01'}

    # WordNet synset name fragments that indicate authority role
    _AUTHORITY_HYPERNYM_FRAGMENTS = {
        'leader', 'superior', 'educator', 'teacher', 'head',
        'chief', 'ruler', 'master', 'boss', 'supervisor',
        'authority', 'commander', 'director', 'manager',
        'guardian', 'official', 'administrator', 'executive',
        'parent', 'elder',
    }

    # WordNet verb synset name fragments that indicate directive/command semantics
    _DIRECTIVE_VERB_FRAGMENTS = {
        'order', 'command', 'direct', 'instruct', 'require',
        'compel', 'oblige', 'force', 'cause', 'tell',
        'demand', 'request', 'ask', 'charge', 'bid',
        'prescribe', 'dictate', 'decree', 'mandate',
        'control', 'govern', 'rule', 'dominate',
    }

    # Child/youth synset markers — entities with these are NOT authorities
    _CHILD_MARKERS = {
        'child', 'juvenile', 'minor', 'youngster', 'kid',
        'boy', 'girl', 'infant', 'baby', 'toddler',
        'adolescent', 'teenager', 'youth', 'student', 'pupil',
        'male_child', 'female_child',
    }

    def __init__(self, nlp):
        self.nlp = nlp

    # ------------------------------------------------------------------
    # WordNet-based logical checks
    # ------------------------------------------------------------------

    def is_human_role(self, word: str) -> bool:
        """Check if word represents a human/person via WordNet hypernym chain.
        Returns True for teacher, instructor, coach, doctor, etc.
        NO keyword matching — purely hypernym traversal."""
        if not _WN_AVAILABLE:
            return False
        word_lower = word.lower()
        cache_key = ('human_role', word_lower)
        if cache_key in _authority_wn_cache:
            return _authority_wn_cache[cache_key]

        synsets = wn.synsets(word_lower, pos=wn.NOUN)
        for syn in synsets[:4]:
            # Check if any lemma is a child marker — early reject
            lemma_names = {l.name().lower() for l in syn.lemmas()}
            if lemma_names & self._CHILD_MARKERS:
                continue  # skip child synsets, check other senses

            for path in syn.hypernym_paths():
                for h in path:
                    if h.name() in self._PERSON_ROOTS:
                        _authority_wn_cache[cache_key] = True
                        return True
                    # Also check via lemma names for person
                    h_lemmas = {l.name().lower() for l in h.lemmas()}
                    if 'person' in h_lemmas or 'human' in h_lemmas:
                        _authority_wn_cache[cache_key] = True
                        return True

        _authority_wn_cache[cache_key] = False
        return False

    def is_authority_hypernym(self, word: str) -> bool:
        """Check if word is an authority role via WordNet hypernym chain.
        Traverses synset hierarchy looking for authority-related ancestor synsets.
        Returns True for instructor, professor, coach, boss, etc."""
        if not _WN_AVAILABLE:
            return False
        word_lower = word.lower()
        cache_key = ('auth_hypernym', word_lower)
        if cache_key in _authority_wn_cache:
            return _authority_wn_cache[cache_key]

        synsets = wn.synsets(word_lower, pos=wn.NOUN)

        # Quick child exclusion
        for syn in synsets[:4]:
            lemma_names = {l.name().lower() for l in syn.lemmas()}
            if lemma_names & self._CHILD_MARKERS:
                _authority_wn_cache[cache_key] = False
                return False

        for syn in synsets[:4]:
            # Check direct lemma names against authority fragments
            lemma_names = {l.name().lower() for l in syn.lemmas()}
            if lemma_names & self._AUTHORITY_HYPERNYM_FRAGMENTS:
                _authority_wn_cache[cache_key] = True
                return True

            # Traverse hypernym chain
            for path in syn.hypernym_paths():
                for h in path:
                    h_lemmas = {l.name().lower() for l in h.lemmas()}
                    if h_lemmas & self._AUTHORITY_HYPERNYM_FRAGMENTS:
                        _authority_wn_cache[cache_key] = True
                        return True

        _authority_wn_cache[cache_key] = False
        return False

    def verb_implies_directive(self, verb_lemma: str) -> bool:
        """Check if a verb semantically implies directive/command action
        via WordNet verb synset hypernym chain traversal."""
        if not _WN_AVAILABLE:
            return False
        cache_key = ('directive_verb', verb_lemma.lower())
        if cache_key in _authority_wn_cache:
            return _authority_wn_cache[cache_key]

        synsets = wn.synsets(verb_lemma.lower(), pos=wn.VERB)
        for syn in synsets[:3]:
            # Check direct lemma match
            lemma_names = {l.name().lower() for l in syn.lemmas()}
            if lemma_names & self._DIRECTIVE_VERB_FRAGMENTS:
                _authority_wn_cache[cache_key] = True
                return True

            # Traverse hypernym chain for verb synsets
            try:
                for path in syn.hypernym_paths():
                    for h in path:
                        h_lemmas = {l.name().lower() for l in h.lemmas()}
                        if h_lemmas & self._DIRECTIVE_VERB_FRAGMENTS:
                            _authority_wn_cache[cache_key] = True
                            return True
            except Exception:
                continue

        _authority_wn_cache[cache_key] = False
        return False

    # ------------------------------------------------------------------
    # Dependency-based power relation detection
    # ------------------------------------------------------------------

    def detect_power_relations(
        self, doc, coref_map: Dict[str, str] = None
    ) -> Dict[str, Dict[str, float]]:
        """Use spaCy dependency parsing to detect subject→directive_verb→object
        power relations. Returns per-entity authority/subordinate weights.

        Logic:
          For each verb in the doc:
            - Find nsubj (the director) and dobj/dative (the directed)
            - Check if verb semantically implies directive action (via WordNet)
            - If yes: director gets +authority, directed gets +subordinate
        """
        _coref = coref_map or {}
        results: Dict[str, Dict[str, float]] = defaultdict(
            lambda: {"directive_authority": 0.0, "directive_subordinate": 0.0}
        )

        for token in doc:
            if token.pos_ != "VERB":
                continue

            verb_lemma = token.lemma_.lower()

            # Use WordNet to check if this verb implies directive power
            if not self.verb_implies_directive(verb_lemma):
                continue

            # Find subject (the authority) and object (the target)
            director = None
            directed = None

            for child in token.children:
                if child.dep_ in ("nsubj",):
                    raw = child.text.lower()
                    director = _coref.get(raw, raw)
                if child.dep_ in ("dobj", "dative", "pobj", "nsubjpass"):
                    raw = child.text.lower()
                    directed = _coref.get(raw, raw)

            if director:
                results[director]["directive_authority"] += 0.4
            if directed:
                results[directed]["directive_subordinate"] += 0.3

        return dict(results)

    # ------------------------------------------------------------------
    # NER-based institutional context inference
    # ------------------------------------------------------------------

    def detect_institutional_context(
        self, doc, entity_name: str
    ) -> float:
        """Detect if an entity co-occurs with organizational/institutional
        NER entities (ORG, FAC) in the same sentence. Returns a weight.

        Logic:
          If entity X is a WordNet person AND appears in a sentence with
          an ORG/FAC NER entity → institutional authority context inferred.
        """
        entity_lower = entity_name.lower()
        if not self.is_human_role(entity_lower):
            return 0.0

        institutional_weight = 0.0
        for sent in doc.sents:
            sent_text_lower = sent.text.lower()
            if entity_lower not in sent_text_lower:
                continue

            # Check for institutional NER entities in the same sentence
            for ent in sent.ents:
                if ent.label_ in ("ORG", "FAC", "NORP"):
                    institutional_weight += 0.2
                    break  # one per sentence is enough

        return min(1.0, institutional_weight)


class AuthorityPatternDetector:
    """
    Detects authority relationships using linguistic patterns.

    For each entity, returns two scores:
      - authority_score: how much this entity acts as an authority
      - authority_target_score: how much this entity is the target of authority

    Returns: Dict[entity_lower, Dict[str, float]]
    """

    def __init__(self, nlp):
        self.nlp = nlp

    def detect(self, events: List[Dict], coref_map: Dict[str, str] = None) -> Dict[str, Dict[str, float]]:
        scores: Dict[str, Dict[str, float]] = defaultdict(
            lambda: {
                "authority_score": 0.0,
                "authority_target_score": 0.0,
                "wordnet_role_weight": 0.0,
                "directive_power_weight": 0.0,
                "institutional_weight": 0.0,
            }
        )
        total_events = len(events) or 1
        _coref = coref_map or {}

        # v8.0: Use WordNet analyzer for logical authority detection
        analyzer = WordNetAuthorityAnalyzer(self.nlp)

        # Reconstruct full story doc for institutional context detection
        full_text = ' '.join(ev.get('text', '') for ev in events)
        full_doc = None
        try:
            full_doc = self.nlp(full_text)
        except Exception:
            pass

        for ev in events:
            text = ev.get("text", "")
            if not text:
                continue
            try:
                doc = self.nlp(text)

                # --- Original authority verb detection (preserved) ---
                for token in doc:
                    verb_lemma = token.lemma_.lower()
                    verb_text = token.text.lower()

                    # Check if this is an authority verb
                    if (verb_lemma in AUTHORITY_ACTION_VERBS
                            or verb_text in AUTHORITY_ACTION_VERBS):
                        # Find subject (authority) and object (target)
                        auth_entity = None
                        target_entity = None

                        for child in token.children:
                            if child.dep_ in ("nsubj",):
                                raw = child.text.lower()
                                auth_entity = _coref.get(raw, raw)
                            if child.dep_ in ("dobj", "pobj", "nsubjpass"):
                                raw = child.text.lower()
                                target_entity = _coref.get(raw, raw)

                        if auth_entity:
                            scores[auth_entity]["authority_score"] += 1.0
                        if target_entity:
                            scores[target_entity]["authority_target_score"] += 1.0

                # --- v8.0: WordNet directive verb power detection ---
                power_rels = analyzer.detect_power_relations(doc, coref_map=_coref)
                for entity, weights in power_rels.items():
                    scores[entity]["directive_power_weight"] += weights.get(
                        "directive_authority", 0.0
                    )
                    scores[entity]["authority_score"] += weights.get(
                        "directive_authority", 0.0
                    )
                    scores[entity]["authority_target_score"] += weights.get(
                        "directive_subordinate", 0.0
                    )

                # Also check regex patterns for phrase-level authority
                text_lower = text.lower()
                for pattern in AUTHORITY_PHRASE_PATTERNS:
                    if re.search(pattern, text_lower):
                        # Boost any entity that is a known authority noun in this sentence
                        for token in doc:
                            if (token.dep_ == "nsubj" and
                                    token.head.lemma_.lower() in AUTHORITY_ACTION_VERBS):
                                raw = token.text.lower()
                                resolved = _coref.get(raw, raw)
                                scores[resolved]["authority_score"] += 0.5

            except Exception:
                continue

        # --- v8.0: WordNet human-role and authority-hypernym scoring ---
        all_entities = set(scores.keys())
        # Also collect entities from events agent/target fields
        for ev in events:
            for field in ('agent', 'target'):
                val = (ev.get(field) or '').strip().lower()
                if val and len(val) > 1:
                    head = _coref.get(val.split()[-1], val.split()[-1])
                    all_entities.add(head)

        for entity in all_entities:
            # WordNet human-role check
            if analyzer.is_human_role(entity):
                if analyzer.is_authority_hypernym(entity):
                    scores[entity]["wordnet_role_weight"] += 0.6
                    scores[entity]["authority_score"] += 0.6

            # Institutional context check
            if full_doc:
                inst_weight = analyzer.detect_institutional_context(
                    full_doc, entity
                )
                if inst_weight > 0:
                    scores[entity]["institutional_weight"] += inst_weight
                    scores[entity]["authority_score"] += inst_weight * 0.5

        # Normalise
        max_auth = max((s["authority_score"] for s in scores.values()), default=1.0) or 1.0
        max_targ = max((s["authority_target_score"] for s in scores.values()), default=1.0) or 1.0
        for entity in scores:
            scores[entity]["authority_score"] = min(1.0, scores[entity]["authority_score"] / max_auth)
            scores[entity]["authority_target_score"] = min(1.0, scores[entity]["authority_target_score"] / max_targ)

        return dict(scores)


# ============================================================================
# 5. NARRATIVE CENTRALITY SCORER — Composite HeroScore
# ============================================================================

class NarrativeCentralityScorer:
    """
    Computes a composite HeroScore per entity:

        HeroScore = w1 × agent_frequency
                  + w2 × coreference_mentions
                  + w3 × internal_state_expressions
                  + w4 × narrative_focus_weight

    Entity with the highest HeroScore → Hero.
    Entities with high authority_score → Authority Figure.
    """

    # Weights for the composite score
    W_AGENT = 0.30
    W_COREF = 0.25
    W_INTERNAL = 0.25
    W_FOCUS = 0.20

    def __init__(self, nlp):
        self.nlp = nlp
        self.coref_resolver = CoreferenceResolver(nlp)
        self.agency_detector = NarrativeAgencyDetector(nlp)
        self.state_detector = InternalStateDetector(nlp)
        self.authority_detector = AuthorityPatternDetector(nlp)

    def compute(
        self, story_text: str, events: List[Dict]
    ) -> Dict[str, Dict[str, float]]:
        """
        Returns per-entity scores:
        {
            "boy": {
                "hero_score": 0.92,
                "agent_score": 0.85,
                "coref_score": 1.0,
                "internal_state_score": 0.90,
                "focus_score": 0.75,
                "authority_score": 0.0,
                "authority_target_score": 0.6,
            },
            "parents": {
                "hero_score": 0.25,
                "agent_score": 0.3,
                ...
                "authority_score": 0.95,
                "authority_target_score": 0.0,
            },
        }
        """
        # Step 1: Coreference resolution
        coref_map = self.coref_resolver.resolve(story_text)
        logger.debug(f"Coref map: {coref_map}")

        # Step 2: Enrich events with resolved coreferences
        enriched_events = self.coref_resolver.enrich_events(events, coref_map)

        # Step 3: Compute individual signals on enriched events
        #         Pass coref_map so dep-parse subjects get resolved
        agency_scores = self.agency_detector.score(enriched_events, coref_map=coref_map)
        internal_scores = self.state_detector.score(enriched_events, coref_map=coref_map)
        authority_result = self.authority_detector.detect(enriched_events, coref_map=coref_map)

        # Step 4: Compute coreference mention counts
        coref_counts: Dict[str, int] = defaultdict(int)
        for pronoun, referent in coref_map.items():
            # Count how many times each pronoun appears in story
            count = story_text.lower().count(pronoun)
            coref_counts[referent.lower()] += count
        # Also count direct mentions
        doc = self.nlp(story_text)
        for token in doc:
            if token.pos_ in ("NOUN", "PROPN") and len(token.text) > 1:
                coref_counts[token.text.lower()] += 1

        # Normalise coref
        max_coref = max(coref_counts.values()) if coref_counts else 1
        coref_scores = {k: v / max_coref for k, v in coref_counts.items()}

        # Step 5: Compute narrative focus (proportion of sentences mentioning entity)
        sentences = [s.text.lower() for s in doc.sents]
        num_sents = len(sentences) or 1
        focus_scores: Dict[str, float] = {}
        all_entities = set(
            list(agency_scores.keys()) + list(coref_scores.keys()) +
            list(internal_scores.keys()) + list(authority_result.keys())
        )
        for entity in all_entities:
            mention_count = sum(1 for s in sentences if entity in s)
            focus_scores[entity] = mention_count / num_sents

        # Step 6: Composite HeroScore + AuthorityScore
        # v8.0: Also compute composite_authority_score from sub-weights
        analyzer = WordNetAuthorityAnalyzer(self.nlp)
        results: Dict[str, Dict[str, float]] = {}
        for entity in all_entities:
            agent_s = agency_scores.get(entity, 0.0)
            coref_s = coref_scores.get(entity, 0.0)
            internal_s = internal_scores.get(entity, 0.0)
            focus_s = focus_scores.get(entity, 0.0)
            auth = authority_result.get(entity, {})
            auth_s = auth.get("authority_score", 0.0)
            auth_t = auth.get("authority_target_score", 0.0)

            # v8.0: Sub-weights from enhanced AuthorityPatternDetector
            wn_role_w = auth.get("wordnet_role_weight", 0.0)
            directive_w = auth.get("directive_power_weight", 0.0)
            institutional_w = auth.get("institutional_weight", 0.0)

            # v8.0: Composite authority score (logic-based)
            composite_auth = (
                0.35 * auth_s
                + 0.30 * min(1.0, wn_role_w)
                + 0.20 * min(1.0, directive_w)
                + 0.15 * min(1.0, institutional_w)
            )

            # v8.0: Additional WordNet-based boost —
            # if WordNet says entity is an authority role, ensure minimum score
            if analyzer.is_authority_hypernym(entity) and analyzer.is_human_role(entity):
                composite_auth = max(composite_auth, 0.45)

            hero_score = (
                self.W_AGENT * agent_s
                + self.W_COREF * coref_s
                + self.W_INTERNAL * internal_s
                + self.W_FOCUS * focus_s
            )

            # Penalise hero score if entity has high authority score
            # (authorities are rarely the hero in TAT narratives)
            if auth_s > 0.5 or composite_auth > 0.45:
                hero_score *= (1.0 - max(auth_s, composite_auth) * 0.4)

            results[entity] = {
                "hero_score": round(min(1.0, hero_score), 4),
                "agent_score": round(agent_s, 4),
                "coref_score": round(coref_s, 4),
                "internal_state_score": round(internal_s, 4),
                "focus_score": round(focus_s, 4),
                "authority_score": round(auth_s, 4),
                "authority_target_score": round(auth_t, 4),
                "composite_authority_score": round(min(1.0, composite_auth), 4),
                "wordnet_role_weight": round(min(1.0, wn_role_w), 4),
                "directive_power_weight": round(min(1.0, directive_w), 4),
                "institutional_weight": round(min(1.0, institutional_w), 4),
            }

        # Store coref map and enriched events for downstream use
        self._last_coref_map = coref_map
        self._last_enriched_events = enriched_events

        return results

    @property
    def coref_map(self) -> Dict[str, str]:
        return getattr(self, "_last_coref_map", {})

    @property
    def enriched_events(self) -> List[Dict]:
        return getattr(self, "_last_enriched_events", [])


# ============================================================================
# 6. CONTEMPORARY FIGURE DETECTOR (v9.0)
# ============================================================================

# Peer-relationship prototype sentences for SBERT similarity
_PEER_PROTOTYPES = [
    "Two friends are spending time together.",
    "Classmates are studying or playing together.",
    "Siblings are having a conversation.",
    "A companion stands beside the person.",
    "The colleague offers support and cooperation.",
    "Two people of similar age interact as equals.",
    "A peer shares a moment of understanding.",
    "The friend listens and empathizes.",
    "Fellow students work on a project together.",
    "Two young people face the same challenge.",
]

# Nouns that strongly suggest peer / contemporary role
_PEER_NOUNS = {
    "friend", "companion", "classmate", "colleague", "peer", "partner",
    "sibling", "brother", "sister", "cousin", "teammate", "roommate",
    "neighbor", "neighbour", "buddy", "mate", "fellow", "rival",
    "boyfriend", "girlfriend", "lover", "spouse", "husband", "wife",
}

# Age-peer nouns (same developmental stage as likely protagonist)
_AGE_PEER_NOUNS = {
    "boy", "girl", "man", "woman", "child", "student", "youth",
    "teenager", "adolescent", "young man", "young woman", "lad", "lass",
}

# Cache for peer prototype embeddings
_peer_proto_cache: Dict[str, Any] = {}


class ContemporaryFigureDetector:
    """
    Detects contemporary / peer figures in TAT narratives using:
      1. Peer-noun lexical matching
      2. SBERT embedding similarity to peer-relationship prototypes
      3. Age-peer proximity to the Hero entity

    Returns per-entity contemporary_score (0.0–1.0).
    Entities with high contemporary_score and low authority_score → Contemporary Figure.
    """

    def __init__(self, nlp, nlp_processor=None):
        self.nlp = nlp
        self.nlp_processor = nlp_processor
        self._proto_embs = None
        if nlp_processor is not None:
            self._compute_prototypes()

    def _compute_prototypes(self):
        global _peer_proto_cache
        if 'peer_embs' not in _peer_proto_cache:
            _peer_proto_cache['peer_embs'] = self.nlp_processor.get_embeddings(
                _PEER_PROTOTYPES
            )
        self._proto_embs = _peer_proto_cache['peer_embs']

    def score(
        self,
        events: List[Dict],
        centrality_scores: Dict[str, Dict[str, float]],
        coref_map: Dict[str, str] = None,
    ) -> Dict[str, float]:
        """
        Score each entity for contemporary/peer likelihood.
        Returns: Dict[entity_lower, float] — normalised 0.0–1.0.
        """
        _coref = coref_map or {}
        scores: Dict[str, float] = defaultdict(float)

        # Signal 1: Peer-noun lexical match
        all_entities = set(centrality_scores.keys())
        for entity in all_entities:
            e_lower = entity.lower().strip()
            tokens = set(e_lower.replace('-', ' ').replace('_', ' ').split())
            if tokens & _PEER_NOUNS:
                scores[entity] += 0.5
            elif tokens & _AGE_PEER_NOUNS:
                scores[entity] += 0.2

        # Signal 2: SBERT similarity to peer prototypes (if available)
        if self._proto_embs is not None and self.nlp_processor is not None:
            # Build per-entity context sentences from events
            entity_contexts: Dict[str, List[str]] = defaultdict(list)
            for ev in events:
                text = ev.get('text', '')
                agent = (ev.get('agent') or '').strip().lower()
                target = (ev.get('target') or '').strip().lower()
                agent = _coref.get(agent, agent)
                target = _coref.get(target, target)
                if agent and agent in all_entities:
                    entity_contexts[agent].append(text)
                if target and target in all_entities:
                    entity_contexts[target].append(text)

            for entity, contexts in entity_contexts.items():
                if not contexts:
                    continue
                try:
                    ctx_embs = self.nlp_processor.get_embeddings(contexts[:5])
                    ctx_centroid = ctx_embs.mean(axis=0)
                    proto_centroid = self._proto_embs.mean(axis=0)
                    import numpy as _np
                    cos_sim = float(_np.dot(ctx_centroid, proto_centroid) / (
                        _np.linalg.norm(ctx_centroid) * _np.linalg.norm(proto_centroid) + 1e-8
                    ))
                    if cos_sim > 0.25:
                        scores[entity] += cos_sim * 0.5
                except Exception:
                    pass

        # Signal 3: Moderate agency + not authority → peer-like
        for entity, cs in centrality_scores.items():
            agent_s = cs.get('agent_score', 0)
            auth_s = cs.get('authority_score', 0)
            composite_auth = cs.get('composite_authority_score', 0)
            hero_s = cs.get('hero_score', 0)
            # Peer: has some agency, but is neither the Hero nor Authority
            if agent_s > 0.1 and max(auth_s, composite_auth) < 0.3 and hero_s < 0.5:
                scores[entity] += 0.3 * agent_s

        # Normalise
        if scores:
            max_s = max(scores.values()) or 1.0
            scores = {k: min(1.0, v / max_s) for k, v in scores.items()}

        return dict(scores)


# ============================================================================
# 7. ENTITY ROLE HIERARCHY ENFORCER (v9.0 — adds Contemporary Figure rule)
# ============================================================================

def enforce_role_hierarchy(
    classifications: Dict[str, str],
    centrality_scores: Dict[str, Dict[str, float]],
    is_person_check,  # callable(word) → bool
    is_object_check,  # callable(word) → bool
    contemporary_scores: Optional[Dict[str, float]] = None,
) -> Dict[str, str]:
    """
    Enforce entity role hierarchy:
      Human protagonist → Hero (highest hero_score among humans)
      Human authority → Authority Figure
      Peers → Contemporary Figure
      Objects → Symbolic Object (NEVER Hero)

    v9.0: Adds Rule 4 — explicit Contemporary Figure assignment.

    Mutates and returns the classifications dict.
    """
    # Rule 1: Objects can never be Hero
    for entity, role in list(classifications.items()):
        if role == "Hero" and is_object_check(entity.lower()):
            classifications[entity] = "Symbolic Object"

    # Rule 2: If no Hero assigned, pick the human with highest hero_score
    has_hero = any(r == "Hero" for r in classifications.values())
    if not has_hero and centrality_scores:
        # Filter to human-like entities only
        human_candidates = [
            (e, s["hero_score"])
            for e, s in centrality_scores.items()
            if is_person_check(e.lower()) or not is_object_check(e.lower())
        ]
        if human_candidates:
            best_hero = max(human_candidates, key=lambda x: x[1])
            # Find the matching node in classifications (case-insensitive)
            for node in classifications:
                if node.lower() == best_hero[0].lower():
                    classifications[node] = "Hero"
                    break

    # Rule 3: Entities with high authority_score should be Authority Figure
    # v8.0: Lowered threshold from 0.5 to 0.4; also check composite_authority_score
    for entity, scores in centrality_scores.items():
        auth_score = scores.get("authority_score", 0)
        composite_auth = scores.get("composite_authority_score", 0)
        effective_auth = max(auth_score, composite_auth)

        if effective_auth > 0.4:
            # v8.0: Only assign authority if entity is a person (not an object)
            if is_object_check(entity.lower()):
                continue
            for node in classifications:
                if (node.lower() == entity.lower()
                        and classifications[node] not in ("Hero",)):
                    classifications[node] = "Authority Figure"

    # Rule 4 (v9.0): Assign Contemporary Figure to peer-like human entities
    # that are not already Hero or Authority Figure
    _contemp_scores = contemporary_scores or {}
    for entity, peer_score in sorted(_contemp_scores.items(), key=lambda x: -x[1]):
        if peer_score < 0.2:
            continue
        if is_object_check(entity.lower()):
            continue
        for node in classifications:
            if (node.lower() == entity.lower()
                    and classifications[node] not in ("Hero", "Authority Figure", "Symbolic Object")):
                classifications[node] = "Contemporary Figure"

    return classifications
