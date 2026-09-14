"""
Murray Inference Engine
-----------------------
Infers Murray's needs and presses using sentence embeddings and similarity to prototype descriptions.
Enhanced with full need profile, need-need conflicts, and need categorization.
No keyword lists – purely model-based.
"""

import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from app.assessments.tat.engines.nlp.enhanced_nlp import EnhancedNLPProcessor

NEED_PROTOTYPES = {
    "nAchievement": [
        "The person strives to accomplish something difficult.",
        "They want to overcome obstacles and succeed.",
        "Aiming to excel and reach a high standard.",
        "Desire to master a skill or task.",

        "The person works hard to bring honor to their family through success.",
        "They study diligently to fulfill their parents' expectations.",
    ],
    "nAffiliation": [
        "The individual seeks to be with others, to form friendships.",
        "They want to belong to a group or community.",
        "Desire to share and cooperate with companions.",
        "Need to feel accepted and liked.",

        "The person feels complete being surrounded by their family.",
        "They find meaning through community and shared rituals.",
        "Duty toward the family brings them inner peace.",
    ],
    "nAutonomy": [
        "The person wants to be independent, free from constraints.",
        "They resist influence or coercion from others.",
        "Desire to act according to own wishes.",
        "Need to be self-sufficient and not rely on others.",

        "They want to make their own career choice despite family expectations.",
        "The person seeks to balance personal goals with family obligations.",
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
        "Need to take care of someone vulnerable.",

        "They feel it is their duty to care for aging parents.",
        "The person sacrifices their own needs for the family's wellbeing.",
    ],
    "nSuccorance": [
        "The individual seeks help, protection, or sympathy from others.",
        "They want to be taken care of.",
        "Desire for support when in trouble.",
        "Need to depend on someone.",

        "The person turns to their family elders for guidance and comfort.",
        "They seek the community's support during difficult times.",
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
        "Need to prevent injury or threat.",

        "The person avoids actions that might bring shame upon the family.",
    ],
    "nAbasement": [
        "The individual wants to submit, to accept blame, to apologize.",
        "They feel guilty or inferior.",
        "Desire to atone for mistakes.",
        "Need to be humble and compliant.",

        "The person shows deference to elders as a sign of respect, not weakness.",
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

PRESS_PROTOTYPES = {
    "pDominance": [
        "An external force is trying to control or influence the person.",
        "Someone in authority gives orders or demands.",
        "The environment pressures the individual to conform.",
        "A person or situation dominates and restricts."
    ],
    "pNurturance": [
        "Someone offers help, support, or care.",
        "The environment is protective and comforting.",
        "A person provides nourishment or assistance.",
        "Situations that foster growth and well-being."
    ],
    "pLoss": [
        "The person experiences a loss of something valuable.",
        "Someone or something is taken away.",
        "A separation or death occurs.",
        "The individual is deprived of an important person or object."
    ],
    "pRejection": [
        "The person is rejected, excluded, or abandoned.",
        "Someone refuses to accept them.",
        "The individual faces disapproval or scorn.",
        "Relationships are denied or broken."
    ],
    "pAggression": [
        "The person is attacked, threatened, or harmed.",
        "Someone shows hostility or violence.",
        "The environment is dangerous and menacing.",
        "The individual faces physical or verbal aggression."
    ],
    "pPhysicalDanger": [
        "The environment poses a physical threat.",
        "There is risk of injury, death, or harm.",
        "The person is in a hazardous situation.",
        "Dangerous conditions exist."
    ],
    "pAffliction": [
        "The person suffers from illness, pain, or misfortune.",
        "There is physical or mental suffering.",
        "The individual is afflicted by disease or disability.",
        "Hardship and adversity are present."
    ],
    "pCompetition": [
        "The person faces rivals or competitors.",
        "There is a contest for resources or status.",
        "The environment demands striving against others.",
        "Others are vying for the same goal."
    ],
    "pLuck(Bad)": [
        "The person experiences bad luck or misfortune.",
        "Events are beyond their control and unfavorable.",
        "Fate seems to work against them.",
        "Unexpected negative events occur."
    ],
    "pAffiliation": [
        "The person is in a friendly, cooperative environment.",
        "Others offer companionship and belonging.",
        "Social connections are available.",
        "The atmosphere is warm and inviting."
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
    ("nUnderstanding", "nExhibition"),
    ("nBlameAvoidance", "nExhibition"),
    ("nCounteraction", "nAbasement"),
    ("nDefendance", "nAbasement")
]

OPPOSING_NEED_PRESS_PAIRS = [
    ("nAutonomy", "pDominance"),
    ("nNurturance", "pRejection"),
    ("nAffiliation", "pRejection"),
    ("nSuccorance", "pRejection"),
    ("nAchievement", "pCompetition"),
    ("nDominance", "pDominance"),
    ("nHarmAvoidance", "pAggression"),
    ("nHarmAvoidance", "pPhysicalDanger")
]

class MurrayInferenceEngine:
    """
    Infers needs and presses from narrative events using sentence embeddings
    and similarity to prototype descriptions. Now returns full need profiles
    and need-need conflicts.
    """

    GENDER_BIAS_CORRECTIONS = {
        "male": {"nNurturance": 1.15, "nAffiliation": 1.10, "nAbasement": 1.10, "nSuccorance": 1.08},
        "female": {"nDominance": 1.15, "nAggression": 1.10, "nAchievement": 1.05, "nAutonomy": 1.08},
    }

    def __init__(self, nlp_processor: EnhancedNLPProcessor, rag_engine=None):
        self.processor = nlp_processor
        self.rag_engine = rag_engine

        from app.utils.prototype_store import get_prototypes_by_prefix
        need_embs = get_prototypes_by_prefix("need")
        press_embs = get_prototypes_by_prefix("press")
        if need_embs and press_embs:
            self.need_proto_embs = need_embs
            self.press_proto_embs = press_embs
        else:
            self.need_proto_embs = {}
            self.press_proto_embs = {}
            self._compute_prototype_embeddings()

    def _compute_prototype_embeddings(self):
        """Compute and store embeddings for all prototype sentences."""
        for need, sentences in NEED_PROTOTYPES.items():
            self.need_proto_embs[need] = self.processor.get_embeddings(sentences)
        for press, sentences in PRESS_PROTOTYPES.items():
            self.press_proto_embs[press] = self.processor.get_embeddings(sentences)

    def infer_from_events(self, events: List[Dict], rag_engine=None, patient_gender: str = None) -> Dict[str, Any]:
        """
        events: list of event dicts (from SemanticNarrativeEngine)
        rag_engine: optional override; if not provided uses self.rag_engine
        patient_gender: optional, 'male' or 'female' for gender-bias correction
        Returns dictionary with needs, presses, conflicts, and full profiles.
        """

        texts = [e['text'] for e in events]
        if not texts:
            return {
                "needs": [],
                "presses": [],
                "conflicts": [],
                "needs_full_profile": [],
                "dominant_needs": [],
                "latent_needs": [],
                "suppressed_needs": [],
                "need_conflicts": [],
                "knowledge_base_context": {}
            }

        event_embs = self.processor.get_embeddings(texts)

        need_scores = {}
        for need, proto_embs in self.need_proto_embs.items():
            sim_matrix = np.dot(proto_embs, event_embs.T) / (
                np.linalg.norm(proto_embs, axis=1, keepdims=True) * np.linalg.norm(event_embs, axis=1) + 1e-8
            )
            max_sim_per_event = np.max(sim_matrix, axis=0)
            avg_sim = np.mean(max_sim_per_event)
            need_scores[need] = avg_sim

        press_scores = {}
        for press, proto_embs in self.press_proto_embs.items():
            sim_matrix = np.dot(proto_embs, event_embs.T) / (
                np.linalg.norm(proto_embs, axis=1, keepdims=True) * np.linalg.norm(event_embs, axis=1) + 1e-8
            )
            max_sim_per_event = np.max(sim_matrix, axis=0)
            avg_sim = np.mean(max_sim_per_event)
            press_scores[press] = avg_sim

        need_probs = self._softmax(need_scores, temperature=0.3)
        press_probs = self._softmax(press_scores, temperature=0.3)

        if patient_gender:
            need_probs = self._apply_gender_normalization(need_probs, patient_gender)

        def _identity(label: str) -> str:
            return label

        needs_full_profile = sorted([(_identity(k), v) for k, v in need_probs.items()], key=lambda x: -x[1])

        dominant_needs = [(n, p) for n, p in needs_full_profile if p > 0.1][:3]

        latent_needs = [(n, p) for n, p in needs_full_profile if 0.05 <= p <= 0.1]

        suppressed_needs = [(n, p) for n, p in needs_full_profile if p < 0.05]

        top_needs = needs_full_profile[:5]
        top_presses = sorted([(_identity(k), v) for k, v in press_probs.items()], key=lambda x: -x[1])[:5]

        need_conflicts = self._detect_need_conflicts(need_probs, _identity)

        need_press_conflicts = self._detect_need_press_conflicts(need_probs, press_probs, _identity)

        kb_context = {}
        active_rag = rag_engine or self.rag_engine
        if active_rag and hasattr(active_rag, 'retrieve_for_domain'):
            try:
                top_need_names = [n[0] for n in top_needs[:3]]
                top_press_names = [p[0] for p in top_presses[:2]]
                query = " ".join(top_need_names + top_press_names)
                if query.strip():
                    passages = active_rag.retrieve_for_domain("needs_presses", query, top_k=3)
                    if passages and hasattr(active_rag, 'format_context_concise'):
                        kb_context["needs_presses_evidence"] = active_rag.format_context_concise(passages)
                    elif passages:
                        kb_context["needs_presses_evidence"] = active_rag.format_context(passages, max_chars=800)
            except Exception:
                pass

        return {
            "needs": top_needs,
            "presses": top_presses,
            "conflicts": need_press_conflicts,
            "needs_full_profile": needs_full_profile,
            "dominant_needs": dominant_needs,
            "latent_needs": latent_needs,
            "suppressed_needs": suppressed_needs,
            "need_conflicts": need_conflicts,
            "knowledge_base_context": kb_context
        }
    def _softmax(self, scores: Dict[str, float], temperature: float = 1.0) -> Dict[str, float]:
        """Convert raw scores to probabilities. Temperature < 1.0 makes distribution sharper."""
        values = np.array(list(scores.values())) / temperature
        exp_values = np.exp(values - np.max(values))
        probs = exp_values / exp_values.sum()
        return dict(zip(scores.keys(), probs))

    def _apply_gender_normalization(self, need_probs: Dict[str, float], patient_gender: str) -> Dict[str, float]:
        """
        Counteract known SBERT gender biases by boosting under-detected needs.
        For example, nNurturance is systematically under-scored for male narratives
        because the sentence-transformer was trained on internet text with gender biases.
        """
        gender_key = patient_gender.strip().lower()
        corrections = self.GENDER_BIAS_CORRECTIONS.get(gender_key)
        if not corrections:
            return need_probs

        adjusted = dict(need_probs)
        for need, multiplier in corrections.items():
            if need in adjusted:
                adjusted[need] *= multiplier

        total = sum(adjusted.values())
        if total > 0:
            adjusted = {k: v / total for k, v in adjusted.items()}
        return adjusted

    def _detect_need_conflicts(self, need_probs: Dict[str, float], strip_fn) -> List[Dict[str, Any]]:
        """Detect conflicts between opposing needs."""
        conflicts = []
        for need_a, need_b in OPPOSING_NEED_PAIRS:
            if need_a in need_probs and need_b in need_probs:
                strength = need_probs[need_a] * need_probs[need_b]
                if strength > 0.05:
                    conflicts.append({
                        "need_a": strip_fn(need_a),
                        "need_b": strip_fn(need_b),
                        "conflict_strength": float(strength),
                        "conflict_type": "approach-avoidance",
                        "evidence": "Co-occurrence of opposing needs in narrative"
                    })
        return conflicts

    def _detect_need_press_conflicts(self, need_probs: Dict[str, float], press_probs: Dict[str, float], strip_fn) -> List[tuple]:
        """Detect conflicts between needs and presses (original format)."""
        conflicts = []
        for need, press in OPPOSING_NEED_PRESS_PAIRS:
            if need in need_probs and press in press_probs:
                intensity = need_probs[need] * press_probs[press]
                if intensity > 0.05:
                    conflicts.append((strip_fn(need), strip_fn(press), float(intensity)))
        return conflicts
