"""
Theme Detection Engine
----------------------
Uses Sentence-BERT embeddings and BERTopic to extract latent themes from narrative.
Enhanced with structured theme metadata: intensity, affect tone, related needs, etc.
No predefined keywords.
"""

import numpy as np
import logging
from sentence_transformers import SentenceTransformer
from bertopic import BERTopic
from typing import List, Dict, Any, Optional, Tuple
import re
from collections import defaultdict

logger = logging.getLogger(__name__)

try:
    from nltk.corpus import wordnet as wn
    _WN_THEME_AVAILABLE = True
except ImportError:
    _WN_THEME_AVAILABLE = False

LITERAL_PROTOTYPES = [
    "The man walked to the store.",
    "She sat in a chair and read a book.",
    "He picked up the phone and called his mother.",
    "The boy went to school in the morning.",
    "They ate dinner together at the table.",
    "She opened the door and walked inside.",
    "He drove his car to work every day.",
]

FIGURATIVE_PROTOTYPES = [
    "The weight of the world was on his shoulders.",
    "She felt like drowning in her sorrows.",
    "A dark cloud hung over his life.",
    "Her heart was a cage of thorns.",
    "He was trapped in a web of lies.",
    "The silence between them was deafening.",
    "She carried an invisible burden that crushed her spirit.",
    "The walls were closing in on him.",
    "Time stood still as grief consumed her.",
]

SYMBOLIC_PROTOTYPES = [
    "The violin represented his abandoned dreams.",
    "The locked door symbolized her fear of intimacy.",
    "The barren field was a mirror of his empty soul.",
    "Light and darkness battled within him.",
    "The broken bridge meant there was no going back.",
    "The rising sun signified hope after long suffering.",
    "The storm inside him raged without end.",
]

FIGURATIVE_MARKERS = {
    'like', 'as if', 'seemed', 'felt like', 'as though',
    'metaphor', 'symbol', 'represent', 'mirror', 'echo',
    'shadow', 'weight', 'burden', 'cage', 'trap', 'web',
    'drowning', 'sinking', 'rising', 'falling', 'floating',
    'darkness', 'light', 'fire', 'storm', 'ocean', 'mountain',
    'bridge', 'wall', 'door', 'path', 'journey', 'road',
    'ghost', 'phantom', 'mask', 'chains', 'prison', 'wings',
}

try:
    import nltk
    from nltk.corpus import stopwords
    STOPWORDS = set(stopwords.words('english'))
except Exception:

    STOPWORDS = {
        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", "you'll", "you'd",
        'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', "she's", 'her', 'hers',
        'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
        'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if',
        'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
        'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
        'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
        'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
        'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't",
        'should', "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', "aren't", 'couldn',
        "couldn't", 'didn', "didn't", 'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't",
        'isn', "isn't", 'ma', 'mightn', "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan', "shan't",
        'shouldn', "shouldn't", 'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't"
    }

EXTRA_TAT_STOPWORDS = {
    'man', 'woman', 'boy', 'girl', 'person', 'people', 'one', 'two', 'look', 'looks', 'looking', 'seem',
    'seems', 'picture', 'card', 'story', 'tell', 'think', 'thought', 'know', 'say', 'said', 'go', 'going',
    'make', 'makes', 'take', 'takes', 'come', 'comes', 'see', 'sees', 'saw', 'get', 'gets', 'got', 'day', 'time',
    'thing', 'things', 'feel', 'feels', 'feeling', 'keep', 'keeps', 'keeping', 'want', 'wants', 'like', 'likes',
    'decide', 'decides', 'deciding', 'dream', 'dreams', 'dreaming', 'young', 'stand', 'stands', 'standing',
    'hold', 'holds', 'holding'
}
STOPWORDS.update(EXTRA_TAT_STOPWORDS)

PSYCHOLOGICAL_CONSTRUCTS = {
        'authority', 'control', 'conflict', 'identity', 'duty', 'suppression',
        'guilt', 'fear', 'abandonment', 'rejection', 'success', 'failure',
        'nurturance', 'loss', 'grief', 'hope', 'despair', 'anger', 'anxiety',
        'shame', 'pride', 'dependence', 'independence', 'autonomy', 'power'
}

def _is_psychological_construct_wn(word: str) -> bool:
    """Check if word relates to psychological/emotional constructs via WordNet.
    Looks for words whose hypernym chain includes emotion, feeling, trait,
    cognition, or motivation — the semantic families of psychological constructs."""
    if not _WN_THEME_AVAILABLE:
        return word.lower() in PSYCHOLOGICAL_CONSTRUCTS

    if word.lower() in PSYCHOLOGICAL_CONSTRUCTS:
        return True
    synsets = wn.synsets(word.lower(), pos=wn.NOUN)
    for syn in synsets[:3]:
        hypernym_names = set()
        for path in syn.hypernym_paths():
            for h in path:
                hypernym_names.add(h.name())
        if any(marker in h for h in hypernym_names
               for marker in ('feeling', 'emotion', 'trait', 'cognition',
                              'motivation', 'psychological', 'state')):
            return True
    return False

CLINICAL_LABEL_PROTOTYPES = {
    "Attachment & Bonding": (
        "emotional connection, closeness, separation, bonding, intimacy, yearning to be close, "
        "fear of losing someone, belonging, warmth between people"
    ),
    "Achievement & Ambition": (
        "success, goals, performance, striving, accomplishment, ambition, working hard to excel, "
        "desire to prove oneself, persistence, mastery, competitive drive"
    ),
    "Loss & Grief": (
        "death, separation, mourning, emptiness, bereavement, loss, absence of someone loved, "
        "sorrow over what is gone, inability to recover, irreversible ending"
    ),
    "Power & Control": (
        "dominance, submission, authority, helplessness, control, oppression, "
        "one person controlling another, feeling powerless, coercive force, subjugation"
    ),
    "Identity & Self": (
        "self-concept, identity, purpose, confusion, self-worth, role, who am I, "
        "sense of self, personal values, existential uncertainty about one's place"
    ),
    "Aggression & Conflict": (
        "hostility, violence, anger, opposition, struggle, conflict, fighting, "
        "destructive impulse, rage, physical or verbal assault, wishing to harm"
    ),
    "Autonomy & Independence": (
        "freedom, self-reliance, independence, breaking free, autonomy, "
        "resisting control, determining one's own path, refusing to obey"
    ),
    "Fear & Anxiety": (
        "worry, dread, apprehension, nervousness, fear, threat, "
        "anticipation of harm, constant unease, feeling unsafe, panic"
    ),
    "Guilt & Shame": (
        "remorse, self-blame, inadequacy, wrongdoing, shame, guilt, "
        "feeling responsible for harm, hiding from others, humiliation, moral failure"
    ),
    "Dependency & Neediness": (
        "reliance, helplessness, clinging, support-seeking, dependency, "
        "inability to function alone, needing someone to survive, turning to others"
    ),
    "Rejection & Abandonment": (
        "exclusion, neglect, abandonment, being unwanted, isolation, "
        "left behind, cast aside, unloved, nobody cares, pushed away"
    ),
    "Hope & Aspiration": (
        "optimism, dreams, future plans, aspiration, positive outlook, "
        "things will get better, believing in oneself, seeing light ahead"
    ),

    "Trauma & Victimization": (
        "being hurt, abused, harmed, violated, traumatized, experiencing something terrible, "
        "painful past, wound that won't heal, victim of circumstance or violence"
    ),
    "Sexuality & Intimacy": (
        "sexual desire, romantic longing, physical attraction, erotic tension, "
        "intimacy between partners, forbidden desire, love and lust, sensual connection"
    ),
    "Spiritual & Existential": (
        "meaning of life, faith, searching for purpose, God, transcendence, afterlife, "
        "questioning existence, prayer, spiritual emptiness, cosmic meaning"
    ),
    "Self-Esteem & Worth": (
        "feeling worthless, low self-esteem, believing in oneself, confidence, "
        "not good enough, comparing oneself to others, inner value, self-respect"
    ),
    "Helplessness & Passivity": (
        "unable to act, paralyzed by circumstances, someone else decides everything, "
        "no way out, passive suffering, resigned to fate, giving up control"
    ),
    "Shame & Humiliation": (
        "public embarrassment, being exposed, humiliated in front of others, "
        "feeling small and degraded, wanting to disappear, deep personal shame"
    ),
    "Rage & Destructive Impulse": (
        "uncontrollable anger, wanting to destroy, explosive fury, "
        "destructive fantasies, violent impulse, losing control of one's temper"
    ),
    "Separation & Individuation": (
        "leaving home, separating from parents, becoming one's own person, "
        "differentiation from family, growing up apart, cutting ties to become independent"
    ),
}

THEME_TYPE_PROTOTYPES = {
    "relational": [
        "The story centers on the relationship between two people.",
        "She longed to be close to the person she loved.",
        "The connection between them was the heart of everything.",
        "He needed the other person in order to feel complete.",
        "Their bond defined who they were to each other.",
        "She felt isolated and longed for human connection.",
    ],
    "achievement": [
        "He was determined to succeed no matter what it took.",
        "She worked relentlessly toward her goal.",
        "The desire to be recognized and to excel drove everything.",
        "He pushed himself harder than anyone else.",
        "She was motivated by ambition and the fear of failure.",
        "Success was the only outcome he could accept.",
    ],
    "conflict": [
        "There was a battle between them for dominance and control.",
        "The tension between the two characters was irreconcilable.",
        "He struck out in anger, unable to contain his rage.",
        "The struggle for power consumed them both.",
        "Violence and aggression erupted in the narrative.",
        "She resisted with everything she had.",
    ],
    "autonomy": [
        "He wanted to break free from everyone who controlled him.",
        "She refused to be told what to do.",
        "The desire for independence was overwhelming.",
        "He made his own choices regardless of others' expectations.",
        "She pushed back against every constraint placed on her.",
        "Freedom was more important than belonging.",
    ],
    "attachment_loss": [
        "She couldn't stop mourning the person she had lost.",
        "The absence of that person left everything hollow.",
        "He was terrified of being left alone again.",
        "Grief consumed him long after the separation.",
        "She clung to the relationship out of fear of abandonment.",
        "The bond was severed and neither could fully recover.",
    ],
    "power_struggle": [
        "One person dominated while the other submitted against their will.",
        "He exerted control over her every decision.",
        "She was caught between obedience and self-determination.",
        "Authority was imposed through pressure and punishment.",
        "The power imbalance was the central force in the narrative.",
        "He demanded compliance and she had no choice.",
    ],
    "performance_anxiety": [
        "She was paralyzed by the fear of failing.",
        "He wanted to succeed but dread held him back.",
        "The pressure to perform perfectly was crushing.",
        "She dreaded being judged and found inadequate.",
        "Fear of failure overshadowed every ambition.",
        "The thought of falling short terrified him.",
    ],
    "dependency": [
        "She could not function without the other person's support.",
        "He relied on someone else for everything.",
        "The need to be taken care of was overwhelming.",
        "She clung to the caregiver out of fear of being alone.",
        "Dependence on another person defined his existence.",
        "She was unable to make a decision without seeking help.",
    ],
    "identity_conflict": [
        "He did not know who he truly was.",
        "She felt torn between different versions of herself.",
        "His sense of self was fragile and constantly changing.",
        "She struggled to reconcile her needs with others' expectations.",
        "The question of identity was unresolved throughout the narrative.",
        "He wanted to belong but also to be his own person.",
    ],
    "trauma": [
        "Something terrible had happened that could not be undone.",
        "She carried the weight of a past wound.",
        "He was haunted by what had occurred.",
        "The memory of the traumatic event shaped every feeling.",
        "She flinched from anything that reminded her of the harm.",
        "Survival came at the cost of enormous psychological pain.",
    ],
    "existential": [
        "He questioned the meaning of his existence.",
        "She searched for purpose in a world that felt empty.",
        "The narrative was about confronting mortality and meaning.",
        "He wondered whether anything he did truly mattered.",
        "She faced the void and found no answers.",
        "Spiritual emptiness and the search for transcendence.",
    ],
    "sexuality": [
        "There was a powerful erotic tension between them.",
        "She felt desire that was impossible to suppress.",
        "The physical attraction was undeniable.",
        "He longed for an intimate connection that went beyond words.",
        "Sexual feelings intertwined with shame and longing.",
        "The intimacy between them was charged with desire.",
    ],
    "shame_guilt": [
        "He could not forgive himself for what he had done.",
        "She felt deep shame that prevented her from moving forward.",
        "The guilt consumed him from within.",
        "She hid the truth because exposure would be unbearable.",
        "He believed he was fundamentally flawed and unworthy.",
        "Shame kept her silent even when she needed help.",
    ],
    "helplessness": [
        "She had no power to change anything.",
        "He was at the mercy of forces beyond his control.",
        "There was nothing anyone could do.",
        "She surrendered all agency and waited for something to happen.",
        "He felt utterly trapped with no way out.",
        "The sense of paralysis was complete.",
    ],
    "narrative": [
        "The story described a sequence of events without strong emotional coloring.",
        "The person went from one place to another and did various things.",
        "Events unfolded in an ordinary way without deep psychological weight.",
        "The narrative was descriptive and factual.",
    ],
}

_THEME_TYPE_PROTO_EMBS_CACHE: dict = {}

NEED_PROTOTYPES = {
    "nAchievement": [
        "The person strives to accomplish something difficult.",
        "They want to overcome obstacles and succeed.",
        "Aiming to excel and reach a high standard.",
        "Desire to master a skill or task."
    ],
    "nAffiliation": [
        "The individual seeks to be with others, to form friendships.",
        "They want to belong to a group or community.",
        "Desire to share and cooperate with companions.",
        "Need to feel accepted and liked."
    ],
    "nAutonomy": [
        "The person wants to be independent, free from constraints.",
        "They resist influence or coercion from others.",
        "Desire to act according to own wishes.",
        "Need to be self-sufficient and not rely on others."
    ],
    "nDominance": [
        "The individual wants to control their environment or other people.",
        "They seek to influence or direct others.",
        "Desire to be a leader or have authority.",
        "Need to be in charge and make decisions."
    ],
    "nNurturance": [
        "The person wants to help, protect, or care for others.",
        "They provide support and comfort.",
        "Desire to be compassionate and nurturing.",
        "Need to take care of someone vulnerable."
    ],
    "nSuccorance": [
        "The individual seeks help, protection, or sympathy from others.",
        "They want to be taken care of.",
        "Desire for support when in trouble.",
        "Need to depend on someone."
    ],
    "nRecognition": [
        "The person wants to be admired, respected, or praised.",
        "They seek social approval and fame.",
        "Desire for honor and recognition.",
        "Need to be noticed and valued."
    ],
    "nUnderstanding": [
        "The individual wants to understand, to know, to figure things out.",
        "They seek knowledge and insight.",
        "Desire to comprehend complex ideas.",
        "Need to make sense of the world."
    ],
    "nHarmAvoidance": [
        "The person wants to avoid pain, physical danger, or illness.",
        "They are cautious and fearful of harm.",
        "Desire to stay safe and secure.",
        "Need to prevent injury or threat."
    ],
    "nAbasement": [
        "The individual wants to submit, to accept blame, to apologize.",
        "They feel guilty or inferior.",
        "Desire to atone for mistakes.",
        "Need to be humble and compliant."
    ],
    "nPlay": [
        "The person wants to have fun, to laugh, to relax.",
        "They engage in playful activities.",
        "Desire for enjoyment and amusement.",
        "Need for recreation and leisure."
    ],
    "nAcquisition": [
        "The individual wants to gain possessions, property, or resources.",
        "They are acquisitive and want to own things.",
        "Desire to collect or accumulate.",
        "Need for material wealth."
    ],
    "nSex": [
        "The person wants to form an erotic relationship.",
        "They have sexual desires or romantic feelings.",
        "Desire for intimacy and physical pleasure.",
        "Need for sexual expression."
    ],
    "nAggression": [
        "The individual wants to attack, hurt, or kill others.",
        "They express anger or hostility.",
        "Desire to overcome opposition forcefully.",
        "Need to fight or destroy."
    ],

    "nBlameAvoidance": [
        "The person wants to avoid blame, criticism, or punishment.",
        "They are sensitive to disapproval.",
        "Desire to be blameless and beyond reproach.",
        "Need to escape guilt or shame."
    ],
    "nCounteraction": [
        "The person wants to compensate for failure by trying again.",
        "They strive to overcome a weakness.",
        "Desire to make up for a loss or defeat.",
        "Need to reassert oneself after a setback."
    ],
    "nDefendance": [
        "The person wants to defend oneself against blame or criticism.",
        "They justify actions and resist attack.",
        "Desire to protect one's reputation.",
        "Need to offer explanations and excuses."
    ],
    "nExhibition": [
        "The person wants to impress others, to be seen and heard.",
        "They enjoy being the center of attention.",
        "Desire to show off and attract notice.",
        "Need for dramatic self-expression."
    ],
    "nOrder": [
        "The person wants to organize, arrange, and be tidy.",
        "They seek precision and orderliness.",
        "Desire to have things clean and structured.",
        "Need for routine and predictability."
    ],
    "nRejection": [
        "The person wants to exclude, ignore, or reject another.",
        "They separate themselves from others.",
        "Desire to snub or show disdain.",
        "Need to keep distance from disliked persons."
    ]
}

OPPOSING_NEED_PAIRS = [
    ("nAutonomy", "nDominance"),
    ("nNurturance", "nAggression"),
    ("nAffiliation", "nRejection"),
    ("nSuccorance", "nAutonomy"),
    ("nAchievement", "nPlay"),
    ("nHarmAvoidance", "nAggression"),
    ("nAbasement", "nDominance"),
    ("nOrder", "nPlay"),
    ("nUnderstanding", "nExhibition")
]

class ThemeDetectionEngine:
    """
    Detects recurring themes across multiple TAT stories.
    Now returns structured themes with intensity, affect, related needs, etc.
    """

    def __init__(self, nlp_processor):
        self.processor = nlp_processor
        self.sentence_model = nlp_processor.bert_embedder
        self.topic_model = None

        self.need_proto_embs = {}
        self._compute_need_prototype_embeddings()

        self._clinical_proto_embs = {}
        self._compute_clinical_label_embeddings()

        self.sentiment_analyzer = getattr(nlp_processor, 'sentiment_analyzer', None)

        self.config = getattr(nlp_processor, 'config', None)

    def _compute_need_prototype_embeddings(self):
        """Compute and store embeddings for all need prototypes."""
        for need, sentences in NEED_PROTOTYPES.items():
            self.need_proto_embs[need] = self.processor.get_embeddings(sentences)

    def _compute_clinical_label_embeddings(self):
        """Pre-compute SBERT embeddings for clinical label prototypes.
        Used by _generate_clinical_label for SBERT-based label matching."""
        for label, description in CLINICAL_LABEL_PROTOTYPES.items():
            emb = self.processor.get_embeddings([description])
            self._clinical_proto_embs[label] = emb[0]

    def extract_themes(self, stories: List[str]) -> Dict[str, Any]:
        """
        Input: list of story texts (one per card)
        Returns: dictionary with structured themes and sentence mapping.
        """

        sentences = []
        for story in stories:
            sents = re.split(r'[.!?]', story)
            sentences.extend([s.strip() for s in sents if len(s.strip()) > 10])

        min_size = getattr(self.config, 'THEME_MIN_SIZE', 3) if self.config else 3
        if len(sentences) < min_size:

            return self._fallback_themes(stories, sentences)

        embeddings = self.sentence_model.encode(sentences, show_progress_bar=False)

        from sklearn.feature_extraction.text import CountVectorizer
        vectorizer_model = CountVectorizer(stop_words=list(STOPWORDS))
        self.topic_model = BERTopic(embedding_model=self.sentence_model, vectorizer_model=vectorizer_model, verbose=False)
        try:
            topics, probs = self.topic_model.fit_transform(sentences, embeddings)
        except (TypeError, ValueError, Exception) as e:

            return self._fallback_themes(stories, sentences)

        try:
            topic_info = self.topic_model.get_topic_info()
        except (ValueError, Exception) as e:
            logger.warning(f"BERTopic get_topic_info failed (not fitted edge case): {e}")
            return self._fallback_themes(stories, sentences)

        topic_sentences = defaultdict(list)
        topic_embeddings = defaultdict(list)
        topic_indices = defaultdict(list)
        for idx, (sent, topic, emb) in enumerate(zip(sentences, topics, embeddings)):
            if topic != -1:
                topic_sentences[topic].append(sent)
                topic_embeddings[topic].append(emb)
                topic_indices[topic].append(idx)

        themes = []
        for topic_id, sent_list in topic_sentences.items():
            if topic_id == -1:
                continue
            topic_words = self.topic_model.get_topic(topic_id)

            raw_words = [w for w, _ in topic_words]
            filtered_words = []

            for w in raw_words:
                doc = self.processor.nlp(w)
                if len(doc) > 0:
                    token = doc[0]
                    lemma = token.lemma_.lower()
                    if lemma in STOPWORDS or token.is_punct or token.is_space:
                        continue
                    if token.pos_ in ('NOUN', 'VERB', 'ADJ') or lemma in PSYCHOLOGICAL_CONSTRUCTS:
                        filtered_words.append(lemma)

            filtered_words = list(dict.fromkeys(filtered_words))[:5]

            if not filtered_words:
                 filtered_words = ["latent_theme"]

            words = filtered_words
            count = len(sent_list)
            percentage = count / len(sentences) * 100

            theme_embeddings = np.array(topic_embeddings[topic_id])
            centroid = np.mean(theme_embeddings, axis=0)

            similarities = self._cosine_similarity(theme_embeddings, centroid)
            clarity = float(np.mean(similarities))

            _sd_preview = self._compute_symbolic_density(sent_list)
            intensity = round(
                0.6 * (count / max(1, len(sentences)))
                + 0.4 * _sd_preview,
                3
            )

            affect_tone = self._compute_affect_tone(sent_list)

            emotional_consistency = self._compute_emotional_consistency(sent_list)

            positions = np.array(topic_indices[topic_id]) / len(sentences)
            narrative_centrality = float(np.mean(positions))

            frequency_signal = count

            expression_mode = self._compute_expression_mode(sent_list)

            symbolic_density = self._compute_symbolic_density(sent_list)

            related_needs = self._map_to_needs(centroid)

            conflicting_needs = self._find_conflicting_needs(related_needs)

            theme_type = self._infer_theme_type_sbert(sent_list, centroid)

            label = self._generate_clinical_label(words, sent_list, related_needs)

            theme = {
                "id": topic_id,
                "_topic_id": topic_id,
                "words": words,
                "count": count,
                "percentage": round(percentage, 1),
                "label": label,
                "theme": label,
                "type": theme_type,
                "intensity": intensity,
                "clarity": round(clarity, 3),
                "affect_tone": affect_tone,
                "frequency_signal": frequency_signal,
                "expression_mode": expression_mode,
                "related_needs": related_needs,
                "conflicting_needs": conflicting_needs,
                "symbolic_density": round(symbolic_density, 3),
                "emotional_consistency": round(emotional_consistency, 3),
                "narrative_centrality": round(narrative_centrality, 3),

                "coherence": 0.0,
                "coherence_flag": "pending",
            }
            themes.append(theme)

        if not themes:
            return self._fallback_themes(stories, sentences)

        themes.sort(key=lambda x: -x["count"])

        centroid_embeddings = {}
        for topic_id_dup, emb_list in topic_embeddings.items():
            if emb_list:
                centroid_embeddings[topic_id_dup] = np.mean(np.array(emb_list), axis=0)

        themes = self._deduplicate_themes(themes, centroid_embeddings)

        themes = self._validate_theme_coherence(themes, topic_sentences, sentences)

        return {
            "themes": themes,
            "sentence_topic_map": list(zip(sentences, topics))
        }

    def _generate_clinical_label(self, words: List[str], sentences: List[str], related_needs: List[str]) -> str:
        """Generate a descriptive clinical theme label using SBERT similarity
        to match theme content against known clinical construct prototypes.
        v3.0: Library-driven — uses SBERT instead of raw keyword concatenation."""

        best_clinical_label = None
        best_sim = 0.0
        if sentences and hasattr(self, '_clinical_proto_embs'):

            sent_embs = self.processor.get_embeddings(sentences[:5])
            centroid = np.mean(sent_embs, axis=0)
            for label, proto_emb in self._clinical_proto_embs.items():
                cos_sim = float(np.dot(centroid, proto_emb) / (
                    np.linalg.norm(centroid) * np.linalg.norm(proto_emb) + 1e-8
                ))
                if cos_sim > best_sim:
                    best_sim = cos_sim
                    best_clinical_label = label

        if best_clinical_label and best_sim > 0.35:
            return best_clinical_label

        noun_phrases = []
        for sent in sentences[:3]:
            doc = self.processor.nlp(sent)
            for chunk in doc.noun_chunks:
                np_text = chunk.root.lemma_.lower()
                if np_text not in STOPWORDS and len(np_text) > 2:

                    if _is_psychological_construct_wn(np_text):
                        noun_phrases.insert(0, np_text)
                    else:
                        noun_phrases.append(np_text)

        all_terms = list(dict.fromkeys(words[:3] + noun_phrases[:3]))

        need_suffix = ""
        if related_needs:
            top_need = related_needs[0].replace("n", "", 1) if related_needs[0].startswith("n") else related_needs[0]
            need_suffix = f" ({top_need})"

        label = " / ".join(all_terms[:3]) + need_suffix
        return label if label.strip() else " ".join(words[:3])

    def _fallback_themes(self, stories: List[str], sentences: List[str] = None) -> Dict[str, Any]:
        """Fallback theme extraction using embedding-based sentence clustering.
        Produces clinical-grade themes even for short narratives (< 5 sentences)."""
        text = " ".join(stories)

        if not sentences:
            sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.strip()) > 10]
        if not sentences:
            return {"themes": [], "sentence_topic_map": []}

        embeddings = self.sentence_model.encode(sentences, show_progress_bar=False)

        n_clusters = max(2, min(len(sentences) // 2, 4))
        try:
            from sklearn.cluster import AgglomerativeClustering
            clustering = AgglomerativeClustering(
                n_clusters=n_clusters,
                metric='cosine',
                linkage='average'
            )
            labels = clustering.fit_predict(embeddings)
        except Exception:

            labels = [0] * len(sentences)

        cluster_sentences = defaultdict(list)
        cluster_embeddings = defaultdict(list)
        cluster_indices = defaultdict(list)
        for idx, (sent, label, emb) in enumerate(zip(sentences, labels, embeddings)):
            cluster_sentences[label].append(sent)
            cluster_embeddings[label].append(emb)
            cluster_indices[label].append(idx)

        themes = []
        for cluster_id, sent_list in cluster_sentences.items():
            embs = np.array(cluster_embeddings[cluster_id])
            centroid = np.mean(embs, axis=0)

            key_phrases = self._extract_key_phrases(sent_list)

            related_needs = self._map_to_needs(centroid)
            conflicting_needs = self._find_conflicting_needs(related_needs)

            expression_mode = self._compute_expression_mode(sent_list)
            symbolic_density = self._compute_symbolic_density(sent_list)
            affect_tone = self._compute_affect_tone(sent_list)
            emotional_consistency = self._compute_emotional_consistency(sent_list)

            similarities = self._cosine_similarity(embs, centroid)
            clarity = float(np.mean(similarities))

            positions = np.array(cluster_indices[cluster_id]) / max(1, len(sentences))
            narrative_centrality = float(np.mean(positions))

            count = len(sent_list)
            percentage = count / len(sentences) * 100
            intensity = percentage / 100.0

            theme_type = self._infer_theme_type(related_needs, key_phrases)

            label = self._generate_clinical_label(key_phrases, sent_list, related_needs)

            try:
                label_emb = self.sentence_model.encode([label], show_progress_bar=False)[0]
                coherence = float(np.mean(self._cosine_similarity(embs, label_emb)))
            except Exception:
                coherence = 0.5

            coherence_flag = "high" if coherence > 0.5 else ("moderate" if coherence > 0.3 else "low_coherence")

            themes.append({
                "id": cluster_id,
                "_topic_id": cluster_id,
                "words": key_phrases[:5],
                "count": count,
                "percentage": round(percentage, 1),
                "label": label,
                "theme": label,
                "type": theme_type,
                "intensity": round(intensity, 3),
                "clarity": round(clarity, 3),
                "affect_tone": affect_tone,
                "frequency_signal": count,
                "expression_mode": expression_mode,
                "related_needs": related_needs,
                "conflicting_needs": conflicting_needs,
                "symbolic_density": round(symbolic_density, 3),
                "emotional_consistency": round(emotional_consistency, 3),
                "narrative_centrality": round(narrative_centrality, 3),
                "coherence": round(coherence, 3),
                "coherence_flag": coherence_flag,
            })

        themes.sort(key=lambda x: -x["count"])
        return {"themes": themes[:5], "sentence_topic_map": list(zip(sentences, labels.tolist() if hasattr(labels, 'tolist') else list(labels)))}

    def _extract_key_phrases(self, sentences: List[str]) -> List[str]:
        """Extract key noun phrases from a list of sentences using spaCy + WordNet.
        v3.0: Uses WordNet to detect psychological constructs dynamically instead
        of checking against a static set."""
        phrase_counts = defaultdict(int)
        for sent in sentences:
            doc = self.processor.nlp(sent)
            for chunk in doc.noun_chunks:

                head_lemma = chunk.root.lemma_.lower()
                if head_lemma in STOPWORDS or len(head_lemma) < 3:
                    continue

                full_phrase = " ".join([t.lemma_.lower() for t in chunk if t.lemma_.lower() not in STOPWORDS and not t.is_punct])
                if full_phrase:
                    phrase_counts[full_phrase] += 1

            for token in doc:
                lemma = token.lemma_.lower()
                if _is_psychological_construct_wn(lemma):
                    phrase_counts[lemma] += 5

        sorted_phrases = sorted(phrase_counts.items(), key=lambda x: -x[1])
        return [p for p, _ in sorted_phrases[:8]]

    def _cosine_similarity(self, embeddings: np.ndarray, centroid: np.ndarray) -> np.ndarray:
        """Compute cosine similarity between each embedding and centroid."""
        dot = np.dot(embeddings, centroid)
        norm_emb = np.linalg.norm(embeddings, axis=1)
        norm_cent = np.linalg.norm(centroid)
        return dot / (norm_emb * norm_cent + 1e-8)

    def _compute_affect_tone(self, sentences: List[str]) -> str:
        """Determine dominant affect tone for a set of sentences.
        v4.0: 5-way transformer-computed classification.
        Uses the sentiment_analyzer's confidence scores exclusively —
        no keyword matching. Positive sub-types (hopeful/anxious) are
        distinguished via sentence embedding similarity to SBERT anchors.
        Labels: positive | hopeful | anxious | negative | neutral
        """
        if not self.sentiment_analyzer or not sentences:
            return "neutral"

        pos_scores, neg_scores, neu_scores = [], [], []
        for sent in sentences:
            try:
                result = self.sentiment_analyzer(sent[:512])[0]
                lbl = result['label'].lower()
                sc = result['score']
                if lbl == 'positive':
                    pos_scores.append(sc)
                elif lbl == 'negative':
                    neg_scores.append(sc)
                else:
                    neu_scores.append(sc)
            except Exception:
                continue

        n = len(sentences)
        if n == 0:
            return "neutral"

        avg_pos = sum(pos_scores) / n
        avg_neg = sum(neg_scores) / n

        if avg_pos <= avg_neg and avg_neg <= 0.25:
            return "neutral"
        if avg_neg > avg_pos and avg_neg > 0.25:

            try:
                anxious_anchor = "She was full of dread and anxious anticipation of something terrible."
                despair_anchor = "He felt empty, devastated, and consumed by hopeless grief."
                if not hasattr(self, '_affect_anchor_cache'):
                    self._affect_anchor_cache = {
                        'anxious': self.sentence_model.encode([anxious_anchor], show_progress_bar=False)[0],
                        'despair': self.sentence_model.encode([despair_anchor], show_progress_bar=False)[0],
                    }
                sent_embs = self.sentence_model.encode(sentences[:5], show_progress_bar=False)
                centroid = np.mean(sent_embs, axis=0)
                anx_sim = float(np.dot(centroid, self._affect_anchor_cache['anxious']) / (
                    np.linalg.norm(centroid) * np.linalg.norm(self._affect_anchor_cache['anxious']) + 1e-8
                ))
                des_sim = float(np.dot(centroid, self._affect_anchor_cache['despair']) / (
                    np.linalg.norm(centroid) * np.linalg.norm(self._affect_anchor_cache['despair']) + 1e-8
                ))
                return "anxious" if anx_sim > des_sim else "negative"
            except Exception:
                return "negative"
        if avg_pos > avg_neg and avg_pos > 0.25:

            try:
                hopeful_anchor = "Despite everything, she believed that things would get better."
                positive_anchor = "He felt genuinely happy and content with his life."
                if not hasattr(self, '_affect_anchor_cache'):
                    self._affect_anchor_cache = {}
                if 'hopeful' not in self._affect_anchor_cache:
                    self._affect_anchor_cache['hopeful'] = self.sentence_model.encode(
                        [hopeful_anchor], show_progress_bar=False)[0]
                    self._affect_anchor_cache['positive'] = self.sentence_model.encode(
                        [positive_anchor], show_progress_bar=False)[0]
                sent_embs = self.sentence_model.encode(sentences[:5], show_progress_bar=False)
                centroid = np.mean(sent_embs, axis=0)
                hop_sim = float(np.dot(centroid, self._affect_anchor_cache['hopeful']) / (
                    np.linalg.norm(centroid) * np.linalg.norm(self._affect_anchor_cache['hopeful']) + 1e-8
                ))
                pos_anchor_sim = float(np.dot(centroid, self._affect_anchor_cache['positive']) / (
                    np.linalg.norm(centroid) * np.linalg.norm(self._affect_anchor_cache['positive']) + 1e-8
                ))
                return "hopeful" if hop_sim > pos_anchor_sim else "positive"
            except Exception:
                return "positive"
        return "neutral"

    def _compute_emotional_consistency(self, sentences: List[str]) -> float:
        """Compute consistency (1 - std of sentiment scores)."""
        if not self.sentiment_analyzer:
            return 0.5
        scores = []
        for sent in sentences:
            try:
                result = self.sentiment_analyzer(sent[:512])[0]

                if result['label'].lower() == 'positive':
                    val = 1.0
                elif result['label'].lower() == 'negative':
                    val = -1.0
                else:
                    val = 0.0
                scores.append(val * result['score'])
            except:
                continue
        if len(scores) < 2:
            return 0.5
        std = np.std(scores)
        consistency = 1.0 / (1.0 + std)
        return float(consistency)

    def _compute_expression_mode(self, sentences: List[str]) -> str:
        """Classify expression mode as 'direct', 'metaphorical', or 'symbolic'
        using sentence embedding similarity to prototype sentences."""
        if not sentences:
            return "direct"

        try:

            sent_embs = self.sentence_model.encode(sentences, show_progress_bar=False)
            centroid = np.mean(sent_embs, axis=0)

            if not hasattr(self, '_expr_proto_cache'):
                self._expr_proto_cache = {
                    'literal': self.sentence_model.encode(LITERAL_PROTOTYPES, show_progress_bar=False),
                    'figurative': self.sentence_model.encode(FIGURATIVE_PROTOTYPES, show_progress_bar=False),
                    'symbolic': self.sentence_model.encode(SYMBOLIC_PROTOTYPES, show_progress_bar=False),
                }

            scores = {}
            for mode_name, proto_embs in self._expr_proto_cache.items():
                proto_centroid = np.mean(proto_embs, axis=0)
                cos_sim = np.dot(centroid, proto_centroid) / (
                    np.linalg.norm(centroid) * np.linalg.norm(proto_centroid) + 1e-8
                )
                scores[mode_name] = float(cos_sim)

            text_lower = ' '.join(sentences).lower()
            marker_count = sum(1 for m in FIGURATIVE_MARKERS if m in text_lower)
            if marker_count >= 3:
                scores['figurative'] += 0.05
                scores['symbolic'] += 0.03
            elif marker_count >= 1:
                scores['figurative'] += 0.02

            best_mode = max(scores, key=scores.get)

            mode_map = {
                'literal': 'direct',
                'figurative': 'metaphorical',
                'symbolic': 'symbolic',
            }
            return mode_map.get(best_mode, 'direct')

        except Exception:
            return "direct"

    def _compute_symbolic_density(self, sentences: List[str]) -> float:
        """Compute symbolic density using POS ratios and figurative language markers.

        Formula:
            density = (0.5 * abstract_content_ratio) + (0.3 * figurative_marker_ratio) + (0.2 * adj_adv_ratio)

        Returns float in [0.0, 1.0].
        """
        if not sentences:
            return 0.0

        text = ' '.join(sentences)
        total_words = len(text.split())
        if total_words == 0:
            return 0.0

        try:
            doc = self.processor.nlp(text)

            adj_count = 0
            adv_count = 0
            abstract_noun_count = 0
            content_word_count = 0

            abstract_indicators = {
                'love', 'fear', 'hope', 'dream', 'desire', 'grief', 'pain',
                'loss', 'silence', 'freedom', 'justice', 'truth', 'fate',
                'destiny', 'soul', 'spirit', 'heart', 'mind', 'guilt',
                'shame', 'pride', 'anger', 'joy', 'sorrow', 'peace',
                'chaos', 'power', 'control', 'identity', 'self',
                'weight', 'burden', 'darkness', 'light', 'shadow',
                'struggle', 'conflict', 'passion', 'loneliness', 'despair',
            }

            for token in doc:
                if token.is_punct or token.is_space or token.is_stop:
                    continue
                content_word_count += 1

                if token.pos_ == 'ADJ':
                    adj_count += 1
                elif token.pos_ == 'ADV':
                    adv_count += 1
                elif token.pos_ == 'NOUN' and token.lemma_.lower() in abstract_indicators:
                    abstract_noun_count += 1

            if content_word_count == 0:
                return 0.0

            abstract_content_ratio = min(1.0, (abstract_noun_count * 2) / content_word_count)

            text_lower = text.lower()
            marker_hits = sum(1 for m in FIGURATIVE_MARKERS if m in text_lower)
            figurative_marker_ratio = min(1.0, marker_hits / max(1, total_words * 0.05))

            adj_adv_ratio = min(1.0, (adj_count + adv_count) / content_word_count)

            density = (
                0.5 * abstract_content_ratio
                + 0.3 * figurative_marker_ratio
                + 0.2 * adj_adv_ratio
            )

            return round(min(1.0, max(0.0, density)), 3)

        except Exception:
            return 0.1

    def _deduplicate_themes(self, themes: List[Dict], topic_embeddings: Dict) -> List[Dict]:
        """Merge themes whose centroid embeddings have cosine similarity > 0.85."""
        if len(themes) < 2:
            return themes

        centroids = []
        for t in themes:
            topic_id = t.get("_topic_id", None)
            if topic_id is not None and topic_id in topic_embeddings:
                centroids.append(topic_embeddings[topic_id])
            else:

                words_text = ' '.join(t.get("words", []))
                if words_text.strip():
                    emb = self.sentence_model.encode([words_text], show_progress_bar=False)[0]
                    centroids.append(emb)
                else:
                    centroids.append(np.zeros(self.sentence_model.get_sentence_embedding_dimension()))

        merged = [False] * len(themes)
        result = []
        for i in range(len(themes)):
            if merged[i]:
                continue
            current = dict(themes[i])
            for j in range(i + 1, len(themes)):
                if merged[j]:
                    continue

                cos_sim = np.dot(centroids[i], centroids[j]) / (
                    np.linalg.norm(centroids[i]) * np.linalg.norm(centroids[j]) + 1e-8
                )
                if cos_sim > 0.85:

                    merged[j] = True
                    other = themes[j]
                    combined_words = list(dict.fromkeys(current.get("words", []) + other.get("words", [])))
                    current["words"] = combined_words[:10]
                    current["count"] = current.get("count", 0) + other.get("count", 0)
                    current["intensity"] = (current.get("intensity", 0) + other.get("intensity", 0)) / 2

                    if len(other.get("theme", "")) > len(current.get("theme", "")):
                        current["theme"] = other["theme"]

                    merged_needs = list(dict.fromkeys(
                        current.get("related_needs", []) + other.get("related_needs", [])
                    ))
                    current["related_needs"] = merged_needs[:5]
            result.append(current)

        return result

    def _validate_theme_coherence(
        self, themes: List[Dict], topic_sentences: Dict, all_sentences: List[str]
    ) -> List[Dict]:
        """Validate each theme by checking embedding similarity between the
        theme label and its assigned sentences. Flag themes with cosine < 0.3."""
        if not themes:
            return themes

        for theme in themes:
            topic_id = theme.get("_topic_id", None)
            label = theme.get("theme", theme.get("label", ""))
            sents = topic_sentences.get(topic_id, []) if topic_id is not None else []

            if not label or not sents:
                theme["coherence"] = 0.0
                theme["coherence_flag"] = "no_data"
                continue

            try:
                label_emb = self.sentence_model.encode([label], show_progress_bar=False)[0]
                sent_embs = self.sentence_model.encode(sents[:20], show_progress_bar=False)

                cos_sims = np.dot(sent_embs, label_emb) / (
                    np.linalg.norm(sent_embs, axis=1) * np.linalg.norm(label_emb) + 1e-8
                )
                mean_coherence = float(np.mean(cos_sims))
                theme["coherence"] = round(mean_coherence, 3)

                if mean_coherence < 0.3:
                    theme["coherence_flag"] = "low_coherence"
                elif mean_coherence < 0.5:
                    theme["coherence_flag"] = "moderate"
                else:
                    theme["coherence_flag"] = "high"

            except Exception:
                theme["coherence"] = 0.0
                theme["coherence_flag"] = "error"

        return themes

    def _map_to_needs(self, theme_centroid: np.ndarray) -> List[str]:
        """Return list of needs most similar to this theme centroid."""
        if not hasattr(self, 'need_proto_embs') or not self.need_proto_embs:
            return []
        scores = {}
        for need, proto_embs in self.need_proto_embs.items():

            sims = np.dot(proto_embs, theme_centroid) / (
                np.linalg.norm(proto_embs, axis=1) * np.linalg.norm(theme_centroid) + 1e-8
            )
            max_sim = np.max(sims)
            scores[need] = max_sim

        threshold = getattr(self.config, 'NEED_SIM_THRESHOLD', 0.5) if self.config else 0.5
        sorted_needs = sorted(scores.items(), key=lambda x: -x[1])
        related = [need for need, score in sorted_needs if score > threshold][:5]
        return related

    def _find_conflicting_needs(self, related_needs: List[str]) -> List[Dict[str, str]]:
        """Among related needs, find pairs that are in opposition."""
        conflicts = []
        for i, need_a in enumerate(related_needs):
            for need_b in related_needs[i+1:]:
                if (need_a, need_b) in OPPOSING_NEED_PAIRS or (need_b, need_a) in OPPOSING_NEED_PAIRS:
                    conflicts.append({"need_a": need_a, "need_b": need_b})
        return conflicts

    def _infer_theme_type(self, related_needs: List[str], words: List[str]) -> str:
        """Legacy entry point kept for backward compatibility.
        Now delegates to _infer_theme_type_sbert for transformer-based inference.
        Falls back to need-set heuristic only when SBERT is unavailable."""

        if not related_needs:
            return "narrative"
        need_set = set(related_needs)
        if need_set & {"nAffiliation", "nNurturance", "nSuccorance"} and need_set & {"nRejection"}:
            return "attachment_loss"
        if need_set & {"nDominance"} and need_set & {"nAbasement", "nAutonomy"}:
            return "power_struggle"
        if need_set & {"nAchievement"} and need_set & {"nHarmAvoidance"}:
            return "performance_anxiety"
        if need_set & {"nNurturance"} and need_set & {"nSuccorance"}:
            return "dependency"
        if need_set & {"nAutonomy"} and need_set & {"nAffiliation"}:
            return "identity_conflict"
        if need_set & {"nAbasement", "nBlameAvoidance"} and need_set & {"nHarmAvoidance"}:
            return "shame_guilt"
        if need_set & {"nSuccorance"} and not need_set & {"nAutonomy"}:
            return "helplessness"
        if need_set & {"nSex"}:
            return "sexuality"
        if need_set & {"nUnderstanding"} and not need_set & (
            {"nAffiliation", "nNurturance", "nAchievement"}
        ):
            return "existential"
        if need_set & {"nAggression"} and not need_set & {"nAffiliation"}:
            return "trauma"
        need = related_needs[0]
        if need in ("nAffiliation", "nNurturance", "nSuccorance", "nRejection"):
            return "relational"
        elif need in ("nAchievement", "nDominance", "nRecognition"):
            return "achievement"
        elif need in ("nAggression", "nHarmAvoidance"):
            return "conflict"
        elif need in ("nAutonomy", "nAbasement"):
            return "autonomy"
        return "narrative"

    def _infer_theme_type_sbert(self, sentences: List[str], centroid: np.ndarray = None) -> str:
        """SBERT-based theme type inference.
        Encodes THEME_TYPE_PROTOTYPES once (cached in _THEME_TYPE_PROTO_EMBS_CACHE)
        then computes cosine similarity between the theme's sentence centroid and
        each type's prototype centroid. Returns the highest-scoring type.
        NO keyword matching — purely transformer-computed.
        """
        global _THEME_TYPE_PROTO_EMBS_CACHE

        if not sentences:
            return "narrative"

        try:

            if not _THEME_TYPE_PROTO_EMBS_CACHE:
                for ttype, protos in THEME_TYPE_PROTOTYPES.items():
                    embs = self.sentence_model.encode(protos, show_progress_bar=False)
                    _THEME_TYPE_PROTO_EMBS_CACHE[ttype] = np.mean(embs, axis=0)

            if centroid is None:
                sent_embs = self.sentence_model.encode(
                    sentences[:10], show_progress_bar=False
                )
                centroid = np.mean(sent_embs, axis=0)

            scores = {}
            for ttype, proto_centroid in _THEME_TYPE_PROTO_EMBS_CACHE.items():
                cos_sim = float(
                    np.dot(centroid, proto_centroid)
                    / (np.linalg.norm(centroid) * np.linalg.norm(proto_centroid) + 1e-8)
                )
                scores[ttype] = cos_sim

            best_type = max(scores, key=scores.get)
            return best_type

        except Exception:
            return "narrative"
