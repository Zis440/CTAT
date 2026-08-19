"""
Needs-Presses Scorer
--------------------
Adapter wrapping MurrayInferenceEngine to provide the score interface
expected by ClinicalScoringIntegration and ClinicalReportGenerator.

This file was missing (identified in audit v4.0). It is now a thin
bridge so ClinicalScoringIntegration can import and call it safely.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional

@dataclass
class NeedsPressesScore:
    """Structured Murray Needs-Presses scoring result."""
    dominant_need: str = "Unknown"
    dominant_press: str = "Unknown"
    needs: List[Dict[str, Any]] = field(default_factory=list)
    presses: List[Dict[str, Any]] = field(default_factory=list)
    outcome: Dict[str, Any] = field(default_factory=lambda: {
        "outcome_type": "unknown",
        "confidence": 0.0
    })
    need_press_conflicts: List[Dict[str, Any]] = field(default_factory=list)
    coping_mechanisms: List[str] = field(default_factory=list)
    confidence: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dominant_need": self.dominant_need,
            "dominant_press": self.dominant_press,
            "needs": self.needs,
            "presses": self.presses,
            "outcome": self.outcome,
            "need_press_conflicts": self.need_press_conflicts,
            "coping_mechanisms": self.coping_mechanisms,
            "confidence": self.confidence,
        }

class NeedsPressesScorer:
    """
    Compute Murray Needs-Presses scores for a TAT story.
    Wraps the full MurrayInferenceEngine if available; falls back to
    lightweight keyword heuristics when engine is not initialised.
    """

    def __init__(self, murray_engine=None, config=None):
        """
        Args:
            murray_engine: Optional pre-initialised MurrayInferenceEngine instance.
                           If None, the scorer attempts to instantiate one using config.
            config:        Optional SystemConfig for engine instantiation.
        """
        self._engine = murray_engine

        if self._engine is None and config is not None:
            try:
                from app.assessments.tat.engines.inference.murray_inference_engine import MurrayInferenceEngine
                self._engine = MurrayInferenceEngine(config)
            except Exception as e:
                print(f"⚠ NeedsPressesScorer: Could not initialize MurrayInferenceEngine: {e}")
                self._engine = None

    def score_story(self, story_text: str) -> NeedsPressesScore:
        """
        Score a TAT story using Murray's Needs-Presses framework.

        Returns:
            NeedsPressesScore — structured result with needs, presses,
            dominant values, conflicts, and confidence.
        """
        if story_text is None:
            story_text = ""

        if self._engine is not None:
            try:
                return self._score_via_engine(story_text)
            except Exception as e:
                print(f"⚠ NeedsPressesScorer: Engine scoring failed, using heuristics: {e}")

        return self._score_heuristic(story_text)

    def _score_via_engine(self, story_text: str) -> NeedsPressesScore:
        """Delegate to full MurrayInferenceEngine."""
        result = self._engine.infer(story_text)

        needs_raw = result.get("needs", [])
        presses_raw = result.get("presses", [])

        needs = []
        for item in needs_raw:
            if isinstance(item, (list, tuple)) and len(item) == 2:
                needs.append({"need_name": item[0], "intensity": item[1]})
            elif isinstance(item, dict):
                needs.append(item)

        presses = []
        for item in presses_raw:
            if isinstance(item, (list, tuple)) and len(item) == 2:
                presses.append({"press_name": item[0], "intensity": item[1]})
            elif isinstance(item, dict):
                presses.append(item)

        dominant_need = ""
        if needs:
            dominant_need = max(needs, key=lambda x: x.get("intensity", 0)).get("need_name", "")

        dominant_press = ""
        if presses:
            dominant_press = max(presses, key=lambda x: x.get("intensity", 0)).get("press_name", "")

        conflicts = result.get("conflicts", [])

        np_conflicts = []
        for c in conflicts:
            if isinstance(c, dict):
                np_conflicts.append({
                    "need": c.get("need", c.get("need_a", "")),
                    "press": c.get("press", c.get("need_b", "")),
                    "conflict_intensity": c.get("intensity", c.get("conflict_intensity", 1.0)),
                })

        confidence = result.get("confidence", min(1.0, len(story_text.split()) / 50))

        return NeedsPressesScore(
            dominant_need=dominant_need,
            dominant_press=dominant_press,
            needs=needs,
            presses=presses,
            outcome=result.get("outcome", {"outcome_type": "unknown", "confidence": 0.0}),
            need_press_conflicts=np_conflicts,
            confidence=confidence,
        )

    _NEED_KEYWORDS = {
        "nAchievement": ["achieve", "success", "excel", "accomplish", "goal", "win", "compete"],
        "nAffiliation": ["friend", "love", "belong", "together", "support", "help", "care"],
        "nDominance": ["control", "lead", "command", "boss", "authority", "power", "direct"],
        "nAutonomy": ["free", "independent", "alone", "self", "escape", "liberty", "own"],
        "nAggression": ["anger", "fight", "attack", "hostile", "revenge", "destroy", "punish"],
        "nNurturance": ["care", "nurture", "protect", "comfort", "soothe", "parent", "heal"],
        "nInfavoidance": ["shame", "embarrass", "humiliate", "fail", "avoid", "hide", "retreat"],
        "nHarm-avoidance": ["fear", "safe", "danger", "threat", "escape", "risk", "caution"],
    }

    _PRESS_KEYWORDS = {
        "pAggression": ["abused", "attacked", "threatened", "beaten", "harmed", "bullied"],
        "pAffiliation": ["supported", "loved", "helped", "befriended", "cared", "welcomed"],
        "pDominance": ["controlled", "ordered", "commanded", "forced", "pressured", "directed"],
        "pLoss": ["lost", "died", "left", "abandoned", "separated", "bereaved"],
        "pLack": ["poor", "needy", "deprived", "lacking", "without", "shortage"],
    }

    def _score_heuristic(self, story_text: str) -> NeedsPressesScore:
        """Keyword-based heuristic scoring when engine is unavailable."""
        words = story_text.lower().split()

        need_scores: Dict[str, float] = {}
        for need, kws in self._NEED_KEYWORDS.items():
            count = sum(1 for w in words if any(kw in w for kw in kws))
            if count:
                need_scores[need] = min(5.0, count * 1.0)

        press_scores: Dict[str, float] = {}
        for press, kws in self._PRESS_KEYWORDS.items():
            count = sum(1 for w in words if any(kw in w for kw in kws))
            if count:
                press_scores[press] = min(5.0, count * 1.0)

        needs = [{"need_name": k, "intensity": v} for k, v in sorted(need_scores.items(), key=lambda x: -x[1])]
        presses = [{"press_name": k, "intensity": v} for k, v in sorted(press_scores.items(), key=lambda x: -x[1])]

        dominant_need = needs[0]["need_name"] if needs else "Unknown"
        dominant_press = presses[0]["press_name"] if presses else "Unknown"

        word_count = len(words)
        confidence = min(0.7, word_count / 80)

        return NeedsPressesScore(
            dominant_need=dominant_need,
            dominant_press=dominant_press,
            needs=needs,
            presses=presses,
            outcome={"outcome_type": "unknown", "confidence": confidence},
            need_press_conflicts=[],
            confidence=confidence,
        )
