"""
Production Utilities for TAT System
------------------------------------
Shared infrastructure module providing deterministic scoring,
precision control, input validation, and trajectory classification.

ADDITIVE ONLY — No existing features modified or removed.
"""

import random
import numpy as np
from typing import List, Optional, Dict, Any
from collections import Counter

def set_reproducibility_seed(seed: int = 42):
    """
    Set deterministic seeds across all RNG sources.
    Call at the start of each analysis run for reproducible results.
    """
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch
        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except ImportError:
        pass

def round_metric(value, decimals: int = 2) -> float:
    """
    Standardized rounding for all scoring metrics.
    Handles None and non-numeric gracefully.
    """
    if value is None:
        return 0.0
    try:
        return round(float(value), decimals)
    except (TypeError, ValueError):
        return 0.0

def clamp(value, lo: float = 0.0, hi: float = 100.0) -> float:
    """
    Safe bounding for any numeric metric.
    Prevents overflow/underflow in scoring outputs.
    """
    if value is None:
        return lo
    try:
        return max(lo, min(hi, float(value)))
    except (TypeError, ValueError):
        return lo

def detect_input_quality(text: str) -> Dict[str, Any]:
    """
    Validate narrative input for edge cases.
    Returns quality classification and metadata.

    Quality levels:
        "valid"      — Normal narrative, proceed with full analysis
        "empty"      — No text provided
        "too_short"  — Under 10 words, confidence should be capped
        "repetitive" — >60% repeated tokens, coherence should be reduced
    """
    if not text or not text.strip():
        return {"quality": "empty", "word_count": 0, "repetition_ratio": 0.0}

    words = text.strip().split()
    word_count = len(words)

    if word_count < 10:
        return {"quality": "too_short", "word_count": word_count, "repetition_ratio": 0.0}

    lower_words = [w.lower() for w in words]
    counts = Counter(lower_words)
    if counts:
        most_common_count = counts.most_common(1)[0][1]
        repetition_ratio = most_common_count / max(1, word_count)
    else:
        repetition_ratio = 0.0

    if repetition_ratio > 0.6:
        return {"quality": "repetitive", "word_count": word_count, "repetition_ratio": repetition_ratio}

    return {"quality": "valid", "word_count": word_count, "repetition_ratio": repetition_ratio}

def compute_volatility(values: List[float]) -> float:
    """
    Variance-based volatility index for a list of metric values.
    Returns 0.0 for stable, approaches 1.0 for highly volatile.
    Normalized to [0, 1] range.
    """
    if not values or len(values) < 2:
        return 0.0

    std = float(np.std(values))
    mean = float(np.mean(values))

    if mean == 0:
        return min(1.0, std)

    cv = std / abs(mean)
    return round_metric(min(1.0, cv), 4)

def compute_peak_intensity(values: List[float]) -> float:
    """
    Peak deviation from mean — measures how far the strongest
    signal deviates from the average.
    """
    if not values or len(values) < 2:
        return 0.0

    mean = float(np.mean(values))
    peak = max(abs(v - mean) for v in values)
    return round_metric(peak)

def compute_stability_coefficient(volatility: float) -> float:
    """
    Stability coefficient = 1.0 - volatility.
    Used in the dual-layer aggregation formula.
    """
    return round_metric(max(0.0, min(1.0, 1.0 - volatility)), 4)

def classify_ego_trajectory(series: List[float]) -> str:
    """
    Classify ego strength trajectory across sessions.

    Returns:
        "Stable"           — variance < 5% of mean
        "Gradual Decline"  — monotonic decrease trend
        "Situational Spike" — single sharp deviation > 2× std
    """
    if not series or len(series) < 2:
        return "Stable"

    mean = float(np.mean(series))
    std = float(np.std(series))

    if mean > 0 and (std / abs(mean)) < 0.05:
        return "Stable"

    diffs = [series[i+1] - series[i] for i in range(len(series) - 1)]
    if all(d <= 0 for d in diffs) and sum(diffs) < -std:
        return "Gradual Decline"

    if std > 0:
        deviations = [abs(v - mean) / std for v in series]
        if max(deviations) > 2.0:
            return "Situational Spike"

    return "Stable"

def dual_layer_aggregate(card_values: List[float]) -> Dict[str, float]:
    """
    Compute the dual-layer aggregation for a list of per-card metric values.

    Formula:
        Final = WeightedMean + (PeakIntensity × StabilityCoefficient)

    Returns dict with: mean, peak, volatility, stability_coeff, final
    """
    if not card_values:
        return {"mean": 0.0, "peak": 0.0, "volatility": 0.0, "stability_coeff": 1.0, "final": 0.0}

    if len(card_values) == 1:
        v = round_metric(card_values[0])
        return {"mean": v, "peak": 0.0, "volatility": 0.0, "stability_coeff": 1.0, "final": v}

    mean = round_metric(float(np.mean(card_values)))
    peak = compute_peak_intensity(card_values)
    volatility = compute_volatility(card_values)
    stability = compute_stability_coefficient(volatility)

    final = round_metric(mean + (peak * stability * 0.1))

    return {
        "mean": mean,
        "peak": peak,
        "volatility": volatility,
        "stability_coeff": stability,
        "final": final
    }

METRIC_BOUNDS = {

    'anxiety_level': (0, 100),
    'conflict_internal': (0, 100),
    'conflict_interpersonal': (0, 100),
    'ego_strength': (0, 100),
    'hero_ego_strength': (0, 100),
    'emotional_stability': (0, 100),
    'overall_confidence': (0, 100),
    'reality_testing': (0, 100),
    'narrative_coherence': (0, 100),
    'complexity': (0, 100),
    'social_cognition': (0, 100),
    'peak_anxiety_index': (0, 100),
    'emotional_volatility_index': (0, 100),

    'affective_integration': (0, 100),
    'regulation_index': (0, 10),

    'stability_index': (0, 1),
    'need_stability': (0, 1),
    'press_stability': (0, 1),
    'conflict_persistence': (0, 1),
    'trait_convergence': (0, 1),
}

def apply_global_bounds(metrics_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    §1: Post-aggregation hard-cap enforcement.
    bounded_value = max(min(calculated_value, upper_bound), lower_bound)
    Only modifies numeric values that have defined bounds.
    Non-numeric keys and unknown keys pass through unchanged.
    """
    if not isinstance(metrics_dict, dict):
        return metrics_dict

    for key, (lo, hi) in METRIC_BOUNDS.items():
        if key in metrics_dict:
            val = metrics_dict[key]
            if isinstance(val, (int, float)):
                metrics_dict[key] = round_metric(max(lo, min(hi, float(val))))

    return metrics_dict

def compute_affective_integration(events: list, words: list) -> float:
    """
    §5: Blended emotional complexity detection.

    Formula:
        affective_integration =
           (0.4 * diversity_scaled) +
           (0.3 * transition_score_scaled) +
           (0.2 * emotional_depth_weight) +
           (0.1 * coexistence_bonus)

    Result scaled to 0–10.
    """
    if not events:
        return 5.0

    all_emotions = [e.get('emotion', '').lower() for e in events if e.get('emotion')]
    unique_emotions = len(set(all_emotions))
    total_mentions = max(1, len(all_emotions))
    diversity = unique_emotions / total_mentions

    valences = [e.get('valence', 0) for e in events]
    polarity_labels = []
    for v in valences:
        if v > 0.1:
            polarity_labels.append('positive')
        elif v < -0.1:
            polarity_labels.append('negative')
        else:
            polarity_labels.append('neutral')

    polarity_switches = sum(
        1 for i in range(1, len(polarity_labels))
        if polarity_labels[i] != polarity_labels[i - 1]
    )
    total_segments = max(1, len(polarity_labels) - 1)
    transition_score = polarity_switches / total_segments

    depth_tokens = {
        'guilt', 'shame', 'pride', 'longing', 'grief', 'remorse',
        'anguish', 'torn', 'conflicted', 'ambivalent', 'bittersweet',
        'nostalgic', 'yearning', 'despair', 'elation', 'dread'
    }
    depth_count = sum(1 for w in words if w.lower() in depth_tokens)
    emotional_depth_weight = min(1.0, depth_count / max(1, len(words) * 0.05))

    coexistence_bonus = 0.0
    WINDOW = 3
    for i in range(len(valences)):
        for j in range(max(0, i - WINDOW), min(len(valences), i + WINDOW + 1)):
            if i != j:
                if (valences[i] > 0.2 and valences[j] < -0.2) or\
                   (valences[i] < -0.2 and valences[j] > 0.2):
                    coexistence_bonus = 0.5
                    break
        if coexistence_bonus > 0:
            break

    raw = (0.4 * diversity) + (0.3 * transition_score) +\
          (0.2 * emotional_depth_weight) + (0.1 * coexistence_bonus)

    affective_integration = round_metric(raw * 10, 2)
    return max(0.0, min(10.0, affective_integration))

def compute_confidence_interval(score: float, n_events: int, scale_max: float = 100.0) -> dict:
    """
    Compute 95% confidence interval for a score based on event count.
    Uses score-proportional standard error scaled by sample size.
    Returns: {"value": score, "lower": lo, "upper": hi, "margin": margin}
    """
    if n_events <= 0:
        margin = scale_max * 0.15
    else:

        base_se = scale_max * 0.10
        se = base_se / (n_events ** 0.5)
        margin = round_metric(se * 1.96, 1)

    lo = round_metric(max(0, score - margin), 1)
    hi = round_metric(min(scale_max, score + margin), 1)
    return {"value": round_metric(score, 1), "lower": lo, "upper": hi, "margin": round_metric(margin, 1)}

def cap_extreme_scores(scores_dict: dict, psychosis_markers: bool = False) -> dict:
    """
    §10 (v3.1): Cap extreme dimension scores unless psychotic markers present.
    Non-psychosis: >90 capped to 88, <5 floored to 8.
    Reality testing: capped at 85 unless cognitive_complexity > 60.
    If psychosis_markers=True, no capping is applied.
    """
    if psychosis_markers:
        return scores_dict

    CAPPED_DIMS = {
        'ego_strength', 'reality_testing', 'affective_integration',
        'cognitive_complexity', 'social_cognition', 'emotional_stability',
        'narrative_coherence', 'object_relations'
    }
    cog_complexity = float(scores_dict.get('cognitive_complexity', 50))

    for key in CAPPED_DIMS:
        if key in scores_dict and isinstance(scores_dict[key], (int, float)):
            val = float(scores_dict[key])

            if key == 'reality_testing':
                if cog_complexity <= 60:
                    val = min(val, 85.0)
                else:
                    val = min(val, 90.0)

            if val > 90:
                val = round_metric(88.0)
            elif val < 5:
                val = round_metric(8.0)

            scores_dict[key] = round_metric(val)
    return scores_dict

def apply_precision_score_cap(
    scores_dict: dict,
    word_count: int = 0,
    cognitive_complexity: float = 0.0,
    has_multi_perspective: bool = False,
    has_emotional_contradiction: bool = False,
) -> dict:
    """
    Rule 3 (CoreTAT Calibration v1.2): Anti-Perfection Score Cap.

    No dimension may output 10.0 (or 100 on 0-100 scale) unless ALL criteria met:
      - word_count > 150
      - cognitive_complexity >= 7 (or 70 on 0-100 scale)
      - multi-perspective reasoning present
      - no emotional contradictions

    Otherwise: maximum per dimension = 8.8 (or 88 on 0-100 scale).
    Applied especially to: Social Cognition, Object Relations, Narrative Coherence.
    """

    PRECISION_CAP_DIMS = {
        'social_cognition', 'object_relations', 'narrative_coherence',
        'ego_strength', 'reality_testing', 'emotional_stability',
        'cognitive_complexity'
    }

    cog_ok = cognitive_complexity >= 7.0 or cognitive_complexity >= 70.0
    all_criteria_met = (
        word_count > 150
        and cog_ok
        and has_multi_perspective
        and not has_emotional_contradiction
    )

    for key in PRECISION_CAP_DIMS:
        if key in scores_dict and isinstance(scores_dict[key], (int, float)):
            val = float(scores_dict[key])

            cap_value = 10.0 if val <= 10.0 else 100.0
            max_allowed = cap_value if all_criteria_met else (8.8 if cap_value == 10.0 else 88.0)
            if val > max_allowed:

                reduced = max(8.5 if cap_value == 10.0 else 85.0, min(max_allowed, val))
                scores_dict[key] = round_metric(reduced)
    return scores_dict

def generate_variance_justification(dim_name: str, dim_value: float,
                                     n_events: int, valence_std: float = 0.0,
                                     event_type_count: int = 1) -> str:
    """
    §10 (v3.1): Generate a variance justification note for a dimension score.
    Explains WHY the score is high, moderate, or low.
    """
    if dim_value > 80:
        level = "High"
        if dim_name == 'reality_testing':
            reason = "high agent consistency and situated event structure"
        elif dim_name == 'ego_strength':
            reason = "strong resolution patterns and high agency"
        elif dim_name == 'emotional_stability':
            reason = f"low affective variance (σ={valence_std:.2f})"
        else:
            reason = "strong signal density"
    elif dim_value > 40:
        level = "Moderate"
        reason = "balanced evidence across narrative indicators"
    else:
        level = "Low"
        if n_events < 5:
            reason = f"limited event count ({n_events})"
        elif valence_std > 0.5:
            reason = f"high affective variability (σ={valence_std:.2f})"
        elif event_type_count <= 2:
            reason = f"limited event diversity ({event_type_count} types)"
        else:
            reason = "weak signal density"

    return f"{dim_name}: {level} ({dim_value:.1f}) — {reason}"

def compute_internal_consistency(card_scores_list: List[dict]) -> float:
    """
    Compute internal consistency of dimension scores across cards.

    For n_cards >= 3: Cronbach's alpha with sample variance (ddof=1).
    For n_cards == 2: Split-half correlation (Spearman-Brown corrected).
    Returns alpha in [0, 1]. Returns 0.0 if insufficient data.
    """
    if not card_scores_list or len(card_scores_list) < 2:
        return 0.0

    common_keys = set(card_scores_list[0].keys())
    for cs in card_scores_list[1:]:
        common_keys &= set(cs.keys())

    numeric_keys = sorted(
        k for k in common_keys
        if all(isinstance(cs.get(k), (int, float)) for cs in card_scores_list)
    )

    if len(numeric_keys) < 2:
        return 0.0

    n_cards = len(card_scores_list)
    k = len(numeric_keys)

    if n_cards == 2:
        v1 = np.array([float(card_scores_list[0][key]) for key in numeric_keys])
        v2 = np.array([float(card_scores_list[1][key]) for key in numeric_keys])
        std1, std2 = float(np.std(v1)), float(np.std(v2))
        if std1 == 0 or std2 == 0:
            return 0.5
        r = float(np.corrcoef(v1, v2)[0, 1])
        r = max(0.0, r)

        alpha = (2 * r) / (1 + r) if (1 + r) > 0 else 0.0
        return round_metric(max(0.0, min(1.0, alpha)), 3)

    item_scores = []
    for key in numeric_keys:
        vals = [float(cs[key]) for cs in card_scores_list]
        item_scores.append(vals)

    item_vars = [float(np.var(vals, ddof=1)) for vals in item_scores]
    sum_item_vars = sum(item_vars)

    totals = [sum(item_scores[j][i] for j in range(k)) for i in range(n_cards)]
    total_var = float(np.var(totals, ddof=1))

    if total_var == 0:
        return 1.0

    alpha = (k / (k - 1)) * (1 - sum_item_vars / total_var)
    return round_metric(max(0.0, min(1.0, alpha)), 3)

def compute_cross_card_convergence(card_scores_list: List[dict]) -> float:
    """
    Mean pairwise correlation across cards for dimension scores.
    Returns correlation in [0, 1]. Returns 0.0 if insufficient data.
    """
    if not card_scores_list or len(card_scores_list) < 2:
        return 0.0

    common_keys = set(card_scores_list[0].keys())
    for cs in card_scores_list[1:]:
        common_keys &= set(cs.keys())
    numeric_keys = sorted(k for k in common_keys
                          if all(isinstance(cs.get(k), (int, float)) for cs in card_scores_list))

    if len(numeric_keys) < 3:
        return 0.0

    vectors = []
    for cs in card_scores_list:
        vectors.append([float(cs[k]) for k in numeric_keys])

    correlations = []
    for i in range(len(vectors)):
        for j in range(i + 1, len(vectors)):
            v1, v2 = np.array(vectors[i]), np.array(vectors[j])
            if np.std(v1) == 0 or np.std(v2) == 0:
                correlations.append(0.0)
            else:
                corr = float(np.corrcoef(v1, v2)[0, 1])
                correlations.append(max(0.0, corr))

    return round_metric(float(np.mean(correlations)) if correlations else 0.0, 3)

def compute_interpretive_confidence(
    n_cards: int,
    avg_word_count: float,
    n_themes: int,
    internal_consistency: float = None,
) -> float:
    """
    Composite confidence score for interpretation reliability.
    Factors: number of cards, narrative length, thematic richness,
    and internal consistency (if available).

    Safeguards:
      - Hard cap at 0.60 for ≤2 cards
      - Consistency gate: if α < 0.3, cap at 0.50
    Returns score in [0, 1].
    """
    card_factor = min(1.0, n_cards / 6.0)
    length_factor = min(1.0, avg_word_count / 150.0)
    theme_factor = min(1.0, n_themes / 4.0)

    if internal_consistency is not None and internal_consistency > 0:

        consistency_factor = min(1.0, internal_consistency / 0.7)
        raw = (0.30 * card_factor) + (0.25 * length_factor) +\
              (0.20 * theme_factor) + (0.25 * consistency_factor)
    else:
        raw = (0.40 * card_factor) + (0.35 * length_factor) + (0.25 * theme_factor)

    confidence = max(0.0, min(1.0, raw))

    if n_cards <= 2:
        confidence = min(confidence, 0.60)

    if internal_consistency is not None and internal_consistency < 0.3:
        confidence = min(confidence, 0.50)

    return round_metric(confidence, 3)

def check_narrative_complexity_threshold(word_count: int, n_events: int, n_unique_emotions: int) -> str:
    """
    Assess whether narrative complexity is adequate for reliable interpretation.
    Returns: "adequate", "marginal", or "insufficient"
    """
    score = 0
    if word_count >= 100:
        score += 2
    elif word_count >= 50:
        score += 1

    if n_events >= 5:
        score += 2
    elif n_events >= 3:
        score += 1

    if n_unique_emotions >= 3:
        score += 1

    if score >= 4:
        return "adequate"
    elif score >= 2:
        return "marginal"
    return "insufficient"

def validate_metrics(metrics_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    §8: Pre-render validation checks.
    - No metric exceeds defined bounds
    - No negative values where invalid
    - No percentage > 100
    - No divide-by-zero risk
    Auto-corrects via bounding. Logs internally.
    Does NOT expose validation log in report.
    """
    if not isinstance(metrics_dict, dict):
        return metrics_dict

    _validation_log = []

    for key, (lo, hi) in METRIC_BOUNDS.items():
        if key in metrics_dict:
            val = metrics_dict[key]
            if isinstance(val, (int, float)):
                fval = float(val)
                if fval < lo or fval > hi:
                    _validation_log.append({
                        "metric": key,
                        "original": fval,
                        "corrected": max(lo, min(hi, fval)),
                        "bound": f"[{lo}, {hi}]"
                    })
                    metrics_dict[key] = round_metric(max(lo, min(hi, fval)))

    for key, val in metrics_dict.items():
        if isinstance(val, (int, float)) and key not in METRIC_BOUNDS:
            if 'percent' in key.lower() or 'confidence' in key.lower():
                if float(val) > 100.0:
                    _validation_log.append({
                        "metric": key,
                        "original": float(val),
                        "corrected": 100.0,
                        "bound": "[0, 100]"
                    })
                    metrics_dict[key] = 100.0

    if _validation_log:
        metrics_dict['_validation_log'] = _validation_log

    return metrics_dict

_INVALID_AUTHORITY_TOKENS = {

    "violin", "book", "gun", "picture", "painting", "letter", "piano",
    "desk", "chair", "table", "bed", "door", "window", "mirror", "lamp",
    "candle", "knife", "rope", "crops", "harvest", "tools", "plow",
    "money", "car", "boat", "train", "horse", "photograph", "diary",
    "medicine", "clock", "key", "flower", "tree", "bridge",

    "drought", "poverty", "weather", "war", "famine", "disease",
    "economy", "government", "society", "nature", "storm", "flood",
    "earthquake", "fire", "darkness", "night", "school", "city",
    "village", "town", "country", "world", "land", "field", "farm",
    "river", "mountain", "forest", "road", "house", "home", "room",
    "building", "church", "temple", "hospital", "prison", "market",

    "mistake", "error", "problem", "issue", "failure", "success",
    "hope", "fear", "love", "hate", "desire", "dream", "thought",
    "idea", "feeling", "emotion", "belief", "truth", "fate", "destiny",
    "life", "death", "time", "future", "past", "silence", "peace",
    "chaos", "order", "justice", "freedom", "identity", "self", "soul",
    "mind", "heart", "pain", "joy", "sorrow", "grief", "anger", "guilt",
    "shame", "loneliness", "happiness", "sadness", "anxiety", "confusion",
    "luck", "fortune", "interests", "opportunity", "circumstance",
}

_REPAIR_MARKERS = {
    "eventually", "understands", "learns", "improves", "supported", "realizes",
    "comes to", "begins to", "starts to", "manages to", "finds a way",
    "works through", "heals", "recovers", "rebuilds", "reconnects", "accepts",
    "adapted", "copes", "grows", "better", "hopeful", "strength", "courage",
    "moves on", "agrees", "confident", "relief", "understanding", "improvement",
    "stabilizes", "resolved", "at peace", "finally", "ultimately",
}

_NEGATIVE_ENDING_MARKERS = {
    "never", "hopeless", "alone", "died", "lost", "broken", "gave up",
    "destroyed", "failed", "nothing", "collapsed", "suicide", "end",
    "darkness", "despair", "abandoned", "no hope", "no way out",
}

def validate_and_autocorrect_analysis(analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    v3.3 Pre-output validation gate.
    Enforces all 5 rules and auto-corrects violations before report generation.
    Returns (possibly corrected) analysis dict with 'validation_report' appended.
    """
    corrections = []

    rel_patterns = analysis.get("relational_patterns", {})
    valid_figures = rel_patterns.get("valid_figure_types", [])
    hero_entities = {f["entity"] for f in valid_figures if f.get("type") == "Hero"}

    for fig in valid_figures:
        if fig.get("type") != "Authority Figure":
            continue
        entity_lower = fig["entity"].lower()

        if entity_lower in _INVALID_AUTHORITY_TOKENS:
            fig["type"] = "Environmental Press" if entity_lower in {
                "drought","poverty","weather","war","famine","disease",
                "economy","school"
            } else "Symbolic Object"
            fig["authority_validation"] = "FAIL (auto-corrected by gate)"
            corrections.append(f"Authority→{fig['type']}: '{fig['entity']}'")

        elif fig["entity"] in hero_entities:
            fig["type"] = "Peer"
            fig["authority_validation"] = "FAIL (Hero cannot be Authority)"
            corrections.append(f"Authority→Peer (was Hero): '{fig['entity']}'")

    remaining_auth = [f for f in valid_figures if f.get("type") == "Authority Figure"]
    analysis.setdefault("relational_patterns", {})["authority_present"] = (
        bool(remaining_auth)
    )
    if not remaining_auth:
        analysis["relational_patterns"]["authority_display"] = "None"

    for fig in valid_figures:
        if fig.get("type") != "Contemporary":
            continue
        entity_lower = fig["entity"].lower()

        if entity_lower in _INVALID_AUTHORITY_TOKENS:
            fig["type"] = "Symbolic Object"
            fig["authority_validation"] = "FAIL (Contemporary→Object by gate)"
            corrections.append(f"Contemporary→Symbolic Object: '{fig['entity']}'")
        elif fig["entity"] in hero_entities:
            fig["type"] = "Peer"
            fig["authority_validation"] = "FAIL (Hero cannot be Contemporary)"
            corrections.append(f"Contemporary→Peer (was Hero): '{fig['entity']}'")

    remaining_contemp = [f for f in valid_figures if f.get("type") == "Contemporary"]
    analysis.setdefault("relational_patterns", {})["contemporary_present"] = (
        bool(remaining_contemp)
    )

    conflicts = analysis.get("conflict_structure", [])
    global_cs = analysis.get("global_conflict_score", {})
    top_divergence = max(
        (c.get("intensity", 0) for c in conflicts), default=0.0
    )

    for c in conflicts:
        intensity = c.get("intensity", 0)
        status = c.get("status", "Unresolved")

        if intensity >= 1.0 and (top_divergence < 0.9 or "resolved" in status.lower()):
            c["intensity"] = 0.88
            corrections.append(f"Conflict intensity capped 1.00→0.88: {c.get('type')}")

        if "resolved" in status.lower() and intensity > 0.80:
            c["intensity"] = round(min(intensity, 0.80), 2)
            corrections.append(f"Resolved conflict capped: {c.get('type')}")

    if conflicts:
        sorted_c = sorted(conflicts, key=lambda x: -x.get("intensity", 0))
        top2 = sorted_c[:2]
        intensities = [c.get("intensity", 0) for c in top2]
        wm = intensities[0] * 0.6 + (intensities[1] * 0.4 if len(intensities) > 1 else 0)
        resolved_any = any("resolved" in c.get("status", "").lower() for c in top2)
        penalty = 0.70 if resolved_any else 1.0
        new_global = min(wm * penalty, intensities[0] + 0.1)
        new_global = max(0.0, min(1.0, new_global))
        if abs(new_global - global_cs.get("global_conflict", 0)) > 0.05:
            corrections.append(
                f"Global conflict updated: {global_cs.get('global_conflict',0):.2f}→{new_global:.2f}"
            )
            analysis["global_conflict_score"]["global_conflict"] = round(new_global, 2)

    story_text = analysis.get("story_text", "")
    story_lower = story_text.lower()
    repair_count = sum(1 for m in _REPAIR_MARKERS if m in story_lower)
    neg_count = sum(1 for m in _NEGATIVE_ENDING_MARKERS if m in story_lower)

    for c in conflicts:
        status = c.get("status", "")

        if status == "Unresolved" and repair_count >= 2 and neg_count == 0:
            c["status"] = "Partially Resolved"
            corrections.append(f"Resolution corrected Unresolved→Partially Resolved: {c.get('type')}")

        if status in ("Unresolved", "Partially Resolved") and repair_count >= 3 and neg_count == 0:
            c["status"] = "Resolved (Adaptive Integration)"
            corrections.append(f"Resolution upgraded to Resolved: {c.get('type')}")

    CAPPED_KEYS = [
        "reality_testing", "ego_strength", "emotional_stability",
        "narrative_coherence", "social_cognition"
    ]

    story_text_for_cap = analysis.get("story_text", "")
    wc_for_cap = len(story_text_for_cap.split())
    for key in CAPPED_KEYS:
        for store in [analysis, analysis.get("dimension_scores", {}),
                      analysis.get("quantitative_scores", {})]:
            val = store.get(key)
            if isinstance(val, (int, float)) and val > 88:

                store[key] = 88.0
                corrections.append(f"Score cap (Rule 3): {key} {val:.1f}→88.0")

    n_cards = len(analysis.get("card_analyses", analysis.get("cards", []))) if isinstance(
        analysis.get("card_analyses", analysis.get("cards", [])), list
    ) else 0
    ego_traj = analysis.get("ego_trajectory", {})
    if isinstance(ego_traj, dict) and n_cards > 0 and n_cards <= 3:
        raw_vol = float(ego_traj.get("raw_volatility", ego_traj.get("volatility", 0)))
        scaled_vol = round(raw_vol * 0.35, 3)
        trend_change = float(ego_traj.get("trend_change", raw_vol))
        scaled_change = round(trend_change * 0.35, 3)

        if scaled_change < 1.0:
            trend_label = "Stable"
        elif scaled_change < 2.0:
            trend_label = "Mild Fluctuation"
        else:
            trend_label = "Situational Spike"
        if ego_traj.get("volatility") != scaled_vol:
            ego_traj["volatility"] = scaled_vol
            ego_traj["trend"] = trend_label
            ego_traj["n_cards_scale_applied"] = n_cards
            corrections.append(f"Ego volatility scaled (×0.35 for {n_cards} cards): {raw_vol:.3f}→{scaled_vol:.3f} [{trend_label}]")

    rp = analysis.get("relational_patterns", {})
    att = rp.get("attachment_classification", {})
    style = att.get("style", "")
    security = att.get("attachment_security", 0.5)

    if "Indeterminate" in style and not (0.40 <= security <= 0.60):
        new_sec = max(0.40, min(0.60, security))
        att["attachment_security"] = round(new_sec, 2)
        rp["attachment_consistency_check"] = "FAIL (auto-corrected by gate)"
        corrections.append(f"Attachment security adjusted for Indeterminate: {security:.2f}→{new_sec:.2f}")
    elif security > 0.65 and "Indeterminate" in style:
        att["style"] = "Secure (Revised)"
        rp["attachment_valence"] = "Secure (Revised)"
        rp["attachment_consistency_check"] = "FAIL (auto-corrected by gate)"
        corrections.append(f"Attachment style revised Indeterminate→Secure (security={security:.2f})")
    elif style in ("Anxious-Ambivalent", "Avoidant") and security > 0.65:
        att["attachment_security"] = 0.60
        rp["attachment_consistency_check"] = "FAIL (auto-corrected by gate)"
        corrections.append(f"Attachment security capped for {style}: {security:.2f}→0.60")

    analysis["validation_report"] = {
        "gate": "v3.3 Pre-Output Validation",
        "corrections_made": len(corrections),
        "corrections": corrections,
        "status": "PASS" if not corrections else "CORRECTED",
    }
    if corrections:
        print(f"  🔧 Pre-output gate corrected {len(corrections)} issue(s):")
        for c in corrections:
            print(f"     • {c}")
    else:
        print("  ✅ Pre-output validation gate: PASS (no corrections needed)")

    return analysis
