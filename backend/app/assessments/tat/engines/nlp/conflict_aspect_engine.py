"""
Conflict Aspect Engine
----------------------
Detects explicit dynamic tensions and conflicts within the narrative.
Models parallel conflicts (not just sequential) using embedding similarity
against established clinical conflict prototypes.

RECALIBRATION v3.0:
- Added explicit conflict labeling (primary/secondary, domain, polarity, resolution)
- Added conflict intensity and cross-card persistence scoring
- Preserved all original detection logic
"""

import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class Conflict:
    type: str
    forces: List[str]
    intensity: float
    status: str
    evidence: str

# Conflict Prototypes based on clinical literature
CONFLICT_PROTOTYPES = {
    "Approach-Avoidance": [
        "The character wants something but is afraid to get it.",
        "Desire is blocked by fear of consequences.",
        "They are torn between moving forward and pulling back.",
        "Ambivalence about a goal due to perceived danger."
    ],
    "Desire-Prohibition": [
        "The character wants something that is forbidden.",
        "Internal moral standards block a strong impulse.",
        "They feel guilty about what they want to do.",
        "Authority or super-ego blocks the id drive."
    ],
    "Autonomy-Dependency": [
        "The character wants to be independent but feels they need help.",
        "Struggling between standing alone and relying on others.",
        "Resentment of dependency but fear of isolation.",
        "Trying to break free but feeling unable to survive alone."
    ],
    "Aggression-Guilt": [
        "The character wants to hurt someone but feels bad about it.",
        "Anger is expressed and then immediately regretted.",
        "Hostile impulses are checked by conscience.",
        "Fear of their own destructive potential."
    ],
    "Dominance-Submission": [
        "The character oscillates between taking charge and giving in.",
        "Struggle to assert authority versus fear of retaliation.",
        "Resenting control but afraid to lead.",
        "Power dynamic shifting rapidly."
    ],
    "Affiliation-Rejection": [
        "The character wants to be close but fears being hurt.",
        "Desire for intimacy blocked by fear of abandonment.",
        "Pushing people away to avoid being rejected.",
        "Loneliness versus safety in isolation."
    ]
}

# --- Recalibration: Conflict polarity mapping ---
CONFLICT_POLARITY_MAP = {
    "Approach-Avoidance": "Approach–Avoidance",
    "Desire-Prohibition": "Approach–Avoidance",
    "Autonomy-Dependency": "Approach–Avoidance",
    "Aggression-Guilt": "Approach–Avoidance",
    "Dominance-Submission": "Avoidance–Avoidance",
    "Affiliation-Rejection": "Approach–Avoidance",
}

# --- Recalibration: Conflict domain mapping ---
CONFLICT_DOMAIN_MAP = {
    "Approach-Avoidance": "Intrapersonal",
    "Desire-Prohibition": "Intrapersonal",
    "Autonomy-Dependency": "Developmental",
    "Aggression-Guilt": "Intrapersonal",
    "Dominance-Submission": "Interpersonal",
    "Affiliation-Rejection": "Interpersonal",
}

# --- Recalibration: Resolution keyword sets (v3.1 expanded) ---
RESOLUTION_KEYWORDS = {
    "Assertive": {"stood up", "confronted", "demanded", "insisted", "asserted",
                  "spoke up", "challenged", "declared", "took charge", "determined"},
    "Integrated": {"resolved", "overcame", "succeeded", "grew", "learned", "accepted",
                   "peace", "achieved", "together", "reconciled", "forgave",
                   "understood", "balanced", "compromise", "cooperated"},
    "Compliant": {"obeyed", "followed", "agreed", "submitted", "accepted quietly",
                  "gave in", "complied", "did as told", "listened", "yielded"},
    "Avoidant": {"left", "escaped", "ran", "ignored", "forgot", "walked away",
                 "abandoned", "fled", "avoided", "turned away", "withdrew"},
    "Defensive": {"blamed", "attacked", "denied", "projected", "anger", "fought",
                  "retaliated", "refused", "rejected", "destroyed"},
}

# v3.2 Fix 3: Narrative repair markers
NARRATIVE_REPAIR_MARKERS = {
    "eventually", "understands", "learns", "improves", "supported",
    "realizes", "comes to", "begins to", "starts to", "manages to",
    "finds a way", "works through", "heals", "recovers", "rebuilds",
    "reconnects", "accepts", "adapted", "copes", "grows",
    "better", "hopeful", "strength", "courage", "moves on",
}

NEGATIVE_ENDING_MARKERS = {
    "never", "hopeless", "alone", "died", "lost", "broken",
    "gave up", "destroyed", "failed", "nothing", "collapsed",
    "suicide", "end", "darkness", "despair", "abandoned",
}


def _strip_np(val: str) -> str:
    """Strips internal 'n' or 'p' prefixes from Murray labels at display-level."""
    if isinstance(val, str):
        # Handle older PascalCase like "nAchievement"
        if val.startswith('n') and len(val) > 1 and val[1].isupper():
            return val[1:]
        if val.startswith('p') and len(val) > 1 and val[1].isupper():
            return val[1:]
    return str(val)


class ConflictAspectEngine:
    """
    Analyzes narrative for specific structural conflicts.
    Operates IN PARALLEL with Need detection.
    """

    def __init__(self, nlp_processor, rag_engine=None):
        self.processor = nlp_processor
        self.rag_engine = rag_engine
        self.conflict_embs = {}
        self._compute_prototypes()

    def _compute_prototypes(self):
        """Pre-compute embeddings for conflict descriptions."""
        for c_type, sentences in CONFLICT_PROTOTYPES.items():
            self.conflict_embs[c_type] = self.processor.get_embeddings(sentences)

    def _classify_resolution_pattern(self, narrative_text: str) -> str:
        """Classify narrative resolution pattern from keyword analysis."""
        text_lower = narrative_text.lower()
        pattern_scores = {}
        for pattern, keywords in RESOLUTION_KEYWORDS.items():
            count = sum(1 for kw in keywords if kw in text_lower)
            pattern_scores[pattern] = count

        best = max(pattern_scores, key=pattern_scores.get)
        if pattern_scores[best] > 0:
            return best
        return "Unresolved"

    def detect_conflicts(self, narrative_text: str, distinct_events: List[Dict]) -> List[Dict[str, Any]]:
        """
        Detects conflicts based on narrative similarity to prototypes.
        Returns enriched conflict dicts with explicit labeling.
        """
        if not narrative_text.strip():
            return []

        # 1. Global Narrative Embedding
        narrative_emb = self.processor.get_embeddings([narrative_text])
        
        conflicts = []

        # 2. Check against each conflict prototype
        for c_type, proto_embs in self.conflict_embs.items():
            # Similarity: (1, dim) . (N, dim).T -> (1, N)
            sims = np.dot(narrative_emb, proto_embs.T) / (
                np.linalg.norm(narrative_emb) * np.linalg.norm(proto_embs, axis=1) + 1e-8
            )
            score = np.mean(sims)

            # Threshold for detection
            if score > 0.45:  # Tunable threshold
                # --- v3.2 Fix 3: Enhanced resolution detection ---
                resolution_pattern = self._classify_resolution_pattern(narrative_text)
                resolution_status = self._determine_resolution_status(narrative_text, resolution_pattern)

                conflict_polarity = CONFLICT_POLARITY_MAP.get(c_type, "Approach–Avoidance")
                conflict_domain = CONFLICT_DOMAIN_MAP.get(c_type, "Intrapersonal")

                # Determine Need vs Press from forces
                forces = c_type.split("-")
                primary_conflict = f"{_strip_np(forces[0])} (Need) vs {_strip_np(forces[1])} (Press)" if len(forces) >= 2 else _strip_np(c_type)

                conflicts.append({
                    "type": _strip_np(c_type),
                    "intensity": float(score),
                    "status": resolution_status,
                    "forces": [_strip_np(f) for f in forces],
                    "evidence": f"Narrative coherence with {_strip_np(c_type)} themes (Score: {score:.2f})",
                    "primary_conflict": primary_conflict,
                    "conflict_domain": conflict_domain,
                    "conflict_polarity": conflict_polarity,
                    "resolution_pattern": resolution_pattern,
                    "conflict_persistence_score": 0.0,
                })

        # --- KB augmentation: enrich conflict evidence ---
        conflicts = self._augment_with_kb(conflicts)

        return sorted(conflicts, key=lambda x: -x['intensity'])

    def _determine_resolution_status(self, narrative_text: str, resolution_pattern: str) -> str:
        """
        Calibrated resolution status (Rule 2 — Psyichub Calibration v1.2).
        3-tier: Resolved (Adaptive Integration) / Partially Resolved / Unresolved

        Resolved (Adaptive Integration) requires:
          - Mutual agreement / emotional relief / increased confidence /
            strengthened relationship / explicit learning in ending
          - No remaining emotional tension markers in final portion

        Partially Resolved:
          - Repair occurred but emotional tension visible in final paragraph

        Unresolved:
          - Negative > repair, or avoidant/defensive pattern dominates
        """
        text_lower = narrative_text.lower()

        # Extended adaptive integration markers (Rule 2 additions)
        ADAPTIVE_MARKERS = NARRATIVE_REPAIR_MARKERS | {
            "agreed", "mutually", "relief", "relieved", "confident",
            "stronger", "strengthened", "learned", "understood",
            "at peace", "together", "reconciled", "forgave", "integrated",
            "resolved", "settled", "closure", "finally", "ultimately",
            "feels better", "moved forward", "proud", "succeed", "overcame",
        }

        repair_count = sum(1 for marker in ADAPTIVE_MARKERS if marker in text_lower)
        negative_count = sum(1 for marker in NEGATIVE_ENDING_MARKERS if marker in text_lower)

        # Final portion (last 25% of words)
        words = text_lower.split()
        final_portion = ' '.join(words[-(max(1, len(words) // 4)):]) if len(words) > 8 else text_lower
        final_repair = sum(1 for marker in ADAPTIVE_MARKERS if marker in final_portion)
        final_negative = sum(1 for marker in NEGATIVE_ENDING_MARKERS if marker in final_portion)

        # ---- Tier 1: Resolved (Adaptive Integration) ----
        # Strong repair signal AND ending is stabilized (no tension in final portion)
        if repair_count >= 2 and final_negative == 0 and resolution_pattern in ("Integrated", "Assertive"):
            return "Resolved (Adaptive Integration)"

        # Upgrade: even 1 repair marker is enough if ending tone is clearly stable
        if repair_count >= 1 and final_repair > 0 and final_negative == 0 and resolution_pattern in ("Integrated", "Assertive"):
            return "Resolved (Adaptive Integration)"

        # ---- Tier 2: Partially Resolved ----
        # Repair occurred but emotional tension remains in ending
        if repair_count >= 1 and final_negative > 0:
            return "Partially Resolved"
        if repair_count >= 1 and resolution_pattern in ("Compliant", "Integrated", "Assertive"):
            # Check if ending has any residual tension
            if final_negative == 0:
                return "Resolved (Adaptive Integration)"
            return "Partially Resolved"
        if repair_count > 0 and negative_count > 0:
            return "Partially Resolved"

        # ---- Tier 3: Unresolved ----
        if resolution_pattern in ("Avoidant", "Defensive"):
            return "Unresolved"
        if negative_count > repair_count and final_negative > 0:
            return "Unresolved"
        if repair_count > 0:
            return "Partially Resolved"
        return "Unresolved"

    def compute_global_conflict_score(self, conflicts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        v3.2 Fix 2: Compute harmonized global conflict score.
        Uses weighted mean of top-2 divergences with resolution penalty.
        Global conflict cannot exceed highest divergence + 0.1.
        """
        if not conflicts:
            return {"global_conflict": 0.0, "method": "no_conflicts", "confidence": 0.0}

        # Sort by intensity descending
        sorted_conflicts = sorted(conflicts, key=lambda c: -c.get('intensity', 0))
        intensities = [c.get('intensity', 0) for c in sorted_conflicts[:2]]

        # Weighted mean of top-2 (weight: 0.6 for top, 0.4 for second)
        if len(intensities) >= 2:
            weighted_mean = intensities[0] * 0.6 + intensities[1] * 0.4
        else:
            weighted_mean = intensities[0]

        # Resolution penalty: reduce by 20-40% if resolved
        resolved_any = any(
            'resolved' in c.get('status', '').lower()
            for c in sorted_conflicts[:2]
        )
        if resolved_any:
            # Reduce by 30% (midpoint of 20-40%)
            resolution_penalty = 0.70
        else:
            resolution_penalty = 1.0

        global_score = weighted_mean * resolution_penalty

        # Cap: cannot exceed highest divergence + 0.1
        max_allowed = intensities[0] + 0.1
        global_score = min(global_score, max_allowed)

        # Clamp to [0, 1]
        global_score = max(0.0, min(1.0, global_score))

        return {
            "global_conflict": round(global_score, 2),
            "method": "weighted_mean_top2_with_penalty",
            "top_divergences": [round(i, 2) for i in intensities],
            "resolution_penalty_applied": resolved_any,
            "confidence": min(0.9, 0.3 + len(conflicts) * 0.15),
        }


    def detect_conflicts_from_murray(
        self,
        narrative_text: str,
        murray_result: dict,
        events: list,
        is_single_card: bool = True,
        rag_engine=None,
    ) -> List[Dict[str, Any]]:
        """
        Derive explicit conflict semantics from top Murray needs vs presses.
        This guarantees every card has at least one named conflict.
        Returns enriched conflict dicts.
        rag_engine: optional override for KB augmentation.
        """
        top_needs = murray_result.get('needs', [])[:3]
        top_presses = murray_result.get('presses', [])[:3]
        resolution_pattern = self._classify_resolution_pattern(narrative_text)

        # Compute intensity from need-press divergence
        need_scores = {n: s for n, s in top_needs}
        press_scores = {p: s for p, s in top_presses}

        conflicts = []

        # Generate primary conflict: top need vs top press
        if top_needs and top_presses:
            primary_need, primary_need_score = top_needs[0]
            primary_press, primary_press_score = top_presses[0]
            divergence = abs(primary_need_score - primary_press_score)
            intensity = min(1.0, divergence * 2.0 + 0.3)  # baseline + divergence

            # Domain classification from need-press types
            domain = self._infer_conflict_domain(primary_need, primary_press)
            polarity = self._infer_polarity(primary_need, primary_press, resolution_pattern)

            # --- v3.3 Fix 2: Use narrative repair markers for resolution ---
            resolution_status = self._determine_resolution_status(narrative_text, resolution_pattern)

            # --- v3.3 Fix 3: Conflict 1.00 lock ---
            # intensity = 1.00 only if: divergence >= 0.9 AND no resolution AND high event neg
            if intensity >= 0.95 and resolution_status != "Unresolved":
                intensity = min(intensity, 0.88)
            elif intensity >= 1.0 and divergence < 0.9:
                intensity = min(intensity, 0.90)

            conflicts.append({
                "type": f"{_strip_np(primary_need)}-{_strip_np(primary_press)}",
                "primary_conflict": f"{_strip_np(primary_need)} vs {_strip_np(primary_press)}",
                "forces": [_strip_np(primary_need), _strip_np(primary_press)],
                "conflict_domain": domain,
                "conflict_polarity": polarity,
                "resolution_pattern": resolution_pattern,
                "intensity": round(intensity, 2),
                "status": resolution_status,
                "evidence": f"Need {_strip_np(primary_need)} ({primary_need_score:.2f}) vs Press {_strip_np(primary_press)} ({primary_press_score:.2f})",
                "conflict_persistence_score": "N/A" if is_single_card else 0.0,
                "is_primary": True,
            })

        # Secondary conflict: 2nd need vs 2nd press (if available)
        if len(top_needs) >= 2 and len(top_presses) >= 2:
            sec_need, sec_need_score = top_needs[1]
            sec_press, sec_press_score = top_presses[1]
            divergence = abs(sec_need_score - sec_press_score)
            intensity = min(1.0, divergence * 1.5 + 0.2)
            domain = self._infer_conflict_domain(sec_need, sec_press)
            polarity = self._infer_polarity(sec_need, sec_press, resolution_pattern)

            sec_resolution = self._determine_resolution_status(narrative_text, resolution_pattern)
            # Fix 3: secondary conflict intensity lock
            if intensity >= 1.0 and divergence < 0.9:
                intensity = min(intensity, 0.85)

            conflicts.append({
                "type": f"{_strip_np(sec_need)}-{_strip_np(sec_press)}",
                "primary_conflict": f"{_strip_np(sec_need)} vs {_strip_np(sec_press)}",
                "forces": [_strip_np(sec_need), _strip_np(sec_press)],
                "conflict_domain": domain,
                "conflict_polarity": polarity,
                "resolution_pattern": resolution_pattern,
                "intensity": round(intensity, 2),
                "status": sec_resolution,
                "evidence": f"Need {_strip_np(sec_need)} ({sec_need_score:.2f}) vs Press {_strip_np(sec_press)} ({sec_press_score:.2f})",
                "conflict_persistence_score": "N/A" if is_single_card else 0.0,
                "is_primary": False,
            })

        # If no needs or presses, fallback to prototype-based detection
        if not conflicts:
            conflicts = self.detect_conflicts(narrative_text, events)

        # --- KB augmentation: enrich conflict evidence ---
        active_rag = rag_engine or self.rag_engine
        if active_rag:
            conflicts = self._augment_with_kb(conflicts, active_rag)

        return conflicts

    def _augment_with_kb(
        self, conflicts: List[Dict[str, Any]], rag_engine=None
    ) -> List[Dict[str, Any]]:
        """
        Enrich conflict dicts with knowledge base evidence.
        Adds 'knowledge_base_evidence' field to each conflict.
        Best-effort: failures silently fall back to no augmentation.
        """
        active_rag = rag_engine or self.rag_engine
        if not active_rag or not hasattr(active_rag, 'retrieve_for_domain'):
            return conflicts

        try:
            conflict_types = [c.get('type', '') for c in conflicts[:3]]
            query = " ".join(conflict_types)
            if query.strip():
                passages = active_rag.retrieve_for_domain("conflict", query, top_k=3)
                if passages and hasattr(active_rag, 'format_context_concise'):
                    kb_evidence = active_rag.format_context_concise(passages)
                elif passages:
                    kb_evidence = active_rag.format_context(passages, max_chars=800)
                else:
                    kb_evidence = ""
                
                if kb_evidence:
                    for conflict in conflicts:
                        conflict["knowledge_base_evidence"] = kb_evidence
        except Exception:
            pass  # KB augmentation is best-effort

        return conflicts

    def _infer_conflict_domain(self, need: str, press: str) -> str:
        """Classify conflict domain from need-press types."""
        need_lower = need.lower()
        press_lower = press.lower()

        interpersonal_markers = {'affiliation', 'rejection', 'dominance', 'aggression',
                                  'nurturance', 'succorance', 'deference', 'abasement'}
        developmental_markers = {'autonomy', 'achievement', 'exhibition', 'play',
                                  'understanding', 'construction'}

        for marker in interpersonal_markers:
            if marker in need_lower or marker in press_lower:
                return "Interpersonal"
        for marker in developmental_markers:
            if marker in need_lower or marker in press_lower:
                return "Developmental"
        return "Intrapersonal"

    def _infer_polarity(self, need: str, press: str, resolution: str) -> str:
        """Classify conflict polarity."""
        avoidance_needs = {'harmavoidance', 'blameavoidance', 'infavoidance'}
        approach_needs = {'achievement', 'affiliation', 'autonomy', 'nurturance', 'exhibition'}

        n_lower = need.lower()
        if n_lower in avoidance_needs:
            return "Avoidance–Avoidance"
        if n_lower in approach_needs and resolution in ("Avoidant", "Defensive"):
            return "Approach–Avoidance"
        if n_lower in approach_needs:
            return "Approach–Approach"
        return "Approach–Avoidance"
