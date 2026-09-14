"""
Multicard Dynamics Engine
-------------------------
Aggregates across multiple TAT cards to produce dynamic personality profile.
Now computes cross-card consistency metrics: need stability, conflict persistence,
trait convergence, authority/peer pattern stability.
"""

import os
import numpy as np
from typing import List, Dict, Any, Tuple
from collections import defaultdict, Counter

class MulticardDynamicsEngine:
    """
    Analyzes multiple cards to identify stable vs. variable psychological features.
    Supports ultra-fast zero-memory aggregation for cloud/low-memory environments.
    """

    def __init__(self, nlp_processor=None, murray_engine=None, theme_engine=None, relational_engine=None, defense_engine=None):
        self.nlp_processor = nlp_processor
        self.murray_engine = murray_engine
        self.theme_engine = theme_engine
        self.relational_engine = relational_engine
        self.defense_engine = defense_engine

    def _ensure_local_engines(self):
        if self.nlp_processor is None:
            return False
        if self.murray_engine is None:
            from app.assessments.tat.engines.inference.murray_inference_engine import MurrayInferenceEngine
            self.murray_engine = MurrayInferenceEngine(self.nlp_processor)
        if self.theme_engine is None:
            from app.assessments.tat.engines.nlp.theme_detection_engine import ThemeDetectionEngine
            self.theme_engine = ThemeDetectionEngine(self.nlp_processor)
        if self.relational_engine is None:
            from app.assessments.tat.engines.graph.relational_field_engine import RelationalFieldEngine
            self.relational_engine = RelationalFieldEngine(self.nlp_processor)
        if self.defense_engine is None:
            from app.assessments.tat.engines.inference.defense_inference_engine import DefenseInferenceEngine
            self.defense_engine = DefenseInferenceEngine(self.nlp_processor)
        return True

    def aggregate(self, card_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        card_results: list of dictionaries per card.
        Returns aggregated profile with cross-card stability metrics.
        """
        num_cards = len(card_results)
        if num_cards == 0:
            return {}

        all_events = []
        all_stories = []
        per_card_murray = []
        per_card_relational = []
        for cr in card_results:
            all_events.extend(cr.get("events", []))
            all_stories.append(cr.get("story_text", cr.get("story", "")))
            per_card_murray.append(cr.get("murray", {}))
            per_card_relational.append(cr.get("relational_patterns", {}))

        per_card_conflicts_new = [cr.get("conflict_structure", []) for cr in card_results]
        per_card_envs = [cr.get("environment_classification", {}) for cr in card_results]

        # Fast 1-card path
        if num_cards == 1:
            cr = card_results[0]
            events = cr.get("events", [])
            emotion_counts = defaultdict(int)
            for event in events:
                if event.get('emotion'):
                    emotion_counts[event['emotion']] += 1
            top_emotions = sorted(emotion_counts.items(), key=lambda x: -x[1])[:5]
            dom_env = cr.get("environment_classification", {}).get("primary", "Adaptive")
            ego_scores = [cr.get("quantitative_scores", {}).get("hero_ego_strength", cr.get("ego_strength", 50))]

            return {
                "num_cards": 1,
                "murray": cr.get("murray", {}),
                "themes": cr.get("themes", []),
                "relational_patterns": cr.get("relational_patterns", {}),
                "defenses": cr.get("defense_mechanisms", cr.get("defenses", [])),
                "emotional_attractors": top_emotions,
                "need_stability": "N/A",
                "press_stability": "N/A",
                "conflict_persistence": "N/A",
                "dominant_environment": dom_env,
                "authority_pattern_stability": "N/A",
                "contemporary_pattern_stability": "N/A",
                "peer_pattern_stability": "N/A",
                "trait_convergence": "N/A",
                "convergence_confidence": "N/A",
                "stability_confidence": "N/A",
                "ego_trajectory": self._compute_trajectory(ego_scores),
                "per_card_murray": per_card_murray,
                "per_card_conflicts": per_card_conflicts_new,
                "per_card_environments": per_card_envs,
                "_internal_volatility": {}
            }

        is_low_mem = os.getenv("LOW_MEMORY_MODE", "false").lower() in ("true", "1") or bool(os.getenv("RENDER"))
        has_precomputed = any(cr.get("murray") for cr in card_results)

        if not is_low_mem and not has_precomputed and self._ensure_local_engines():
            murray_all = self.murray_engine.infer_from_events(all_events)
            themes = self.theme_engine.extract_themes(all_stories)
            self.relational_engine.build_graph(all_events)
            relational_patterns = self.relational_engine.get_relational_patterns()
            defenses = self.defense_engine.infer_from_events(all_events, n_cards=num_cards)
        else:
            # Fast zero-overhead multi-card consolidation
            murray_all = self._consolidate_murray(per_card_murray)
            themes = self._consolidate_themes(card_results)
            relational_patterns = self._consolidate_relational(card_results)
            defenses = self._consolidate_defenses(card_results)

        emotion_counts = defaultdict(int)
        for event in all_events:
            if event.get('emotion'):
                emotion_counts[event['emotion']] += 1
        top_emotions = sorted(emotion_counts.items(), key=lambda x: -x[1])[:5]

        env_counts = defaultdict(int)
        for env in per_card_envs:
            if env.get("primary"):
                env_counts[env["primary"]] += 1
        dominant_environment = sorted(env_counts.items(), key=lambda x: -x[1])[:1]
        dominant_env_str = dominant_environment[0][0] if dominant_environment else "Ambiguous"

        if num_cards < 2:
            need_stability = "N/A"
            press_stability = "N/A"
            conflict_persistence = "N/A"
            authority_stability = "N/A"
            contemporary_stability = "N/A"
            peer_stability = "N/A"
            trait_convergence = "N/A"
            stability_confidence = "N/A"
            convergence_confidence = "N/A"
        else:

            need_stability = self._compute_stability([m.get("needs", []) for m in per_card_murray])
            press_stability = self._compute_stability([m.get("presses", []) for m in per_card_murray])
            conflict_persistence = self._compute_conflict_persistence(per_card_murray, per_card_conflicts_new, per_card_relational)
            authority_stability = self._compute_authority_stability([rp.get("authority_figures", []) for rp in per_card_relational])
            peer_stability = self._compute_peer_stability(per_card_relational)
            contemporary_stability = self._compute_contemporary_stability(per_card_relational)
            raw_trait_convergence = self._compute_trait_convergence([rp.get("personality_traits", {}) for rp in per_card_relational])

            if need_stability < 0.3:
                trait_convergence = min(raw_trait_convergence, 0.6)
            elif need_stability < 0.5:
                trait_convergence = min(raw_trait_convergence, 0.75)
            else:
                trait_convergence = raw_trait_convergence

            if press_stability < 0.3:
                trait_convergence = min(trait_convergence, 0.6)
            elif press_stability < 0.5:
                trait_convergence = min(trait_convergence, 0.75)

            stability_confidence = min(0.95, 0.4 + num_cards * 0.1)

            convergence_confidence = min(0.9, 0.3 + (need_stability + press_stability) * 0.3)

        ego_scores = [cr.get("quantitative_scores", {}).get("hero_ego_strength", cr.get("ego_strength", 50)) for cr in card_results]
        ego_trajectory = self._compute_trajectory(ego_scores)

        from app.utils.production_utils import compute_volatility
        _internal_volatility = {}
        for metric in ['anxiety_level', 'hero_ego_strength', 'conflict_internal', 'emotional_stability']:
            scores = [cr.get("quantitative_scores", {}).get(metric, 50) for cr in card_results]
            _internal_volatility[metric] = compute_volatility(scores)

        return {
            "num_cards": num_cards,
            "murray": murray_all,
            "themes": themes,
            "relational_patterns": relational_patterns,
            "defenses": defenses,
            "emotional_attractors": top_emotions,
            "need_stability": need_stability,
            "press_stability": press_stability,
            "conflict_persistence": conflict_persistence,
            "dominant_environment": dominant_env_str,
            "authority_pattern_stability": authority_stability,
            "contemporary_pattern_stability": contemporary_stability,
            "peer_pattern_stability": peer_stability,
            "trait_convergence": trait_convergence,
            "convergence_confidence": convergence_confidence,
            "stability_confidence": stability_confidence,
            "ego_trajectory": ego_trajectory,
            "per_card_murray": per_card_murray,
            "per_card_conflicts": per_card_conflicts_new,
            "per_card_environments": per_card_envs,

            "_internal_volatility": _internal_volatility
        }

    def _compute_stability(self, per_card_scores: List[List[Tuple[str, float]]]) -> float:
        """
        Compute stability of needs/presses across cards.
        Higher stability = low variance in top 3 items.
        """
        if not per_card_scores or len(per_card_scores) < 2:
            return 1.0

        top_sets = [set([need for need, _ in scores[:3]]) for scores in per_card_scores]

        similarities = []
        for i in range(len(top_sets)-1):
            inter = len(top_sets[i] & top_sets[i+1])
            union = len(top_sets[i] | top_sets[i+1])
            if union > 0:
                similarities.append(inter/union)
        return np.mean(similarities) if similarities else 1.0

    def _compute_conflict_persistence(self, per_card_murray: List[Dict], per_card_structural_conflicts: List[List[Dict]], per_card_relational: List[Dict]) -> float:
        """
        Compute persistence of structural narrative patterns (Needs, Presses, Conflicts, Authority).
        """
        if len(per_card_murray) < 2:
            return 1.0

        similarities = []
        for i in range(len(per_card_murray) - 1):
            murray_a = per_card_murray[i]
            murray_b = per_card_murray[i+1]

            needs_a = set(n[0] for n in murray_a.get('needs', [])[:3])
            needs_b = set(n[0] for n in murray_b.get('needs', [])[:3])
            need_sim = len(needs_a & needs_b) / max(1, len(needs_a | needs_b))

            presses_a = set(p[0] for p in murray_a.get('presses', [])[:3])
            presses_b = set(p[0] for p in murray_b.get('presses', [])[:3])
            press_sim = len(presses_a & presses_b) / max(1, len(presses_a | presses_b))

            rel_a = per_card_relational[i] if i < len(per_card_relational) else {}
            rel_b = per_card_relational[i+1] if i+1 < len(per_card_relational) else {}
            auth_a = sum(1 for v in rel_a.get("figure_classifications", {}).values() if v in ("authority", "Authority Figure"))
            auth_b = sum(1 for v in rel_b.get("figure_classifications", {}).values() if v in ("authority", "Authority Figure"))
            auth_sim = 1.0 if (auth_a > 0 and auth_b > 0) else (1.0 if auth_a == 0 and auth_b == 0 else 0.0)

            contemp_a = sum(1 for v in rel_a.get("figure_classifications", {}).values() if v in ("contemporary", "Contemporary"))
            contemp_b = sum(1 for v in rel_b.get("figure_classifications", {}).values() if v in ("contemporary", "Contemporary"))
            contemp_sim = 1.0 if (contemp_a > 0 and contemp_b > 0) else (1.0 if contemp_a == 0 and contemp_b == 0 else 0.0)

            conf_a = set()
            for c in murray_a.get('conflicts', []):
                if isinstance(c, tuple) and len(c) >= 2: conf_a.add(f"{c[0]}-{c[1]}")
                elif isinstance(c, dict) and 'need_a' in c: conf_a.add(f"{c['need_a']}-{c['need_b']}")

            for sc in per_card_structural_conflicts[i] if i < len(per_card_structural_conflicts) else []:
                if isinstance(sc, dict) and 'type' in sc: conf_a.add(sc['type'])

            conf_b = set()
            for c in murray_b.get('conflicts', []):
                if isinstance(c, tuple) and len(c) >= 2: conf_b.add(f"{c[0]}-{c[1]}")
                elif isinstance(c, dict) and 'need_a' in c: conf_b.add(f"{c['need_a']}-{c['need_b']}")

            for sc in per_card_structural_conflicts[i+1] if i+1 < len(per_card_structural_conflicts) else []:
                if isinstance(sc, dict) and 'type' in sc: conf_b.add(sc['type'])

            c_score = 0.0
            parts_a_list = [(ca, set(ca.replace('NP:', '').replace('NN:', '').replace('SC:', '').split('-'))) for ca in conf_a]
            parts_b_list = [(cb, set(cb.replace('NP:', '').replace('NN:', '').replace('SC:', '').split('-'))) for cb in conf_b]

            for ca, p_a in parts_a_list:
                for cb, p_b in parts_b_list:
                    if ca == cb:
                         c_score += 1.0
                    elif p_a & p_b:
                         c_score += 0.5

            max_cf = min(len(conf_a), len(conf_b))
            conf_sim = min(1.0, c_score / max(1, max_cf)) if max_cf > 0 else 1.0
            if len(conf_a) == 0 and len(conf_b) == 0: conf_sim = 1.0

            weighted_sim = (need_sim * 0.25) + (press_sim * 0.25) + (auth_sim * 0.15) + (contemp_sim * 0.10) + (conf_sim * 0.25)
            similarities.append(weighted_sim)

        return float(np.mean(similarities)) if similarities else 0.0

    def _compute_authority_stability(self, per_card_authority: List[List[Tuple[str, float]]]) -> float:
        """Stability of authority figures (nodes) across cards."""
        if len(per_card_authority) < 2:
            return 1.0
        auth_sets = [set([node for node, _ in auth[:3]]) for auth in per_card_authority]
        similarities = []
        for i in range(len(auth_sets)-1):
            inter = len(auth_sets[i] & auth_sets[i+1])
            union = len(auth_sets[i] | auth_sets[i+1])
            if union > 0:
                similarities.append(inter/union)
        return np.mean(similarities) if similarities else 1.0

    def _compute_peer_stability(self, per_card_relational: List[Dict]) -> float:
        """Stability of peer figures across cards."""
        if len(per_card_relational) < 2:
            return 0.8
        peer_counts = []
        for rp in per_card_relational:
            figs = rp.get("figure_classifications", {})
            peer_count = sum(1 for v in figs.values() if v in ("Peer", "peer"))
            peer_counts.append(peer_count)

        if all(c > 0 for c in peer_counts) or all(c == 0 for c in peer_counts):
            return 0.9
        return 0.5

    def _compute_contemporary_stability(self, per_card_relational: List[Dict]) -> float:
        """Stability of contemporary figures across cards."""
        if len(per_card_relational) < 2:
            return 1.0
        contemp_counts = []
        for rp in per_card_relational:
            figs = rp.get("figure_classifications", {})
            contemp_count = sum(1 for v in figs.values() if v in ("Contemporary", "contemporary"))
            contemp_counts.append(contemp_count)

        if all(c > 0 for c in contemp_counts) or all(c == 0 for c in contemp_counts):
            return 0.9
        return 0.4

    def _compute_trait_convergence(self, per_card_traits: List[Dict]) -> float:
        """Compute average variance of trait scores across cards; lower variance = higher convergence."""
        if len(per_card_traits) < 2:
            return 1.0

        all_keys = set()
        for traits in per_card_traits:
            all_keys.update(traits.keys())
        variances = []
        for key in all_keys:
            values = [traits.get(key, 0.5) for traits in per_card_traits]

            if any(not isinstance(v, (int, float)) for v in values):
                continue
            variances.append(np.var(values))
        avg_var = np.mean(variances) if variances else 0

        convergence = 1.0 / (1.0 + avg_var)
        return float(convergence)

    def _compute_trajectory(self, scores: List[float]) -> Dict[str, Any]:
        """Compute trend and volatility of a metric."""
        if len(scores) < 2:
            return {"trend": "stable", "volatility": 0.0, "slope": 0.0}
        x = np.arange(len(scores))
        slope = np.polyfit(x, scores, 1)[0]
        volatility = np.std(scores)
        trend = "increasing" if slope > 1 else "decreasing" if slope < -1 else "stable"
        return {"trend": trend, "volatility": volatility, "slope": slope}

    def _consolidate_murray(self, per_card_murray: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate Murray needs and presses across cards without heavy ML."""
        need_scores = defaultdict(list)
        press_scores = defaultdict(list)
        profile_scores = defaultdict(list)
        for m in per_card_murray:
            if not m or not isinstance(m, dict):
                continue
            for item in m.get("needs", []):
                if isinstance(item, (list, tuple)) and len(item) > 1:
                    need_scores[str(item[0])].append(float(item[1]))
                elif isinstance(item, str):
                    need_scores[item].append(0.7)
            for item in m.get("presses", []):
                if isinstance(item, (list, tuple)) and len(item) > 1:
                    press_scores[str(item[0])].append(float(item[1]))
                elif isinstance(item, str):
                    press_scores[item].append(0.7)
            for item in m.get("needs_full_profile", []):
                if isinstance(item, dict) and "name" in item:
                    profile_scores[str(item["name"])].append(float(item.get("score", 0.5)))

        agg_needs = [[n, round(float(np.mean(vals)), 3)] for n, vals in need_scores.items()]
        agg_needs.sort(key=lambda x: -x[1])

        agg_presses = [[p, round(float(np.mean(vals)), 3)] for p, vals in press_scores.items()]
        agg_presses.sort(key=lambda x: -x[1])

        agg_profile = [{"name": n, "score": round(float(np.mean(vals)), 3)} for n, vals in profile_scores.items()]
        agg_profile.sort(key=lambda x: -x["score"])

        dominant = agg_needs[:3]
        return {
            "needs": agg_needs,
            "presses": agg_presses,
            "needs_full_profile": agg_profile if agg_profile else [{"name": n[0], "score": n[1]} for n in agg_needs],
            "dominant_needs": dominant,
            "latent_needs": agg_needs[3:6] if len(agg_needs) > 3 else [],
            "suppressed_needs": agg_needs[-3:] if len(agg_needs) > 6 else [],
            "conflicts": [],
        }

    def _consolidate_themes(self, card_results: List[Dict[str, Any]]) -> List[str]:
        """Collect and frequency-sort themes across cards."""
        theme_counts = Counter()
        for cr in card_results:
            raw_themes = cr.get("themes", [])
            if isinstance(raw_themes, dict):
                raw_themes = raw_themes.get("themes", [])
            for th in (raw_themes if isinstance(raw_themes, list) else []):
                label = th.get("label", th.get("theme", "")) if isinstance(th, dict) else str(th)
                label = label.strip()
                if label and len(label) >= 3:
                    theme_counts[label] += 1
        return [th for th, _ in theme_counts.most_common(15)]

    def _consolidate_relational(self, card_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Collect and merge relational figures across cards."""
        all_figures = []
        seen_entities = set()
        for cr in card_results:
            rp = cr.get("relational_patterns", {})
            figs = rp.get("valid_figure_types", []) if isinstance(rp, dict) else []
            for f in figs:
                if isinstance(f, dict):
                    entity = f.get("entity", "")
                    if entity and entity not in seen_entities:
                        seen_entities.add(entity)
                        all_figures.append(f)
        return {
            "valid_figure_types": all_figures,
            "figures": [f.get("entity") for f in all_figures],
        }

    def _consolidate_defenses(self, card_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Collect and merge defenses across cards."""
        seen = {}
        for cr in card_results:
            for d in cr.get("defense_mechanisms", cr.get("defenses", [])):
                if isinstance(d, dict):
                    name = d.get("defense") or d.get("name")
                    if name and name not in seen:
                        seen[name] = d
        return list(seen.values())

