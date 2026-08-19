"""
TAT Judging Engine - Real Implementation
Applies learned rules and narrative inference to judge TAT stories
"""

import hashlib
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional

class TATJudgingEngine:
    """
    Real TAT Judging Engine with theme detection and rule application
    """

    def __init__(self, config, knowledge_graph):
        self.config = config
        self.knowledge_graph = knowledge_graph
        self.nlp = getattr(config, 'nlp', None)
        self.applied_rules_history = []

    def judge_story(self, story_text: str, card_id: str = None) -> Dict:
        """
        Judge a TAT story using narrative themes + learned rules
        REAL IMPLEMENTATION - actually analyzes story content
        """

        themes = self._extract_themes(story_text)

        relevant_rules = self._find_relevant_rules_with_fallback(
            story_text, themes, card_id
        )

        judgments = self._apply_rules_to_story(story_text, relevant_rules)

        overall_judgment = self._calculate_overall_judgment(
            judgments, themes, story_text
        )

        result = {
            "story_id": hashlib.md5(story_text.encode()).hexdigest()[:8],
            "card_used": card_id or "unknown",
            "inferred_themes": themes,
            "judgments": judgments,
            "overall_judgment": overall_judgment,
            "rule_applications": len(judgments),
            "confidence": round(
                np.mean([j.get("confidence", 0.5) for j in judgments])
                if judgments else 0.6,
                2
            ),
            "timestamp": datetime.now().isoformat(),
            "knowledge_graph_status": "active" if self.knowledge_graph and hasattr(self.knowledge_graph, 'graph') and self.knowledge_graph.graph.number_of_nodes() > 0 else "bootstrap"
        }

        self.applied_rules_history.append(result)
        return result

    def _extract_themes(self, story_text: str) -> List[str]:
        """Extract psychological themes from story"""
        themes = []
        story_lower = story_text.lower()

        common_themes = [
            "achievement", "aggression", "affiliation", "power",
            "rejection", "failure", "success", "conflict",
            "loneliness", "intimacy", "authority", "autonomy",
            "help", "support", "family", "stress", "emotional",
            "anxiety", "depression", "fear", "sadness", "anger"
        ]

        for theme in common_themes:
            if theme in story_lower:
                themes.append(theme)

        return list(set(themes))

    def _find_relevant_rules_with_fallback(self, story_text: str, themes: List[str], card_id: str = None) -> List[Dict]:
        """Find relevant rules with robust fallback mechanism"""

        if not self.knowledge_graph or not hasattr(self.knowledge_graph, 'graph') or self.knowledge_graph.graph.number_of_nodes() == 0:
            return self._get_fallback_rules(story_text, themes, card_id)

        relevant_rules = []

        for theme in themes:
            try:
                rules = self.knowledge_graph.query_graph(
                    f"{theme} psychological meaning", max_results=5
                )
                relevant_rules.extend(rules)
            except Exception:
                pass

        try:
            preview = " ".join(story_text.split()[:40])
            relevant_rules.extend(
                self.knowledge_graph.query_graph(preview, max_results=5)
            )
        except Exception:
            pass

        if card_id:
            try:
                relevant_rules.extend(
                    self.knowledge_graph.query_graph(
                        f"TAT card {card_id}", max_results=3
                    )
                )
            except Exception:
                pass

        if not relevant_rules:
            return self._get_fallback_rules(story_text, themes, card_id)

        return relevant_rules[:15]

    def _get_fallback_rules(self, story_text: str, themes: List[str], card_id: str = None) -> List[Dict]:
        """Get fallback rules when knowledge graph is empty"""
        story_lower = story_text.lower()

        fallback_rules = []

        if any(word in story_lower for word in ["help", "support", "assistance", "guidance"]):
            fallback_rules.append({
                "rule_id": "FALLBACK_HELP_001",
                "rule_text": "When story mentions seeking help or support, consider underlying emotional distress",
                "confidence": 0.85,
                "source": "system_fallback",
                "type": "rule"
            })

        if any(word in story_lower for word in ["sad", "angry", "anxious", "worried", "stressed"]):
            fallback_rules.append({
                "rule_id": "FALLBACK_EMOTION_001",
              "rule_text": "Explicit emotional expression in narrative suggests affect regulation concerns",
                "confidence": 0.8,
                "source": "system_fallback",
                "type": "rule"
            })

        if any(word in story_lower for word in ["family", "parents", "mother", "father", "relationship"]):
            fallback_rules.append({
                "rule_id": "FALLBACK_FAMILY_001",
                "rule_text": "References to family or relationships indicate interpersonal dynamics assessment",
                "confidence": 0.75,
                "source": "system_fallback",
                "type": "rule"
            })

        if any(word in story_lower for word in ["work", "study", "exam", "success", "failure", "achievement"]):
            fallback_rules.append({
                "rule_id": "FALLBACK_ACHIEVE_001",
                "rule_text": "Themes of achievement or performance often relate to self-worth and pressure",
                "confidence": 0.7,
                "source": "system_fallback",
                "type": "rule"
            })

        if not fallback_rules:
            fallback_rules.append({
                "rule_id": "FALLBACK_GENERAL_001",
                "rule_text": "Narrative analysis suggests psychological themes based on story content and structure",
                "confidence": 0.6,
                "source": "system_fallback",
                "type": "rule"
            })

        return fallback_rules

    def _apply_rules_to_story(self, story_text: str, rules: List[Dict]) -> List[Dict]:
        """Apply rules to story and generate judgments"""
        judgments = []
        story_lower = story_text.lower()

        for rule in rules:
            rule_text = rule.get("rule_text", "").lower()

            keywords = self._extract_keywords_from_rule(rule_text)

            matched_keywords = [kw for kw in keywords if kw in story_lower]

            if matched_keywords or len(keywords) == 0:

                judgment = {
                    "rule_id": rule.get("rule_id", "unknown"),
                    "rule_text": rule.get("rule_text", ""),
                    "confidence": rule.get("confidence", 0.7),
                    "source": rule.get("source", "unknown"),
                    "matched_keywords": matched_keywords,
                    "applies": True
                }
                judgments.append(judgment)

        return judgments

    def _extract_keywords_from_rule(self, rule_text: str) -> List[str]:
        """Extract keywords from rule text for matching"""

        keywords = []
        common_words = ["when", "if", "the", "a", "an", "suggests", "indicates", "consider"]

        words = rule_text.lower().split()
        for word in words:
            if len(word) > 3 and word not in common_words:
                keywords.append(word)

        return keywords[:5]

    def _calculate_overall_judgment(self, judgments: List[Dict], themes: List[str], story_text: str) -> Dict:
        """Calculate overall judgment from individual rule applications"""
        if not judgments:
            return {
                "theme": ", ".join(themes) if themes else "General psychological narrative",
                "risk": "low",
                "confidence": 0.5,
                "reasoning": "Limited rule matching - fallback assessment"
            }

        avg_confidence = np.mean([j.get("confidence", 0.5) for j in judgments])

        risk_keywords = ["depression", "anxiety", "stress", "anger", "fear", "rejection", "failure"]
        risk_count = sum(1 for theme in themes if theme in risk_keywords)

        if risk_count >= 3:
            risk_level = "high"
        elif risk_count >= 1:
            risk_level = "moderate"
        else:
            risk_level = "low"

        return {
            "theme": ", ".join(themes[:3]) if themes else "Psychological narrative",
            "risk": risk_level,
            "confidence": round(avg_confidence, 2),
            "reasoning": f"Based on {len(judgments)} rule applications and {len(themes)} identified themes",
            "themes_analyzed": themes
        }
