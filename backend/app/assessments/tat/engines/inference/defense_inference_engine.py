"""
Defense Mechanism Inference Engine — v3.0
-------------------------------------------
Infers psychological defense mechanisms from narrative events using
sentence embeddings and cosine similarity to prototype descriptions.

v3.0 ENHANCEMENTS:
✔ Defense maturity classification (Vaillant / DSM-IV hierarchy)
✔ Rigidity index (concentration ratio)
✔ Personality organization level (Kernberg framework)
✔ Clinically informative evidence strings
✔ Tuned softmax temperature for better secondary defense surfacing
✔ Complete output schema: defense, confidence, maturity_level,
  rigidity_index, evidence, personality_organization
"""

import numpy as np
from typing import List, Dict, Any


# ============================================================================
# DEFENSE PROTOTYPE SENTENCES
# ============================================================================
# Each defense is described by 5–7 prototype sentences that capture the
# behavioral and narrative markers a clinician would look for. The embeddings
# of these sentences are compared to event embeddings via cosine similarity.
# ============================================================================

DEFENSE_PROTOTYPES = {
    "Intellectualization": [
        "The person described the situation in abstract, analytical terms without emotion.",
        "They discussed the problem rationally, distancing from feelings.",
        "The narrative was overly logical, avoiding any emotional engagement.",
        "Events were observed and analyzed rather than felt.",
        "The protagonist approached the conflict as an intellectual puzzle.",
    ],
    "Repression": [
        "The person seemed to forget or omit important emotional details.",
        "Key events were avoided or glossed over quickly.",
        "The story was remarkably brief and impoverished given the stimulus.",
        "Critical information appeared to be unconsciously excluded.",
        "The narrative lacked affect as if painful feelings were pushed away.",
    ],
    "Suppression": [
        "The person consciously held back their emotional reaction.",
        "They chose not to express what they were feeling.",
        "Emotions were present but deliberately restrained and controlled.",
        "The protagonist forced themselves to stay composed despite distress.",
        "Feelings were acknowledged but intentionally pushed aside.",
    ],
    "Reaction Formation": [
        "They expressed the opposite of what they seemed to feel.",
        "A positive attitude masked underlying distress or anger.",
        "The cheerfulness felt forced and inappropriate given the situation.",
        "Love was expressed where hostility might be expected.",
        "Extreme kindness appeared to cover deeper resentment.",
    ],
    "Avoidance": [
        "The person turned away from the conflict entirely.",
        "They left the situation rather than confront it.",
        "Escape was chosen over engagement with the problem.",
        "The protagonist withdrew when emotions became intense.",
        "Difficult topics were sidestepped or redirected.",
    ],
    "Compliance": [
        "The person submitted to authority without resistance.",
        "They agreed to everything despite internal disagreement.",
        "Obedience replaced autonomous decision-making.",
        "The protagonist yielded their own wishes to satisfy others.",
        "Conformity was used as a strategy to avoid conflict.",
    ],
    "Projection": [
        "They attributed their own unacceptable feelings to another character.",
        "The person blamed others for emotions they could not accept in themselves.",
        "Internal conflicts were perceived as coming from external sources.",
        "The protagonist saw hostility in others that mirrored their own anger.",
        "Uncomfortable desires were located in other characters.",
    ],
    "Denial": [
        "The person refused to acknowledge an obvious reality.",
        "They acted as though the threatening situation did not exist.",
        "Facts were ignored or contradicted to avoid distress.",
        "The protagonist insisted everything was fine despite clear evidence otherwise.",
        "Reality was distorted to make the situation seem less threatening.",
    ],
    "Displacement": [
        "Anger was directed at a safer target instead of the real source.",
        "Emotions meant for one person were expressed toward someone else.",
        "Frustration was redirected to a weaker or less threatening figure.",
        "The protagonist took out their feelings on an unrelated person.",
        "Aggression was channeled away from the original source of conflict.",
    ],
    "Sublimation": [
        "Difficult emotions were channeled into creative or productive activity.",
        "The person transformed inner turmoil into something constructive.",
        "Anxiety was converted into focused work or artistic expression.",
        "Internal conflicts became motivation for positive achievement.",
        "The protagonist used their pain as fuel for growth.",
    ],
    "Rationalization": [
        "The person made logical excuses for emotionally driven behavior.",
        "They provided reasonable-sounding justifications for what they did.",
        "The protagonist explained away their actions with post-hoc reasoning.",
        "Uncomfortable choices were reframed as practical or necessary.",
        "Motives were reinterpreted to seem more acceptable.",
    ],
    "Undoing": [
        "The person tried to reverse or cancel out a harmful action.",
        "They performed compensatory acts to make up for past wrongs.",
        "Ritualistic behavior was used to neutralize guilt.",
        "The protagonist attempted to undo damage through symbolic gestures.",
        "Apology and atonement were used compulsively.",
    ],
}


# ============================================================================
# DEFENSE MATURITY CLASSIFICATION (Vaillant / DSM-IV hierarchy)
# ============================================================================

DEFENSE_MATURITY = {
    "Sublimation":          "Mature",
    "Intellectualization":  "Mature",
    "Suppression":          "Mature",
    "Rationalization":      "Neurotic",
    "Reaction Formation":   "Neurotic",
    "Undoing":              "Neurotic",
    "Displacement":         "Neurotic",
    "Repression":           "Neurotic",
    "Projection":           "Immature",
    "Denial":               "Immature",
    "Avoidance":            "Immature",
    "Compliance":           "Immature",
}

# Maturity level weights for personality organization scoring
_MATURITY_WEIGHTS = {"Mature": 1.0, "Neurotic": 0.5, "Immature": 0.0}


# ============================================================================
# EVIDENCE TEMPLATES (clinically informative, per defense)
# ============================================================================

_EVIDENCE_TEMPLATES = {
    "Intellectualization": (
        "Narrative shows abstract, detached analysis of emotionally charged material. "
        "Affective content is filtered through cognitive framing, consistent with "
        "intellectualization as a distancing mechanism."
    ),
    "Repression": (
        "Key emotional content appears omitted or glossed; the narrative is "
        "impoverished relative to stimulus complexity, suggesting unconscious "
        "exclusion of painful material."
    ),
    "Suppression": (
        "Emotions are acknowledged but deliberately restrained. The protagonist "
        "demonstrates conscious containment of affect, indicative of controlled "
        "suppression rather than unconscious repression."
    ),
    "Reaction Formation": (
        "Affect-behavior incongruence detected: positive emotional expressions "
        "occur in contexts where negative affect would be expected, suggesting "
        "transformation of unacceptable impulses into their opposite."
    ),
    "Avoidance": (
        "Protagonist disengages from conflict rather than confronting it. "
        "Withdrawal or topic-shifting replaces direct engagement with distressing "
        "material."
    ),
    "Compliance": (
        "Protagonist yields autonomy to external demands without resistance. "
        "Self-assertion is replaced by submission, suggesting passive conflict "
        "management through conformity."
    ),
    "Projection": (
        "Unacceptable internal states are attributed to other characters. "
        "Narrative externalizes conflict, locating the source of distress "
        "outside the self."
    ),
    "Denial": (
        "Narrative contradicts or ignores evident reality. Threatening information "
        "is treated as non-existent despite stimulus cues suggesting otherwise."
    ),
    "Displacement": (
        "Emotional intensity is redirected from the original source to a substitute "
        "target. Aggression or frustration is channeled toward a safer, less "
        "threatening figure."
    ),
    "Sublimation": (
        "Distressing affect is transformed into constructive or creative output. "
        "Narrative demonstrates adaptive channeling of conflict into prosocial "
        "or productive activity."
    ),
    "Rationalization": (
        "Post-hoc logical justifications are used to explain emotionally driven "
        "behavior. Uncomfortable decisions are reframed as rational and necessary."
    ),
    "Undoing": (
        "Compensatory or reparative actions follow transgressive behavior. "
        "The protagonist engages in symbolic reversal to neutralize guilt."
    ),
    "Adaptive Coping": (
        "No prominent defensive distortion detected. Narrative is organized "
        "without significant defensive patterning, suggesting adequate ego "
        "functioning and adaptive coping capacity."
    ),
}


# ============================================================================
# STRUCTURAL META-FEATURES (secondary signals, blended with embedding scores)
# ============================================================================

def _compute_structural_features(events: List[Dict]) -> Dict[str, float]:
    """Extract narrative-structural features that supplement embedding inference."""
    n = len(events)
    if n == 0:
        return {}

    total_words = sum(len(e.get('text', '').split()) for e in events)
    avg_words = total_words / n
    missing_agents = sum(1 for e in events if not e.get('agent')) / n
    emotions_present = sum(1 for e in events if e.get('emotion')) / n
    avg_valence = sum(e.get('valence', 0) for e in events) / n
    valence_var = float(np.std([e.get('valence', 0) for e in events]))

    # Valence mismatch: positive valence on conflict/obstacle events
    mismatch = sum(
        1 for e in events
        if e.get('valence', 0) > 0.4
        and e.get('event_type') in ('obstacle', 'conflict', 'defense', 'attack')
    ) / n

    return {
        "avg_words_per_event": avg_words,
        "missing_agent_ratio": missing_agents,
        "emotion_presence_ratio": emotions_present,
        "avg_valence": avg_valence,
        "valence_variance": valence_var,
        "valence_mismatch_ratio": mismatch,
    }


# ============================================================================
# STRUCTURAL BONUS RULES (additive adjustments to embedding-based scores)
# ============================================================================

_STRUCTURAL_BONUSES = {
    # (defense_name, feature_name, condition_fn, bonus)
    "Intellectualization": [
        ("avg_words_per_event", lambda v: v > 18, 0.08),
        ("emotion_presence_ratio", lambda v: v < 0.25, 0.06),
    ],
    "Repression": [
        ("avg_words_per_event", lambda v: v < 6, 0.10),
        ("missing_agent_ratio", lambda v: v > 0.5, 0.08),
    ],
    "Reaction Formation": [
        ("valence_mismatch_ratio", lambda v: v > 0.15, 0.10),
    ],
    "Suppression": [
        ("emotion_presence_ratio", lambda v: v < 0.3, 0.05),
    ],
}


# ============================================================================
# ENGINE CLASS
# ============================================================================

class DefenseInferenceEngine:
    """
    Infers defense mechanisms from narrative events using sentence embeddings
    and cosine similarity to prototype descriptions.

    Primary signal: Embedding-based similarity (same approach as MurrayInferenceEngine)
    Secondary signal: Structural meta-features (brevity, missing agents, valence)

    Output schema (v3.0):
        defense, confidence, maturity_level, rigidity_index, evidence,
        personality_organization
    """

    def __init__(self, nlp_processor):
        self.processor = nlp_processor
        self.proto_embs: Dict[str, np.ndarray] = {}
        self._compute_prototype_embeddings()

    def _compute_prototype_embeddings(self):
        """Pre-compute embeddings for all defense prototype sentences."""
        for defense, sentences in DEFENSE_PROTOTYPES.items():
            self.proto_embs[defense] = self.processor.get_embeddings(sentences)

    def infer_from_events(self, events: List[Dict], n_cards: int = 1) -> List[Dict[str, Any]]:
        """
        Returns a list of detected defenses with confidence, maturity,
        rigidity, evidence, and personality organization.

        Pipeline:
          1. Encode all event texts
          2. Compute cosine similarity against each defense prototype
          3. Apply structural bonuses from narrative meta-features
          4. Top-K filtering (keep top 5 only) before softmax
          5. Softmax normalization
          6. Post-processing refinements
          7. Compute maturity levels, rigidity, and personality organization
          8. Return top 3 defenses above threshold

        Args:
            events: List of narrative events.
            n_cards: Number of cards analyzed (used for personality org safeguards).
        """
        if not events:
            return []

        texts = [e.get('text', '') for e in events]
        if not any(texts):
            return []

        # Step 1: Compute event embeddings
        event_embs = self.processor.get_embeddings(texts)

        # Step 2: Embedding-based similarity scores
        raw_scores: Dict[str, float] = {}
        for defense, proto_embs in self.proto_embs.items():
            sim_matrix = np.dot(proto_embs, event_embs.T) / (
                np.linalg.norm(proto_embs, axis=1, keepdims=True)
                * np.linalg.norm(event_embs, axis=1)
                + 1e-8
            )
            # For each event, take max similarity across prototypes; then average
            max_sim_per_event = np.max(sim_matrix, axis=0)
            raw_scores[defense] = float(np.mean(max_sim_per_event))

        # Step 3: Structural bonuses
        struct = _compute_structural_features(events)
        for defense, rules in _STRUCTURAL_BONUSES.items():
            if defense in raw_scores:
                for feature_name, condition_fn, bonus in rules:
                    if feature_name in struct and condition_fn(struct[feature_name]):
                        raw_scores[defense] += bonus

        # Step 4 (Fix 3): Top-K filtering — only pass top 5 to softmax
        # This eliminates the noise floor from low-similarity defenses
        TOP_K = 5
        sorted_raw = sorted(raw_scores.items(), key=lambda x: -x[1])
        top_k_scores = dict(sorted_raw[:TOP_K])

        # Step 7 (moved before softmax): Compute rigidity on RAW scores
        # Rigidity must be computed before softmax because softmax with temperature=0.5
        # compresses the distribution, making all gaps near-zero regardless of actual dominance.
        raw_vals = sorted(top_k_scores.values(), reverse=True)
        raw_top = raw_vals[0] if raw_vals else 0.0
        raw_second = raw_vals[1] if len(raw_vals) > 1 else 0.0
        raw_total = sum(raw_vals) if raw_vals else 1.0
        # Concentration ratio: how much the top defense dominates the raw score mass
        # Normalized to [0, 1]: 0 = perfectly balanced, 1 = one defense holds everything
        dominance_gap = (raw_top - raw_second) / (raw_total + 1e-8)
        rigidity_index = round(min(1.0, max(0.0, dominance_gap * 3.0)), 3)

        # Step 5: Normalize to softmax probabilities (temperature-scaled)
        scores = self._softmax(top_k_scores, temperature=0.5)

        # Step 6: Post-processing refinements
        scores = self._refine_scores(scores, struct)

        # Step 8 (Fix 3): Build results — raised threshold 0.06→0.10, max 3 per card
        threshold = 0.10  # raised from 0.06 to reduce spurious low-confidence detections
        MAX_DEFENSES_PER_CARD = 3
        results = sorted(scores.items(), key=lambda x: -x[1])
        defenses = []
        for defense, score in results:
            if score > threshold and len(defenses) < MAX_DEFENSES_PER_CARD:
                maturity = DEFENSE_MATURITY.get(defense, "Unknown")
                defenses.append({
                    "defense": defense,
                    "confidence": round(float(score), 3),
                    "maturity_level": maturity,
                    "rigidity_index": round(rigidity_index, 3),
                    "evidence": self._generate_evidence(defense, score, struct),
                })

        # Fallback if no defense exceeds threshold
        if not defenses:
            defenses.append({
                "defense": "Adaptive Coping",
                "confidence": 0.4,
                "maturity_level": "Mature",
                "rigidity_index": 0.0,
                "evidence": _EVIDENCE_TEMPLATES["Adaptive Coping"],
            })

        # Step 9 (Fix 2): Compute personality organization with card-count safeguard
        personality_org = self._compute_personality_organization(defenses, n_cards=n_cards)
        for d in defenses:
            d["personality_organization"] = personality_org

        return defenses

    # ------------------------------------------------------------------
    # PERSONALITY ORGANIZATION (Kernberg framework)
    # ------------------------------------------------------------------

    def _compute_personality_organization(
        self, defenses: List[Dict], n_cards: int = 1
    ) -> Dict[str, Any]:
        """
        Derive personality organization level from the defense profile.
        Uses Kernberg's structural model:
          - Neurotic (healthy): predominantly Mature + Neurotic defenses
          - Mixed Defense Profile: mixed profile with significant Immature defenses
          - Preliminary — Insufficient Data: predominantly Immature with low card count

        Fix 2 safeguards:
          - For ≤2 cards: suppress Borderline/Psychotic labels
          - Confidence penalty proportional to card count

        Returns dict with level, confidence, and rationale.
        """
        if not defenses:
            return {"level": "Indeterminate", "confidence": 0.0, "rationale": "No defense data"}

        # Weighted maturity score (by confidence)
        total_weight = 0.0
        weighted_maturity = 0.0
        maturity_counts = {"Mature": 0, "Neurotic": 0, "Immature": 0}

        for d in defenses:
            mat = d.get("maturity_level", "Unknown")
            conf = d.get("confidence", 0)
            weight = _MATURITY_WEIGHTS.get(mat, 0.5)
            weighted_maturity += weight * conf
            total_weight += conf
            if mat in maturity_counts:
                maturity_counts[mat] += 1

        if total_weight == 0:
            return {"level": "Indeterminate", "confidence": 0.0, "rationale": "No defense data"}

        maturity_score = weighted_maturity / total_weight  # 0.0-1.0

        # Classification
        if maturity_score >= 0.65:
            level = "Neurotic (Healthy)"
            rationale = (
                f"Defense profile is predominantly mature/neurotic "
                f"(maturity index: {maturity_score:.2f}). "
                f"Mature: {maturity_counts['Mature']}, "
                f"Neurotic: {maturity_counts['Neurotic']}, "
                f"Immature: {maturity_counts['Immature']}. "
                "Suggests intact ego functioning and adaptive defense organization."
            )
        elif maturity_score >= 0.35:
            level = "Mixed Defense Profile"
            rationale = (
                f"Defense profile shows mixed maturity levels "
                f"(maturity index: {maturity_score:.2f}). "
                f"Mature: {maturity_counts['Mature']}, "
                f"Neurotic: {maturity_counts['Neurotic']}, "
                f"Immature: {maturity_counts['Immature']}. "
                "Suggests structural variability with partial integration of "
                "primitive and higher-level defenses. NOTE: 'Borderline-level "
                "organization' is one hypothesis warranting further assessment."
            )
        else:
            level = "Predominantly Immature Profile"
            rationale = (
                f"Defense profile is predominantly immature/primitive "
                f"(maturity index: {maturity_score:.2f}). "
                f"Mature: {maturity_counts['Mature']}, "
                f"Neurotic: {maturity_counts['Neurotic']}, "
                f"Immature: {maturity_counts['Immature']}. "
                "Suggests significant structural fragility; reality testing and "
                "identity coherence may be compromised. Requires further assessment."
            )

        # Confidence in classification = distance from nearest boundary
        if maturity_score >= 0.65:
            boundary_dist = maturity_score - 0.65
        elif maturity_score >= 0.35:
            boundary_dist = min(maturity_score - 0.35, 0.65 - maturity_score)
        else:
            boundary_dist = 0.35 - maturity_score
        org_confidence = min(0.95, 0.5 + boundary_dist * 2.0)

        # ---- Fix 2: Card-count safeguards ----
        # Apply confidence penalty proportional to card count (need ≥4 for full)
        card_penalty = min(1.0, n_cards / 4.0)
        org_confidence *= card_penalty

        # For ≤2 cards: suppress alarming labels and add explicit warning
        if n_cards <= 2 and level in ("Mixed Defense Profile", "Predominantly Immature Profile"):
            insufficient_note = (
                f" [PRELIMINARY — {n_cards}-card data is insufficient for "
                f"structural personality classification. This label is a "
                f"working hypothesis only.]"
            )
            level = f"Preliminary ({level})"
            rationale += insufficient_note
            org_confidence = min(org_confidence, 0.35)  # hard cap for low-card

        return {
            "level": level,
            "confidence": round(org_confidence, 3),
            "maturity_index": round(maturity_score, 3),
            "maturity_distribution": maturity_counts,
            "rationale": rationale,
            "cards_analyzed": n_cards,
        }

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    def _softmax(self, scores: Dict[str, float], temperature: float = 1.0) -> Dict[str, float]:
        """Convert raw scores to probabilities via temperature-scaled softmax."""
        values = np.array(list(scores.values())) / temperature
        exp_values = np.exp(values - np.max(values))
        probs = exp_values / exp_values.sum()
        return dict(zip(scores.keys(), probs.tolist()))

    def _refine_scores(self, scores: Dict[str, float], struct: Dict[str, float]) -> Dict[str, float]:
        """Post-processing: clinical heuristic adjustments."""
        avg_valence = struct.get("avg_valence", 0)

        # If overall valence is positive, consider Suppression as Healthy Regulation
        if avg_valence > 0.3 and "Suppression" in scores:
            scores["Suppression"] *= 0.7
            # Boost Sublimation as the healthier alternative
            if "Sublimation" in scores:
                scores["Sublimation"] *= 1.2

        # Cap Compliance when co-occurring with Avoidance (they're related but distinct)
        if scores.get("Compliance", 0) > 0.1 and scores.get("Avoidance", 0) > 0.1:
            scores["Compliance"] = min(scores["Compliance"], 0.15)

        return scores

    def _generate_evidence(self, defense: str, score: float, struct: Dict[str, float]) -> str:
        """Generate a clinically informative evidence string."""
        # Use the rich template as base
        base = _EVIDENCE_TEMPLATES.get(defense, f"Semantic similarity to {defense.lower()} prototype patterns.")

        # Add structural evidence where relevant
        extras = []
        if defense == "Intellectualization" and struct.get("avg_words_per_event", 0) > 15:
            extras.append(f"Structural support: high verbal output ({struct['avg_words_per_event']:.0f} words/event)")
        if defense == "Repression" and struct.get("missing_agent_ratio", 0) > 0.4:
            extras.append(f"Structural support: missing agency ({struct['missing_agent_ratio']:.0%} of events)")
        if defense == "Repression" and struct.get("avg_words_per_event", 0) < 6:
            extras.append(f"Structural support: impoverished narrative ({struct['avg_words_per_event']:.0f} words/event)")
        if defense == "Reaction Formation" and struct.get("valence_mismatch_ratio", 0) > 0.1:
            extras.append("Structural support: positive valence on conflict events (affect-behavior incongruence)")
        if defense == "Suppression" and struct.get("emotion_presence_ratio", 0) < 0.3:
            extras.append(f"Structural support: low emotion presence ({struct['emotion_presence_ratio']:.0%})")

        if extras:
            return f"{base} {'; '.join(extras)}."
        return base