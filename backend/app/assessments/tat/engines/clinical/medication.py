# ============================================================================
# MEDICATION & OLLAMA INTEGRATION
# ============================================================================

# Module-level cache to avoid re-running the same Ollama inference
# (e.g., when /api/aggregate and /api/report both call this function
#  with identical data in the same session).
_medication_result_cache = {}


def _build_cache_key(card_analyses):
    """Build a deterministic cache key from card IDs + story lengths."""
    parts = []
    for k in sorted(card_analyses.keys()):
        story = card_analyses[k].get('story_text', card_analyses[k].get('story', ''))
        parts.append(f"{k}:{len(story or '')}")
    return "|".join(parts)


def clear_medication_cache():
    """Clear the medication result cache (call between sessions)."""
    _medication_result_cache.clear()


def get_medication_and_humanize(card_analyses, aggregated_analysis,
                                medication_engine, ollama_humanizer,
                                rag_engine=None,
                                clinical_formulation=None):
    """
    Match inferred conditions to medication database and humanize output.

    When ``clinical_formulation`` is provided, a single
    'comprehensive_clinical_report' Ollama call replaces the separate
    'therapy_recommendation' + 'clinical_summary' calls — cutting the
    number of LLM inferences from 2 to 1 without losing any output.

    rag_engine: optional RAG engine for remedy-specific KB context retrieval.
    clinical_formulation: optional clinical formulation text to include in the
        combined prompt. When provided, the result dict will also contain a
        'clinical_conclusion' key with the AI clinical conclusion text.
    """
    # --- Cache check (prevents duplicate Ollama calls in API aggregate+report flow) ---
    cache_key = _build_cache_key(card_analyses)
    if cache_key in _medication_result_cache:
        print(f"\n{'='*80}")
        print("MEDICATION REASONING & HUMANIZATION")
        print(f"{'='*80}\n")
        print("  ♻️ Using cached medication results (avoiding duplicate Ollama call)")
        print(f"\n{'='*80}\n")
        return _medication_result_cache[cache_key]

    print(f"\n{'='*80}")
    print("MEDICATION REASONING & HUMANIZATION")
    print(f"{'='*80}\n")

    # ----------------------------------------------------------------------
    # 1️⃣ EXTRACT THEMES & EMOTIONS
    # ----------------------------------------------------------------------
    all_themes = []
    all_emotions = []
    all_cultural_factors = []
    all_cultural_notes = []

    def _extract_theme_labels(themes_data):
        """Extract string labels from theme data (which may be dicts or strings)."""
        if isinstance(themes_data, dict):
            themes_data = themes_data.get('themes', [])
        labels = []
        for t in (themes_data or []):
            if isinstance(t, dict):
                labels.append(t.get('label', t.get('words', ['unknown'])[0] if t.get('words') else 'unknown'))
            elif isinstance(t, str):
                labels.append(t)
        return labels

    for analysis in card_analyses.values():
        events = analysis.get('events', [])
        for e in events:
            if e.get('emotion'):
                all_emotions.append(e['emotion'])
        all_themes.extend(_extract_theme_labels(analysis.get('themes', [])))
        # Extract cultural context
        all_cultural_factors.extend(analysis.get('indian_context_factors', []))
        all_cultural_notes.extend(analysis.get('cultural_normalization_notes', []))

    if aggregated_analysis:
        all_emotions.extend([e for e,_ in aggregated_analysis.get('emotional_attractors', [])])
        all_themes.extend(_extract_theme_labels(aggregated_analysis.get('themes', [])))

    all_emotions = list(set(filter(None, all_emotions)))
    all_themes = list(set(filter(None, all_themes)))
    all_cultural_factors = list(set(filter(None, all_cultural_factors)))
    all_cultural_notes = list(set(filter(None, all_cultural_notes)))

    # ----------------------------------------------------------------------
    # 2️⃣ MATCH MEDICATION CONDITIONS
    # ----------------------------------------------------------------------
    print("💊 Matching conditions to MEDICATION.csv...")
    matches = []

    if medication_engine:
        try:
            raw_matches = medication_engine.match_conditions(
                themes=all_themes,
                emotions=all_emotions
            )
            seen_conditions = set()
            for m in raw_matches:
                condition = getattr(m, "mental_condition", None)
                if condition and condition not in seen_conditions:
                    seen_conditions.add(condition)
                    matches.append(m)
            print(f"  ✅ Found {len(matches)} unique condition matches")
        except Exception as e:
            print(f"  ❌ Medication matching error: {e}")
            matches = []
    else:
        print("  ⚠ Medication engine not available")
        matches = []

    # ----------------------------------------------------------------------
    # 3️⃣ PREPARE STRUCTURED DATA FOR OLLAMA
    # ----------------------------------------------------------------------
    import re
    def _strip_murray_prefix(s: str) -> str:
        s = re.sub(r'^[NnPp]([A-Z][a-z])', lambda m: m.group(1), str(s).strip())
        s = re.sub(r'^[np]([a-z])', lambda m: m.group(1).upper(), s)
        return s

    top_needs = []
    top_presses = []

    for analysis in card_analyses.values():
        murray = analysis.get('murray', {})
        top_needs.extend([_strip_murray_prefix(n) for n, _ in murray.get('needs', [])[:3]])
        top_presses.extend([_strip_murray_prefix(p) for p, _ in murray.get('presses', [])[:3]])

    if aggregated_analysis:
        top_needs.extend([_strip_murray_prefix(n) for n, _ in aggregated_analysis.get('murray', {}).get('needs', [])[:3]])
        top_presses.extend([_strip_murray_prefix(p) for p, _ in aggregated_analysis.get('murray', {}).get('presses', [])[:3]])

    # Extract patient age + gender from any card analysis
    patient_age = None
    age_context = {}
    patient_gender = None
    gender_context = {}
    patient_environment = ""
    patient_notes = ""
    for analysis in card_analyses.values():
        if analysis.get('patient_age') is not None:
            patient_age = analysis['patient_age']
            age_context = analysis.get('age_context', {})
        if analysis.get('patient_gender') is not None and patient_gender is None:
            patient_gender = analysis['patient_gender']
            gender_context = analysis.get('gender_context', {})
        if analysis.get('patient_environment'):
            patient_environment = analysis['patient_environment']
        if analysis.get('patient_notes'):
            patient_notes = analysis['patient_notes']
        if patient_age is not None and patient_gender is not None and patient_environment and patient_notes:
            break

    # --- Retrieve remedy-specific KB context ---
    remedy_kb_context = ""
    if rag_engine and hasattr(rag_engine, 'retrieve_for_domain'):
        try:
            # Build remedy-focused query from matched conditions + themes
            matched_conditions = [
                getattr(m, "mental_condition", "") for m in matches[:3]
            ]
            remedy_query = " ".join(all_themes[:4] + all_emotions[:3] + matched_conditions)
            if remedy_query.strip():
                passages = rag_engine.retrieve_for_domain("remedies", remedy_query, top_k=4)
                remedy_kb_context = rag_engine.format_context(passages, max_chars=1500)
        except Exception:
            remedy_kb_context = ""

    # Build narrative excerpt from cards for Ollama prompt
    tat_story_excerpt = ""
    if clinical_formulation:
        # When doing comprehensive mode, collect stories from ALL cards
        stories = []
        for card_key, analysis in card_analyses.items():
            story = analysis.get('story', analysis.get('story_text', analysis.get('narrative', '')))
            if story:
                stories.append(f"Card {card_key}: {story[:200]}")
        tat_story_excerpt = "\n".join(stories[:5])
    else:
        for analysis in card_analyses.values():
            story = analysis.get('story', analysis.get('narrative', ''))
            if story:
                tat_story_excerpt = story[:400]
                break

    # Build psych profile data
    psych_profile_data = {
        "patient_age": patient_age,
        "age_context": age_context.get("label", "Not provided"),
        "age_guidance": age_context.get("guidance", ""),
        "patient_gender": patient_gender,
        "gender_context": gender_context.get("label", "Not specified"),
        "gender_guidance": gender_context.get("guidance", ""),
        "patient_environment": patient_environment,
        "patient_notes": patient_notes,
        "needs": list(set(top_needs))[:6],
        "presses": list(set(top_presses))[:6],
        "emotions": all_emotions[:6],
        "themes": all_themes[:6],
        "conflict_types": [],
        "cultural_factors": all_cultural_factors,
        "cultural_notes": all_cultural_notes,
    }

    # Inject clinical formulation into psych_profile for the combined prompt
    if clinical_formulation:
        psych_profile_data["_clinical_formulation"] = clinical_formulation

        # Also enrich with aggregated data for a richer clinical conclusion
        if aggregated_analysis:
            raw_defenses = aggregated_analysis.get('defenses', {})
            if isinstance(raw_defenses, dict):
                # dict keyed by defense name (multicard) — just use the keys
                psych_profile_data["defenses"] = list(raw_defenses.keys())[:6]
            else:
                # list of defense dicts — extract the 'defense' name field
                _def_names = []
                for d in raw_defenses[:6]:
                    if isinstance(d, dict):
                        name = d.get('defense') or d.get('name', '')
                        if name:
                            _def_names.append(name)
                    elif d:
                        _def_names.append(str(d))
                psych_profile_data["defenses"] = _def_names
            psych_profile_data["conflict_types"] = list(
                aggregated_analysis.get('conflict', {}).get('types', {}).keys()
            )[:4]
            psych_profile_data["relational_figures"] = [
                f.get('entity', '') for f in
                aggregated_analysis.get('relational', {}).get('valid_figure_types', [])[:5]
                if isinstance(f, dict) and f.get('entity')
            ]

    ollama_data = {
        "tat_story": tat_story_excerpt,
        "psych_profile": psych_profile_data,
        "recommended_remedies": [
            m.to_dict() if hasattr(m, "to_dict") else str(m)
            for m in matches[:5]
        ],
        "learned_concepts": all_themes[:10],
    }

    # ----------------------------------------------------------------------
    # 4️⃣ OLLAMA HUMANIZATION
    # When clinical_formulation is provided, use comprehensive mode (1 call)
    # Otherwise, use original therapy_recommendation mode (backward compat)
    # ----------------------------------------------------------------------
    use_comprehensive = bool(clinical_formulation and ollama_humanizer)
    response_type = 'comprehensive_clinical_report' if use_comprehensive else 'therapy_recommendation'

    print(f"\n🤖 Invoking Ollama ({response_type})...")
    humanized_summary = None
    clinical_conclusion = None
    meta_reasoning_text = None

    if ollama_humanizer:
        try:
            response = ollama_humanizer.humanize_response(
                response_type=response_type,
                data=ollama_data
            )
            response_text = str(response).strip() if response is not None else ""

            if not response_text:
                print("  ⚠️ Ollama returned empty response.")
                humanized_summary = "Humanized summary unavailable — model returned empty output."
            elif len(response_text) < 40:
                print("  ⚠️ Ollama returned very short response.")
                humanized_summary = response_text + "\n\n(Note: Response unusually brief.)"
            else:
                if use_comprehensive:
                    # Split the comprehensive response into three sections
                    from app.services.ollama_humanizer import OllamaHumanizer
                    sections = OllamaHumanizer.split_comprehensive_response(response_text)
                    humanized_summary = sections['therapy_recommendation']
                    clinical_conclusion = sections['clinical_conclusion']
                    meta_reasoning_text = sections['meta_reasoning']
                    print(f"  ✅ Ollama returned {len(response_text)} chars "
                          f"(meta: {len(meta_reasoning_text)}, "
                          f"therapy: {len(humanized_summary)}, "
                          f"conclusion: {len(clinical_conclusion)})")
                else:
                    humanized_summary = response_text
                    print(f"  ✅ Ollama returned {len(response_text)} characters.")
        except Exception as e:
            print(f"  ❌ Ollama error: {e}")
            humanized_summary = f"Ollama service error: {str(e)}"
    else:
        print("  ⚠ Ollama humanizer not available")
        humanized_summary = "Humanization unavailable — Ollama not configured."

    if not humanized_summary or not str(humanized_summary).strip():
        humanized_summary = "Humanized summary unavailable — no valid Ollama output."

    # --- PRODUCTION CORRECTION: §2 Final Medication Confidence Clamp ---
    # Enforce 0-100% bounding at render layer to prevent overflow (e.g., 446%)
    for m in matches:
        if hasattr(m, 'match_score'):
            m.match_score = round(max(0.0, min(100.0, float(m.match_score))), 2)

    print(f"\n{'='*80}\n")

    result = {
        "medication_matches": matches,
        "humanized_summary": humanized_summary,
        "ollama_interpretation": humanized_summary,
    }

    # Include comprehensive sections when comprehensive mode was used
    if clinical_conclusion:
        result["clinical_conclusion"] = clinical_conclusion
    if meta_reasoning_text:
        result["meta_reasoning"] = meta_reasoning_text

    # Cache the result
    _medication_result_cache[cache_key] = result

    return result