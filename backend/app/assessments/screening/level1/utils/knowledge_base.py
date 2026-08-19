"""
Centralized Psychological Knowledge Base
Defines the Ground Truth annotations and psychometric targets for system evaluations.
"""

NPIA_KNOWLEDGE_GRAPH = {
    "card_1": {
        "title": "The Confrontation",
        "visual_elements": [
            "Two people facing each other",
            "Dimly lit room",
            "One person holding a folder or document tightly",
            "One person with crossed arms",
            "Window showing a stormy sky"
        ],
        "psychological_targets": [
            "Interpersonal Conflict",
            "Power Dynamics",
            "Defensiveness",
            "Response to Bad News or Accusations"
        ],
        "ambiguities": [
            "The relationship between the two individuals (personal vs professional)",
            "The contents of the folder",
            "Who is the aggressor and who is defending"
        ]
    },
    "card_2": {
        "title": "The Boardroom",
        "visual_elements": [
            "Solitary figure sitting at a large table",
            "Empty chairs surrounding the table",
            "Papers scattered across the surface",
            "Clock showing late evening"
        ],
        "psychological_targets": [
            "Isolation vs Dedication",
            "Workaholism",
            "Overwhelm and Burnout",
            "Abandonment in a team setting"
        ],
        "ambiguities": [
            "Why the other chairs are empty (did they leave, or were they never there?)",
            "Is the person stressed, defeated, or intensely focused?"
        ]
    },
    "card_3": {
        "title": "The Crossroads",
        "visual_elements": [
            "Person standing at a fork in the road",
            "One path leading uphill through fog",
            "One path leading to a sunlit valley",
            "Person holding a torn or damaged map"
        ],
        "psychological_targets": [
            "Decision Making under Uncertainty",
            "Future Orientation",
            "Risk vs Reward Assessment",
            "Hopefulness"
        ],
        "ambiguities": [
            "Which path the person will ultimately choose",
            "The emotional state of the person (fearful vs adventurous)",
            "Why the map is torn"
        ]
    },
    "card_4": {
        "title": "The Crying Figure",
        "visual_elements": [
            "Figure with face obscured, appearing to cry or hide",
            "Dark and moody environment",
            "Slumped posture"
        ],
        "psychological_targets": [
            "Resilience",
            "Emotional Tone (Depression vs Catharsis)",
            "Self-Image",
            "Reaction to failure or trauma"
        ],
        "ambiguities": [
            "The reason for the distress",
            "Is the person crying out of sadness, relief, or exhaustion?",
            "Is anyone else present just out of frame?"
        ]
    },
    "card_5": {
        "title": "The Operating Room",
        "visual_elements": [
            "Operating room setting",
            "Medical professionals gathered around a table",
            "Bright surgical lights",
            "Masked faces"
        ],
        "psychological_targets": [
            "Anxiety and Fear",
            "Dependency on authority/experts",
            "Themes of mortality or high stakes",
            "Interpersonal Trust (trusting the professionals)"
        ],
        "ambiguities": [
            "Who is on the table",
            "The outcome of the surgery",
            "The emotional state of the medical professionals behind the masks"
        ]
    },
    "card_6": {
        "title": "The Woman at the Door",
        "visual_elements": [
            "Woman standing by a partially open door",
            "Looking out or looking back",
            "Ambiguous lighting (could be dawn or dusk)"
        ],
        "psychological_targets": [
            "Themes of Departure vs Arrival",
            "Dependency vs Independence",
            "Curiosity vs Fear of the outside",
            "Achievement Motivation (seeking new opportunities)"
        ],
        "ambiguities": [
            "Is she leaving or entering?",
            "Who or what is she looking at?",
            "Is she hesitating, hiding, or exploring?"
        ]
    }
}
