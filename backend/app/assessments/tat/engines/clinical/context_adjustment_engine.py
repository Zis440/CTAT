"""
Context Adjustment Engine

Handles the computation of the Context Adjustment Layer for the TAT Interpretation Engine.
Extracts context from patient demographics and applies:
- AgeWeightFactor & AgeCongruenceScore
- LivingConditionStressIndex (StressContextScore)
- Environmental Pressure Score
- Psychological Context Score (PCS)
"""

from typing import Dict, Any, List

class ContextAdjustmentEngine:
    def __init__(self):
        # Expected themes by age group for Age Congruence
        self.expected_themes = {
            "child": ["dependency", "family", "school", "play", "parent"],
            "adolescent": ["identity", "peer", "achievement", "rebellion", "friend"],
            "young_adult": ["career", "relationship", "independence", "romance", "future"],
            "adult": ["responsibility", "leadership", "family", "work", "stress"],
            "senior": ["legacy", "health", "reflection", "loss", "wisdom"]
        }

    def _get_age_group(self, age: int) -> str:
        if age is None:
            return "adult"  # default
        if age <= 12:
            return "child"
        elif age <= 17:
            return "adolescent"
        elif age <= 25:
            return "young_adult"
        elif age <= 45:
            return "adult"
        elif age <= 60:
            return "middle_aged" # We map this to adult themes plus some senior
        else:
            return "senior"

    def compute_age_congruence_score(self, age: int, observed_themes: List[str]) -> float:
        """
        AgeCongruenceScore = ObservedThemeSimilarity / ExpectedThemeSimilarity
        Normalized 0-100
        """
        if not observed_themes:
            return 50.0  # neutral

        age_group = self._get_age_group(age)
        
        # Map middle_aged to adult themes for the sake of expected theme sets, 
        # or combine adult and senior.
        if age_group == "middle_aged":
            expected = self.expected_themes["adult"] + ["health", "reflection"]
        else:
            expected = self.expected_themes.get(age_group, self.expected_themes["adult"])

        # Simple overlap for ObservedThemeSimilarity
        observed_lower = []
        for t in observed_themes:
            if isinstance(t, dict):
                theme_val = t.get("label") or t.get("theme") or ""
                observed_lower.append(str(theme_val).lower())
            else:
                observed_lower.append(str(t).lower())
        matches = 0
        for obs in observed_lower:
            if any(exp in obs for exp in expected):
                matches += 1
                
        # Normalize: 0 matches -> ~30 (low congruence), 1 match -> ~60, 2+ matches -> ~90+
        if matches == 0:
            return 30.0
        elif matches == 1:
            return 60.0
        elif matches == 2:
            return 85.0
        else:
            return 100.0

    def compute_stress_context_score(self, living_condition: str, family_structure: str, environment_type: str) -> float:
        """
        StressContextScore (LivingConditionStressIndex)
        EnvironmentWeight + LivingConditionWeight + FamilyWeight
        Normalized 0-100
        """
        score = 0.0
        
        lc = str(living_condition).lower()
        if "homeless" in lc or "temporary" in lc:
            score += 35.0
        elif "alone" in lc or "orphanage" in lc or "foster" in lc or "institutional" in lc:
            score += 25.0
        elif "hostel" in lc or "dormitory" in lc or "shared" in lc:
            score += 15.0
        else: # with family, parents, married
            score += 5.0

        fs = str(family_structure).lower()
        if "no family" in fs or "foster" in fs:
            score += 35.0
        elif "single parent" in fs or "guardian" in fs:
            score += 20.0
        else:
            score += 5.0

        env = str(environment_type).lower()
        if "highly stressful" in env or "trauma" in env or "conflict" in env:
            score += 30.0
        elif "challenged" in env or "isolated" in env or "pressured" in env:
            score += 20.0
        elif "highly supportive" in env:
            score += 0.0
        else:
            score += 10.0

        return min(100.0, score)

    def compute_environmental_pressure_score(self, environment_type: str, occupation: str, socioeconomic_status: str) -> float:
        """
        EPS = AcademicPressure + FinancialPressure + SocialPressure + FamilyPressure
        """
        score = 0.0
        
        env = str(environment_type).lower()
        if "academically pressured" in env or "high achievement" in env:
            score += 30.0
        
        se = str(socioeconomic_status).lower()
        if "low" in se:
            score += 30.0
        elif "lower middle" in se:
            score += 20.0
            
        if "isolated" in env or "conflict" in env:
            score += 20.0
            
        occ = str(occupation).lower()
        if "unemployed" in occ or "student" in occ:
            score += 20.0

        if score == 0.0:
            score = 25.0 # baseline low pressure
            
        return min(100.0, score)
        
    def compute_family_support_score(self, family_structure: str, environment_type: str) -> float:
        score = 50.0 # baseline
        env = str(environment_type).lower()
        if "highly supportive" in env:
            score = 90.0
        elif "moderately supportive" in env:
            score = 70.0
        elif "conflict" in env or "isolated" in env or "trauma" in env:
            score = 20.0
            
        fs = str(family_structure).lower()
        if "no family" in fs:
            score = max(10.0, score - 30.0)
            
        return score

    def compute_socioeconomic_adjustment(self, socioeconomic_status: str) -> float:
        se = str(socioeconomic_status).lower()
        if "high" in se:
            return 80.0
        elif "upper middle" in se:
            return 70.0
        elif "middle" in se:
            return 50.0
        elif "lower middle" in se:
            return 30.0
        elif "low" in se:
            return 10.0
        return 50.0

    def compute_pcs(self, 
                    stress_context_score: float, 
                    environmental_pressure_score: float, 
                    age_congruence_score: float,
                    family_support_score: float,
                    socioeconomic_adjustment: float) -> float:
        """
        PCS = 0.30 × StressContextScore + 0.25 × EnvironmentalPressureScore + 0.20 × AgeCongruenceScore + 0.15 × FamilySupportScore + 0.10 × SocioeconomicAdjustment
        """
        pcs = (
            (0.30 * stress_context_score) +
            (0.25 * environmental_pressure_score) +
            (0.20 * age_congruence_score) +
            (0.15 * family_support_score) +
            (0.10 * socioeconomic_adjustment)
        )
        return min(100.0, max(0.0, pcs))

    def apply_context_adjustment_layer(self, base_score: float, pcs: float) -> float:
        """
        FinalScore = (BasePsychologicalScore × 0.80) + (PCS × 0.20)
        """
        final_score = (base_score * 0.80) + (pcs * 0.20)
        return min(100.0, max(0.0, final_score))

    def compute_gender_target_alignment(self, participant_gender: str, card_tags: List[str]) -> Dict[str, Any]:
        """
        Calculates the Primary Character Identification Probability (PCIP) based on the matching 
        of participant gender to card gender targets.
        
        participant_gender: 'M', 'F', 'B', 'G'
        card_tags: List of tags from card_metadata (e.g. ['BM', 'GF'])
        
        Returns:
            Dict containing:
            - pcip_level: 'High', 'Moderate', 'Low', 'Standard' (for WHITE)
            - confidence_modifier: e.g., +0.20, 0.0, -0.10
            - amplified_themes: list of themes to increase confidence for
        """
        if "WHITE" in card_tags or not participant_gender:
            return {
                "pcip_level": "Standard",
                "confidence_modifier": 0.0,
                "amplified_themes": []
            }
            
        g = participant_gender.upper()
        # Normalization if full words passed
        if g in ['MALE', 'MAN']: g = 'M'
        elif g in ['FEMALE', 'WOMAN']: g = 'F'
        elif g in ['BOY']: g = 'B'
        elif g in ['GIRL']: g = 'G'
            
        high_matches = []
        low_matches = []
        
        if g == 'M':
            high_matches = ['M', 'BM', 'MF']
            low_matches = ['F', 'GF', 'G']
        elif g == 'F':
            high_matches = ['F', 'GF', 'MF']
            low_matches = ['M', 'BM', 'B']
        elif g == 'B':
            high_matches = ['B', 'BM', 'BG']
            low_matches = ['F', 'GF', 'G']
        elif g == 'G':
            high_matches = ['G', 'GF', 'BG']
            low_matches = ['M', 'BM', 'B']
        else:
            return {"pcip_level": "Standard", "confidence_modifier": 0.0, "amplified_themes": []}

        # Determine level based on overlap
        is_high = any(t in high_matches for t in card_tags)
        is_low = any(t in low_matches for t in card_tags)

        # Logic: If it has a high match, prioritize High.
        # If it has only a low match, it's Low.
        # Otherwise, Moderate.
        if is_high:
            pcip_level = "High"
            modifier = 0.20 # +20%
        elif is_low:
            pcip_level = "Low"
            modifier = -0.10 # -10%
        else:
            pcip_level = "Moderate"
            modifier = 0.0

        # Amplified themes based on Card Target Identity rules
        amplified = []
        if is_high:
            if 'M' in card_tags:
                amplified.extend(['male role conflicts', 'male identity', 'masculinity', 'father', 'achievement', 'occupational'])
            if 'F' in card_tags:
                amplified.extend(['female role conflicts', 'femininity', 'mother', 'relationship', 'caregiving'])
            if 'B' in card_tags:
                amplified.extend(['childhood', 'school', 'developmental', 'dependency', 'authority conflicts'])
            if 'G' in card_tags:
                amplified.extend(['female childhood', 'dependency', 'family conflicts', 'developmental'])
            if 'BM' in card_tags:
                amplified.extend(['male developmental', 'masculine identity', 'growth conflicts', 'achievement struggles', 'authority relationships'])
            if 'GF' in card_tags:
                amplified.extend(['female developmental', 'relational', 'attachment patterns', 'identity formation'])
            if 'MF' in card_tags:
                amplified.extend(['adult relationships', 'marriage', 'partner dynamics', 'interpersonal conflicts', 'adult role expectations'])
            if 'BG' in card_tags:
                amplified.extend(['peer relationships', 'sibling dynamics', 'school experiences', 'childhood development', 'adolescent concerns'])

        return {
            "pcip_level": pcip_level,
            "confidence_modifier": modifier,
            "amplified_themes": list(set(amplified))
        }

    def process_patient_context(self, patient_data: Dict[str, Any], observed_themes: List[str] = None) -> Dict[str, Any]:
        """
        Process all patient metadata and return the Contextual Scores
        """
        if observed_themes is None:
            observed_themes = []
            
        age = patient_data.get("age", 30)
        gender = patient_data.get("gender", "Unknown")
        living_condition = patient_data.get("living_condition", "Unknown")
        family_structure = patient_data.get("family_structure", "Unknown")
        residence_type = patient_data.get("residence_type", "Unknown")
        environment_type = patient_data.get("environment_type", "Unknown")
        education_level = patient_data.get("education_level", "Unknown")
        occupation = patient_data.get("occupation", "Unknown")
        socioeconomic_status = patient_data.get("socioeconomic_status", "Unknown")

        # Create Context Vector
        context_vector = [
            age, 
            self._get_age_group(age), 
            gender, 
            living_condition, 
            family_structure, 
            residence_type, 
            environment_type, 
            education_level, 
            occupation, 
            socioeconomic_status
        ]

        # Compute Scores
        age_congruence = self.compute_age_congruence_score(age, observed_themes)
        stress_context = self.compute_stress_context_score(living_condition, family_structure, environment_type)
        environmental_pressure = self.compute_environmental_pressure_score(environment_type, occupation, socioeconomic_status)
        family_support = self.compute_family_support_score(family_structure, environment_type)
        socio_adj = self.compute_socioeconomic_adjustment(socioeconomic_status)

        pcs = self.compute_pcs(
            stress_context_score=stress_context,
            environmental_pressure_score=environmental_pressure,
            age_congruence_score=age_congruence,
            family_support_score=family_support,
            socioeconomic_adjustment=socio_adj
        )

        return {
            "context_vector": context_vector,
            "age_congruence_score": round(age_congruence, 2),
            "stress_context_score": round(stress_context, 2),
            "environmental_pressure_score": round(environmental_pressure, 2),
            "family_support_score": round(family_support, 2),
            "socioeconomic_adjustment": round(socio_adj, 2),
            "psychological_context_score": round(pcs, 2),
            "raw_metadata": {
                "age": age,
                "gender": gender,
                "living_condition": living_condition,
                "family_structure": family_structure,
                "environment_type": environment_type,
                "residence_type": residence_type,
                "education_level": education_level,
                "occupation": occupation,
                "socioeconomic_status": socioeconomic_status
            }
        }
