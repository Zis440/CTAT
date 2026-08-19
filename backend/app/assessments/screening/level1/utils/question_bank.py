# Rephrased Questions Bank
# All items rephrased to avoid copyright while keeping exact response scales and scoring logic.

QUESTIONS = {
    "pss": {
        "name": "Perceived Stress Assessment",
        "scale_labels": ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"],
        "scale_range": [0, 4],
        "reverse_items": ["pss_4", "pss_5", "pss_7", "pss_8"],
        "items": [
            {"id": "pss_1", "text": "Over the past 30 days, how frequently have you been disturbed by an unexpected event?"},
            {"id": "pss_2", "text": "Over the past 30 days, how often have you felt powerless over significant aspects of your life?"},
            {"id": "pss_3", "text": "Over the past 30 days, how frequently have you experienced feelings of tension and anxiety?"},
            {"id": "pss_4", "text": "Over the past 30 days, how often have you felt assured in your capacity to resolve personal issues?"},
            {"id": "pss_5", "text": "Over the past 30 days, how frequently have you felt that events were progressing favorably for you?"},
            {"id": "pss_6", "text": "Over the past 30 days, how often have you felt overwhelmed by the number of tasks you had to accomplish?"},
            {"id": "pss_7", "text": "Over the past 30 days, how frequently have you been able to manage frustrating situations effectively?"},
            {"id": "pss_8", "text": "Over the past 30 days, how often have you felt you were successfully handling your responsibilities?"},
            {"id": "pss_9", "text": "Over the past 30 days, how frequently have you become angry due to situations beyond your influence?"},
            {"id": "pss_10", "text": "Over the past 30 days, how often have you felt that challenges were accumulating to an insurmountable level?"},
        ]
    },
    "wemwbs": {
        "name": "Wellbeing Assessment",
        "scale_labels": ["None of the time", "Rarely", "Some of the time", "Often", "All of the time"],
        "scale_range": [1, 5],
        "reverse_items": [],
        "items": [
            {"id": "wemwbs_1", "text": "I have maintained a positive outlook regarding what lies ahead."},
            {"id": "wemwbs_2", "text": "I have experienced a sense of purpose and utility."},
            {"id": "wemwbs_3", "text": "I have felt calm and at ease."},
            {"id": "wemwbs_4", "text": "I have maintained an active interest in the people around me."},
            {"id": "wemwbs_5", "text": "I have possessed abundant physical and mental vitality."},
            {"id": "wemwbs_6", "text": "I have been effectively navigating and resolving challenges."},
            {"id": "wemwbs_7", "text": "I have experienced clarity in my thoughts and reasoning."},
            {"id": "wemwbs_8", "text": "I have maintained a positive self-perception."},
            {"id": "wemwbs_9", "text": "I have felt a strong sense of connection to others."},
            {"id": "wemwbs_10", "text": "I have experienced feelings of self-assurance."},
            {"id": "wemwbs_11", "text": "I have felt capable of making independent decisions."},
            {"id": "wemwbs_12", "text": "I have felt valued and cared for by others."},
            {"id": "wemwbs_13", "text": "I have found myself curious and engaged by novel experiences."},
            {"id": "wemwbs_14", "text": "I have maintained a bright and pleasant mood."},
        ]
    },
    "mbi": {
        "name": "Burnout Assessment",
        "scale_labels": ["Never", "A few times a year", "Once a month", "A few times a month", "Once a week", "A few times a week", "Every day"],
        "scale_range": [0, 6],
        "sections": {
            "A": {
                "name": "Emotional Exhaustion",
                "item_count": 7,
                "max_score": 42,
                "items": [
                    {"id": "mbi_a_1", "text": "My job leaves me feeling emotionally exhausted."},
                    {"id": "mbi_a_2", "text": "Interacting with others throughout the workday demands significant energy from me."},
                    {"id": "mbi_a_3", "text": "I experience my job as actively deteriorating my well-being."},
                    {"id": "mbi_a_4", "text": "I frequently experience feelings of exasperation regarding my job."},
                    {"id": "mbi_a_5", "text": "I believe I am putting excessive effort into my professional duties."},
                    {"id": "mbi_a_6", "text": "Direct interpersonal interactions at work cause me substantial stress."},
                    {"id": "mbi_a_7", "text": "I feel I have reached the limit of my capacity to cope."},
                ]
            }
        }
    },
    "wrqol": {
        "name": "Quality of working life",
        "scale_labels": ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
        "scale_range": [1, 5],
        "reverse_items": ["wrqol_5"],
        "items": [
            {"id": "wrqol_1", "text": "My work objectives and goals are clearly defined."},
            {"id": "wrqol_2", "text": "I am able to utilize my skills and talents in my current role."},
            {"id": "wrqol_3", "text": "I currently experience a good sense of physical and mental wellness."},
            {"id": "wrqol_4", "text": "My manager recognizes and appreciates my good performance."},
            {"id": "wrqol_5", "text": "Lately, I have experienced feelings of sadness or low mood."},
            {"id": "wrqol_6", "text": "Overall, I am content with how my life is going."},
            {"id": "wrqol_7", "text": "My workplace supports and encourages my professional development."},
            {"id": "wrqol_8", "text": "My life circumstances are largely aligned with my ideals."},
            {"id": "wrqol_9", "text": "Most situations in my life tend to resolve positively."},
            {"id": "wrqol_10", "text": "I am pleased with the potential for career growth at my organization."},
            {"id": "wrqol_11", "text": "The training provided for my current responsibilities meets my expectations."},
            {"id": "wrqol_12", "text": "Taking everything into account, I have felt fairly cheerful lately."},
        ]
    },
}


def get_all_questions():
    """Return the full question bank. Frontend uses this to render questionnaires."""
    return QUESTIONS
