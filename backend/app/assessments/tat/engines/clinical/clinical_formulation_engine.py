"""
Clinical Formulation Engine
---------------------------
Generates narrative formulations from aggregated psychological data.
Includes expanded sections: thematic organization, full need hierarchy,
need conflict structure, personality traits, authority model, peer style,
cross-card stability.

RECALIBRATION v3.0:
- Reframed as CLINICAL FORMULATION (Non-Diagnostic)
- Added Dominant Motivational Architecture, Core Relational Style,
  Emotional Regulation Pattern, Adaptive Strengths, Growth Edges
- Added DSM-5 safeguard notice
- Added Supervisory Integration Recommendation
"""

from typing import Dict, Any, List


# DSM-5 safeguard notice
DSM_SAFEGUARD = (
    "No definitive diagnosis is warranted unless narrative pathology meets "
    "DSM-5 symptom clustering thresholds across multiple data sources. "
    "All formulations below are exploratory and require supervisory validation."
)


def _strip_np(val: str) -> str:
    """Strips internal 'n' or 'p' prefixes from Murray labels at display-level."""
    if isinstance(val, str):
        # Handle older PascalCase like "nAchievement"
        if val.startswith('n') and len(val) > 1 and val[1].isupper():
            return val[1:]
        if val.startswith('p') and len(val) > 1 and val[1].isupper():
            return val[1:]
    return str(val)


def generate_clinical_formulation(aggregated_data: Dict[str, Any]) -> str:
    """
    aggregated_data is the output from MulticardDynamicsEngine.aggregate()
    Returns a human-readable formulation with expanded clinical insights
    and recalibrated non-diagnostic framing.
    """
    lines = []

    # =================================================================
    # HEADER (Recalibration v3.0)
    # =================================================================
    lines.append("CLINICAL FORMULATION (Non-Diagnostic)")
    lines.append("=" * 55)
    lines.append("")
    lines.append(f"⚠ {DSM_SAFEGUARD}")
    lines.append("")

    # =================================================================
    # DOMINANT MOTIVATIONAL ARCHITECTURE (Recalibration v3.0)
    # =================================================================
    murray = aggregated_data.get('murray', {})
    needs_full = murray.get('needs_full_profile', [])
    dominant_needs = murray.get('dominant_needs', [])
    top_needs = dominant_needs[:3] if dominant_needs else [(n, s) for n, s in (needs_full or [])[:3]]

    lines.append("DOMINANT MOTIVATIONAL ARCHITECTURE:")
    lines.append("-" * 40)
    if top_needs:
        need_names = [_strip_np(n) for n, _ in top_needs]
        lines.append(f"  Primary motivational drivers: {', '.join(need_names)}")
        for need, score in top_needs:
            lines.append(f"    • {_strip_np(need)}: {score:.3f}")
    else:
        lines.append("  No dominant motivational pattern identified.")

    latent_needs = murray.get('latent_needs', [])
    if latent_needs:
        lines.append(f"  Latent/unexpressed needs: {', '.join([_strip_np(n) for n, _ in latent_needs[:3]])}")

    suppressed_needs = murray.get('suppressed_needs', [])
    if suppressed_needs:
        lines.append(f"  Suppressed needs: {', '.join([_strip_np(n) for n, _ in suppressed_needs[:3]])}")
    lines.append("")

    # Murray full need hierarchy (preserved from original)
    if needs_full:
        lines.append("FULL NEED HIERARCHY:")
        for need, score in needs_full[:10]:
            lines.append(f"  {_strip_np(need)}: {score:.3f}")
        lines.append("")

    # =================================================================
    # CORE RELATIONAL STYLE (Recalibration v3.0)
    # =================================================================
    rp = aggregated_data.get('relational_patterns', {})
    lines.append("CORE RELATIONAL STYLE:")
    lines.append("-" * 40)

    # Attachment classification (from recalibrated relational engine)
    attachment = rp.get('attachment_classification', {})
    if attachment:
        lines.append(f"  Attachment style: {attachment.get('style', 'Mixed')}")
        lines.append(f"    Evidence: {attachment.get('evidence', 'N/A')}")
        lines.append(f"    Confidence: {attachment.get('confidence', 0):.0%}")

    # Figure classifications (preserved)
    fig_class = rp.get('figure_classifications', {})
    if fig_class:
        lines.append("  Figure types identified:")
        for node, ftype in list(fig_class.items())[:5]:
            lines.append(f"    {node}: {ftype}")

    # Authority figures (preserved)
    authority_figures = rp.get('authority_figures', [])
    if authority_figures:
        lines.append("  Authority figures: " + ", ".join([f"{n}" for n, _ in authority_figures]))

    # Contemporary figures (v4.0)
    fig_class = rp.get('figure_classifications', {})
    contemporary_figures = [node for node, ftype in fig_class.items() if ftype == "Contemporary"]
    if contemporary_figures:
        lines.append("  Contemporary figures: " + ", ".join(contemporary_figures))
    elif not authority_figures:
        lines.append("  No authority or contemporary figures identified.")

    # Interaction psychology (preserved)
    inter_psych = rp.get('interaction_psychology', {})
    if inter_psych:
        lines.append("  Interaction dynamics:")
        for node, metrics in list(inter_psych.items())[:3]:
            lines.append(f"    {node}: affect={metrics['affect']:.2f}, power={metrics['power_perception']:.2f}, dependency={metrics['dependency']:.2f}")
    lines.append("")

    # =================================================================
    # EMOTIONAL REGULATION PATTERN (Recalibration v3.0)
    # =================================================================
    lines.append("EMOTIONAL REGULATION PATTERN:")
    lines.append("-" * 40)

    emo = aggregated_data.get('emotional_attractors', [])
    if emo:
        lines.append("  Core emotional states:")
        for e, cnt in emo[:5]:
            lines.append(f"    • {e} (frequency: {cnt})")

    # Regulation metrics from dimension scores
    dims = aggregated_data.get('dimension_scores', {})
    em_stab = dims.get('emotional_stability', aggregated_data.get('emotional_stability', 50))
    affect_int = dims.get('affective_integration', aggregated_data.get('affective_integration', 5))
    lines.append(f"  Emotional stability: {em_stab:.1f}/100")
    lines.append(f"  Affective integration: {affect_int:.1f}/100")

    ego_traj = aggregated_data.get('ego_trajectory', {})
    if ego_traj:
        lines.append(f"  Ego strength trajectory: {ego_traj.get('trend', 'stable')} (volatility {ego_traj.get('volatility', 0):.2f})")
    lines.append("")

    # =================================================================
    # DEFENSIVE ORGANIZATION (v3.0 — from defense inference engine)
    # =================================================================
    lines.append("DEFENSIVE ORGANIZATION:")
    lines.append("-" * 40)

    agg_defenses = aggregated_data.get('aggregated_defenses', [])
    if agg_defenses:
        # Primary defense cluster
        lines.append("  Primary defense mechanisms:")
        for d in agg_defenses[:3]:
            mat = d.get('maturity_level', 'Unknown')
            conf = d.get('avg_confidence', d.get('confidence', 0))
            rig = d.get('max_rigidity', d.get('rigidity_index', 0))
            lines.append(f"    • {d.get('defense', 'Unknown')} [{mat}] — "
                         f"confidence: {conf:.2f}, rigidity: {rig:.2f}")

        # Maturity distribution
        maturity_levels = [d.get('maturity_level', 'Unknown') for d in agg_defenses]
        mat_counts = {}
        for m in maturity_levels:
            mat_counts[m] = mat_counts.get(m, 0) + 1
        maturity_str = ', '.join([f"{k}: {v}" for k, v in mat_counts.items()])
        lines.append(f"  Maturity distribution: {maturity_str}")

        # Cross-card consistency (if multi-card)
        for d in agg_defenses[:3]:
            ccc = d.get('cross_card_consistency', 'N/A')
            if ccc and 'Persistent' in str(ccc):
                lines.append(f"  ⚠ {d.get('defense', 'Unknown')}: {ccc} (fixed defensive style)")
    else:
        # Fallback: try per-card defense_mechanisms
        card_defenses = []
        for card in aggregated_data.get('per_card_summaries', []):
            card_defenses.extend(card.get('defenses', []))
        if card_defenses:
            lines.append("  Primary defense mechanisms:")
            for d in card_defenses[:3]:
                mat = d.get('maturity_level', 'Unknown')
                lines.append(f"    • {d.get('defense', 'Unknown')} [{mat}] — "
                             f"confidence: {d.get('confidence', 0):.2f}")
        else:
            lines.append("  No defense mechanisms currently available.")

    # Personality organization (Kernberg) — from first defense with this field
    personality_org = None
    for d in agg_defenses:
        if 'personality_organization' in d:
            personality_org = d.get('personality_organization', {})
            break
    # Fallback: check per_card_summaries → defense_mechanisms → personality_organization
    if not personality_org:
        for card in aggregated_data.get('per_card_summaries', []):
            for d in card.get('defenses', []):
                if 'personality_organization' in d:
                    personality_org = d.get('personality_organization', {})
                    break
            if personality_org:
                break

    if personality_org and isinstance(personality_org, dict):
        org_level = personality_org.get('level', 'Indeterminate')
        org_conf = personality_org.get('confidence', 0)
        org_rationale = personality_org.get('rationale', '')
        lines.append(f"  Personality organization (Kernberg): {org_level} (confidence: {org_conf:.0%})")
        if org_rationale:
            lines.append(f"    {org_rationale}")
    else:
        lines.append("  Personality organization: Data insufficient for classification.")

    # Defensive flexibility assessment
    if agg_defenses:
        avg_rigidity = sum(d.get('max_rigidity', d.get('rigidity_index', 0)) for d in agg_defenses) / len(agg_defenses)
        if avg_rigidity > 0.7:
            lines.append("  ⚠ Defensive Flexibility: RIGID — fixed defensive style with limited adaptive range.")
        elif avg_rigidity > 0.4:
            lines.append("  Defensive Flexibility: MODERATE — some defensive variability across contexts.")
        else:
            lines.append("  ✓ Defensive Flexibility: FLEXIBLE — diverse defensive repertoire, adaptive capacity intact.")
    lines.append("")

    # =================================================================
    # NEED CONFLICT STRUCTURE (preserved)
    # =================================================================
    need_conflicts = murray.get('need_conflicts', [])
    if need_conflicts:
        lines.append("NEED CONFLICT STRUCTURE:")
        for conf in need_conflicts:
            lines.append(f"  {conf['need_a']} vs {conf['need_b']} (strength {conf['conflict_strength']:.2f}) - {conf['conflict_type']}")
        lines.append("")

    conflicts = murray.get('conflicts', [])
    if conflicts:
        lines.append("Key need-press conflicts:")
        for n, p, i in conflicts:
            lines.append(f"  - {n} vs {p} (intensity {i:.2f})")
        lines.append("")

    # =================================================================
    # THEMATIC ORGANIZATION (preserved)
    # =================================================================
    themes = aggregated_data.get('themes', {})
    if isinstance(themes, dict):
        themes = themes.get('themes', [])
    if themes:
        lines.append("NARRATIVE ORGANIZATION:")
        for t in (themes if isinstance(themes, list) else [])[:5]:
            if isinstance(t, dict):
                conflict_str = ''
                if t.get('conflicting_needs'):
                    conflict_str = ', '.join([f"{c['need_a']}-{c['need_b']}" for c in t['conflicting_needs']])
                lines.append(f"  Theme: {t.get('label', t.get('theme', 'Unknown'))}")
                lines.append(f"    Type: {t.get('type', 'narrative')} | Intensity: {t.get('intensity', 0):.2f} | Affect: {t.get('affect_tone', 'neutral')}")
                lines.append(f"    Related needs: {', '.join(t.get('related_needs', []))}")
                if conflict_str:
                    lines.append(f"    Internal conflict: {conflict_str}")
        lines.append("")

    # =================================================================
    # ADAPTIVE STRENGTHS (Recalibration v3.0)
    # =================================================================
    lines.append("ADAPTIVE STRENGTHS:")
    lines.append("-" * 40)
    strengths = []
    ego = dims.get('ego_strength', aggregated_data.get('hero_ego_strength', 50))
    if ego >= 60:
        strengths.append(f"Adequate ego functioning ({ego:.0f}/100)")
    reality = dims.get('reality_testing', aggregated_data.get('reality_testing', 50))
    if reality >= 60:
        strengths.append(f"Intact reality testing ({reality:.0f}/100)")
    social = dims.get('social_cognition', aggregated_data.get('social_cognition', 50))
    if social >= 50:
        strengths.append(f"Social cognition within normal range ({social:.0f}/100)")
    coherence = dims.get('narrative_coherence', aggregated_data.get('narrative_coherence', 50))
    if coherence >= 60:
        strengths.append(f"Coherent narrative organization ({coherence:.0f}/100)")

    # Personality trait strengths
    traits = rp.get('personality_traits', {})
    if traits.get('affect_regulation', 0) > 0.6:
        strengths.append("Adequate affect regulation capacity")
    if traits.get('attachment_security', 0) > 0.5:
        strengths.append("Baseline attachment security")

    if strengths:
        for s in strengths:
            lines.append(f"  ✓ {s}")
    else:
        lines.append("  Assessment engagement itself indicates willingness to explore inner experience.")
    lines.append("")

    # =================================================================
    # GROWTH EDGES (Recalibration v3.0)
    # =================================================================
    lines.append("GROWTH EDGES:")
    lines.append("-" * 40)
    edges = []
    if ego < 40:
        edges.append(f"Ego strength development ({ego:.0f}/100 — below adaptive threshold)")
    if em_stab < 40:
        edges.append(f"Emotional regulation strengthening ({em_stab:.0f}/100)")
    if social < 40:
        edges.append(f"Social cognition enhancement ({social:.0f}/100)")
    if traits.get('defensive_rigidity', 0) > 0.7:
        edges.append("Defensive flexibility development (rigidity detected)")

    if edges:
        for e in edges:
            lines.append(f"  → {e}")
    else:
        lines.append("  No significant growth edges identified at this assessment level.")
    lines.append("")

    # =================================================================
    # PERSONALITY TRAITS (preserved)
    # =================================================================
    if traits:
        lines.append("PERSONALITY TRAITS (from relational patterns):")
        for trait, value in traits.items():
            if isinstance(value, str):
                lines.append(f"  {trait.replace('_', ' ').title()}: {value}")
            elif isinstance(value, (int, float)):
                lines.append(f"  {trait.replace('_', ' ').title()}: {value:.2f}")
        lines.append("")

    # =================================================================
    # CROSS-CARD STABILITY (v3.1: guarded for single-card N/A)
    # =================================================================
    def _fmt_stability(val):
        """Format stability value, handling N/A for single-card."""
        if isinstance(val, str):
            return f"{val} (single card)"
        return f"{val:.2f}"

    lines.append("CROSS-CARD STABILITY:")
    stability_keys = [
        ('need_stability', 'Need stability'),
        ('press_stability', 'Press stability'),
        ('conflict_persistence', 'Conflict persistence'),
        ('authority_pattern_stability', 'Authority pattern stability'),
        ('contemporary_pattern_stability', 'Contemporary pattern stability'),
        ('peer_pattern_stability', 'Peer pattern stability'),
        ('trait_convergence', 'Trait convergence'),
    ]
    for key, label in stability_keys:
        if key in aggregated_data:
            lines.append(f"  {label}: {_fmt_stability(aggregated_data[key])}")

    if 'stability_confidence' in aggregated_data:
        sc = aggregated_data['stability_confidence']
        lines.append(f"  Stability confidence: {_fmt_stability(sc)}")
    lines.append("")

    # =================================================================
    # PSYCHOMETRIC CONFIDENCE (Recalibration v3.0)
    # =================================================================
    psych = aggregated_data.get('psychometric_integrity', {})
    if psych:
        lines.append("PSYCHOMETRIC CONFIDENCE:")
        lines.append(f"  Internal consistency (α): {psych.get('internal_consistency', 0):.3f}")
        lines.append(f"  Cross-card convergence: {psych.get('cross_card_convergence', 0):.3f}")
        lines.append(f"  Interpretive confidence: {psych.get('interpretive_confidence', 0):.3f}")
        lines.append(f"  Narrative adequacy: {psych.get('narrative_adequacy', 'N/A')}")
        lines.append("")

    # =================================================================
    # SUPERVISORY INTEGRATION RECOMMENDATION (Recalibration v3.0)
    # =================================================================
    lines.append("SUPERVISORY INTEGRATION RECOMMENDATION:")
    lines.append("-" * 40)
    lines.append("  This formulation should be reviewed in the context of:")
    lines.append("  1. Clinical interview data and behavioral observations")
    lines.append("  2. Corroborating psychometric instruments (e.g., MMPI-2, BDI-II)")
    lines.append("  3. Cultural and developmental history")
    lines.append("  4. Current treatment goals and therapeutic alliance")
    lines.append("")
    lines.append(f"  ⚠ {DSM_SAFEGUARD}")

    return "\n".join(lines)