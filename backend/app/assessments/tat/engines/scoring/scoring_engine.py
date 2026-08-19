"""
Scoring Engine
--------------
Provides multi-dimensional TAT scores based on narrative events.

RECALIBRATION v3.0:
- Added confidence intervals per dimension score
- Added extreme score capping (unless psychosis markers present)
- Added variance explanation notes
"""

from typing import Dict, Any
import numpy as np
from app.utils.production_utils import (
    compute_confidence_interval, cap_extreme_scores, round_metric,
    generate_variance_justification, apply_precision_score_cap
)

class TATScoringEngine:
    def __init__(self, config, knowledge_graph=None, nlp_processor=None):
        self.config = config
        self.knowledge_graph = knowledge_graph
        self.nlp_processor = nlp_processor  # Optional: for semantic coherence scoring

    def score_story(self, story_text: str, events: list = None) -> Dict[str, Any]:
        """
        Compute dimension scores from events if provided, else from text.
        """
        if events is None:
            # fallback to simple scoring
            return self._fallback_score(story_text)

        num_events = len(events)
        if num_events == 0:
            return self._fallback_score(story_text)

        # Ego strength: based on resolution success and agency
        resolutions = [e for e in events if e.get('event_type') == 'resolution']
        resolution_scores = [e.get('resolution_success', 0.5) for e in resolutions]
        resolution_score = np.mean(resolution_scores) if resolution_scores else 0.5
        agency = sum(1 for e in events if e.get('agent') is not None) / num_events
        ego_strength = (resolution_score + agency) * 50  # scale to 0-100

        # Reality testing: agent consistency and plausible event structure
        agents = [e.get('agent') for e in events if e.get('agent')]
        agent_ratio = len(agents) / num_events if num_events else 0
        # Events with both agent and target show situated reality contact
        situated = sum(1 for e in events if e.get('agent') and e.get('target'))
        situated_ratio = situated / num_events if num_events else 0
        reality_testing = min(100, (agent_ratio * 60 + situated_ratio * 40) * 100 / 100)
        reality_testing = max(20, reality_testing)  # floor at 20 (non-zero baseline)

        # Affective integration: blended emotional complexity (PRODUCTION CORRECTION §5)
        # compute_affective_integration returns 0–10; normalize to 0–100 for consistent dimension scale
        from app.utils.production_utils import compute_affective_integration
        words = story_text.split() if story_text else []
        affective_integration_raw = compute_affective_integration(events, words)  # 0–10
        affective_integration = affective_integration_raw * 10.0  # → 0–100

        # Cognitive complexity: variety of event types
        event_types = set(e.get('event_type') for e in events)
        cognitive_complexity = len(event_types) * 10

        # Social cognition: presence of interactions
        interactions = sum(1 for e in events if e.get('target') is not None)
        social_cognition = (interactions / num_events) * 100
        # Fix 4: Cap at 85, floor at 15 (100/0 are structural artifacts, not real measures)
        social_cognition = max(15, min(85, social_cognition))

        # Emotional stability: inverse of valence variance (independent of affective_integration)
        valences_all = [e.get('valence', 0) for e in events]
        valence_var = float(np.std(valences_all)) if valences_all else 0.0
        emotional_stability = max(0, min(100, 100 - valence_var * 100))

        # Narrative coherence: diversity of event-type transitions (logical flow)
        type_sequence = [e.get('event_type', 'unknown') for e in events]
        if len(type_sequence) > 1:
            transitions = set()
            for i in range(len(type_sequence) - 1):
                transitions.add((type_sequence[i], type_sequence[i + 1]))
            # More diverse transitions → higher coherence (up to a ceiling)
            structural_coherence = min(100, len(transitions) * 15 + 20)
        else:
            structural_coherence = max(30, len(event_types) * 15)

        # Semantic coherence: embedding-based sequential similarity
        semantic_coherence = None
        if self.nlp_processor and len(events) >= 2:
            try:
                event_texts = [e.get('text', '') for e in events if e.get('text')]
                if len(event_texts) >= 2:
                    embs = self.nlp_processor.get_embeddings(event_texts)
                    seq_sims = []
                    for i in range(len(embs) - 1):
                        cos_sim = np.dot(embs[i], embs[i+1]) / (
                            np.linalg.norm(embs[i]) * np.linalg.norm(embs[i+1]) + 1e-8
                        )
                        seq_sims.append(float(cos_sim))
                    semantic_coherence = np.mean(seq_sims) * 100
            except Exception:
                semantic_coherence = None

        # Blend structural and semantic coherence (50/50 if both available)
        if semantic_coherence is not None:
            narrative_coherence = (structural_coherence + semantic_coherence) / 2.0
        else:
            narrative_coherence = structural_coherence

        # Object relations: relationships between characters
        object_relations = (interactions / num_events) * 100
        # Fix 4: Same cap/floor as social_cognition
        object_relations = max(15, min(85, object_relations))

        # Fix 7: Affective integration ceiling for short narratives
        word_count = len(words)
        if word_count < 200:
            affective_integration = min(85.0, affective_integration)

        dimension_scores = {
            'ego_strength': min(100, max(0, ego_strength)),
            'reality_testing': min(100, max(0, reality_testing)),
            'affective_integration': min(100, max(0, affective_integration)),   # now 0–100 (v4.0)
            'cognitive_complexity': min(100, max(0, cognitive_complexity)),
            'social_cognition': min(100, max(0, social_cognition)),
            'emotional_stability': min(100, max(0, emotional_stability)),
            'narrative_coherence': min(100, max(0, narrative_coherence)),
            'object_relations': min(100, max(0, object_relations))
        }

        # --- Recalibration v3.0: Extreme score capping ---
        dimension_scores = cap_extreme_scores(dimension_scores, psychosis_markers=False)

        # --- Fix 7: Apply precision score cap (anti-perfection) ---
        dimension_scores = apply_precision_score_cap(
            dimension_scores,
            word_count=word_count,
            cognitive_complexity=float(dimension_scores.get('cognitive_complexity', 0)),
        )

        overall_score = np.mean(list(dimension_scores.values()))
        confidence = min(1.0, num_events / 10)

        # --- Recalibration v3.0: Confidence intervals per dimension ---
        confidence_intervals = {}
        for dim_key, dim_val in dimension_scores.items():
            # All dimensions now on 0–100 scale (v4.0 fix)
            confidence_intervals[dim_key] = compute_confidence_interval(
                float(dim_val), num_events, scale_max=100.0
            )

        # --- Recalibration v3.0: Variance explanation notes ---
        variance_notes = []
        if valence_var > 0.5:
            variance_notes.append(f"High affective variability (σ={valence_var:.2f}) contributing to emotional_stability score")
        if num_events < 5:
            variance_notes.append(f"Low event count ({num_events}) may reduce scoring precision")
        if len(event_types) <= 2:
            variance_notes.append(f"Limited event-type diversity ({len(event_types)} types) may underestimate cognitive_complexity")

        # --- v3.1 Fix 6: Per-dimension variance justification ---
        variance_justifications = {}
        for dim_key, dim_val in dimension_scores.items():
            variance_justifications[dim_key] = generate_variance_justification(
                dim_name=dim_key,
                dim_value=float(dim_val),
                n_events=num_events,
                valence_std=valence_var,
                event_type_count=len(event_types),
            )

        return {
            'overall_score': overall_score,
            'dimension_scores': dimension_scores,
            'confidence': confidence,
            'confidence_intervals': confidence_intervals,
            'variance_notes': variance_notes,
            'variance_justifications': variance_justifications,
        }

    def _fallback_score(self, text: str) -> Dict[str, Any]:
        """Legacy scoring if no events. All dims on 0–100 scale."""
        return {
            'overall_score': 50.0,  # 0–100 scale (consistent with dimension_scores)
            'dimension_scores': {
                'ego_strength': 50,
                'reality_testing': 50,
                'affective_integration': 50,   # 0–100 scale (v4.0)
                'cognitive_complexity': 50,
                'social_cognition': 50,
                'emotional_stability': 50,
                'narrative_coherence': 50,
                'object_relations': 50
            },
            'confidence': 0.3
        }