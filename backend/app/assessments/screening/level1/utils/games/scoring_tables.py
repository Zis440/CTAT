"""
Advanced Cognitive Performance Assessment (ACPA) Scoring Tables — Raw Score → Scaled Score conversion by age group,
and Composite Index (IVP/Processing Speed Index) from sum of scaled scores.

Source: Advanced Cognitive Performance Assessment (ACPA) Spanish Edition, Tables A.1 and A.5.
Translated and integrated for the Employee Mental Health Screening Tool.

Age groups covered:
  19       → uses 20_24 norms (nearest available)
  20–24    → 20_24
  25–29    → 25_29
  30–34    → 30_34
  35–44    → 35_44
  45–60    → uses 35_44 norms (nearest available)
"""

from typing import Dict, Tuple, Optional

def get_age_group(age: int) -> str:
    """Map a user's age to the correct norm table key."""
    if age <= 24:
        return "20_24"
    elif age <= 29:
        return "25_29"
    elif age <= 34:
        return "30_34"
    else:
        return "35_44"

def _build_lookup(ranges: list) -> list:
    """Return sorted list of (upper_bound_inclusive, scaled_score)."""
    return sorted(ranges, key=lambda x: x[0])

CC_TABLES: Dict[str, list] = {
    "20_24": _build_lookup([
        (10, 1), (14, 2), (18, 3), (23, 4), (27, 5),
        (32, 6), (36, 7), (41, 8), (45, 9), (49, 10),
        (53, 11), (57, 12), (60, 13), (63, 14), (64, 15),
        (65, 16), (66, 19),
    ]),
    "25_29": _build_lookup([
        (9, 1), (12, 2), (17, 3), (20, 4), (24, 5),
        (29, 6), (33, 7), (37, 8), (41, 9), (45, 10),
        (49, 11), (53, 12), (57, 13), (60, 14), (62, 15),
        (64, 16), (65, 17), (66, 19),
    ]),
    "30_34": _build_lookup([
        (6, 1), (9, 2), (13, 3), (17, 4), (21, 5),
        (25, 6), (29, 7), (34, 8), (38, 9), (41, 10),
        (45, 11), (49, 12), (53, 13), (56, 14), (60, 15),
        (63, 16), (64, 17), (65, 18), (66, 19),
    ]),
    "35_44": _build_lookup([
        (4, 1), (8, 2), (11, 3), (19, 4), (23, 5),
        (27, 6), (31, 7), (35, 8), (39, 9), (43, 10),
        (46, 11), (50, 12), (54, 13), (58, 14), (62, 15),
        (64, 16), (65, 17), (66, 19),
    ]),
}

BS_TABLES: Dict[str, list] = {
    "20_24": _build_lookup([
        (3, 1), (8, 2), (12, 3), (15, 4), (17, 5),
        (20, 6), (23, 7), (26, 8), (29, 9), (31, 10),
        (34, 11), (37, 12), (39, 13), (43, 14), (45, 15),
        (47, 16), (50, 17), (52, 18), (60, 19),
    ]),
    "25_29": _build_lookup([
        (7, 1), (12, 2), (15, 3), (18, 4), (20, 5),
        (23, 6), (28, 7), (31, 8), (34, 9), (36, 10),
        (39, 11), (42, 12), (44, 13), (46, 14), (49, 15),
        (51, 16), (53, 17), (55, 18), (60, 19),
    ]),
    "30_34": _build_lookup([
        (7, 1), (12, 2), (14, 3), (17, 4), (20, 5),
        (23, 6), (26, 7), (28, 8), (31, 9), (33, 10),
        (36, 11), (39, 12), (42, 13), (44, 14), (46, 15),
        (48, 16), (50, 17), (52, 18), (60, 19),
    ]),
    "35_44": _build_lookup([
        (6, 1), (9, 2), (12, 3), (14, 4), (17, 5),
        (20, 6), (24, 7), (27, 8), (30, 9), (32, 10),
        (34, 11), (37, 12), (40, 13), (43, 14), (46, 15),
        (48, 16), (50, 17), (52, 18), (60, 19),
    ]),
}

SLN_TABLES: Dict[str, list] = {
    "20_24": _build_lookup([
        (6, 1), (7, 2), (8, 3), (9, 4), (10, 5),
        (11, 6), (12, 7), (13, 8), (14, 9), (15, 10),
        (16, 11), (17, 12), (18, 13), (19, 14), (20, 15),
        (21, 16), (22, 17), (24, 18), (30, 19),
    ]),
    "25_29": _build_lookup([
        (6, 1), (7, 2), (8, 3), (9, 4), (10, 5),
        (11, 6), (13, 7), (14, 8), (15, 9), (17, 10),
        (18, 11), (19, 12), (20, 13), (21, 14), (22, 15),
        (23, 16), (24, 17), (26, 18), (30, 19),
    ]),
    "30_34": _build_lookup([
        (6, 1), (7, 2), (8, 3), (9, 4), (11, 5),
        (12, 6), (13, 7), (15, 8), (16, 9), (17, 10),
        (18, 11), (19, 12), (20, 13), (21, 14), (22, 15),
        (23, 16), (25, 17), (27, 18), (30, 19),
    ]),
    "35_44": _build_lookup([
        (4, 1), (6, 2), (8, 3), (9, 4), (11, 5),
        (12, 6), (13, 7), (15, 8), (16, 9), (18, 10),
        (19, 11), (20, 12), (21, 13), (22, 14), (24, 15),
        (25, 16), (27, 17), (28, 18), (30, 19),
    ]),
}

RD_TABLES: Dict[str, list] = {
    "20_24": _build_lookup([
        (11, 1), (12, 2), (13, 3), (14, 4), (16, 5),
        (17, 6), (19, 7), (20, 8), (22, 9), (24, 10),
        (26, 11), (28, 12), (30, 13), (32, 14), (34, 15),
        (36, 16), (39, 17), (40, 18), (48, 19),
    ]),
    "25_29": _build_lookup([
        (10, 1), (11, 2), (13, 3), (15, 4), (17, 5),
        (18, 6), (20, 7), (22, 8), (24, 9), (26, 10),
        (28, 11), (29, 12), (31, 13), (33, 14), (35, 15),
        (37, 16), (39, 17), (41, 18), (48, 19),
    ]),
    "30_34": _build_lookup([
        (9, 1), (11, 2), (13, 3), (14, 4), (16, 5),
        (18, 6), (19, 7), (21, 8), (23, 9), (25, 10),
        (27, 11), (29, 12), (31, 13), (33, 14), (35, 15),
        (37, 16), (39, 17), (41, 18), (48, 19),
    ]),
    "35_44": _build_lookup([
        (9, 1), (10, 2), (13, 3), (14, 4), (16, 5),
        (17, 6), (19, 7), (21, 8), (23, 9), (25, 10),
        (27, 11), (29, 12), (31, 13), (33, 14), (34, 15),
        (36, 16), (38, 17), (40, 18), (48, 19),
    ]),
}

IVP_TABLE: Dict[int, dict] = {
    2: {"ivp": 50, "percentile": 0.1, "ci_90": (46, 67), "ci_95": (46, 69)},
    3: {"ivp": 51, "percentile": 0.1, "ci_90": (49, 68), "ci_95": (47, 69)},
    4: {"ivp": 55, "percentile": 0.1, "ci_90": (52, 71), "ci_95": (50, 73)},
    5: {"ivp": 59, "percentile": 0.3, "ci_90": (55, 74), "ci_95": (54, 76)},
    6: {"ivp": 62, "percentile": 0.6, "ci_90": (58, 77), "ci_95": (56, 79)},
    7: {"ivp": 65, "percentile": 1, "ci_90": (61, 80), "ci_95": (59, 81)},
    8: {"ivp": 68, "percentile": 2, "ci_90": (63, 82), "ci_95": (61, 84)},
    9: {"ivp": 71, "percentile": 3, "ci_90": (66, 85), "ci_95": (64, 86)},
    10: {"ivp": 74, "percentile": 4, "ci_90": (68, 87), "ci_95": (67, 89)},
    11: {"ivp": 77, "percentile": 6, "ci_90": (71, 90), "ci_95": (69, 92)},
    12: {"ivp": 80, "percentile": 9, "ci_90": (73, 92), "ci_95": (72, 94)},
    13: {"ivp": 83, "percentile": 12, "ci_90": (76, 95), "ci_95": (74, 97)},
    14: {"ivp": 85, "percentile": 17, "ci_90": (78, 97), "ci_95": (76, 98)},
    15: {"ivp": 88, "percentile": 22, "ci_90": (80, 99), "ci_95": (79, 101)},
    16: {"ivp": 91, "percentile": 27, "ci_90": (83, 102), "ci_95": (81, 104)},
    17: {"ivp": 94, "percentile": 34, "ci_90": (85, 104), "ci_95": (84, 106)},
    18: {"ivp": 96, "percentile": 40, "ci_90": (87, 106), "ci_95": (85, 108)},
    19: {"ivp": 99, "percentile": 47, "ci_90": (90, 109), "ci_95": (88, 111)},
    20: {"ivp": 102, "percentile": 54, "ci_90": (92, 111), "ci_95": (90, 113)},
    21: {"ivp": 104, "percentile": 61, "ci_90": (94, 113), "ci_95": (92, 115)},
    22: {"ivp": 107, "percentile": 68, "ci_90": (97, 115), "ci_95": (95, 117)},
    23: {"ivp": 110, "percentile": 74, "ci_90": (99, 118), "ci_95": (97, 120)},
    24: {"ivp": 112, "percentile": 80, "ci_90": (101, 120), "ci_95": (99, 121)},
    25: {"ivp": 115, "percentile": 84, "ci_90": (103, 122), "ci_95": (102, 124)},
    26: {"ivp": 118, "percentile": 88, "ci_90": (106, 125), "ci_95": (104, 127)},
    27: {"ivp": 121, "percentile": 92, "ci_90": (109, 127), "ci_95": (107, 129)},
    28: {"ivp": 124, "percentile": 94, "ci_90": (111, 130), "ci_95": (109, 132)},
    29: {"ivp": 127, "percentile": 96, "ci_90": (114, 132), "ci_95": (112, 134)},
    30: {"ivp": 130, "percentile": 98, "ci_90": (116, 135), "ci_95": (114, 137)},
    31: {"ivp": 133, "percentile": 99, "ci_90": (119, 138), "ci_95": (117, 139)},
    32: {"ivp": 136, "percentile": 99.1, "ci_90": (121, 140), "ci_95": (120, 142)},
    33: {"ivp": 139, "percentile": 99.5, "ci_90": (124, 143), "ci_95": (122, 145)},
    34: {"ivp": 142, "percentile": 99.7, "ci_90": (126, 145), "ci_95": (125, 147)},
    35: {"ivp": 146, "percentile": 99.9, "ci_90": (130, 149), "ci_95": (128, 151)},
    36: {"ivp": 149, "percentile": 99.9, "ci_90": (132, 151), "ci_95": (131, 153)},
    37: {"ivp": 150, "percentile": 99.9, "ci_90": (133, 152), "ci_95": (131, 154)},
    38: {"ivp": 150, "percentile": 99.9, "ci_90": (133, 152), "ci_95": (131, 154)},
}

def raw_to_scaled(raw_score: int, subtest: str, age: int) -> int:
    """
    Convert a raw score to a scaled score (1–19) for a given subtest and age.

    Args:
        raw_score: The raw score from the game/task
        subtest: One of 'CC', 'BS', 'SLN', 'RD'
        age: User's age in years

    Returns:
        Scaled score (1–19). Returns 1 if raw_score is 0 or below minimum.
    """
    tables = {"CC": CC_TABLES, "BS": BS_TABLES, "SLN": SLN_TABLES, "RD": RD_TABLES}
    table = tables.get(subtest)
    if not table:
        raise ValueError(f"Unknown subtest: {subtest}")

    age_group = get_age_group(age)
    lookup = table.get(age_group)
    if not lookup:
        raise ValueError(f"No norms for age group: {age_group}")

    if raw_score <= 0:
        return 1

    for upper_bound, scaled in lookup:
        if raw_score <= upper_bound:
            return scaled

    return lookup[-1][1]

def compute_processing_speed_index(cc_scaled: int, bs_scaled: int) -> dict:
    """
    Compute the Processing Speed Index (IVP) composite from the sum of
    CC and BS scaled scores.

    Returns dict with: ivp, percentile, ci_90, ci_95, classification
    """
    sum_scaled = cc_scaled + bs_scaled
    sum_scaled = max(2, min(38, sum_scaled))

    entry = IVP_TABLE[sum_scaled]
    ivp = entry["ivp"]

    if ivp <= 69:
        classification = "Extremely Low"
    elif ivp <= 79:
        classification = "Borderline"
    elif ivp <= 89:
        classification = "Low Average"
    elif ivp <= 109:
        classification = "Average"
    elif ivp <= 119:
        classification = "High Average"
    elif ivp <= 129:
        classification = "Superior"
    else:
        classification = "Very Superior"

    return {
        "sum_scaled_scores": sum_scaled,
        "ivp": ivp,
        "percentile": entry["percentile"],
        "ci_90": entry["ci_90"],
        "ci_95": entry["ci_95"],
        "classification": classification,
    }

def score_cognitive_game(game_type: str, raw_score: float, age: int,
                         movement_count: int, completion_time: float) -> dict:
    """
    Full scoring pipeline for a single cognitive game.

    Args:
        game_type: 'symbol', 'code_number', 'pattern_memory', 'tat'
        raw_score: The raw score from the game
        age: User's age
        movement_count: Number of user interactions
        completion_time: Seconds taken

    Returns:
        Complete scoring result with raw, scaled, efficiency metrics
    """
    subtest_map = {
        "symbol": "BS",
        "code_number": "CC",
        "pattern_memory": "SLN",
    }

    result = {
        "game_type": game_type,
        "raw_score": raw_score,
        "movement_count": movement_count,
        "completion_time_seconds": completion_time,
    }

    subtest = subtest_map.get(game_type)
    if subtest:
        scaled = raw_to_scaled(int(raw_score), subtest, age)
        result["scaled_score"] = scaled
        result["subtest"] = subtest

        time_factor = max(0.5, 1.0 - (completion_time / 240))
        movement_penalty = max(0.7, 1.0 - (movement_count / 200) * 0.3)
        result["cognitive_efficiency_index"] = round(scaled * time_factor * movement_penalty, 2)
    else:

        result["scaled_score"] = None
        result["qualitative_score"] = raw_score

        result["cognitive_efficiency_index"] = round(raw_score * (1.0 - (completion_time / 240) * 0.2), 2)

    return result
