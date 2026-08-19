"""
Card Metadata System for Gender-Aware Interpretation.
Maps standard and numeric TAT Card IDs to their respective Gender Target tags.
"""
import re

# Gender Tags
TAG_M = "M"
TAG_F = "F"
TAG_B = "B"
TAG_G = "G"
TAG_BM = "BM"
TAG_GF = "GF"
TAG_MF = "MF"
TAG_BG = "BG"
TAG_WHITE = "WHITE"

# Based on User-Provided mapping dictionary:
# "Card 1": "TAT-1 Boy and Violin"
# "Card 2": "TAT-2 Farm Scene"
# "Card 3": "TAT-3BM / 3GF Distress Figure"
# "Card 4": "TAT-4 Couple" -> MF
# "Card 5": "TAT-5 Woman in Doorway" -> F
# "Card 6": "TAT-6BM / 6GF Family Interaction"
# "Card 7": "TAT-7BM / 7GF Parent Child"
# "Card 8": "TAT-8BM / 8GF Conflict Reflection"
# "Card 9": "TAT-9BM / 9GF Social Scene"
# "Card 10": "TAT-10 Embrace" -> MF
# "Card 11": "TAT-11 Nature Fantasy"
# "Card 12": "TAT-12M / 12F / 12BG"
# "Card 13": "TAT-13MF / 13B / 13G"
# "Card 14": "TAT-14 Window Figure"
# "Card 15": "TAT-15 Graveyard"
# "Card 16": "TAT-16 Blank Card"
# "Card 17": "TAT-17BM / 17GF"
# "Card 18": "TAT-18BM / 18GF"
# "Card 19": "TAT-19 Ambiguous Scene"
# "Card 20": "TAT-20 Night Figure"

CARD_TARGET_MAP = {
    1: [TAG_B], # Traditionally Boy, acts as B
    2: [TAG_WHITE],
    3: [TAG_BM, TAG_GF],
    4: [TAG_MF],
    5: [TAG_F],
    6: [TAG_BM, TAG_GF],
    7: [TAG_BM, TAG_GF],
    8: [TAG_BM, TAG_GF],
    9: [TAG_BM, TAG_GF],
    10: [TAG_MF],
    11: [TAG_WHITE],
    12: [TAG_M, TAG_F, TAG_BG],
    13: [TAG_MF, TAG_B, TAG_G],
    14: [TAG_WHITE],
    15: [TAG_WHITE],
    16: [TAG_WHITE],
    17: [TAG_BM, TAG_GF],
    18: [TAG_BM, TAG_GF],
    19: [TAG_WHITE],
    20: [TAG_WHITE]
}

def get_card_target_tags(card_id: str) -> list:
    """
    Extract the numeric portion of the card ID and return its assigned Gender Tags.
    Defaults to [TAG_WHITE] if not found or unparseable.
    """
    if not card_id:
        return [TAG_WHITE]
    
    # Try to extract the number from strings like "Card 1", "Card_3", "3BM"
    match = re.search(r'\d+', str(card_id))
    if match:
        card_num = int(match.group())
        return CARD_TARGET_MAP.get(card_num, [TAG_WHITE])
    
    return [TAG_WHITE]
