"""
Ollama Humanizer for TAT Learning System
FREE | Offline | Clinical-safe | Logged | Retry-enabled
"""

import json
import time
import random
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

try:
    import ollama
except ImportError:
    ollama = None

import os
LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "logs", "ollama_humanizer.log")
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class OllamaHumanizer:
    """
    Ollama-powered clinical humanizer for TAT responses.
    Fully offline, free, and safe for academic / clinical usage.
    """

    def __init__(
        self,
        model_name: str = "hf.co/therandomuser03/Airavata-Q4_K_M-GGUF:Q4_K_M",
        max_retries: int = 2,
        base_retry_delay: float = 1.5,
        rag_engine=None,
        airavata_provider=None,
    ):
        self.model_name = model_name
        self.fallback_model_name = airavata_provider.model_name if airavata_provider else None
        self.max_retries = max_retries
        self.base_retry_delay = base_retry_delay

        self.rag_engine = rag_engine
        self.airavata_provider = airavata_provider

        self.conversation_history: List[Dict[str, Any]] = []

        self.templates = self._load_templates()

        logger.info(f"OllamaHumanizer initialized using model: {model_name}")
        if rag_engine:
            logger.info("  RAG engine attached — knowledge-grounded mode")
        if airavata_provider:
            logger.info("  Airavata provider attached")

    def humanize_response(
        self,
        response_type: str,
        data: Dict,
        conversation_context: Optional[List] = None
    ) -> str:
        """
        Humanize TAT output using Ollama with safe fallback.
        ALWAYS returns a non-empty string.

        When RAG engine is available, retrieves relevant clinical
        passages and injects them as REFERENCE MATERIAL.
        """

        rag_context = ""
        rag_metadata = {}
        if self.rag_engine:
            try:
                import time as _time
                _rag_start = _time.time()

                tat_story = (data or {}).get("tat_story", "")
                psych = (data or {}).get("psych_profile", {})

                domain, rag_query = self._build_domain_query(
                    response_type, tat_story, psych, data
                )

                if rag_query:
                    if hasattr(self.rag_engine, 'retrieve_for_domain'):
                        passages = self.rag_engine.retrieve_for_domain(
                            domain, rag_query
                        )
                    else:
                        passages = self.rag_engine.retrieve(rag_query)
                    rag_context = self.rag_engine.format_context(passages)
                    rag_metadata = self.rag_engine.get_retrieval_metadata(passages)
                    rag_metadata["domain"] = domain
                    rag_metadata["generation_time"] = _time.time() - _rag_start
                    logger.info(
                        f"RAG [{domain}] retrieved {len(passages)} passages "
                        f"({rag_metadata.get('generation_time', 0):.2f}s)"
                    )
            except Exception as e:
                logger.warning(f"RAG retrieval failed (falling back): {e}")
                rag_context = ""

        prompt = self._build_enhanced_prompt(
            response_type=response_type,
            data=data or {},
            conversation_context=conversation_context,
            rag_context=rag_context,
        )

        safe_prompt = prompt[:6000]

        # 1. Try Groq if configured
        try:
            from app.services.groq_service import is_groq_available, call_groq_chat
            if is_groq_available():
                logger.info(f"Using Groq LLM for {response_type} humanization")
                groq_text = call_groq_chat(
                    messages=[
                        {"role": "system", "content": self._system_guardrails()},
                        {"role": "user", "content": safe_prompt}
                    ],
                    temperature=0.3,
                )
                if groq_text and len(groq_text.strip()) >= 20:
                    self._store_in_history(response_type, groq_text)
                    return groq_text
        except Exception as ge:
            logger.warning(f"Groq humanization attempt failed: {ge}")

        # 2. Try Ollama if available
        if ollama is not None:
            for attempt in range(1, self.max_retries + 1):
                try:
                    logger.info(f"Ollama call attempt {attempt} | type={response_type} | primary={self.model_name}")

                    response = ollama.chat(
                        model=self.model_name,
                        messages=[
                            {"role": "system", "content": self._system_guardrails()},
                            {"role": "user", "content": safe_prompt}
                        ],
                        options={"temperature": 0.3}
                    )

                text = self._extract_response_text(response)

                if not text or len(text.strip()) < 20:
                    if len(safe_prompt) > 1000:
                        safe_prompt = safe_prompt[:1000]
                        continue
                    raise ValueError("Ollama returned empty or invalid content")

                self._store_in_history(response_type, text)
                return text

            except Exception as e:

                if attempt == self.max_retries and self.fallback_model_name:
                    logger.warning(f"Primary model {self.model_name} failed. Attempting fallback {self.fallback_model_name}...")
                    try:
                        fb_response = ollama.chat(
                            model=self.fallback_model_name,
                            messages=[
                                {"role": "system", "content": self._system_guardrails()},
                                {"role": "user", "content": safe_prompt}
                            ],
                            options={"temperature": 0.3}
                        )
                        fb_text = self._extract_response_text(fb_response)
                        if fb_text and len(fb_text.strip()) >= 20:
                            self._store_in_history(response_type, fb_text)
                            return fb_text
                    except Exception as fb_e:
                        logger.error(f"Fallback model failed: {fb_e}")

                delay = self.base_retry_delay * attempt
                logger.warning(f"Ollama error: {e} | retrying in {delay}s")
                time.sleep(delay)

        logger.warning(f"Ollama failed. Falling back to templates.")
        return self._use_template(response_type)

    def _extract_response_text(self, response: Any) -> str:
        """
        Extract text safely from Ollama response.
        Supports chat format, legacy format, streaming, and edge cases.
        """

        text = ""

        try:

            if isinstance(response, dict):

                if "message" in response and isinstance(response["message"], dict):
                    text = response["message"].get("content", "")

                elif "response" in response:
                    text = response.get("response", "")

            elif hasattr(response, "__iter__"):
                collected = []
                for chunk in response:
                    if isinstance(chunk, dict):
                        collected.append(
                            chunk.get("message", {}).get("content", "")
                        )
                text = "".join(collected)

        except Exception as e:
            logger.warning(f"Response parsing error: {e}")
            text = ""

        return str(text).strip()

    def _build_domain_query(
        self,
        response_type: str,
        tat_story: str,
        psych: Dict,
        data: Dict,
    ) -> tuple:
        """
        Build a domain-targeted query based on the response type.
        Returns (domain_name, query_string).
        Each response type queries different aspects of the knowledge base.
        """
        story_snippet = (tat_story or "")[:200]
        themes = " ".join(psych.get("themes", [])[:4])
        emotions = " ".join(psych.get("emotions", [])[:4])
        needs = " ".join(psych.get("needs", [])[:4])
        presses = " ".join(psych.get("presses", [])[:3])
        defenses = " ".join(
            psych.get("defenses", [])[:3]
            if isinstance(psych.get("defenses"), list) else []
        )
        conflicts = " ".join(psych.get("conflict_types", [])[:3])

        domain_query_map = {
            "clinical_summary": (
                "clinical",
                f"{story_snippet} {themes} {emotions} relational dynamics interpretation"
            ),
            "judgment_summary": (
                "scoring",
                f"TAT scoring criteria judgment {themes} hero outcome {needs}"
            ),
            "formulation_explanation": (
                "defense",
                f"defense mechanism coping {defenses} {needs} {conflicts} formulation"
            ),
            "therapy_recommendation": (
                "remedies",
                f"therapeutic intervention remedy {themes} {emotions} Gita treatment"
            ),
            "risk_explanation": (
                "conflict",
                f"risk conflict tension {conflicts} {emotions} resolution harm"
            ),
            "score_explanation": (
                "scoring",
                f"psychological scoring interpretation {needs} {presses} ego strength"
            ),
        }

        domain, query = domain_query_map.get(
            response_type,
            ("clinical", f"{story_snippet} {themes} {emotions}")
        )
        return domain, query.strip()

    def _build_enhanced_prompt(
        self,
        response_type: str,
        data: Dict,
        conversation_context: Optional[List],
        rag_context: str = "",
    ) -> str:
        """Build prompt using structured real data, with differentiated
        templates per response_type and domain-specific RAG context."""

        psych_profile = data.get("psych_profile", {})
        learned_concepts = data.get("learned_concepts", [])
        recommended_remedies = data.get("recommended_remedies", [])
        tat_story = data.get("tat_story", "")

        gita_insights = []
        for r in recommended_remedies:
            if isinstance(r, dict):
                verse = r.get("gita_verse", "")
                insight = r.get("gita_insight", "")
                remedy_raw = r.get("gita_remedies", "")

                if verse and insight:
                    gita_insights.append(f"Verse: {verse}\nInsight: {insight}")
                elif verse:
                    gita_insights.append(f"Remedy: {verse}")
                elif remedy_raw:
                    gita_insights.append(f"Remedy: {remedy_raw.strip()}")
            elif isinstance(r, str):
                gita_insights.append(f"Remedy: {r}")

        age_context_str = ""
        patient_age = psych_profile.get("patient_age")
        age_label = psych_profile.get("age_context", "")
        age_guidance = psych_profile.get("age_guidance", "")
        if patient_age is not None:
            age_context_str = f"\nPATIENT AGE CONTEXT:\n"
            age_context_str += f"- Patient: {age_label}\n"
            age_context_str += f"- Developmental Guidance: {age_guidance}\n"

        gender_context_str = ""
        patient_gender = psych_profile.get("patient_gender")
        gender_label = psych_profile.get("gender_context", "")
        gender_guidance = psych_profile.get("gender_guidance", "")
        if patient_gender and patient_gender.lower() not in ("not specified", "unknown", ""):
            gender_context_str = f"\nPATIENT GENDER CONTEXT:\n"
            gender_context_str += f"- Gender: {gender_label}\n"
            gender_context_str += f"- TAT Normative Guidance: {gender_guidance}\n"

        cultural_context_str = ""
        if psych_profile.get("cultural_factors") or psych_profile.get("cultural_notes"):
            cultural_context_str = "\nCULTURAL CONTEXT (INDIAN):\n"
            if psych_profile.get("cultural_factors"):
                cultural_context_str += f"- Factors: {', '.join(psych_profile['cultural_factors'])}\n"
            if psych_profile.get("cultural_notes"):
                cultural_context_str += "- Normalization Notes:\n  " + "\n  ".join(psych_profile['cultural_notes']) + "\n"

        reference_block = f"\nDOMAIN-SPECIFIC REFERENCE MATERIAL:\n{rag_context}\n" if rag_context else ""
        gita_block = "\nREFLECTIVE GITA INSIGHTS (for inclusion):\n" + "\n\n".join(gita_insights) + "\n" if gita_insights else ""

        history_block = ""
        if conversation_context:
            try:
                history_block = "\nPrevious context:\n" + json.dumps(conversation_context[-1], indent=2)
            except Exception:
                history_block = ""

        builder = self._prompt_builders.get(response_type, self._prompt_clinical_summary)
        return builder(
            self, tat_story, psych_profile, learned_concepts,
            age_context_str, gender_context_str, cultural_context_str, reference_block,
            gita_block, history_block,
        )

    def _prompt_clinical_summary(
        self, tat_story, psych_profile, learned_concepts,
        age_ctx, gender_ctx, cultural_ctx, ref_block, gita_block, history_block,
    ) -> str:
        return f"""
{ref_block}
{age_ctx}
{gender_ctx}
PATIENT NARRATIVE:
{tat_story[:800]}

{cultural_ctx}
{gita_block}
TASK:
Provide a COMPREHENSIVE clinical interpretation of the patient's TAT material.
This should serve as the CLINICAL CONCLUSION of the full report.
Cover emotional themes, interpersonal dynamics, defense patterns, underlying needs,
therapeutic implications, and any cultural considerations.
Integrate the provided Gita insights as reflective wisdom where appropriate.

PSYCHOLOGICAL PROFILE SUMMARY:
{self._flatten_profile_for_prompt(psych_profile)}

LEARNING CONTEXT:
{', '.join(learned_concepts[:15])}

CLINICAL GUIDELINES:
- Context: Indian socio-cultural setting.
- CRITICAL: Interpret ALL findings through the lens of the patient's age and developmental stage.
- CRITICAL: Apply gender-normative TAT interpretation guidelines specified in PATIENT GENDER CONTEXT above.
- Tone: Empathetic, exploratory, professional, and philosophically grounded.
- Rule: Do NOT diagnose. Use exploratory/tentative language.
- Rule: Weave in GITA INSIGHTS naturally for depth.
- Rule: Write a HIGHLY DETAILED, COMPREHENSIVE clinical summary consisting of at least 6-8 substantial paragraphs. Expand significantly on each point with nuance and depth.
- Rule: Write in PLAIN ENGLISH paragraphs only. Do NOT reproduce raw data, dicts, or JSON.
{history_block}

RESPONSE FORMAT:
1. **EMOTIONAL LANDSCAPE**: Dominant emotional themes, affective tone, emotional conflicts.
2. **INTERPERSONAL DYNAMICS & RELATIONAL PATTERNS**: Character relationships, authority dynamics, attachment.
3. **UNDERLYING NEEDS & DEFENSE MECHANISMS**: Murray needs/presses, defenses, inner world.
4. **THERAPEUTIC IMPLICATIONS**: Areas for therapeutic exploration, suggested modalities.
5. **CULTURAL CONSIDERATIONS & REFLECTIVE WISDOM**: Cultural factors, Gita insight integration.

Write in flowing paragraph form. This should read like a professional clinical conclusion a patient can easily understand.
""".strip()

    def _prompt_judgment_summary(
        self, tat_story, psych_profile, learned_concepts,
        age_ctx, gender_ctx, cultural_ctx, ref_block, gita_block, history_block,
    ) -> str:
        return f"""
{ref_block}
{age_ctx}
{gender_ctx}
PATIENT NARRATIVE:
{tat_story[:600]}

{cultural_ctx}
{gita_block}
TASK:
Provide a DETAILED psychological judgment/interpretation of the TAT story.
Focus on the scoring dimensions and how they reveal personality dynamics.
Use the reference material on TAT scoring criteria to ground your interpretation.

PSYCHOLOGICAL PROFILE SUMMARY:
{self._flatten_profile_for_prompt(psych_profile)}
{history_block}

RESPONSE FORMAT:
1. **HERO IDENTIFICATION & CHARACTERIZATION**: Who is the hero? What are their attributes, strengths, and vulnerabilities? How adequate is the hero for the task at hand?
2. **NARRATIVE STRUCTURE & OUTCOME**: Story arc, plot logic, outcome quality (happy, tragic, ambiguous, realistic). What does the chosen outcome reveal?
3. **SCORING INTERPRETATION**: Relate narrative qualities to TAT scoring dimensions — ego strength, reality testing, narrative coherence, complexity.
4. **MOTIVATIONAL DYNAMICS**: How do the identified needs and presses shape the story's trajectory? Reference specific Murray constructs.
5. **PHILOSOPHICAL REFLECTION**: Connect one Gita insight to the hero's journey or the story's moral resolution.

Write in plain English paragraph form with clinical depth. Do NOT reproduce raw data or dicts.
""".strip()

    def _prompt_formulation_explanation(
        self, tat_story, psych_profile, learned_concepts,
        age_ctx, gender_ctx, cultural_ctx, ref_block, gita_block, history_block,
    ) -> str:
        return f"""
{ref_block}
{age_ctx}
{gender_ctx}
PATIENT NARRATIVE:
{tat_story[:600]}

{cultural_ctx}
{gita_block}
TASK:
Summarize the emotional and narrative patterns, with particular emphasis on
DEFENSE MECHANISMS, COPING STRATEGIES, and PSYCHOLOGICAL FORMULATION.
Use the reference material on defense theory and coping to contextualize findings.

PSYCHOLOGICAL PROFILE SUMMARY:
{self._flatten_profile_for_prompt(psych_profile)}
{history_block}

RESPONSE FORMAT:
1. **DEFENSE PROFILE**: Which defense mechanisms are active? What developmental level do they reflect (primitive, neurotic, mature)? How do they protect the ego?
2. **COPING STYLE ANALYSIS**: Is the patient's coping adaptive or maladaptive? What triggers coping responses in the narrative?
3. **EMOTIONAL PATTERN SYNTHESIS**: How do emotional patterns across the narrative connect to underlying needs and unresolved conflicts?
4. **PSYCHODYNAMIC FORMULATION**: Integrate the above into a brief psychodynamic formulation — what are the core anxieties, what defenses manage them, and what might work therapeutically?
5. **REFLECTIVE GROUNDING**: Incorporate Gita wisdom naturally to provide philosophical perspective on the patient's inner struggle.

Write in plain English paragraph form. Do NOT reproduce raw data or dicts. Emphasize the interplay between defense/coping and emotional patterns.
""".strip()

    def _prompt_therapy_recommendation(
        self, tat_story, psych_profile, learned_concepts,
        age_ctx, gender_ctx, cultural_ctx, ref_block, gita_block, history_block,
    ) -> str:
        return f"""
{ref_block}
{age_ctx}
{gender_ctx}
PATIENT NARRATIVE EXCERPT:
{tat_story[:400]}

{cultural_ctx}
{gita_block}
TASK:
Suggest supportive therapeutic approaches and interventions.
Draw directly from the REMEDY REFERENCE MATERIAL and Gita remedies to provide
concrete, culturally sensitive recommendations.

PSYCHOLOGICAL PROFILE SUMMARY:
{self._flatten_profile_for_prompt(psych_profile)}
{history_block}

RESPONSE FORMAT:
1. **PRIMARY THERAPEUTIC MODALITIES**: Based on the detected themes, conflicts, and needs, which therapeutic approaches are most fitting? (e.g., CBT for anxiety, psychodynamic for unresolved conflicts, narrative therapy for identity themes).
2. **GITA-GROUNDED REFLECTIVE PRACTICES**: Translate the Gita insights into practical reflective exercises (e.g., journaling prompts, meditation themes, philosophical reframing exercises).
3. **TARGETED INTERVENTION AREAS**: Identify 2-3 specific areas from the profile that would benefit from focused intervention (with rationale from the reference material).
4. **CULTURAL ADAPTATION**: How should therapeutic approaches be adapted for the Indian socio-cultural context?
5. **SUPPORTIVE RESOURCES**: Any additional supportive practices — family involvement, group therapy, mindfulness, community resources.

Write in plain English paragraphs with concrete, actionable suggestions. Do NOT reproduce raw data or dicts.
""".strip()

    def _prompt_risk_explanation(
        self, tat_story, psych_profile, learned_concepts,
        age_ctx, gender_ctx, cultural_ctx, ref_block, gita_block, history_block,
    ) -> str:
        return f"""
{ref_block}
{age_ctx}
{gender_ctx}
PATIENT NARRATIVE:
{tat_story[:500]}

{cultural_ctx}
{gita_block}
TASK:
Discuss potential psychological concerns and risk factors identified in the narrative.
Focus on CONFLICT PATTERNS, EMOTIONAL RISKS, and PROTECTIVE FACTORS.
Use the reference material on conflict theory and resolution to ground your analysis.
Maintain a cautious, reassuring, and non-alarmist tone.

PSYCHOLOGICAL PROFILE SUMMARY:
{self._flatten_profile_for_prompt(psych_profile)}
{history_block}

RESPONSE FORMAT:
1. **CONFLICT ANALYSIS**: What are the primary and secondary conflicts? Are they intrapsychic, interpersonal, or developmental? What is their resolution status?
2. **EMOTIONAL RISK INDICATORS**: What emotional patterns suggest potential vulnerabilities? (anxiety, hopelessness, emotional lability, isolation).
3. **PROTECTIVE FACTORS**: What strengths, coping resources, and resilience markers are present in the narrative? What culturally grounded supports might exist?
4. **RISK CONTEXTUALIZATION**: Frame concerns within the patient's developmental stage and cultural context. Avoid over-pathologizing.
5. **PHILOSOPHICAL GROUNDING**: Use a Gita insight to frame risk within a growth/resilience perspective.

Write in plain English paragraphs. Do NOT reproduce raw data or dicts. Emphasize balanced assessment — both vulnerabilities AND strengths.
""".strip()

    def _prompt_score_explanation(
        self, tat_story, psych_profile, learned_concepts,
        age_ctx, gender_ctx, cultural_ctx, ref_block, gita_block, history_block,
    ) -> str:
        return f"""
{ref_block}
{age_ctx}
{gender_ctx}
PATIENT NARRATIVE EXCERPT:
{tat_story[:400]}

{cultural_ctx}
TASK:
Explain the psychological scores and quantitative metrics.
Use the SCORING MANUAL reference material to justify and contextualize
each score dimension.

PSYCHOLOGICAL PROFILE SUMMARY:
{self._flatten_profile_for_prompt(psych_profile)}
{history_block}

RESPONSE FORMAT:
1. **SCORING DIMENSIONS EXPLAINED**: For each major score (ego strength, reality testing, narrative coherence, emotional stability, social cognition), explain what it measures and what the patient's score indicates.
2. **NEEDS & PRESSES QUANTIFICATION**: Explain the Murray need/press probability scores — which are dominant vs latent vs suppressed, and why.
3. **CONFLICT & COMPLEXITY METRICS**: Interpret the conflict intensity, complexity, and internal vs interpersonal conflict scores in the context of the narrative.
4. **COMPARATIVE CONTEXT**: Place the scores within normative context — what is typical versus unusual? Reference specific scoring manual criteria.
5. **CLINICAL MEANING**: What do these numbers collectively tell us about the patient's psychological functioning? Translate metrics into clinically meaningful narrative.

Write in plain English paragraphs. Do NOT reproduce raw data or dicts. Bridge quantitative scores and qualitative clinical meaning.
""".strip()

    @staticmethod
    def _flatten_profile_for_prompt(psych_profile: dict) -> str:
        """
        Convert the psych_profile dict into clean, human-readable plain text.
        Strips N/P prefixes from Murray need/press names.
        Never produces raw Python dicts or JSON notation.
        """
        lines = []

        def _strip_prefix(name: str) -> str:
            """Strip Murray N-prefix (needs) and P-prefix (presses)."""
            import re
            s = str(name).strip()

            s = re.sub(r'^[NnPp]([A-Z][a-z])', lambda m: m.group(1), s)

            s = re.sub(r'^[np]([a-z])', lambda m: m.group(1).upper(), s)
            return s

        def _safe(val, is_need_press: bool = False):
            """Return a short, readable string for any value."""
            if val is None:
                return "Not specified"
            if isinstance(val, bool):
                return "Yes" if val else "No"
            if isinstance(val, (int, float)):
                return str(round(val, 3))
            if isinstance(val, str):
                s = val.strip() or "Not specified"
                return _strip_prefix(s) if is_need_press else s
            if isinstance(val, (list, tuple)):
                parts = []
                for item in val:
                    if isinstance(item, dict):
                        for key in ('name', 'label', 'defense', 'theme', 'mechanism', 'type'):
                            if item.get(key):
                                raw = str(item[key])
                                parts.append(_strip_prefix(raw) if is_need_press else raw)
                                break
                        else:
                            first = str(list(item.values())[0]) if item else ""
                            parts.append(_strip_prefix(first) if is_need_press else first)
                    else:
                        raw = str(item)
                        parts.append(_strip_prefix(raw) if is_need_press else raw)
                return ", ".join(filter(None, parts)) or "None detected"
            if isinstance(val, dict):
                inner = []
                for k, v in val.items():
                    inner.append(f"{k.replace('_', ' ')}: {_safe(v)}")
                return "; ".join(inner[:6]) or "Not specified"
            return str(val)

        if psych_profile.get('patient_age'):
            lines.append(f"Patient age: {psych_profile['patient_age']} ({psych_profile.get('age_context', '')})")
        if psych_profile.get('patient_gender'):
            lines.append(f"Patient gender: {psych_profile['patient_gender']} ({psych_profile.get('gender_context', '')})")
        if psych_profile.get('patient_environment'):
            lines.append(f"Living Environment: {psych_profile['patient_environment']}")
        if psych_profile.get('patient_notes'):
            lines.append(f"Clinical Notes/Observations: {psych_profile['patient_notes']}")

        need_press_keys = {'needs', 'presses'}
        simple_keys = [
            ('needs', 'Primary psychological needs'),
            ('presses', 'Environmental presses'),
            ('emotions', 'Dominant emotions'),
            ('themes', 'Narrative themes'),
            ('conflict_types', 'Conflict types'),
            ('defenses', 'Defense mechanisms'),
            ('relational_figures', 'Relational figures identified'),
            ('cultural_factors', 'Cultural context factors'),
        ]
        for key, label in simple_keys:
            val = psych_profile.get(key)
            if val:
                lines.append(f"{label}: {_safe(val, is_need_press=(key in need_press_keys))}")

        notes = psych_profile.get('cultural_notes', [])
        if notes:
            lines.append(f"Cultural normalization notes: {'; '.join(str(n) for n in notes[:2])}")

        return "\n".join(lines) if lines else "No profile data available."

    def _prompt_comprehensive_clinical_report(
        self, tat_story, psych_profile, learned_concepts,
        age_ctx, gender_ctx, cultural_ctx, ref_block, gita_block, history_block,
    ) -> str:
        """Combined prompt: Generates a complete hospital-grade psychological assessment report."""

        _profile_text = self._flatten_profile_for_prompt(psych_profile)

        return f"""
{ref_block}
{age_ctx}
{gender_ctx}
PATIENT NARRATIVE EXCERPT:
{tat_story[:600]}

{cultural_ctx}
{gita_block}
PSYCHOLOGICAL PROFILE (plain text, no raw data):
{_profile_text}

LEARNING CONTEXT:
{', '.join(learned_concepts[:10])}
{history_block}

You are an Expert Clinical Psychologist, Psychological Assessor, Clinical Report Writer, and Psychological Formulation Engine.

Your responsibility is NOT merely to interpret TAT cards.
Your responsibility is to integrate TAT findings into the complete psychological report and generate a professional clinical formulation that resembles reports used in hospitals, rehabilitation centers, psychiatry departments, psychological assessment units, and clinical psychology practices.

---
PRIMARY OBJECTIVE
---
The final report must contain:
1. Existing Assessment Findings (UNCHANGED)
2. Existing Test Results (UNCHANGED)
3. Existing Interpretations (UNCHANGED)
4. TAT Analysis
5. TAT Summary Table
6. Clinical Summary
7. Comprehensive Clinical Summary
8. Integrated Clinical Formulation
9. Integrated Impression Addendum
10. Clinical Correlation Note
11. Recommendations

The report must appear as a single integrated psychological assessment report rather than separate disconnected sections.

---
CRITICAL PRESERVATION RULE
---
NEVER DELETE:
* Existing observations
* Existing psychometric findings
* Existing scores
* Existing IQ findings
* Existing behavioral observations
* Existing impressions
* Existing diagnoses
* Existing recommendations

DO NOT REWRITE EXISTING CONTENT.
ONLY APPEND NEW SECTIONS.

---
CLINICAL WRITING STYLE
---
Use:
* Professional psychological terminology
* Clinical objectivity
* Evidence-based language
* Formulation-oriented interpretation

Use phrases such as:
* suggests
* indicates
* appears to
* may reflect
* is indicative of
* is consistent with

Never make absolute claims.
Never diagnose solely from projective findings.

---
THEMATIC APPERCEPTION TEST (TAT)
---
Generate:
### Purpose
The Thematic Apperception Test (TAT) was administered to assess personality dynamics, emotional functioning, motivational needs, interpersonal perceptions, conflict patterns, and coping styles.

---
TAT SUMMARY TABLE
---
Generate:
| Domain                          | Findings |
| ------------------------------- | -------- |
| Story Organization              |          |
| Reality Testing                 |          |
| Hero Identification             |          |
| Emotional Tone                  |          |
| Self Concept                    |          |
| Environment Perception          |          |
| Authority Figure Representation |          |
| Peer Relationships              |          |
| Dominant Needs                  |          |
| Environmental Press             |          |
| Major Conflicts                 |          |
| Defense Mechanisms              |          |
| Coping Style                    |          |
| Interpersonal Functioning       |          |
| Personality Characteristics     |          |
| Adaptive Strengths              |          |
| Areas of Vulnerability          |          |

Fill dynamically from the card narratives.

---
DETAILED TAT INTERPRETATION
---
Interpret:
Narrative Structure
Emotional Themes
Hero Analysis
Self Perception
Environment Perception
Authority Figures
Interpersonal Relationships
Dominant Needs
Environmental Press
Conflict Analysis
Defense Mechanisms
Coping Strategies
Adaptive Capacities
Personality Dynamics

Use Murray's Need-Press framework whenever applicable.

---
CLINICAL SUMMARY
---
Generate a concise formulation.

Length:
200-300 words

Structure:
### Clinical Summary
Based on the thematic content, emotional tone, interpersonal perceptions, and recurring conflict patterns observed across the stories, the client appears to demonstrate a personality organization characterized by [dynamic formulation].
The narratives suggest underlying concerns related to [themes].
Interpersonal functioning appears to be characterized by [patterns].
The client experiences the environment as [environmental perception].
Prominent psychological needs include [needs].
Primary conflicts appear to involve [conflicts].
The client's preferred coping mechanisms involve [defenses].
Overall findings suggest [personality formulation].
The findings should be interpreted in conjunction with clinical interview data, behavioral observations, and objective assessment measures.

---
COMPREHENSIVE CLINICAL SUMMARY
---
THIS IS A MANDATORY SECTION.

Length:
500-1200 words

Write exactly like a senior clinical psychologist preparing a final case formulation.

The summary must integrate:
COGNITIVE FUNCTIONING
* judgment
* reasoning
* reality testing
* planning ability
* problem solving

EMOTIONAL FUNCTIONING
* anxiety
* sadness
* hopelessness
* guilt
* frustration
* emotional sensitivity
* emotional regulation

PERSONALITY FUNCTIONING
* self-esteem
* self-concept
* autonomy
* dependency
* achievement orientation
* self-worth
* confidence

INTERPERSONAL FUNCTIONING
* attachment patterns
* trust
* rejection sensitivity
* affiliation needs
* relationship style
* dependency needs

MOTIVATIONAL DYNAMICS
* achievement
* affiliation
* autonomy
* aggression
* nurturance
* succourance
* dependency

CONFLICT DYNAMICS
Explain:
* conscious conflicts
* unconscious conflicts
* recurrent struggles
* internal tensions

COPING AND DEFENSES
Explain:
* adaptive defenses
* maladaptive defenses
* stress handling
* resilience capacity

ENVIRONMENTAL ADAPTATION
Explain:
* perception of support
* adjustment ability
* social adaptation
* occupational/academic adaptation

CLINICAL STRENGTHS
Identify:
* insight
* resilience
* motivation
* reality orientation
* emotional awareness
* adaptive capacities

AREAS OF CLINICAL CONCERN
Identify:
* interpersonal difficulties
* emotional vulnerabilities
* self-esteem issues
* dependency conflicts
* achievement struggles

RISK FACTORS
Discuss only if strongly indicated. Avoid over-pathologizing.

---
INTEGRATED CLINICAL FORMULATION
---
THIS SECTION MUST READ LIKE A SENIOR CLINICAL PSYCHOLOGIST'S CASE FORMULATION.

Length:
300-600 words

Generate:
### Integrated Clinical Formulation
The available assessment data, behavioral observations, psychometric findings, and projective indicators collectively suggest that the client demonstrates [formulation].

Discuss:
Predisposing Factors
Precipitating Factors
Perpetuating Factors
Protective Factors

Integrate:
* TAT findings
* objective tests
* behavioral observations
* demographics
* age
* gender
* educational background
* presenting complaints

Explain HOW all findings connect together. Do NOT simply list findings. Formulate the person.

---
PROJECTIVE ASSESSMENT SUMMARY
---
Generate:
### Projective Assessment Summary
2-4 professional paragraphs summarizing the complete TAT profile.

---
IMPRESSION ENHANCEMENT
---
WITHOUT modifying the original impression, append:
### Integrated Projective Impression
The projective assessment findings indicate recurring themes involving [themes].
The client demonstrates strengths in [strengths].
Areas of vulnerability include [vulnerabilities].
The predominant conflicts involve [conflicts].
The individual appears to rely on [defenses] to manage psychological distress.
These findings are broadly consistent with the overall assessment profile and should be interpreted in conjunction with objective psychological measures, behavioral observations, clinical interview findings, and professional judgment.

---
CLINICAL CORRELATION NOTE
---
Append after the final impression:
### Clinical Correlation Note
The projective findings provide supplementary information regarding the client's emotional functioning, interpersonal perceptions, motivational dynamics, conflict patterns, and coping strategies. These findings should not be interpreted in isolation but integrated with clinical history, behavioral observations, psychometric results, and contextual factors to achieve a comprehensive understanding of the individual's psychological functioning.

---
QUALITY CONTROL RULES
---
Before generating the final report verify:
✓ Existing report preserved
✓ Existing scores preserved
✓ Existing diagnosis preserved
✓ Existing recommendations preserved
✓ TAT summary table generated
✓ Detailed TAT interpretation generated
✓ Clinical Summary generated
✓ Comprehensive Clinical Summary generated
✓ Integrated Clinical Formulation generated
✓ Projective Assessment Summary generated
✓ Integrated Projective Impression generated
✓ Clinical Correlation Note generated
✓ Professional clinical language maintained
✓ No unsupported diagnoses introduced
✓ No section removed

The final output must read like a complete hospital-grade psychological assessment report.
""".strip()

    _prompt_builders = {
        "clinical_summary": _prompt_clinical_summary,
        "judgment_summary": _prompt_judgment_summary,
        "formulation_explanation": _prompt_formulation_explanation,
        "therapy_recommendation": _prompt_therapy_recommendation,
        "risk_explanation": _prompt_risk_explanation,
        "score_explanation": _prompt_score_explanation,
        "comprehensive_clinical_report": _prompt_comprehensive_clinical_report,
    }

    def _system_guardrails(self) -> str:
        return """
You are a clinical psychology assistant.

Rules:
- Do NOT diagnose
- Do NOT label disorders
- Avoid deterministic language
- Use tentative, exploratory phrasing
- Be empathetic, calm, and professional
- Focus on themes, emotions, relationships, coping
- Never suggest self-harm or extreme conclusions
- ALWAYS interpret narratives through the patient's age and developmental stage
- Adjust expectations for vocabulary, emotional expression, and thematic complexity based on the patient's age
- For children and adolescents, avoid over-pathologizing normative developmental themes
- ALWAYS apply gender-normative TAT interpretation guidelines as specified in PATIENT GENDER CONTEXT
- Do NOT impose binary gender stereotypes; use the gender guidance provided to calibrate interpretation
- For female patients, avoid over-pathologizing affiliative or protective themes on cards 3BM, 4, 13MF
- For male patients, apply normative calibration to achievement and autonomy themes before pathologizing
"""

    def _load_templates(self) -> Dict[str, List[str]]:
        return {
            "clinical_summary": [
                "The material reflects meaningful emotional themes and interpersonal dynamics that can be explored further in a supportive setting."
            ],
            "judgment_summary": [
                "The story reflects certain emotional and motivational themes that may influence how challenges are perceived."
            ],
            "formulation_explanation": [
                "Overall, the narrative suggests patterns that could shape emotional responses and coping styles."
            ],
            "therapy_recommendation": [
                "Supportive reflection and guided discussion may help explore these themes further."
            ],
            "risk_explanation": [
                "There does not appear to be immediate concern, though awareness and reflection are encouraged."
            ],
            "score_explanation": [
                "The score indicates tendencies worth exploring rather than fixed conclusions."
            ],
        }

    def _use_template(self, response_type: str) -> str:
        text = random.choice(
            self.templates.get(
                response_type,
                ["The narrative shows meaningful psychological patterns."]
            )
        )
        self._store_in_history(response_type, text)
        return text

    def _store_in_history(self, response_type: str, response: str):
        self.conversation_history.append({
            "timestamp": datetime.now().isoformat(),
            "type": response_type,
            "response": response,
        })
        self.conversation_history = self.conversation_history[-50:]

    def get_conversation_history(self, limit: int = 10) -> List[Dict]:
        return self.conversation_history[-limit:]

    def clear_conversation_history(self):
        self.conversation_history.clear()

    @staticmethod
    def split_comprehensive_response(response_text: str) -> dict:
        """
        Handle a comprehensive_clinical_report response.
        Because the Advanced TAT prompt generates a single, unified clinical block,
        we return the entire response in all expected fields so upstream consumers
        do not fail if they expect a dictionary.
        """
        text = response_text.strip()

        return {
            "meta_reasoning": text,
            "therapy_recommendation": text,
            "clinical_conclusion": text,
        }
