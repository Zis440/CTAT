"""
Medication and Remedy Recommendation Engine
Integrates MEDICATION.csv with Bhagavad Gita remedies

CLINICAL RECALIBRATION v3.0:
- Converted to probabilistic hypothesis layer (not diagnostic output)
- Added Clinical Confidence Threshold, severity gating, symptom density rules
- Added narrative-evidence justification per condition
- All output marked: "Exploratory Differential Hypothesis — Not Clinical Determination"
"""

from pathlib import Path
from typing import List, Dict, Optional
import csv
from dataclasses import dataclass, field
from collections import defaultdict
import difflib  # for fuzzy matching (fix #9)


# ============================================================================
# CLINICAL CALIBRATION CONSTANTS
# ============================================================================

# Minimum confidence (0-100) before a condition is surfaced with medication
CLINICAL_CONFIDENCE_THRESHOLD = 45.0  # Fix 5: raised from 35 → stricter gating

# Minimum matched keywords before a condition is considered
MIN_SYMPTOM_DENSITY = 3  # Fix 5: raised from 2 → needs 3+ keyword matches

# Severity band thresholds (confidence score => severity)
SEVERITY_BANDS = {
    (0, 20): "Subclinical",
    (20, 40): "Mild",
    (40, 65): "Moderate",
    (65, 100): "Severe",
}

# Minimum pathological indicators required for "Severe" classification
MIN_SEVERE_INDICATORS = 5

HYPOTHESIS_DISCLAIMER = (
    "Exploratory Differential Hypothesis — Not Clinical Determination. "
    "All conditions listed are probabilistic screening hypotheses derived "
    "from narrative material and require independent clinical evaluation."
)

# Fix 5: Conditions requiring behavioral observation data — cannot be reliably
# inferred from narrative material alone. Excluded unless presenting_issue
# explicitly matches.
BEHAVIORAL_DATA_REQUIRED = {
    "kleptomania", "pyromania", "adhd", "attention deficit",
    "dementia", "alzheimer", "tourette", "tic disorder",
    "intellectual disability", "narcolepsy", "sleepwalking",
    "enuresis", "encopresis", "pica", "rumination disorder",
    "stuttering", "selective mutism", "factitious disorder",
    "malingering", "gaming disorder",
}


# ============================================================================
# DATA MODEL
# ============================================================================

@dataclass
class MedicationRecommendation:
    """Medication recommendation with details"""
    mental_condition: str
    symptoms: List[str]
    treatments: List[str]
    medications: List[str]
    dosages: List[str]
    gita_remedies: List[str]
    match_score: float = 0.0
    matched_keywords: List[str] = field(default_factory=list)
    # --- Gita parsing ---
    gita_verse: str = ""
    gita_insight: str = ""
    # --- Recalibration v3.0 fields ---
    symptom_density_score: int = 0
    severity_likelihood: str = "Subclinical"
    clinical_confidence: float = 0.0
    evidence_from_narrative: str = ""
    medication_class: str = ""
    supervisory_review_required: bool = True

    def to_dict(self) -> Dict:
        """Convert recommendation object to dictionary (for JSON/Ollama)"""
        return {
            "mental_condition": self.mental_condition,
            "symptoms": self.symptoms,
            "treatments": self.treatments,
            "medications": self.medications,
            "dosages": self.dosages,
            "gita_remedies": self.gita_remedies,
            "gita_verse": self.gita_verse,
            "gita_insight": self.gita_insight,
            "match_score": self.match_score,
            "matched_keywords": self.matched_keywords,
        }

    def to_hypothesis_dict(self) -> Dict:
        """Upgraded hypothesis output format per clinical recalibration."""
        return {
            "condition": self.mental_condition,
            "evidence_from_narrative": self.evidence_from_narrative,
            "symptom_density_score": self.symptom_density_score,
            "severity_likelihood": self.severity_likelihood,
            "clinical_confidence": f"{self.clinical_confidence:.1f}%",
            "medication_class": self.medication_class if self.clinical_confidence >= CLINICAL_CONFIDENCE_THRESHOLD else "Below threshold — not recommended",
            "medications": self.medications if self.clinical_confidence >= CLINICAL_CONFIDENCE_THRESHOLD else [],
            "supervisory_review_required": "Yes",
            "disclaimer": HYPOTHESIS_DISCLAIMER,
        }


# ============================================================================
# ENGINE
# ============================================================================

class MedicationEngine:
    """Engine for matching symptoms/themes to medication and remedies"""

    def __init__(self, medication_csv_path: Path):
        self.medication_csv_path = medication_csv_path
        self.medications_db = []
        self.condition_index = defaultdict(list)
        self.symptom_index = defaultdict(list)

        if self.medication_csv_path.exists():
            self._load_database()
        else:
            print(f"⚠️ Medication database not found: {medication_csv_path}")

    # ------------------------------------------------------------------------
    # DATABASE LOADING
    # ------------------------------------------------------------------------

    def _load_database(self):
        """Load MEDICATION.csv into memory"""
        try:
            with open(self.medication_csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)

                for idx, row in enumerate(reader):
                    condition = (row.get("Mental Condition") or "").strip()

                    symptoms = [
                        s.strip()
                        for s in (row.get("Symptoms") or "").split(";")
                        if s.strip()
                    ]

                    treatments = [
                        t.strip()
                        for t in (row.get("Recommended Treatments") or "").split(";")
                        if t.strip()
                    ]

                    medications = [
                        m.strip()
                        for m in (row.get("Medications") or "").split(";")
                        if m.strip()
                    ]

                    dosages = [
                        d.strip()
                        for d in (row.get("Dosage") or "").split(";")
                        if d.strip()
                    ]

                    remedies_raw = (row.get("Advanced Remedies") or "").strip()
                    gita_verse = ""
                    gita_insight = ""
                    if "Insight:" in remedies_raw:
                        parts = remedies_raw.split("Insight:", 1)
                        gita_verse = parts[0].strip()
                        gita_insight = parts[1].strip()
                    else:
                        gita_verse = remedies_raw

                    med_entry = {
                        "id": idx,
                        "condition": condition,
                        "symptoms": symptoms,
                        "treatments": treatments,
                        "medications": medications,
                        "dosages": dosages,
                        "gita_remedies": remedies_raw,
                        "gita_verse": gita_verse,
                        "gita_insight": gita_insight
                    }

                    self.medications_db.append(med_entry)

                    if condition:
                        self.condition_index[condition.lower()].append(med_entry)

                    for symptom in symptoms:
                        self.symptom_index[symptom.lower()].append(med_entry)

            print(f"✅ Loaded {len(self.medications_db)} medication entries")

        except Exception as e:
            print(f"⚠️ Error loading medication database: {e}")

    # ------------------------------------------------------------------------
    # MATCHING LOGIC (UPGRADED with fuzzy matching)
    # ------------------------------------------------------------------------

    def match_conditions(
        self,
        themes: List[str],
        symptoms: List[str] = None,
        emotions: List[str] = None,
        presenting_issue: Optional[str] = None,
        anxiety_level: float = 0.0,
        emotional_stability: float = 50.0
    ) -> List[MedicationRecommendation]:
        """
        Match themes/symptoms/emotions to mental conditions.
        Enhanced ranking logic with fuzzy matching.
        """

        if not self.medications_db:
            return []

        # Prepare input sets
        themes_lower = {t.lower() for t in (themes or [])}
        symptoms_lower = {s.lower() for s in (symptoms or [])}
        emotions_lower = {e.lower() for e in (emotions or [])}

        all_keywords = themes_lower | symptoms_lower | emotions_lower
        scored_matches = []

        # High clinical risk emotion weighting
        high_risk_emotions = {"anxiety", "fear", "loneliness", "hopelessness"}

        for entry in self.medications_db:
            score = 0.0
            matched_keywords = []

            # ------------------------------------------------------------
            # Condition Match (High Weight) with fuzzy matching
            # ------------------------------------------------------------
            condition_words = set(entry["condition"].lower().split())
            # Exact matches
            exact_matches = all_keywords & condition_words
            score += len(exact_matches) * 3.0
            matched_keywords.extend(exact_matches)

            # Fuzzy matches for condition (if few exact)
            if len(exact_matches) == 0 and all_keywords:
                # Use difflib to find close matches
                for kw in all_keywords:
                    if difflib.get_close_matches(kw, condition_words, cutoff=0.8):
                        score += 1.5
                        matched_keywords.append(f"fuzzy:{kw}")
                        break  # one fuzzy per entry to avoid overcounting

            # ------------------------------------------------------------
            # Symptom Match (Medium Weight) with fuzzy
            # ------------------------------------------------------------
            for symptom in entry["symptoms"]:
                symptom_words = set(symptom.lower().split())
                exact = all_keywords & symptom_words
                if exact:
                    score += len(exact) * 2.0
                    matched_keywords.extend(exact)
                else:
                    # fuzzy match on full symptom phrase
                    for kw in all_keywords:
                        if difflib.get_close_matches(kw, [symptom.lower()], cutoff=0.7):
                            score += 1.0
                            matched_keywords.append(f"fuzzy:{kw}")
                            break

            # ------------------------------------------------------------
            # Treatment Match (Low Weight)
            # ------------------------------------------------------------
            for treatment in entry["treatments"]:
                treatment_words = set(treatment.lower().split())
                exact = all_keywords & treatment_words
                if exact:
                    score += len(exact) * 0.5
                    matched_keywords.extend(exact)

            # ------------------------------------------------------------
            # Presenting Issue Boost (Very High Weight)
            # ------------------------------------------------------------
            if presenting_issue:
                pi_lower = presenting_issue.lower()
                if pi_lower in entry["condition"].lower():
                    score += 5.0
                    matched_keywords.append(f"presenting_issue:{presenting_issue}")
                elif difflib.get_close_matches(pi_lower, [entry["condition"].lower()], cutoff=0.6):
                    score += 3.0
                    matched_keywords.append(f"fuzzy_presenting:{presenting_issue}")

            # ------------------------------------------------------------
            # Emotional Severity & Threshold Boost (Fix #9)
            # ------------------------------------------------------------
            if emotions_lower & high_risk_emotions:
                score += 2.5
                
            # Clinical threshold triggers: Guarantee > 0 confidence for relevant categories
            cat_lower = entry["condition"].lower()
            if anxiety_level > 70.0 and any(x in cat_lower for x in ['anxiety', 'panic', 'stress']):
                score += 4.0
                matched_keywords.append("clinical_threshold:severe_anxiety")
            
            if emotional_stability < 35.0 and any(x in cat_lower for x in ['mood', 'bipolar', 'depression', 'dysregulation']):
                score += 4.0
                matched_keywords.append("clinical_threshold:affect_dysregulation")

            # ------------------------------------------------------------
            # Finalize Recommendation
            # ------------------------------------------------------------
            if score > 0:
                # --- Fix 5: Behavioral-data exclusion gate ---
                condition_lower = entry["condition"].lower()
                is_behavioral = any(bdr in condition_lower for bdr in BEHAVIORAL_DATA_REQUIRED)
                if is_behavioral:
                    # Allow only if presenting_issue explicitly matches
                    if not (presenting_issue and presenting_issue.lower() in condition_lower):
                        continue  # skip this condition entirely

                # --- Recalibration: symptom density = unique matched keywords ---
                unique_kw = list(set(matched_keywords))
                symptom_density = len(unique_kw)

                # --- Recalibration: narrative evidence justification ---
                evidence_parts = [kw for kw in unique_kw if not kw.startswith('fuzzy:') and not kw.startswith('clinical_threshold:')]
                evidence_str = f"Matched narrative indicators: {', '.join(evidence_parts[:6])}" if evidence_parts else "Indirect/fuzzy match only"

                # --- Recalibration: medication class inference ---
                med_class = ""
                if entry["medications"]:
                    # Infer class from first medication name heuristically
                    first_med = entry["medications"][0].lower()
                    if any(x in first_med for x in ['ssri', 'sertraline', 'fluoxetine', 'escitalopram', 'paroxetine', 'citalopram']):
                        med_class = "SSRI (Selective Serotonin Reuptake Inhibitor)"
                    elif any(x in first_med for x in ['snri', 'venlafaxine', 'duloxetine', 'desvenlafaxine']):
                        med_class = "SNRI (Serotonin-Norepinephrine Reuptake Inhibitor)"
                    elif any(x in first_med for x in ['benzo', 'lorazepam', 'alprazolam', 'diazepam', 'clonazepam']):
                        med_class = "Benzodiazepine (Anxiolytic)"
                    elif any(x in first_med for x in ['antipsychotic', 'risperidone', 'olanzapine', 'quetiapine', 'aripiprazole']):
                        med_class = "Atypical Antipsychotic"
                    elif any(x in first_med for x in ['lithium', 'valproate', 'carbamazepine', 'lamotrigine']):
                        med_class = "Mood Stabilizer"
                    else:
                        med_class = "Psychotropic (class unspecified)"

                recommendation = MedicationRecommendation(
                    mental_condition=entry["condition"],
                    symptoms=entry["symptoms"],
                    treatments=entry["treatments"],
                    medications=entry["medications"],
                    dosages=entry["dosages"],
                    gita_remedies=[entry["gita_remedies"]] if entry["gita_remedies"] else [],
                    gita_verse=entry.get("gita_verse", ""),
                    gita_insight=entry.get("gita_insight", ""),
                    match_score=score,
                    matched_keywords=unique_kw,
                    symptom_density_score=symptom_density,
                    evidence_from_narrative=evidence_str,
                    medication_class=med_class,
                )

                scored_matches.append(recommendation)

        # ------------------------------------------------------------
        # Normalize Score by Symptom Complexity (Bias Reduction)
        # ------------------------------------------------------------
        for rec in scored_matches:
            complexity = len(rec.symptoms) if rec.symptoms else 1
            rec.match_score = round(rec.match_score / complexity, 2)

        # Sort by score
        scored_matches.sort(key=lambda x: x.match_score, reverse=True)

        # --- PRODUCTION CORRECTION: §2 Softmax Confidence Normalization ---
        if scored_matches:
            import math
            raw_scores = [min(rec.match_score, 50) for rec in scored_matches]
            exp_scores = [math.exp(s) for s in raw_scores]
            exp_sum = sum(exp_scores)
            if exp_sum > 0:
                for rec, exp_s in zip(scored_matches, exp_scores):
                    rec.match_score = round((exp_s / exp_sum) * 100, 2)
            for rec in scored_matches:
                rec.match_score = max(0.0, min(100.0, rec.match_score))

        # ------------------------------------------------------------
        # Recalibration v3.0: Clinical Confidence & Severity Gating
        # ------------------------------------------------------------
        for rec in scored_matches:
            rec.clinical_confidence = rec.match_score

            # Severity band assignment
            severity = "Subclinical"
            for (lo, hi), label in SEVERITY_BANDS.items():
                if lo <= rec.clinical_confidence < hi:
                    severity = label
                    break
            # Gate: "Severe" requires minimum pathological indicators
            if severity == "Severe" and rec.symptom_density_score < MIN_SEVERE_INDICATORS:
                severity = "Moderate"
            rec.severity_likelihood = severity

            # Gate: suppress conditions below minimum symptom density
            if rec.symptom_density_score < MIN_SYMPTOM_DENSITY:
                rec.severity_likelihood = "Subclinical"

        # ------------------------------------------------------------
        # Fix 5: Filter to top 10 results, suppress Subclinical
        # ------------------------------------------------------------
        scored_matches = [
            rec for rec in scored_matches
            if rec.severity_likelihood != "Subclinical"
        ]
        scored_matches = scored_matches[:10]  # hard limit

        # ------------------------------------------------------------
        # Threshold enforcement (Fix 7)
        # ------------------------------------------------------------
        if not scored_matches:
             return [MedicationRecommendation(
                    mental_condition="No current pharmacological indication based on screening thresholds",
                    symptoms=[],
                    treatments=[],
                    medications=[],
                    dosages=[],
                    gita_remedies=[],
                    match_score=0.0,
                    matched_keywords=[],
                    severity_likelihood="None",
                    clinical_confidence=0.0,
                    evidence_from_narrative="No narrative indicators met screening thresholds.",
                )]

        return scored_matches

    # ------------------------------------------------------------------------
    # DIRECT LOOKUP
    # ------------------------------------------------------------------------

    def get_recommendations(self, condition: str) -> Optional[MedicationRecommendation]:
        """Get recommendations for a specific mental condition"""

        if not condition:
            return None

        condition_lower = condition.lower()

        if condition_lower in self.condition_index:
            entry = self.condition_index[condition_lower][0]

            return MedicationRecommendation(
                mental_condition=entry["condition"],
                symptoms=entry["symptoms"],
                treatments=entry["treatments"],
                medications=entry["medications"],
                dosages=entry["dosages"],
                gita_remedies=[entry["gita_remedies"]] if entry["gita_remedies"] else [],
                gita_verse=entry.get("gita_verse", ""),
                gita_insight=entry.get("gita_insight", ""),
                match_score=1.0,
                matched_keywords=[condition],
            )

        # Fuzzy lookup if not exact
        for cond in self.condition_index.keys():
            if difflib.get_close_matches(condition_lower, [cond], cutoff=0.7):
                entry = self.condition_index[cond][0]
                return MedicationRecommendation(
                    mental_condition=entry["condition"],
                    symptoms=entry["symptoms"],
                    treatments=entry["treatments"],
                    medications=entry["medications"],
                    dosages=entry["dosages"],
                    gita_remedies=[entry["gita_remedies"]] if entry["gita_remedies"] else [],
                    gita_verse=entry.get("gita_verse", ""),
                    gita_insight=entry.get("gita_insight", ""),
                    match_score=0.8,
                    matched_keywords=[condition],
                )

        return None

    # ------------------------------------------------------------------------
    # GITA REMEDIES
    # ------------------------------------------------------------------------

    def get_gita_remedies(
        self, condition: str = None, keywords: List[str] = None
    ) -> List[str]:
        """Extract Bhagavad Gita remedies"""

        remedies = []

        if condition:
            recommendations = self.match_conditions([condition])
            for rec in recommendations[:3]:
                remedies.extend(rec.gita_remedies)

        if keywords:
            recommendations = self.match_conditions(keywords)
            for rec in recommendations[:3]:
                remedies.extend(rec.gita_remedies)

        # Remove duplicates (preserve order)
        seen = set()
        unique = []

        for remedy in remedies:
            if remedy and remedy not in seen:
                unique.append(remedy)
                seen.add(remedy)

        return unique

    # ------------------------------------------------------------------------
    # SYMPTOM SEARCH
    # ------------------------------------------------------------------------

    def search_by_symptoms(
        self, symptoms: List[str]
    ) -> List[MedicationRecommendation]:
        return self.match_conditions(themes=[], symptoms=symptoms)

    # ------------------------------------------------------------------------
    # UTILITIES
    # ------------------------------------------------------------------------

    def get_all_conditions(self) -> List[str]:
        return list(self.condition_index.keys())

    # ------------------------------------------------------------------------
    # HYPOTHESIS REPORT (Recalibration v3.0)
    # ------------------------------------------------------------------------

    def generate_hypothesis_report(self, matches: List[MedicationRecommendation]) -> Dict:
        """
        Generate the upgraded hypothesis output format.
        Returns a structured dict with hypothesis entries and disclaimer.
        """
        hypotheses = []
        for m in matches:
            hypotheses.append(m.to_hypothesis_dict())

        return {
            "hypothesis_disclaimer": HYPOTHESIS_DISCLAIMER,
            "clinical_confidence_threshold": CLINICAL_CONFIDENCE_THRESHOLD,
            "hypotheses": hypotheses,
            "conditions_above_threshold": sum(
                1 for m in matches if m.clinical_confidence >= CLINICAL_CONFIDENCE_THRESHOLD
            ),
            "supervisory_review_required": True,
        }