# ============================================================================
# PER-CARD ANALYSIS FUNCTION
# ============================================================================

import numpy as np
import logging
from datetime import datetime
from pathlib import Path
from app.utils.production_utils import set_reproducibility_seed, detect_input_quality, round_metric
from app.assessments.tat.engines.visual.visual_analysis_engine import evaluate_perceptual_distortions
from app.services.language_detector import detect_language
from app.assessments.tat.engines.clinical.context_adjustment_engine import ContextAdjustmentEngine
from app.utils.card_metadata import get_card_target_tags

logger = logging.getLogger(__name__)

def _get_age_context(age):
    """Determine developmental stage and interpretive guidance based on patient age."""
    if age is None:
        return {
            "stage": "unknown",
            "label": "Age not provided",
            "guidance": "Interpret narrative without age-specific adjustments.",
        }
    age = int(age)
    if age <= 12:
        return {
            "stage": "child",
            "label": f"{age}-year-old child",
            "guidance": (
                f"This narrative is from a {age}-year-old child. "
                "Interpret through a developmentally appropriate lens: "
                "expect concrete thinking, simpler emotional vocabulary, "
                "fantasy elements, and age-typical concerns (family, play, school). "
                "Avoid over-pathologizing normative childhood themes."
            ),
        }
    elif age <= 17:
        return {
            "stage": "adolescent",
            "label": f"{age}-year-old adolescent",
            "guidance": (
                f"This narrative is from a {age}-year-old adolescent. "
                "Interpret with awareness of identity formation, peer dynamics, "
                "emerging autonomy, emotional intensity, and age-typical conflicts "
                "(authority, belonging, self-image). "
                "Heightened emotionality may be developmentally normative."
            ),
        }
    elif age <= 25:
        return {
            "stage": "young_adult",
            "label": f"{age}-year-old young adult",
            "guidance": (
                f"This narrative is from a {age}-year-old young adult. "
                "Interpret with consideration for career/academic pressures, "
                "romantic relationship themes, independence, and emerging adult identity."
            ),
        }
    elif age <= 45:
        return {
            "stage": "adult",
            "label": f"{age}-year-old adult",
            "guidance": (
                f"This narrative is from a {age}-year-old adult. "
                "Interpret within the context of established life roles, "
                "work-life balance, family responsibilities, and midlife reflections."
            ),
        }
    elif age <= 60:
        return {
            "stage": "middle_aged",
            "label": f"{age}-year-old middle-aged individual",
            "guidance": (
                f"This narrative is from a {age}-year-old individual. "
                "Consider themes of generativity, legacy, health concerns, "
                "and re-evaluation of life priorities."
            ),
        }
    else:
        return {
            "stage": "senior",
            "label": f"{age}-year-old senior",
            "guidance": (
                f"This narrative is from a {age}-year-old senior individual. "
                "Interpret with sensitivity to themes of reflection, loss, "
                "wisdom, health, and end-of-life considerations."
            ),
        }


def _get_gender_context(gender, nlp_processor=None):
    """Return interpretive context and adjustments based on patient gender.
    Uses Sentence-BERT embedding similarity for robust classification.
    Follows TAT manual guidance on gender-differential card norms.
    """
    if not gender or gender.strip().lower() in ('not specified', 'unknown', ''):
        return {
            "label": "Gender not specified",
            "guidance": "Interpret narrative without gender-specific adjustments.",
            "card_norms": [],
            "gender_normalized": False,
        }

    # ── Transformer-based classification via cosine similarity ──
    gender_category = _classify_gender_embedding(gender, nlp_processor)

    if gender_category == "female":
        return {
            "label": f"Female ({gender})",
            "guidance": (
                f"This narrative is from a female patient ({gender}). "
                "Per TAT manual norms, female respondents typically produce more "
                "affiliative, nurturing, and relationally-focused themes. "
                "Card 3BM may elicit grief/loss themes rather than aggression. "
                "Card 4 may emphasize attachment dynamics over sexual rivalry. "
                "Card 13MF should be interpreted within female-normative relational contexts; "
                "avoid over-pathologizing moralistic or protective themes. "
                "Achievement needs may be framed relationally rather than autonomously."
            ),
            "card_norms": [
                "Card 3BM: grief/loss themes normative, less pathological than male respondents",
                "Card 4: attachment and relational security themes expected",
                "Card 13MF: protective/nurturing framing normative",
                "Card 2: education/ambition themes may reflect gender-role negotiation",
            ],
            "gender_normalized": True,
        }
    elif gender_category == "male":
        return {
            "label": f"Male ({gender})",
            "guidance": (
                f"This narrative is from a male patient ({gender}). "
                "Per TAT manual norms, male respondents typically produce more "
                "achievement-oriented, autonomy-seeking, and power-themed narratives. "
                "Card 3BM: aggression/suicidal themes more common — interpret within "
                "normative masculine emotional suppression context. "
                "Card 4: themes of sexual rivalry or autonomy conflict are normative. "
                "Card 13MF: sexual anxiety or guilt themes are more common — evaluate "
                "intensity carefully before pathologizing."
            ),
            "card_norms": [
                "Card 3BM: aggression/suicidal themes require careful evaluation of intensity",
                "Card 4: autonomy conflict and sexual rivalry themes normative",
                "Card 13MF: sexual anxiety normative; evaluate guilt intensity",
                "Card 1: high achievement need themes expected",
            ],
            "gender_normalized": True,
        }
    else:
        # Non-binary or other gender identities
        return {
            "label": f"Non-binary / Other ({gender})",
            "guidance": (
                f"This narrative is from a patient who identifies as {gender}. "
                "Apply gender-sensitive interpretation without defaulting to binary norms. "
                "Focus on the patient's own expressed identity themes, relational needs, "
                "and any identity-related stressors that emerge in the narrative. "
                "Avoid imposing binary gender normative expectations."
            ),
            "card_norms": [],
            "gender_normalized": True,
        }


# ── Gender prototype sentences for embedding-based classification ──
_GENDER_PROTOTYPES = {
    "male": [
        "The patient is male.",
        "He is a man.",
        "The patient is a boy.",
        "Male gender identity.",
        "He identifies as male.",
    ],
    "female": [
        "The patient is female.",
        "She is a woman.",
        "The patient is a girl.",
        "Female gender identity.",
        "She identifies as female.",
    ],
    "nonbinary": [
        "The patient is non-binary.",
        "They identify as genderqueer.",
        "The patient uses they/them pronouns.",
        "Gender non-conforming identity.",
        "The patient identifies as genderfluid.",
    ],
}

# Cache for prototype embeddings (computed once per process)
_gender_proto_cache = {}


def _classify_gender_embedding(gender_input: str, nlp_processor=None) -> str:
    """Classify gender using Sentence-BERT cosine similarity to prototypes.

    Returns 'male', 'female', or 'nonbinary'.  Falls back to simple token
    matching only when no NLP processor is available.
    """
    global _gender_proto_cache

    # ── Primary path: transformer embedding similarity ──
    if nlp_processor is not None and hasattr(nlp_processor, 'get_embeddings'):
        try:
            # Build / cache prototype embeddings on first call
            if not _gender_proto_cache:
                for category, sentences in _GENDER_PROTOTYPES.items():
                    _gender_proto_cache[category] = nlp_processor.get_embeddings(sentences)

            # Embed the input gender string as a short sentence
            query = f"The patient's gender is {gender_input}."
            query_emb = nlp_processor.get_embeddings([query])[0]  # shape (dim,)

            best_category = "nonbinary"
            best_score = -1.0

            for category, proto_embs in _gender_proto_cache.items():
                # Cosine similarity: query vs each prototype, take mean
                norms = np.linalg.norm(proto_embs, axis=1, keepdims=True) * np.linalg.norm(query_emb) + 1e-8
                sims = np.dot(proto_embs, query_emb) / norms.squeeze()
                avg_sim = float(np.mean(sims))

                if avg_sim > best_score:
                    best_score = avg_sim
                    best_category = category

            return best_category
        except Exception as e:
            print(f"⚠ Gender embedding classification failed ({e}), using fallback")

    # ── Fallback: token-set matching (only if NLP processor unavailable) ──
    g = gender_input.strip().lower()
    g_tokens = set(g.replace('-', ' ').replace('_', ' ').split())
    male_tokens = {'male', 'man', 'boy', 'm'}
    female_tokens = {'female', 'woman', 'girl', 'f'}
    is_male = bool(g_tokens & male_tokens)
    is_female = bool(g_tokens & female_tokens)

    if is_female and not is_male:
        return "female"
    elif is_male and not is_female:
        return "male"
    return "nonbinary"


def analyze_card(card_id, story_text, patient_profile,
                 semantic_engine, murray_engine, theme_engine,
                 relational_engine, quantitative_scorer, scoring_engine,
                 conflict_engine=None, environment_classifier=None,
                 meta_reasoning_engine=None, visual_engine=None,
                 defense_engine=None, ollama_model_name="llama3",
                 rag_engine=None):
    """
    Comprehensive analysis of a single TAT card using provided engines.
    rag_engine: optional RAG engine for KB-grounded analysis enrichment.
    """
    # --- PRODUCTION HARDENING: Reproducibility seed (§1) ---
    set_reproducibility_seed(42)

    # --- PRODUCTION HARDENING: Input validation (§9) ---
    input_quality = detect_input_quality(story_text)
    
    if input_quality["quality"] == "empty":
        print(f"⚠ Card {card_id}: Empty narrative — returning safe defaults")
        return {
            'card_id': card_id,
            'story_text': story_text or "",
            'patient_id': patient_profile.patient_id,
            'timestamp': datetime.now().isoformat(),
            'events': [],
            'quantitative_scores': {k: 0.0 for k in [
                'anxiety_level', 'conflict_internal', 'conflict_interpersonal',
                'hero_ego_strength', 'overall_confidence', 'emotional_stability',
                'reality_testing', 'narrative_coherence', 'complexity', 'social_cognition'
            ]},
            'dimension_scores': {},
            'murray': {'needs': [], 'presses': []},
            'themes': [],
            'defense_mechanisms': [],
            'coping_mechanisms': [],
            'overall_score': 0,
            '_input_quality': input_quality,
        }

    print(f"\n{'='*80}")
    print(f"ANALYZING CARD: {card_id}")
    print(f"{'='*80}\n")

    # --- Age-Aware Context ---
    patient_age = getattr(patient_profile, 'age', None)
    age_context = _get_age_context(patient_age)

    # --- Gender-Aware Context (v4.0 — follows TAT manual card norms) ---
    patient_gender = getattr(patient_profile, 'gender', None)
    # Pass the NLP processor from the semantic engine for transformer-based classification
    _nlp = getattr(semantic_engine, 'processor', None)
    gender_context = _get_gender_context(patient_gender, nlp_processor=_nlp)

    # --- Gender Target Alignment (Card PCIP) ---
    card_tags = get_card_target_tags(str(card_id))
    ca_engine = ContextAdjustmentEngine()
    gender_target_alignment = ca_engine.compute_gender_target_alignment(patient_gender, card_tags)
    
    # Store in context
    gender_context['card_tags'] = card_tags
    gender_context['target_alignment'] = gender_target_alignment

    # ------------------------------------------------------------------
    # Language Detection (EN / HI / BN)
    # ------------------------------------------------------------------
    print("🌐 Detecting narrative language...")
    detected_language = detect_language(story_text)
    print(f"  ✅ Language: {detected_language['language_name']} (confidence={detected_language['confidence']:.2f}, method={detected_language['method']})")

    analysis = {
        'card_id': card_id,
        'story_text': story_text,
        'patient_id': patient_profile.patient_id,
        'patient_age': patient_age,
        'age_context': age_context,
        'patient_gender': patient_gender,
        'gender_context': gender_context,
        'patient_environment': getattr(patient_profile, 'demographic_data', {}).get('environment', ''),
        'patient_notes': getattr(patient_profile, 'notes', ''),
        'timestamp': datetime.now().isoformat(),
        '_input_quality': input_quality,
        'detected_language': detected_language,
        'transcription_policy': 'verbatim',
        '_engine_warnings': [],  # Aggregates non-fatal engine failures
    }

    # ------------------------------------------------------------------
    # 0. Objective CNN Visual Analysis
    # ------------------------------------------------------------------
    print("👁️ Extracting objective visual facts from TAT image...")
    if visual_engine:
        import os
        _BACKEND_ROOT = Path(__file__).parent.parent.parent.resolve()
        image_path = os.path.join(_BACKEND_ROOT, "data", "tat_cards", f"{card_id}.jpg")
        
        # Fallback to .webp or other if .jpg doesn't exist
        if not os.path.exists(image_path):
             for ext in [".webp", ".jpeg"]:
                  test_path = os.path.join(_BACKEND_ROOT, "data", "tat_cards", f"{card_id}{ext}")
                  if os.path.exists(test_path):
                       image_path = test_path
                       break
                       
        visual_extraction = visual_engine.analyze_image(image_path, card_id)
        analysis['visual_extraction'] = visual_extraction
        print(f"  ✅ Extracted {visual_extraction.get('raw_detections', 0)} objects, {visual_extraction.get('people_count', 0)} people.")
    else:
        analysis['visual_extraction'] = {}
        print("  ⚠ Visual engine not provided.")

    # ------------------------------------------------------------------
    # 1. Semantic Narrative Parsing
    # ------------------------------------------------------------------
    print("📖 Parsing narrative events...")
    events = semantic_engine.parse_story(story_text)
    event_dicts = [e.to_dict() for e in events]
    analysis['events'] = event_dicts
    print(f"  ✅ Events extracted: {len(events)}")
    
    # ------------------------------------------------------------------
    # 1b. Perceptual Distortion Check (Cross-Modal Validation)
    # ------------------------------------------------------------------
    print("🧠 Checking for perceptual distortions (CNN Vision vs NLP Story)...")
    distortions = evaluate_perceptual_distortions(analysis['visual_extraction'], event_dicts, story_text)
    analysis['perceptual_distortions'] = distortions
    if distortions:
         print(f"  ⚠ {len(distortions)} perceptual distortions detected!")
         for d in distortions:
              print(f"     -> [{d['severity'].upper()}] {d['type']}: {d['detail']}")
    else:
         print("  ✅ Narrative aligns with visual reality.")

    # ------------------------------------------------------------------
    # 2. Murray Need-Press Inference
    # ------------------------------------------------------------------
    print("🎯 Inferring Murray needs and presses...")
    murray = murray_engine.infer_from_events(event_dicts, rag_engine=rag_engine)
    analysis['murray'] = murray
    def _strip_np(nm):
        return nm[1:] if nm and len(nm) > 1 and nm[0] in ('n','p') and nm[1].isupper() else nm
    print(f"  \u2705 Top needs: {', '.join([_strip_np(n) for n,_ in murray['needs'][:3]])}")
    print(f"  \u2705 Full profile computed: {len(murray.get('needs_full_profile', []))} needs")

    # ------------------------------------------------------------------
    # 3. Theme Detection
    # ------------------------------------------------------------------
    print("🎨 Detecting narrative themes...")
    try:
        themes_result = theme_engine.extract_themes([story_text])
        analysis['themes'] = themes_result.get('themes', [])
        
        # Add Amplified Themes from Gender Target Alignment
        amplified = analysis.get('gender_context', {}).get('target_alignment', {}).get('amplified_themes', [])
        if amplified:
            for theme in amplified:
                if theme not in analysis['themes']:
                    analysis['themes'].append(theme)
            print(f"  ✅ Added {len(amplified)} gender-aligned themes")
            
        print(f"  ✅ Themes detected: {len(analysis['themes'])}")
    except Exception as e:
        logger.error(f"Theme detection failed: {e}", exc_info=True)
        print(f"  ⚠ Theme detection failed: {e}")
        analysis['themes'] = []
        analysis['_engine_warnings'].append(f"Theme detection failed: {e}")

    # ------------------------------------------------------------------
    # 4. Relational Field Analysis
    # ------------------------------------------------------------------
    print("🕸️ Building relational field...")
    try:
        relational_engine.build_graph(event_dicts)
        relational_patterns = relational_engine.get_relational_patterns()
        analysis['relational_patterns'] = relational_patterns
        print(f"  ✅ Relational patterns extracted")
    except Exception as e:
        logger.error(f"Relational field failed: {e}", exc_info=True)
        print(f"  ⚠ Relational field failed: {e}")
        analysis['relational_patterns'] = {}
        analysis['_engine_warnings'].append(f"Relational field failed: {e}")

    # ------------------------------------------------------------------
    # 4b. Conflict Structure Analysis (PARALLEL)
    # ------------------------------------------------------------------
    print("⚔️ Analyzing Conflict Structure...")
    if conflict_engine:
        try:
            # Pass narrative text and parsed events
            conflicts = conflict_engine.detect_conflicts(story_text, event_dicts)
            analysis['conflict_structure'] = conflicts
            print(f"  ✅ Prototype conflicts detected: {len(conflicts)}")
            if conflicts:
                print(f"     Top Conflict: {conflicts[0]['type']} (Intent: {conflicts[0]['intensity']:.2f})")

            # --- v3.1: Murray-derived conflict semantics ---
            murray_result = analysis.get('murray', {})
            if murray_result:
                murray_conflicts = conflict_engine.detect_conflicts_from_murray(
                    narrative_text=story_text,
                    murray_result=murray_result,
                    events=event_dicts,
                    is_single_card=True,
                    rag_engine=rag_engine,
                )
                # Merge: Murray conflicts take precedence, add prototype ones not already present
                existing_types = {c['type'] for c in murray_conflicts}
                for pc in conflicts:
                    if pc['type'] not in existing_types:
                        murray_conflicts.append(pc)
                analysis['conflict_structure'] = murray_conflicts
                print(f"  ✅ Murray-derived conflicts: {len(murray_conflicts)}")
        except Exception as e:
            logger.error(f"Conflict analysis failed: {e}", exc_info=True)
            print(f"  ⚠ Conflict analysis failed: {e}")
            analysis['conflict_structure'] = []
            analysis['_engine_warnings'].append(f"Conflict analysis failed: {e}")
    else:
        analysis['conflict_structure'] = []

    # --- v3.2 Fix 2: Compute harmonized global conflict score ---
    if conflict_engine and analysis.get('conflict_structure'):
        try:
            global_conflict = conflict_engine.compute_global_conflict_score(analysis['conflict_structure'])
            analysis['global_conflict_score'] = global_conflict
            print(f"  ✅ Global Conflict Score: {global_conflict['global_conflict']:.2f}")
        except Exception as e:
            logger.error(f"Global conflict computation failed: {e}", exc_info=True)
            print(f"  ⚠ Global conflict computation failed: {e}")
            analysis['global_conflict_score'] = {"global_conflict": 0.0, "method": "error"}
            analysis['_engine_warnings'].append(f"Global conflict computation failed: {e}")
    else:
        analysis['global_conflict_score'] = {"global_conflict": 0.0, "method": "no_conflicts"}

    # ------------------------------------------------------------------
    # 4c. Environment Classification (v2.0 — Fused NLP + Press)
    # ------------------------------------------------------------------
    print("🌍 Classifying Psychological Environment...")
    if environment_classifier and 'murray' in analysis:
        try:
            # Extract presses from Murray result
            presses = analysis['murray'].get('presses', [])
            # Use fused classification if NLP processor is available
            if hasattr(environment_classifier, 'classify_fused') and environment_classifier.nlp_processor:
                env_result = environment_classifier.classify_fused(presses, story_text)
                print(f"  ✅ Environment Type: {env_result['primary']} (fused, confidence={env_result.get('primary_confidence', 0):.2f})")
                if env_result.get('is_mixed_environment'):
                    print(f"     ⚠ Mixed environment detected: {env_result['primary']} + {env_result.get('secondary', 'N/A')}")
            else:
                env_result = environment_classifier.classify(presses)
                print(f"  ✅ Environment Type: {env_result['primary']}")
            analysis['environment_classification'] = env_result
        except Exception as e:
            logger.error(f"Environment classification failed: {e}", exc_info=True)
            print(f"  ⚠ Environment classification failed: {e}")
            analysis['environment_classification'] = {}
            analysis['_engine_warnings'].append(f"Environment classification failed: {e}")
    else:
        analysis['environment_classification'] = {}

    # ------------------------------------------------------------------
    # 5. Quantitative Scoring
    # ------------------------------------------------------------------
    print("📊 Quantitative scoring...")
    quant_scores = quantitative_scorer.score_story(story_text, events=event_dicts)
    analysis['quantitative_scores'] = quant_scores
    print(f"  ✅ Overall complexity: {quant_scores.get('complexity',0):.1f}")

    # ------------------------------------------------------------------
    # 6. Multi-dimensional Scoring
    # ------------------------------------------------------------------
    print("⚙️ Multi-dimensional scoring...")
    tat_scores = scoring_engine.score_story(story_text, events=event_dicts)
    
    # --- Context Adjustment Layer ---
    print("⚙️ Applying Context Adjustment Layer...")
    try:
        context_engine = ContextAdjustmentEngine()
        
        # Build patient data dict
        demo_data = getattr(patient_profile, 'demographic_data', {}) if hasattr(patient_profile, 'demographic_data') else {}
        
        patient_data = {
            "age": patient_age,
            "gender": patient_gender,
            "living_condition": demo_data.get("living_condition", getattr(patient_profile, "living_condition", "Unknown")),
            "family_structure": demo_data.get("family_structure", getattr(patient_profile, "family_structure", "Unknown")),
            "residence_type": demo_data.get("residence_type", getattr(patient_profile, "residence_type", "Unknown")),
            "environment_type": demo_data.get("environment_type", getattr(patient_profile, "environment_type", "Unknown")),
            "education_level": demo_data.get("education_level", getattr(patient_profile, "education_level", "Unknown")),
            "occupation": demo_data.get("occupation", getattr(patient_profile, "occupation", "Unknown")),
            "socioeconomic_status": demo_data.get("socioeconomic_status", getattr(patient_profile, "socioeconomic_status", "Unknown"))
        }
        
        observed_themes = analysis.get('themes', [])
        context_result = context_engine.process_patient_context(patient_data, observed_themes)
        
        base_overall = tat_scores['overall_score']
        final_score = context_engine.apply_context_adjustment_layer(base_overall, context_result['psychological_context_score'])
        
        analysis['context_adjustment'] = context_result
        analysis['base_psychological_score'] = base_overall
        analysis['overall_score'] = round(final_score, 2)
        
        print(f"  ✅ Base Score: {base_overall:.2f} | PCS: {context_result['psychological_context_score']} | Final: {final_score:.2f}")
    except Exception as e:
        logger.error(f"Context Adjustment Layer failed: {e}", exc_info=True)
        print(f"  ⚠ Context Adjustment Layer failed: {e}")
        analysis['overall_score'] = tat_scores['overall_score']

    # Apply Gender Target Confidence Modifier to Scoring Confidence
    alignment_mod = analysis.get('gender_context', {}).get('target_alignment', {}).get('confidence_modifier', 0.0)
    adjusted_confidence = min(1.0, max(0.0, tat_scores['confidence'] + (alignment_mod * 0.5))) # Apply half the modifier to overall scoring confidence

    analysis.update({
        'dimension_scores': tat_scores['dimension_scores'],
        'scoring_confidence': adjusted_confidence
    })
    for k, v in tat_scores['dimension_scores'].items():
        analysis[k] = v

    # --- PRODUCTION CORRECTION: Nuclear bounding on all dimension_scores ---
    from app.utils.production_utils import METRIC_BOUNDS
    dims = analysis.get('dimension_scores', {})
    for dk in list(dims.keys()):
        val = dims[dk]
        if isinstance(val, (int, float)):
            lo, hi = METRIC_BOUNDS.get(dk, (0, 100))
            bounded = max(lo, min(hi, float(val)))
            dims[dk] = bounded
            analysis[dk] = bounded  # sync top-level key too

    # --- v3.3 Fix 4: Score Synchronization — unify dual scoring systems ---
    # For shared metric keys, take the minimum (conservative) value and write
    # it into BOTH quantitative_scores and dimension_scores so they always match.
    SHARED_METRIC_KEYS = {
        'ego_strength', 'reality_testing', 'emotional_stability',
        'narrative_coherence', 'social_cognition'
    }
    quant = analysis.get('quantitative_scores', {})
    dims = analysis.get('dimension_scores', {})
    for shared_key in SHARED_METRIC_KEYS:
        qval = quant.get(shared_key)
        dval = dims.get(shared_key)
        if qval is not None and dval is not None:
            # Use the average of two independent calculations (not min, to avoid systematic underreporting)
            unified = (float(qval) + float(dval)) / 2.0
            # Apply hard cap at 95 for non-psychosis narratives (raised from 88 to avoid over-suppression)
            unified = min(unified, 95.0)
            quant[shared_key] = round(unified, 2)
            dims[shared_key] = round(unified, 2)
            analysis[shared_key] = round(unified, 2)
    analysis['quantitative_scores'] = quant
    analysis['dimension_scores'] = dims

    # --- v3.3 Fix 4b: hero_ego_strength ↔ ego_strength reconciliation ---
    # Quantitative scorer outputs 'hero_ego_strength', dimension scorer outputs 'ego_strength'.
    # Ensure both keys always carry the same value everywhere.
    hero_val = quant.get('hero_ego_strength')
    ego_dim_val = dims.get('ego_strength')
    if hero_val is not None and ego_dim_val is not None:
        unified_ego = round((float(hero_val) + float(ego_dim_val)) / 2.0, 2)
        unified_ego = min(unified_ego, 95.0)
        quant['hero_ego_strength'] = unified_ego
        dims['ego_strength'] = unified_ego
        # Also keep both names in both dicts for any downstream consumer
        quant['ego_strength'] = unified_ego
        dims['hero_ego_strength'] = unified_ego
        analysis['hero_ego_strength'] = unified_ego
        analysis['ego_strength'] = unified_ego
    elif hero_val is not None:
        quant['ego_strength'] = hero_val
        dims['ego_strength'] = hero_val
        dims['hero_ego_strength'] = hero_val
        analysis['hero_ego_strength'] = hero_val
        analysis['ego_strength'] = hero_val
    elif ego_dim_val is not None:
        quant['hero_ego_strength'] = ego_dim_val
        quant['ego_strength'] = ego_dim_val
        dims['hero_ego_strength'] = ego_dim_val
        analysis['hero_ego_strength'] = ego_dim_val
        analysis['ego_strength'] = ego_dim_val
    analysis['quantitative_scores'] = quant
    analysis['dimension_scores'] = dims

    # ------------------------------------------------------------------
    # 7. Psychosis Risk
    # ------------------------------------------------------------------
    analysis["psychosis_risk"] = detect_psychosis_risk(analysis)

    # ------------------------------------------------------------------
    # 8. Cultural Context + Gender Normalization (v4.0)
    # ------------------------------------------------------------------
    print("🇮🇳 Applying Cultural Context Sensitivity...")
    background = patient_profile.demographic_data.get('background', '').lower()
    story_lower = story_text.lower()
    indian_factors = []
    cultural_normalization_notes = []

    # --- Gender-Specific Card Norms (injected from gender_context) ---
    if gender_context.get('gender_normalized'):
        for norm in gender_context.get('card_norms', []):
            # Only add the norm if it's relevant to the current card being analyzed
            card_id_str = str(card_id).lower()
            norm_lower = norm.lower()
            # Broad match: does this norm mention any part of the card_id?
            card_num = card_id_str.replace('card', '').replace('_', '').strip()
            if card_num and card_num in norm_lower:
                cultural_normalization_notes.append(
                    f"[Gender Norm — {gender_context['label']}] {norm}"
                )
        # Always add the gender guidance as a general normalization note
        cultural_normalization_notes.append(
            f"[Gender Context] {gender_context['guidance']}"
        )
        print(f"  👤 Gender normalization applied: {gender_context['label']}")

    # Original detections (preserved)
    if 'joint' in background or 'family' in story_lower:
        indian_factors.append('joint_family_dynamics')
    if 'urban' in background:
        indian_factors.append('urban_stress')
    if 'rural' in background:
        indian_factors.append('rural_traditional_values')
    if 'education' in background or 'study' in story_lower:
        indian_factors.append('education_pressure')

    # --- Recalibration v3.0: Expanded cultural markers ---
    if any(w in story_lower for w in ['obey', 'obedience', 'elders', 'respect elders', 'duty']):
        indian_factors.append('hierarchical_family_norms')
        cultural_normalization_notes.append(
            "Obedience and elder respect themes normalized as culturally adaptive for hierarchical family context."
        )
    if any(w in story_lower for w in ['community', 'together', 'sacrifice for family', 'we', 'our family']):
        indian_factors.append('collective_orientation')
        cultural_normalization_notes.append(
            "Collectivist orientation themes normalized as culturally normative; not indicative of enmeshment pathology."
        )
    if any(w in story_lower for w in ['prayer', 'temple', 'god', 'dharma', 'karma', 'spiritual', 'meditation', 'puja']):
        indian_factors.append('spiritual_religious_context')
        cultural_normalization_notes.append(
            "Religious/spiritual themes present; interpreted within normative devotional framework, not psychotic ideation."
        )
    if any(w in story_lower for w in ['arrange', 'arranged marriage', 'parents decide', 'family decision']):
        indian_factors.append('arranged_social_structure')
        cultural_normalization_notes.append(
            "Arranged social structures (e.g., marriage) normalized as culturally typical decision-making."
        )
    if any(w in story_lower for w in ['shame', 'honor', 'reputation', 'what will people think', 'log kya kahenge']):
        indian_factors.append('honor_shame_dynamics')
        cultural_normalization_notes.append(
            "Honor/shame dynamics present; interpreted as sociocultural pressure, not pathological guilt."
        )

    analysis['indian_context_factors'] = indian_factors
    analysis['indian_context_applied'] = len(indian_factors) > 0
    analysis['cultural_normalization_notes'] = cultural_normalization_notes
    print(f"  ✅ Cultural factors: {', '.join(indian_factors) if indian_factors else 'None detected'}")
    if cultural_normalization_notes:
        print(f"  📝 Cultural normalization notes: {len(cultural_normalization_notes)} applied")

    # ------------------------------------------------------------------
    # 9. Coping / Defense Mechanisms (aggregated for easy access)
    # ------------------------------------------------------------------
    try:
        if defense_engine:
            card_defenses = defense_engine.infer_from_events(event_dicts)
        else:
            # Fallback: try creating one (will work only if nlp_processor is available)
            from app.assessments.tat.engines.inference.defense_inference_engine import DefenseInferenceEngine
            _fallback_def_engine = DefenseInferenceEngine(semantic_engine.processor if hasattr(semantic_engine, 'processor') else None)
            card_defenses = _fallback_def_engine.infer_from_events(event_dicts)
        # Sort and keep top 3 per card as per enforcement rule
        card_defenses = sorted(card_defenses, key=lambda x: x.get('confidence', 0), reverse=True)[:3]
        analysis['defense_mechanisms'] = card_defenses
    except Exception as e:
        logger.error(f"Defense inference failed: {e}", exc_info=True)
        print(f"  ⚠ Defense inference failed: {e}")
        analysis['defense_mechanisms'] = []
        analysis['_engine_warnings'].append(f"Defense inference failed: {e}")

    coping = []
    for d in analysis.get('defense_mechanisms', []):
        coping.append(d.get("defense", "Unknown"))
        
    for ev in event_dicts:
        if ev.get("event_type") == "defense" and ev.get("text"):
            coping.append(ev["text"][:60])
        if ev.get("defense_mechanism"):
            coping.append(ev["defense_mechanism"])
    analysis['coping_mechanisms'] = list(dict.fromkeys(coping))[:5]  # deduplicated, top 5

    # ------------------------------------------------------------------
    # 9b. Meta-Reasoning Psychodynamic Inference (LLM-verified)
    # ------------------------------------------------------------------
    if meta_reasoning_engine:
        print("🧠 Running Meta-Reasoning Psychodynamic Inference...")
        try:
            meta_result = meta_reasoning_engine.run_inference(
                story_text, analysis, ollama_model=ollama_model_name
            )
            if meta_result:
                analysis = meta_reasoning_engine.fuse_results(analysis, meta_result)
                corrections = meta_result.get('corrections_from_engine', [])
                print(f"  ✅ Meta-reasoning complete (confidence: {meta_result.get('confidence_score', 'N/A')})")
                if corrections:
                    print(f"  📝 Corrections: {'; '.join(corrections[:3])}")
            else:
                print("  ⚠ Meta-reasoning returned empty result (non-fatal)")
        except Exception as e:
            logger.error(f"Meta-reasoning failed (non-fatal): {e}", exc_info=True)
            print(f"  ⚠ Meta-reasoning failed (non-fatal): {e}")
            analysis['meta_reasoning'] = {}
            analysis['_engine_warnings'].append(f"Meta-reasoning failed: {e}")

    # ------------------------------------------------------------------
    # 10. Word count and confidence
    # ------------------------------------------------------------------
    analysis['word_count'] = len(story_text.split())
    analysis['overall_confidence_process'] = min(1.0, analysis['word_count'] / 200)

    # ------------------------------------------------------------------
    # 10b. STRUCTURED 7-COMPONENT EXTRACTION (v9.0)
    # ------------------------------------------------------------------
    # Extracts the 7 mandatory psychodynamic components for the report
    print("📋 Extracting 7 mandatory psychodynamic components...")
    try:
        _relational = analysis.get('relational_patterns', {})
        _valid_figs = _relational.get('valid_figure_types', [])
        _murray = analysis.get('murray', {})
        _env = analysis.get('environment_classification', {})
        _conflicts = analysis.get('conflict_structure', [])
        _defenses = analysis.get('defense_mechanisms', [])

        # 1. Hero — entity with highest hero_score
        hero_entity = None
        hero_confidence = 0.0
        alignment_mod = analysis.get('gender_context', {}).get('target_alignment', {}).get('confidence_modifier', 0.0)
        
        for fig in _valid_figs:
            if isinstance(fig, dict) and fig.get('type') == 'Hero':
                hero_entity = fig.get('entity', 'Unknown')
                hero_confidence = fig.get('role_confidence', 0)
                # Apply gender alignment modifier
                if alignment_mod != 0:
                    hero_confidence = min(1.0, max(0.0, hero_confidence + alignment_mod))
                    fig['role_confidence'] = hero_confidence
                break

        # 2. Needs — top Murray needs
        top_needs = [{'name': n, 'score': round(s, 3)} for n, s in _murray.get('needs', [])[:5]]

        # 3. Environment / Press
        env_primary = _env.get('primary', 'N/A')
        env_confidence = _env.get('primary_confidence', 0)
        top_presses = [{'name': p, 'score': round(s, 3)} for p, s in _murray.get('presses', [])[:5]]

        # 4. Authority Figure
        authority_entity = None
        authority_confidence = 0.0
        for fig in _valid_figs:
            if isinstance(fig, dict) and fig.get('type') == 'Authority Figure':
                authority_entity = fig.get('entity', 'Unknown')
                authority_confidence = fig.get('role_confidence', 0)
                break

        # 5. Contemporary Figure
        # The relational engine may store type as "Contemporary" OR "Contemporary Figure"
        contemporary_entity = None
        contemporary_confidence = 0.0
        for fig in _valid_figs:
            if isinstance(fig, dict) and fig.get('type') in ('Contemporary Figure', 'Contemporary', 'Peer'):
                contemporary_entity = fig.get('entity', 'Unknown')
                contemporary_confidence = fig.get('role_confidence', 0)
                break

        # 6. Conflict — top conflicts
        top_conflicts = []
        for c in _conflicts[:3]:
            top_conflicts.append({
                'type': c.get('type', 'Unknown'),
                'intensity': round(c.get('intensity', 0), 2),
                'forces': c.get('forces', []),
            })

        # 7. Defense Mechanisms — top defenses
        top_defenses = []
        for d in _defenses[:3]:
            top_defenses.append({
                'defense': d.get('defense', 'Unknown'),
                'maturity_level': d.get('maturity_level', 'Unknown'),
                'confidence': round(d.get('confidence', 0), 2),
            })

        analysis['structured_components'] = {
            'hero': {
                'entity': hero_entity,
                'confidence': round(hero_confidence, 3),
            },
            'needs': top_needs,
            'environment_press': {
                'environment': env_primary,
                'environment_confidence': round(env_confidence, 3),
                'presses': top_presses,
            },
            'authority_figure': {
                'entity': authority_entity,
                'confidence': round(authority_confidence, 3),
            },
            'contemporary_figure': {
                'entity': contemporary_entity,
                'confidence': round(contemporary_confidence, 3),
            },
            'conflict': top_conflicts,
            'defense_mechanisms': top_defenses,
        }
        print(f"  ✅ Hero: {hero_entity} | Authority: {authority_entity} | Contemporary: {contemporary_entity}")
        print(f"  ✅ Needs: {len(top_needs)} | Conflicts: {len(top_conflicts)} | Defenses: {len(top_defenses)}")
    except Exception as e:
        logger.error(f"Structured component extraction failed (non-fatal): {e}", exc_info=True)
        print(f"  ⚠ Structured component extraction failed (non-fatal): {e}")
        analysis['structured_components'] = {}
        analysis['_engine_warnings'].append(f"Structured component extraction failed: {e}")

    # ------------------------------------------------------------------
    # 11. Pre-Output Validation Gate (v3.3)
    # ------------------------------------------------------------------
    print("🔍 Running pre-output validation gate...")
    try:
        from app.utils.production_utils import validate_and_autocorrect_analysis
        analysis['story_text'] = story_text  # ensure gate has access to text
        analysis = validate_and_autocorrect_analysis(analysis)
    except Exception as e:
        print(f"  ⚠ Validation gate failed (non-fatal): {e}")

    print(f"\n{'='*80}")
    print(f"CARD ANALYSIS COMPLETE: {card_id}")
    print(f"{'='*80}\n")

    return analysis


def detect_psychosis_risk(analysis):
    risk_score = 0
    flags = []

    # Pull from dimension_scores (0-100 scale), falling back to top-level keys
    dims = analysis.get("dimension_scores", {})

    reality_testing = dims.get("reality_testing", analysis.get("reality_testing", 50))
    emotional_stability = dims.get("emotional_stability", analysis.get("emotional_stability", 50))
    narrative_coherence = dims.get("narrative_coherence", analysis.get("narrative_coherence", 50))
    affective_integration = dims.get("affective_integration", analysis.get("affective_integration", 50))

    if reality_testing < 30:
        risk_score += 2
        flags.append("Low Reality Testing")

    if emotional_stability < 30:
        risk_score += 2
        flags.append("Emotional Instability")

    if narrative_coherence < 30:
        risk_score += 2
        flags.append("Narrative Disorganization")

    if affective_integration < 30:
        risk_score += 1
        flags.append("Affective Dysregulation")

    level = "Low"
    if risk_score >= 5:
        level = "High"
    elif risk_score >= 3:
        level = "Moderate"

    return {
        "risk_score": risk_score,
        "risk_level": level,
        "flags": flags
    }