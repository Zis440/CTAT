"""
Psychological Formulation Engine - Real Implementation
Generates comprehensive psychological formulations from TAT analysis
"""

from typing import Dict, List, Any, Optional
from datetime import datetime

class PsychologicalFormulationEngine:
    """
    Real Psychological Formulation Engine
    Synthesizes judgment and scoring data into clinical formulations
    """

    def __init__(self, config):
        self.config = config

    def generate_formulation(self, story_text: str, judgment: Dict, scores: Dict) -> Dict:
        """
        Generate psychological formulation from analysis results
        REAL IMPLEMENTATION - synthesizes data into clinical insights
        """

        themes = judgment.get("inferred_themes", [])
        risk_level = judgment.get("overall_judgment", {}).get("risk", "low")
        overall_score = scores.get("overall_score", 5.0)
        dimension_scores = scores.get("dimension_scores", {})

        summary = self._generate_summary(themes, risk_level, overall_score)
        dominant_patterns = self._identify_dominant_patterns(dimension_scores, themes)
        clinical_concerns = self._identify_clinical_concerns(dimension_scores, risk_level)
        strengths = self._identify_strengths(dimension_scores)

        return {
            "summary": summary,
            "dominant_patterns": dominant_patterns,
            "clinical_concerns": clinical_concerns,
            "psychological_strengths": strengths,
            "narrative_analysis": self._analyze_narrative(story_text),
            "formulation_confidence": self._calculate_confidence(judgment, scores),
            "timestamp": datetime.now().isoformat()
        }

    def _generate_summary(self, themes: List[str], risk_level: str, overall_score: float) -> str:
        """Generate overall psychological summary"""
        theme_str = ", ".join(themes[:3]) if themes else "general psychological concerns"

        if overall_score >= 7.0:
            functioning = "generally healthy psychological functioning"
        elif overall_score >= 5.0:
            functioning = "moderate psychological functioning"
        else:
            functioning = "significant psychological concerns"

        summary = f"The narrative reveals {theme_str} with {functioning}. "
        summary += f"Risk level assessed as {risk_level}. "

        return summary

    def _identify_dominant_patterns(self, dimension_scores: Dict, themes: List[str]) -> List[str]:
        """Identify dominant psychological patterns"""
        patterns = []

        if dimension_scores:
            sorted_dims = sorted(dimension_scores.items(), key=lambda x: x[1], reverse=True)
            top_dims = sorted_dims[:3]

            for dim, score in top_dims:
                if score >= 6.5:
                    patterns.append(f"Strength in {dim.replace('_', ' ')}")

        if "anxiety" in themes or "stress" in themes:
            patterns.append("Anxiety-related concerns evident")
        if "family" in themes or "relationship" in themes:
            patterns.append("Interpersonal dynamics prominent")
        if "achievement" in themes or "success" in themes:
            patterns.append("Achievement-oriented concerns")

        return patterns[:5]

    def _identify_clinical_concerns(self, dimension_scores: Dict, risk_level: str) -> List[str]:
        """Identify clinical concerns from scores"""
        concerns = []

        if dimension_scores:
            for dim, score in dimension_scores.items():
                if score < 4.5:
                    concerns.append(f"Low {dim.replace('_', ' ')} ({score}/10)")

        if risk_level == "high":
            concerns.append("Elevated psychological risk level")
        elif risk_level == "moderate":
            concerns.append("Moderate risk indicators present")

        return concerns[:5]

    def _identify_strengths(self, dimension_scores: Dict) -> List[str]:
        """Identify psychological strengths"""
        strengths = []

        if dimension_scores:
            for dim, score in dimension_scores.items():
                if score >= 7.5:
                    strengths.append(f"Strong {dim.replace('_', ' ')} ({score}/10)")

        return strengths[:5]

    def _analyze_narrative(self, story_text: str) -> Dict:
        """Analyze narrative structure and content"""
        word_count = len(story_text.split())
        sentence_count = story_text.count('.') + story_text.count('!') + story_text.count('?')

        return {
            "word_count": word_count,
            "sentence_count": max(1, sentence_count),
            "avg_sentence_length": round(word_count / max(1, sentence_count), 1),
            "narrative_length": "detailed" if word_count > 100 else "brief" if word_count > 30 else "minimal"
        }

    def _calculate_confidence(self, judgment: Dict, scores: Dict) -> float:
        """Calculate formulation confidence"""
        judgment_confidence = judgment.get("confidence", 0.5)
        scoring_confidence = scores.get("confidence", 0.5)

        return round((judgment_confidence + scoring_confidence) / 2, 2)
