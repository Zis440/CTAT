"""
Confidence Calibrator — Learn Accuracy from Historical Feedback
----------------------------------------------------------------
Adjusts confidence scores based on how often the system's predictions
match clinician corrections. If the system has been historically wrong
40% of the time for defense inferences, the confidence multiplier
for defense_inference becomes 0.6.

Usage:
    calibrator = ConfidenceCalibrator(feedback_store)
    factor = calibrator.get_calibration_factor("need_correction")
    adjusted_confidence = original_confidence * factor
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

class ConfidenceCalibrator:
    """Adjusts confidence based on historical prediction accuracy."""

    MIN_RECORDS_FOR_CALIBRATION = 15

    def __init__(self, feedback_store):
        self.feedback = feedback_store
        self._cache = {}

    def get_calibration_factor(self, feedback_type: str) -> float:
        """
        Returns a multiplier (0–1) to adjust confidence scores.

        If the system's predictions have historically matched clinician
        corrections 80% of the time, the factor is 0.8.

        Returns 1.0 if insufficient data exists.
        """
        if feedback_type in self._cache:
            return self._cache[feedback_type]

        records = self.feedback.get_feedback(feedback_type=feedback_type)
        if len(records) < self.MIN_RECORDS_FOR_CALIBRATION:
            return 1.0

        agreements = 0
        total = 0
        for r in records:
            original = r.get("original", {})
            corrected = r.get("corrected", {})
            if not original or not corrected:
                continue
            total += 1

            if feedback_type in ("need_correction", "defense_correction"):

                orig_val = original.get("need") or original.get("defense")
                corr_val = corrected.get("need") or corrected.get("defense")
                if orig_val and corr_val and orig_val == corr_val:
                    agreements += 1
            elif feedback_type == "score_override":

                orig_score = original.get("score", 0)
                corr_score = corrected.get("score", 0)
                if abs(orig_score - corr_score) < 10:
                    agreements += 1
            else:

                if original == corrected:
                    agreements += 1

        if total == 0:
            return 1.0

        factor = round(agreements / total, 3)
        self._cache[feedback_type] = factor

        logger.info(
            f"ConfidenceCalibrator [{feedback_type}]: "
            f"{agreements}/{total} agreements → factor={factor}"
        )
        return factor

    def clear_cache(self):
        """Clear cached factors (call after new feedback is recorded)."""
        self._cache.clear()
