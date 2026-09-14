"""
Environment Classifier v2.0
----------------------------
Classifies the psychological environment of the narrative using a fused approach:
  1. Press-based classification from Murray presses (expanded 12-category mapping)
  2. NLP-based classification using sentence embeddings against environment prototypes
  3. Narrative cue extraction (setting, spatial, temporal, mood cues via spaCy)

Returns multi-environment results with confidence scoring and mixed-environment detection.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np

ENV_MAPPING = {
    "Supportive": ["pNurturance", "pAffiliation"],
    "Threatening": ["pAggression", "pPhysicalDanger"],
    "Depriving": ["pLoss", "pLack", "pPoverty", "pAffliction"],
    "Controlling": ["pDominance", "pCoercion"],
    "Rejection": ["pRejection", "pBetrayal"],
    "Competitive": ["pCompetition", "pRivalry"],
    "Chaotic": ["pLuck(Bad)", "pDisorder"],
    "Punitive": ["pPunishment", "pBlame"],

    "Nurturing": ["pNurturance", "pAffiliation", "pProtection"],
    "Achievement-Oriented": ["pCompetition", "pRecognition", "pExpectation"],
    "Isolating": ["pRejection", "pLoss", "pAbandonment"],
    "Ambivalent": [],
}

ENV_PROTOTYPES = {
    "Supportive": [
        "The family was warm and encouraging.",
        "Someone offered help and comfort.",
        "The atmosphere felt safe and accepting.",
        "People around were kind and supportive.",
        "There was a sense of belonging and warmth.",
    ],
    "Threatening": [
        "The environment was dangerous and hostile.",
        "Someone threatened or attacked.",
        "There was violence and fear in the air.",
        "The atmosphere was menacing and unsafe.",
        "People around were aggressive and cruel.",
    ],
    "Depriving": [
        "The person lacked basic needs and resources.",
        "Poverty and scarcity dominated the situation.",
        "There was nothing to eat or use.",
        "The environment was barren and empty.",
        "Essential things were missing or taken away.",
    ],
    "Controlling": [
        "Someone was giving orders and demanding obedience.",
        "The authority figure dominated and restricted freedom.",
        "Rules were strict and oppressive.",
        "There was no room for individual choice.",
        "The person was forced to comply without question.",
    ],
    "Rejection": [
        "The person was excluded and unwanted.",
        "Others refused to accept or acknowledge them.",
        "There was abandonment and betrayal.",
        "Nobody cared or listened to them.",
        "The person was pushed away and ignored.",
    ],
    "Competitive": [
        "People were competing for success and recognition.",
        "There was rivalry and pressure to outperform others.",
        "The atmosphere was about winning and achieving.",
        "Others were vying for the same goal.",
        "Comparison and contest dominated interactions.",
    ],
    "Chaotic": [
        "Everything was unpredictable and disordered.",
        "Random events disrupted the situation.",
        "There was no stability or routine.",
        "Bad luck and misfortune struck without warning.",
        "The world felt uncertain and out of control.",
    ],
    "Punitive": [
        "The person was being punished or blamed.",
        "There were harsh consequences for mistakes.",
        "Someone inflicted punishment or criticism.",
        "Guilt and blame permeated the situation.",
        "The atmosphere was judgmental and harsh.",
    ],
    "Nurturing": [
        "The mother held the child tenderly.",
        "Someone was caring for and protecting the person.",
        "The environment was gentle and protective.",
        "There was patient guidance and emotional safety.",
        "Warmth and love surrounded the person.",
    ],
    "Achievement-Oriented": [
        "The person was expected to succeed and excel.",
        "There was pressure to study or work hard.",
        "Education and accomplishment were central values.",
        "The environment demanded high performance.",
        "Success was the primary goal and expectation.",
    ],
    "Isolating": [
        "The person was completely alone.",
        "There was nobody around to help or talk to.",
        "The individual was cut off from human contact.",
        "Loneliness and solitude dominated the scene.",
        "Abandonment left the person isolated.",
    ],
    "Ambivalent": [
        "Mixed signals of support and rejection.",
        "The environment was simultaneously caring and critical.",
        "Contradictory emotions came from the same source.",
        "Approval and disapproval alternated unpredictably.",
        "The atmosphere shifted between warmth and coldness.",
    ],
}

SETTING_CUE_MAP = {

    "darkness": "Threatening", "dark": "Threatening", "alley": "Threatening",
    "prison": "Punitive", "jail": "Punitive", "battlefield": "Threatening",
    "war": "Chaotic", "ruin": "Chaotic", "destroyed": "Chaotic",

    "home": "Nurturing", "garden": "Supportive", "park": "Supportive",
    "warmth": "Nurturing", "sunshine": "Supportive", "hearth": "Nurturing",

    "desert": "Isolating", "wilderness": "Isolating", "alone": "Isolating",
    "empty": "Isolating", "abandoned": "Isolating", "deserted": "Isolating",

    "office": "Controlling", "courtroom": "Controlling", "institution": "Controlling",
    "barracks": "Controlling", "uniform": "Controlling",

    "school": "Achievement-Oriented", "classroom": "Achievement-Oriented",
    "exam": "Achievement-Oriented", "university": "Achievement-Oriented",
    "stage": "Achievement-Oriented", "competition": "Competitive",

    "poverty": "Depriving", "slum": "Depriving", "hunger": "Depriving",
    "drought": "Depriving", "famine": "Depriving",

    "punishment": "Punitive", "blame": "Punitive", "shame": "Punitive",
    "scolding": "Punitive", "beating": "Punitive",
}

MOOD_CUE_MAP = {

    "hostile": "Threatening", "dangerous": "Threatening", "violent": "Threatening",
    "menacing": "Threatening", "frightening": "Threatening", "terrifying": "Threatening",

    "warm": "Supportive", "gentle": "Nurturing", "kind": "Supportive",
    "loving": "Nurturing", "caring": "Nurturing", "tender": "Nurturing",
    "safe": "Supportive", "comforting": "Nurturing",

    "strict": "Controlling", "oppressive": "Controlling", "rigid": "Controlling",
    "demanding": "Controlling", "authoritarian": "Controlling",

    "chaotic": "Chaotic", "unpredictable": "Chaotic", "random": "Chaotic",
    "disorderly": "Chaotic", "turbulent": "Chaotic",

    "lonely": "Isolating", "isolated": "Isolating", "desolate": "Isolating",
    "solitary": "Isolating", "forlorn": "Isolating",

    "harsh": "Punitive", "cruel": "Punitive", "judgmental": "Punitive",
    "critical": "Punitive", "unkind": "Punitive",

    "competitive": "Competitive", "ambitious": "Achievement-Oriented",
    "driven": "Achievement-Oriented", "pressured": "Controlling",

    "conflicted": "Ambivalent", "torn": "Ambivalent", "confused": "Ambivalent",
    "uncertain": "Ambivalent", "mixed": "Ambivalent",
}

class EnvironmentClassifier:
    """
    Determines the dominant environmental press acting on the subject.
    v2.0: Multi-signal fusion (press-based + NLP-based + cue-based).
    """

    ALL_ENV_TYPES = list(ENV_MAPPING.keys())

    def __init__(self, nlp_processor=None):
        """
        Args:
            nlp_processor: EnhancedNLPProcessor instance (optional).
                           If provided, enables embedding-based classification.
        """
        self.nlp_processor = nlp_processor

        from app.utils.prototype_store import get_prototypes_by_prefix
        proto_embs = get_prototypes_by_prefix("env")
        if proto_embs:
            self.proto_embeddings = proto_embs
        elif nlp_processor is not None:
            self.proto_embeddings = {}
            self._compute_prototype_embeddings()
        else:
            self.proto_embeddings = {}

    def _compute_prototype_embeddings(self):
        """Pre-compute sentence embeddings for each environment prototype."""
        for env_type, sentences in ENV_PROTOTYPES.items():
            self.proto_embeddings[env_type] = self.nlp_processor.get_embeddings(sentences)

    def classify(self, presses: List[Tuple[str, float]]) -> Dict[str, Any]:
        """
        Press-only classification (backward compatible).
        presses: List of (press_name, probability/score)
        Returns dictionary with environment classification scores.
        """
        scores = {k: 0.0 for k in self.ALL_ENV_TYPES}

        if not presses:
            return self._format_result(scores, [])

        evidence = []
        for press_name, score in presses:
            for env_type, mapped_presses in ENV_MAPPING.items():
                if press_name in mapped_presses:
                    scores[env_type] += score
                    if score > 0.1:
                        evidence.append(f"{press_name} ({score:.2f}) -> {env_type}")

        return self._format_result(scores, evidence)

    def classify_from_text(self, narrative_text: str) -> Dict[str, Any]:
        """
        NLP-based environment classification from raw narrative text.
        Uses embedding similarity + setting/mood cue extraction.
        Requires nlp_processor to be set.
        """
        if not self.nlp_processor or not narrative_text:
            return self._format_result({k: 0.0 for k in self.ALL_ENV_TYPES}, [])

        scores = {k: 0.0 for k in self.ALL_ENV_TYPES}
        evidence = []

        embedding_scores = self._score_by_embedding(narrative_text)
        for env_type, sim in embedding_scores.items():
            scores[env_type] += sim * 2.0
            if sim > 0.3:
                evidence.append(f"Embedding similarity -> {env_type} ({sim:.3f})")

        cue_scores = self._score_by_cues(narrative_text)
        for env_type, cue_score in cue_scores.items():
            scores[env_type] += cue_score
            if cue_score > 0.1:
                evidence.append(f"Setting/mood cues -> {env_type} ({cue_score:.2f})")

        return self._format_result(scores, evidence)

    def classify_fused(
        self,
        presses: List[Tuple[str, float]],
        narrative_text: str,
        press_weight: float = 0.30,
        text_weight: float = 0.40,
        cue_weight: float = 0.30,
    ) -> Dict[str, Any]:
        """
        Fused classification combining press-based, NLP-based (embedding), and
        verb/adjective cue signals.
        v3.0: 3-signal fusion with spaCy-driven verb/adj extraction.
        """

        press_result = self.classify(presses)
        press_scores = press_result.get("scores", {})

        text_result = self.classify_from_text(narrative_text)
        text_scores = text_result.get("scores", {})

        cue_scores_raw = self._score_by_verb_actions(narrative_text)

        press_norm = self._normalize_scores(press_scores)
        text_norm = self._normalize_scores(text_scores)
        cue_norm = self._normalize_scores(cue_scores_raw)

        fused_scores = {}
        for env_type in self.ALL_ENV_TYPES:
            fused_scores[env_type] = (
                press_weight * press_norm.get(env_type, 0.0)
                + text_weight * text_norm.get(env_type, 0.0)
                + cue_weight * cue_norm.get(env_type, 0.0)
            )

        combined_evidence = press_result.get("evidence", []) + text_result.get("evidence", [])

        for env_type, score in sorted(cue_scores_raw.items(), key=lambda x: -x[1]):
            if score > 0.1:
                combined_evidence.append(f"Verb/Adj cues -> {env_type} ({score:.2f})")

        return self._format_result(fused_scores, combined_evidence)

    def _score_by_embedding(self, narrative_text: str) -> Dict[str, float]:
        """Score each environment type by embedding similarity to prototypes."""
        if not self.proto_embeddings:
            return {k: 0.0 for k in self.ALL_ENV_TYPES}

        import re
        sentences = [s.strip() for s in re.split(r'[.!?]', narrative_text) if len(s.strip()) > 8]
        if not sentences:
            return {k: 0.0 for k in self.ALL_ENV_TYPES}

        sent_embeddings = self.nlp_processor.get_embeddings(sentences)

        scores = {}
        for env_type, proto_embs in self.proto_embeddings.items():

            sim_matrix = np.dot(proto_embs, sent_embeddings.T) / (
                np.linalg.norm(proto_embs, axis=1, keepdims=True)
                * np.linalg.norm(sent_embeddings, axis=1)
                + 1e-8
            )
            max_sim_per_sentence = np.max(sim_matrix, axis=0)
            scores[env_type] = float(np.mean(max_sim_per_sentence))

        return scores

    def _score_by_cues(self, narrative_text: str) -> Dict[str, float]:
        """Score environments using spaCy POS-based adjective/setting extraction
        + lexical cue matching as fallback.
        v3.0: Uses spaCy lemmatization instead of raw string matching."""
        scores = {k: 0.0 for k in self.ALL_ENV_TYPES}
        text_lower = narrative_text.lower()

        for cue, env_type in SETTING_CUE_MAP.items():
            if cue in text_lower:
                scores[env_type] += 0.15

        if self.nlp_processor:
            try:
                doc = self.nlp_processor.nlp(narrative_text)

                for ent in doc.ents:
                    ent_lower = ent.text.lower()
                    if ent.label_ in ("GPE", "LOC", "FAC"):

                        if self.proto_embeddings:
                            loc_emb = self.nlp_processor.get_embeddings([ent.text])
                            for env_type, proto_embs in self.proto_embeddings.items():
                                proto_centroid = np.mean(proto_embs, axis=0)
                                cos_sim = float(np.dot(loc_emb[0], proto_centroid) / (
                                    np.linalg.norm(loc_emb[0]) * np.linalg.norm(proto_centroid) + 1e-8
                                ))
                                if cos_sim > 0.3:
                                    scores[env_type] += cos_sim * 0.15
                        else:

                            for cue, env_type in SETTING_CUE_MAP.items():
                                if cue in ent_lower:
                                    scores[env_type] += 0.20
                                    break

                adjectives = []
                for token in doc:
                    if token.pos_ == "ADJ" and len(token.text) > 2:
                        adjectives.append(token.lemma_.lower())

                        if token.lemma_.lower() in MOOD_CUE_MAP:
                            scores[MOOD_CUE_MAP[token.lemma_.lower()]] += 0.08

                if adjectives and self.proto_embeddings:
                    adj_text = ", ".join(set(adjectives))
                    adj_emb = self.nlp_processor.get_embeddings([adj_text])
                    for env_type, proto_embs in self.proto_embeddings.items():
                        proto_centroid = np.mean(proto_embs, axis=0)
                        cos_sim = float(np.dot(adj_emb[0], proto_centroid) / (
                            np.linalg.norm(adj_emb[0]) * np.linalg.norm(proto_centroid) + 1e-8
                        ))
                        if cos_sim > 0.25:
                            scores[env_type] += cos_sim * 0.2

            except Exception:
                pass

        return scores

    def _score_by_verb_actions(self, narrative_text: str) -> Dict[str, float]:
        """Score environments by extracting verb phrases via spaCy dependency parse
        and matching them against environment prototypes using SBERT.
        v3.0: Dynamic verb-action classification without hardcoded verb lists."""
        scores = {k: 0.0 for k in self.ALL_ENV_TYPES}

        if not self.nlp_processor or not self.proto_embeddings:
            return scores

        try:
            doc = self.nlp_processor.nlp(narrative_text)

            verb_phrases = []
            for token in doc:
                if token.pos_ == "VERB" and token.dep_ in ("ROOT", "advcl", "xcomp", "conj", "ccomp"):

                    children_text = [c.text for c in token.children
                                    if c.dep_ in ("dobj", "pobj", "attr", "acomp", "advmod")]
                    phrase = f"{token.lemma_} {' '.join(children_text)}".strip()
                    if len(phrase) > 2:
                        verb_phrases.append(phrase)

            if not verb_phrases:
                return scores

            vp_embeddings = self.nlp_processor.get_embeddings(verb_phrases)
            vp_centroid = np.mean(vp_embeddings, axis=0)

            for env_type, proto_embs in self.proto_embeddings.items():
                proto_centroid = np.mean(proto_embs, axis=0)
                cos_sim = float(np.dot(vp_centroid, proto_centroid) / (
                    np.linalg.norm(vp_centroid) * np.linalg.norm(proto_centroid) + 1e-8
                ))
                if cos_sim > 0.2:
                    scores[env_type] = cos_sim

        except Exception:
            pass

        return scores

    @staticmethod
    def _normalize_scores(scores: Dict[str, float]) -> Dict[str, float]:
        """Normalize score dict to 0-1 range."""
        vals = list(scores.values())
        max_val = max(vals) if vals else 1.0
        if max_val == 0:
            return {k: 0.0 for k in scores}
        return {k: v / max_val for k, v in scores.items()}

    def _format_result(
        self, scores: Dict[str, float], evidence: List[str]
    ) -> Dict[str, Any]:
        """Format the final classification result with multi-environment support."""
        sorted_env = sorted(scores.items(), key=lambda x: -x[1])

        primary_env = sorted_env[0][0] if sorted_env else "Ambiguous"
        primary_score = sorted_env[0][1] if sorted_env else 0.0

        if primary_score < 0.05:
            primary_env = "Ambiguous"

        secondary_env = None
        secondary_score = 0.0
        if len(sorted_env) > 1 and sorted_env[1][1] > 0.05:
            secondary_env = sorted_env[1][0]
            secondary_score = sorted_env[1][1]

        is_mixed = False
        if primary_score > 0.05 and secondary_score > 0.05:
            ratio = secondary_score / primary_score if primary_score > 0 else 0
            is_mixed = ratio > 0.75

        total = sum(scores.values())
        confidence = primary_score / total if total > 0 else 0.0

        return {
            "primary": primary_env,
            "primary_confidence": round(confidence, 3),
            "scores": {k: round(v, 4) for k, v in scores.items()},
            "secondary": secondary_env,
            "secondary_score": round(secondary_score, 4),
            "is_mixed_environment": is_mixed,
            "evidence": evidence,
        }
