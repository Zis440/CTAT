"""
Advanced Cognitive Performance Assessment (ACPA) Norms — DEPRECATED STUB

All real scoring tables have been consolidated into:
  app/utils/games/scoring_tables.py

This file exists only for backward compatibility. Do not add data here.
Use scoring_tables.raw_to_scaled() and scoring_tables.compute_processing_speed_index() instead.
"""

from app.assessments.screening.level1.utils.games.scoring_tables import (
    raw_to_scaled,
    compute_processing_speed_index,
    score_cognitive_game,
    get_age_group,
)
