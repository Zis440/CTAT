# ============================================================================
# MULTI-CARD AGGREGATION
# ============================================================================

from app.utils.production_utils import (
    dual_layer_aggregate, round_metric, apply_global_bounds, validate_metrics,
    compute_internal_consistency, compute_cross_card_convergence,
    compute_interpretive_confidence, check_narrative_complexity_threshold
)
import numpy as np
from collections import Counter

def aggregate_multi_card_analysis(card_analyses_dict, multicard_engine):
    """
    Aggregates multiple card analyses using MulticardDynamicsEngine.
    Merges per-card quantitative scores and dimension scores into an averaged
    aggregation for comprehensive report rendering.
    """
    if not card_analyses_dict or not isinstance(card_analyses_dict, dict):
        print("⚠️ No card analyses provided for aggregation.")
        return {}

    card_results_list = list(card_analyses_dict.values())
    aggregated = multicard_engine.aggregate(card_results_list)

    # Merge averaged quantitative fields from per-card results
    quant_keys = [
        'anxiety_level', 'conflict_internal', 'conflict_interpersonal',
        'hero_ego_strength', 'overall_confidence', 'emotional_stability',
        'reality_testing', 'narrative_coherence', 'complexity', 'social_cognition'
    ]
    for key in quant_keys:
        weighted_sum = 0.0
        total_weight = 0.0
        card_values = []
        for cr in card_results_list:
            qs = cr.get('quantitative_scores', {})
            v = qs.get(key)
            if v is not None:
                # Default weight = equal across cards (1.0) unless explicitly varied
                weight = 1.0 
                val = float(v)
                card_values.append(val)
                weighted_sum += val * weight
                total_weight += weight
                
        if total_weight > 0 and card_values:
            agg_val = weighted_sum / total_weight
            # Ensure aggregated value strictly falls within min/max bounds of components
            min_val, max_val = min(card_values), max(card_values)
            aggregated[key] = max(min_val, min(max_val, agg_val))

    # --- PRODUCTION HARDENING: Dual-layer aggregation (§2) ---
    _aggregation_metadata = {}
    for key in quant_keys:
        card_values = []
        for cr in card_results_list:
            qs = cr.get('quantitative_scores', {})
            v = qs.get(key)
            if v is not None:
                card_values.append(float(v))
        if len(card_values) >= 2:
            dl = dual_layer_aggregate(card_values)
            # Apply the dual-layer adjustment (additive, bounded)
            current = aggregated.get(key, dl['mean'])
            adjusted = round_metric(current + (dl['peak'] * dl['stability_coeff'] * 0.1))
            # Keep within original min/max bounds
            if card_values:
                adjusted = max(min(card_values), min(max(card_values), adjusted))
            aggregated[key] = adjusted
            _aggregation_metadata[key] = dl
    aggregated['_aggregation_metadata'] = _aggregation_metadata

    # --- PRODUCTION CORRECTION: §4 Peak Anxiety Preservation Layer ---
    anxiety_values = []
    for cr in card_results_list:
        qs = cr.get('quantitative_scores', {})
        v = qs.get('anxiety_level')
        if v is not None:
            anxiety_values.append(float(v))
    if len(anxiety_values) >= 2:
        mean_anxiety = float(np.mean(anxiety_values))
        peak_anxiety = float(max(anxiety_values))
        volatility_anxiety = float(np.std(anxiety_values))
        # Additive formula: always >= mean (preserves peaks, never suppresses)
        # Stronger peak weight (0.4) ensures spikes are visible in multi-card sets
        final_anxiety = mean_anxiety + (0.4 * (peak_anxiety - mean_anxiety)) + (0.15 * volatility_anxiety)
        # --- PRODUCTION CORRECTION: §6 Anxiety Escalation Modifier ---
        if peak_anxiety >= 70:  # 70 on 0–100 scale = 7 on 0–10
            final_anxiety += 5.0  # +0.5 on 0–10 scale = +5 on 0–100
        # Clamp to [0, 100]
        aggregated['anxiety_level'] = round_metric(max(0, min(100, final_anxiety)))
        aggregated['peak_anxiety_index'] = round_metric(peak_anxiety)

    # Merge averaged dimension_scores from per-card results
    all_dim_keys = set()
    for cr in card_results_list:
        ds = cr.get('dimension_scores', {})
        if ds:
            all_dim_keys.update(ds.keys())

    if all_dim_keys:
        merged_dims = {}
        for dk in all_dim_keys:
            weighted_sum = 0.0
            total_weight = 0.0
            card_values = []
            for cr in card_results_list:
                ds = cr.get('dimension_scores', {})
                v = ds.get(dk)
                if v is not None:
                    weight = 1.0
                    val = float(v)
                    card_values.append(val)
                    weighted_sum += val * weight
                    total_weight += weight
            if total_weight > 0 and card_values:
                agg_val = weighted_sum / total_weight
                min_val, max_val = min(card_values), max(card_values)
                merged_dims[dk] = max(min_val, min(max_val, agg_val))
        aggregated.setdefault('dimension_scores', merged_dims)

    # Merge overall_score
    overall_scores = [cr.get('overall_score', 0) for cr in card_results_list]
    aggregated.setdefault('overall_score', sum(overall_scores) / len(overall_scores))

    # Context Adjustment Extraction
    for cr in card_results_list:
        if 'context_adjustment' in cr:
            aggregated['context_adjustment'] = cr['context_adjustment']
            aggregated['base_psychological_score'] = cr.get('base_psychological_score')
            break

    # Common needs/presses from aggregated murray (for PDF compatibility)
    murray_agg = aggregated.get('murray', {})
    aggregated.setdefault('common_needs', [n for n, _ in murray_agg.get('needs', [])])
    aggregated.setdefault('common_presses', [p for p, _ in murray_agg.get('presses', [])])

    # --- PRODUCTION CORRECTION: §1 Global Metric Bounding ---
    aggregated = apply_global_bounds(aggregated)
    # --- PRODUCTION CORRECTION: §8 Validation Layer ---
    aggregated = validate_metrics(aggregated)

    # =================================================================
    # RECALIBRATION v3.0: Psychometric Integrity Layer
    # =================================================================
    card_dim_scores = [
        cr.get('dimension_scores', {}) for cr in card_results_list
        if cr.get('dimension_scores')
    ]
    if card_dim_scores:
        internal_consistency = compute_internal_consistency(card_dim_scores)
        cross_card_convergence = compute_cross_card_convergence(card_dim_scores)
    else:
        internal_consistency = 0.0
        cross_card_convergence = 0.0

    n_cards = len(card_results_list)
    avg_wc = float(np.mean([cr.get('word_count', len(cr.get('story_text', '').split())) for cr in card_results_list]))
    all_themes = []
    for cr in card_results_list:
        t = cr.get('themes', [])
        if isinstance(t, dict):
            t = t.get('themes', [])
        if isinstance(t, list):
            all_themes.extend(t)
    # Extract theme labels from structured or plain themes
    theme_labels = []
    for th in all_themes:
        if isinstance(th, dict):
            label = th.get('label', th.get('theme', ''))
        else:
            label = str(th)
        if label:
            theme_labels.append(label)
    # Deduplicate by frequency + quality filter (matches single-card path)
    _THEME_STOPWORDS = {
        'i', 'me', 'my', 'we', 'us', 'you', 'he', 'she', 'it', 'they',
        'do', 'did', 'does', 'know', 'said', 'say', 'get', 'go', 'went',
        'the', 'a', 'an', 'is', 'was', 'are', 'be', 'been', 'being',
        'this', 'that', 'one', 'with', 'and', 'or', 'but', 'not',
    }
    theme_counter = Counter(theme_labels)
    filtered_themes = []
    for label, _ in theme_counter.most_common(30):
        lbl_clean = label.strip()
        if not lbl_clean or len(lbl_clean) < 4:
            continue
        if '/' in lbl_clean:  # slash-separated LDA garbage like "it / do / know"
            continue
        words = [w.strip('()[]{}.,!?/') for w in lbl_clean.lower().split()]
        meaningful = [w for w in words if len(w) >= 3 and w not in _THEME_STOPWORDS]
        if not meaningful:
            continue
        filtered_themes.append(lbl_clean)
        if len(filtered_themes) >= 15:
            break
    aggregated['themes'] = filtered_themes
    n_themes = len(set(theme_labels))
    interpretive_confidence = compute_interpretive_confidence(
        n_cards, avg_wc, n_themes, internal_consistency=internal_consistency
    )

    # Narrative complexity check per card
    complexity_checks = []
    for cr in card_results_list:
        wc = cr.get('word_count', len(cr.get('story_text', '').split()))
        n_ev = len(cr.get('events', []))
        n_emo = len(set(e.get('emotion') for e in cr.get('events', []) if e.get('emotion')))
        complexity_checks.append(check_narrative_complexity_threshold(wc, n_ev, n_emo))
    overall_adequacy = "adequate" if all(c == "adequate" for c in complexity_checks) else (
        "marginal" if any(c == "adequate" for c in complexity_checks) else "insufficient"
    )

    aggregated['psychometric_integrity'] = {
        'internal_consistency': internal_consistency,
        'cross_card_convergence': cross_card_convergence,
        'interpretive_confidence': interpretive_confidence,
        'narrative_adequacy': overall_adequacy,
        'cards_analyzed': n_cards,
    }

    # =================================================================
    # RECALIBRATION v3.0: Cross-card Defense Consistency
    # =================================================================
    all_defenses = []
    for cr in card_results_list:
        for d in cr.get('defense_mechanisms', []):
            all_defenses.append(d.get('defense', ''))
    defense_counts = Counter(all_defenses)
    # Defenses appearing in >50% of cards get elevated cross-card consistency
    for cr in card_results_list:
        for d in cr.get('defense_mechanisms', []):
            name = d.get('defense', '')
            ratio = defense_counts.get(name, 0) / n_cards if n_cards > 0 else 0
            if ratio > 0.5:
                d['cross_card_consistency'] = f"Persistent ({ratio:.0%} of cards)"
                # Lift rigidity cap above 0.6 for cross-card persistent defenses
                if d.get('rigidity_index', 0) >= 0.5:
                    d['rigidity_index'] = min(1.0, d['rigidity_index'] + 0.2)
            else:
                d['cross_card_consistency'] = f"Isolated ({ratio:.0%} of cards)"

    # =================================================================
    # RECALIBRATION v3.0: Conflict Persistence Score
    # =================================================================
    all_conflict_types = []
    for cr in card_results_list:
        for c in cr.get('conflict_structure', []):
            all_conflict_types.append(c.get('type', ''))
    conflict_type_counts = Counter(all_conflict_types)
    for cr in card_results_list:
        for c in cr.get('conflict_structure', []):
            ctype = c.get('type', '')
            persistence = conflict_type_counts.get(ctype, 0) / n_cards if n_cards > 0 else 0
            c['conflict_persistence_score'] = round(persistence, 2)

    # =================================================================
    # ENHANCED SURFACE: Aggregated Conflict Structure
    # =================================================================
    aggregated_conflicts = []
    seen_conflict_types = set()
    for cr in card_results_list:
        card_id = cr.get('card_id', 'unknown')
        for c in cr.get('conflict_structure', []):
            ctype = c.get('type', '')
            conflict_entry = {
                'type': ctype,
                'intensity': c.get('intensity', 0),
                'evidence': c.get('evidence', c.get('description', '')),
                'source_card': card_id,
                'persistence_score': c.get('conflict_persistence_score', 0),
                'resolution': c.get('resolution', 'unresolved'),
            }
            aggregated_conflicts.append(conflict_entry)
            seen_conflict_types.add(ctype)
    # Deduplicate by type: keep highest intensity per type, note all source cards
    conflict_by_type = {}
    for ac in aggregated_conflicts:
        ctype = ac['type']
        if ctype not in conflict_by_type:
            conflict_by_type[ctype] = {
                'type': ctype,
                'max_intensity': ac['intensity'],
                'avg_intensity': ac['intensity'],
                'evidence_samples': [ac['evidence']] if ac['evidence'] else [],
                'source_cards': [ac['source_card']],
                'persistence_score': ac['persistence_score'],
                'resolution': ac['resolution'],
                'count': 1,
            }
        else:
            entry = conflict_by_type[ctype]
            entry['max_intensity'] = max(entry['max_intensity'], ac['intensity'])
            entry['avg_intensity'] = (entry['avg_intensity'] * entry['count'] + ac['intensity']) / (entry['count'] + 1)
            if ac['evidence'] and ac['evidence'] not in entry['evidence_samples']:
                entry['evidence_samples'].append(ac['evidence'])
            if ac['source_card'] not in entry['source_cards']:
                entry['source_cards'].append(ac['source_card'])
            entry['persistence_score'] = max(entry['persistence_score'], ac['persistence_score'])
            entry['count'] += 1
    aggregated['aggregated_conflicts'] = sorted(
        list(conflict_by_type.values()),
        key=lambda x: x['max_intensity'],
        reverse=True
    )
    aggregated['global_conflict_score'] = {
        'total_conflicts': len(aggregated_conflicts),
        'unique_types': len(seen_conflict_types),
        'persistent_types': [t for t, cnt in conflict_type_counts.items() if cnt > 1],
    }

    # =================================================================
    # ENHANCED SURFACE: Aggregated Defense Mechanisms
    # =================================================================
    aggregated_defenses = []
    for cr in card_results_list:
        card_id = cr.get('card_id', 'unknown')
        for d in cr.get('defense_mechanisms', []):
            aggregated_defenses.append({
                'defense': d.get('defense', 'Unknown'),
                'maturity_level': d.get('maturity_level', 'Unknown'),
                'confidence': d.get('confidence', 0),
                'rigidity_index': d.get('rigidity_index', 0),
                'cross_card_consistency': d.get('cross_card_consistency', 'N/A'),
                'personality_organization': d.get('personality_organization', {}),
                'source_card': card_id,
            })
    # Group by defense name for summary
    defense_summary = {}
    for ad in aggregated_defenses:
        name = ad['defense']
        if name not in defense_summary:
            defense_summary[name] = {
                'defense': name,
                'maturity_level': ad['maturity_level'],
                'avg_confidence': ad['confidence'],
                'max_rigidity': ad['rigidity_index'],
                'cross_card_consistency': ad['cross_card_consistency'],
                'personality_organization': ad.get('personality_organization', {}),
                'source_cards': [ad['source_card']],
                'frequency': 1,
            }
        else:
            entry = defense_summary[name]
            entry['avg_confidence'] = (entry['avg_confidence'] * (entry['frequency']) + ad['confidence']) / (entry['frequency'] + 1)
            entry['max_rigidity'] = max(entry['max_rigidity'], ad['rigidity_index'])
            if ad['source_card'] not in entry['source_cards']:
                entry['source_cards'].append(ad['source_card'])
            entry['frequency'] += 1
            # Update cross-card consistency to the more informative label
            if 'Persistent' in str(ad['cross_card_consistency']):
                entry['cross_card_consistency'] = ad['cross_card_consistency']
            # Carry personality_organization if not already present
            if not entry.get('personality_organization') and ad.get('personality_organization'):
                entry['personality_organization'] = ad['personality_organization']
    aggregated['aggregated_defenses'] = sorted(
        list(defense_summary.values()),
        key=lambda x: x['frequency'],
        reverse=True
    )

    # =================================================================
    # ENHANCED SURFACE: Aggregated Environment Classification
    # =================================================================
    env_counts_detail = Counter()
    env_confidences = {}
    for cr in card_results_list:
        env = cr.get('environment_classification', {})
        primary = env.get('primary', '')
        if primary:
            env_counts_detail[primary] += 1
            conf = env.get('primary_confidence', 0)
            env_confidences.setdefault(primary, []).append(conf)
    dominant_env = env_counts_detail.most_common(1)[0] if env_counts_detail else ('Ambiguous', 0)
    secondary_env = env_counts_detail.most_common(2)[1] if len(env_counts_detail) > 1 else (None, 0)
    aggregated['aggregated_environment'] = {
        'dominant_type': dominant_env[0],
        'dominant_frequency': dominant_env[1],
        'dominant_confidence': round(float(np.mean(env_confidences.get(dominant_env[0], [0]))), 2),
        'secondary_type': secondary_env[0] if secondary_env else None,
        'secondary_frequency': secondary_env[1] if secondary_env else 0,
        'is_mixed': len(env_counts_detail) > 1,
        'distribution': dict(env_counts_detail),
    }

    # =================================================================
    # ENHANCED SURFACE: Aggregated Coping Mechanisms
    # =================================================================
    coping_counts = Counter()
    for cr in card_results_list:
        for c in cr.get('coping_mechanisms', []):
            coping_counts[c] += 1
    aggregated['aggregated_coping'] = [
        {'mechanism': name, 'frequency': freq, 'is_persistent': freq > 1}
        for name, freq in coping_counts.most_common(10)
    ]

    # =================================================================
    # ENHANCED SURFACE: Needs & Presses with Scores
    # =================================================================
    aggregated['needs_with_scores'] = murray_agg.get('needs', [])[:10]
    aggregated['presses_with_scores'] = murray_agg.get('presses', [])[:10]

    # =================================================================
    # ENHANCED SURFACE: Aggregated Perceptual Distortions (CNN Vision)
    # =================================================================
    aggregated_distortions = []
    for cr in card_results_list:
        card_id = cr.get('card_id', 'unknown')
        for dist in cr.get('perceptual_distortions', []):
            dist['source_card'] = card_id
            aggregated_distortions.append(dist)
    aggregated['aggregated_perceptual_distortions'] = aggregated_distortions

    # =================================================================
    # ENHANCED SURFACE: Per-Card Breakdown Summaries
    # =================================================================
    per_card_summaries = []
    for cr in card_results_list:
        card_id = cr.get('card_id', 'unknown')
        card_murray = cr.get('murray', {})
        card_conflicts = cr.get('conflict_structure', [])
        card_env = cr.get('environment_classification', {})
        card_defenses = cr.get('defense_mechanisms', [])
        card_coping = cr.get('coping_mechanisms', [])
        card_quant = cr.get('quantitative_scores', {})

        per_card_summaries.append({
            'card_id': card_id,
            'needs': [{'name': n, 'score': round(s, 3)} for n, s in card_murray.get('needs', [])[:5]],
            'presses': [{'name': p, 'score': round(s, 3)} for p, s in card_murray.get('presses', [])[:5]],
            'conflicts': [{
                'type': c.get('type', ''),
                'intensity': round(c.get('intensity', 0), 2),
                'persistence_score': c.get('conflict_persistence_score', 0),
            } for c in card_conflicts[:5]],
            'environment': {
                'primary': card_env.get('primary', 'N/A'),
                'confidence': round(card_env.get('primary_confidence', 0), 2),
            },
            'defenses': [{
                'defense': d.get('defense', ''),
                'maturity_level': d.get('maturity_level', ''),
                'confidence': round(d.get('confidence', 0), 2),
            } for d in card_defenses[:3]],
            'coping': card_coping[:5],
            'anxiety_level': card_quant.get('anxiety_level', 0),
            'ego_strength': card_quant.get('hero_ego_strength', card_quant.get('ego_strength', 0)),
        })
    aggregated['per_card_summaries'] = per_card_summaries

    return aggregated


def build_single_card_aggregation(card_analysis, multicard_engine):
    """
    Build aggregated view for a single card (for compatibility).
    """
    quant = card_analysis.get("quantitative_scores", {}) or {}
    dims = card_analysis.get("dimension_scores", {}) or {}
    murray = card_analysis.get("murray", {})
    events = card_analysis.get("events", [])
    themes = card_analysis.get("themes", [])

    def _get(key, default=50):
        """Pull from quantitative_scores first, then dimension_scores, then default."""
        v = quant.get(key)
        if v is not None:
            return v
        v = dims.get(key)
        if v is not None:
            return v
        return default

    def L(x):
        if not x:
            return []
        if isinstance(x, list):
            return x
        return [x]

    single_result = multicard_engine.aggregate([card_analysis])

    # Normalize themes to label strings for frontend compatibility
    raw_themes = themes
    if isinstance(raw_themes, dict):
        raw_themes = raw_themes.get('themes', [])
    theme_labels = []
    for th in (raw_themes if isinstance(raw_themes, list) else []):
        if isinstance(th, dict):
            label = th.get('label', th.get('theme', ''))
        else:
            label = str(th)
        if label:
            theme_labels.append(label)
    # Deduplicate preserving order + quality filter
    # Reject degenerate labels: too short, pure pronouns/stopwords,
    # or containing only common words that carry no psychological meaning.
    _THEME_STOPWORDS = {
        'i', 'me', 'my', 'we', 'us', 'you', 'he', 'she', 'it', 'they',
        'do', 'did', 'does', 'know', 'said', 'say', 'get', 'go', 'went',
        'the', 'a', 'an', 'is', 'was', 'are', 'be', 'been', 'being',
        'this', 'that', 'one', 'with', 'and', 'or', 'but', 'not',
    }
    seen = set()
    unique_themes = []
    for lbl in theme_labels:
        lbl_clean = lbl.strip()
        if not lbl_clean or lbl_clean in seen:
            continue
        # Must be at least 4 chars
        if len(lbl_clean) < 4:
            continue
        # Must have at least one word with ≥ 3 chars that isn't a stopword
        words = [w.strip('()[]{}.,!?/') for w in lbl_clean.lower().split()]
        meaningful = [w for w in words if len(w) >= 3 and w not in _THEME_STOPWORDS]
        if not meaningful:
            continue
        seen.add(lbl_clean)
        unique_themes.append(lbl_clean)

    aggregated = {
        "anxiety_level": _get("anxiety_level"),
        "conflict_internal": _get("conflict_internal"),
        "conflict_interpersonal": _get("conflict_interpersonal"),
        "hero_ego_strength": _get("hero_ego_strength", _get("ego_strength")),
        "overall_confidence": _get("overall_confidence"),
        "emotional_stability": _get("emotional_stability"),
        "reality_testing": _get("reality_testing"),
        "narrative_coherence": _get("narrative_coherence"),
        "complexity": _get("complexity"),
        "common_needs": L([n for n, _ in murray.get("needs", [])]),
        "common_presses": L([p for p, _ in murray.get("presses", [])]),
        "dominant_emotions": L([e.get('emotion') for e in events if e.get('emotion')]),
        "card_count": 1,
        "aggregation_type": "single_card_projection",
        "dimension_scores": dims,
        "overall_score": card_analysis.get("overall_score", 0),
    }
    
    # Merge multicard dynamics BEFORE assigning the normalized unique_themes string array
    # to prevent single_result['themes'] (which is a raw dict) from overwriting it.
    aggregated.update(single_result)
    
    # Assign the normalized string array
    aggregated["themes"] = unique_themes

    # Context Adjustment Extraction
    if 'context_adjustment' in card_analysis:
        aggregated['context_adjustment'] = card_analysis['context_adjustment']
        aggregated['base_psychological_score'] = card_analysis.get('base_psychological_score')


    # --- ENHANCED SURFACE: Single-card conflict, defense, environment, coping ---
    card_conflicts = card_analysis.get('conflict_structure', [])
    aggregated['aggregated_conflicts'] = [{
        'type': c.get('type', ''),
        'max_intensity': c.get('intensity', 0),
        'avg_intensity': c.get('intensity', 0),
        'evidence_samples': [c.get('evidence', c.get('description', ''))] if c.get('evidence') or c.get('description') else [],
        'source_cards': [card_analysis.get('card_id', 'unknown')],
        'persistence_score': 0,
        'resolution': c.get('resolution', 'unresolved'),
        'count': 1,
    } for c in card_conflicts]

    aggregated['global_conflict_score'] = {
        'total_conflicts': len(card_conflicts),
        'unique_types': len(set(c.get('type', '') for c in card_conflicts)),
        'persistent_types': [],
    }

    aggregated['aggregated_defenses'] = [{
        'defense': d.get('defense', 'Unknown'),
        'maturity_level': d.get('maturity_level', 'Unknown'),
        'avg_confidence': d.get('confidence', 0),
        'max_rigidity': d.get('rigidity_index', 0),
        'cross_card_consistency': 'N/A (single card)',
        'personality_organization': d.get('personality_organization', {}),
        'source_cards': [card_analysis.get('card_id', 'unknown')],
        'frequency': 1,
    } for d in card_analysis.get('defense_mechanisms', [])]

    card_env = card_analysis.get('environment_classification', {})
    secondary_env_type = card_env.get('secondary', None)
    is_mixed = card_env.get('is_mixed_environment', False)
    # Only expose secondary when it actually exists AND is_mixed is True
    # This prevents "Mixed environment, also Nurturing (0 cards)" ghost labels
    aggregated['aggregated_environment'] = {
        'dominant_type': card_env.get('primary', 'N/A'),
        'dominant_frequency': 1,
        'dominant_confidence': round(card_env.get('primary_confidence', 0), 2),
        'secondary_type': secondary_env_type if is_mixed else None,
        'secondary_frequency': 1 if is_mixed and secondary_env_type else 0,
        'is_mixed': is_mixed,
        'distribution': {card_env.get('primary', 'N/A'): 1} if card_env.get('primary') else {},
    }

    aggregated['aggregated_coping'] = [
        {'mechanism': c, 'frequency': 1, 'is_persistent': False}
        for c in card_analysis.get('coping_mechanisms', [])[:5]
    ]

    aggregated['needs_with_scores'] = murray.get('needs', [])[:10]
    aggregated['presses_with_scores'] = murray.get('presses', [])[:10]
    
    # Vision Distortions
    aggregated['aggregated_perceptual_distortions'] = card_analysis.get('perceptual_distortions', [])

    # Per-card summary (single card)
    aggregated['per_card_summaries'] = [{
        'card_id': card_analysis.get('card_id', 'unknown'),
        'needs': [{'name': n, 'score': round(s, 3)} for n, s in murray.get('needs', [])[:5]],
        'presses': [{'name': p, 'score': round(s, 3)} for p, s in murray.get('presses', [])[:5]],
        'conflicts': [{
            'type': c.get('type', ''),
            'intensity': round(c.get('intensity', 0), 2),
            'persistence_score': 0,
        } for c in card_conflicts[:5]],
        'environment': {
            'primary': card_env.get('primary', 'N/A'),
            'confidence': round(card_env.get('primary_confidence', 0), 2),
        },
        'defenses': [{
            'defense': d.get('defense', ''),
            'maturity_level': d.get('maturity_level', ''),
            'confidence': round(d.get('confidence', 0), 2),
        } for d in card_analysis.get('defense_mechanisms', [])[:3]],
        'coping': card_analysis.get('coping_mechanisms', [])[:5],
        'anxiety_level': quant.get('anxiety_level', 0),
        'ego_strength': quant.get('hero_ego_strength', quant.get('ego_strength', 0)),
    }]

    # --- PRODUCTION CORRECTION: §1 Global Metric Bounding ---
    aggregated = apply_global_bounds(aggregated)
    # --- PRODUCTION CORRECTION: §8 Validation Layer ---
    aggregated = validate_metrics(aggregated)

    return aggregated