import random
import logging

logger = logging.getLogger(__name__)

FALLBACK_INSIGHTS = [
    {
        "message": "Taking time to reflect on your mental health is a sign of strength, not weakness.",
        "category": "encouragement"
    },
    {
        "message": "Research shows that people who regularly assess their stress levels are 40% better at managing it.",
        "category": "fact"
    },
    {
        "message": "Remember: there are no right or wrong answers here. Your honest response helps us help you.",
        "category": "guidance"
    },
    {
        "message": "Burnout doesn't happen overnight — it builds up slowly. Recognizing the early signs is the most powerful step.",
        "category": "insight"
    },
    {
        "message": "Your cognitive patterns reveal how you process pressure. These games measure resilience, not intelligence.",
        "category": "context"
    },
    {
        "message": "Studies show that even brief mindfulness exercises can reduce cortisol levels by up to 25%.",
        "category": "fact"
    },
    {
        "message": "You're doing great. Each section you complete brings you closer to a personalized wellness roadmap.",
        "category": "encouragement"
    },
    {
        "message": "Work-life balance isn't about equal time — it's about feeling fulfilled in both domains.",
        "category": "insight"
    },
    {
        "message": "The speed at which you respond can tell us about your cognitive load — take your time if you need it.",
        "category": "context"
    },
    {
        "message": "Emotional exhaustion is the strongest predictor of burnout. Knowing where you stand is the first step to recovery.",
        "category": "insight"
    },
    {
        "message": "Your wellbeing score isn't a judgement — it's a compass pointing toward areas where support can make the biggest difference.",
        "category": "guidance"
    },
    {
        "message": "People who actively engage with their assessment results show 60% more improvement over 6 months.",
        "category": "fact"
    },
    {
        "message": "Anxiety often disguises itself as irritability or difficulty concentrating. These assessments help uncover the root cause.",
        "category": "insight"
    },
    {
        "message": "Almost there! Completing this assessment is an investment in your long-term mental fitness.",
        "category": "encouragement"
    },
    {
        "message": "Cognitive flexibility — the ability to switch between tasks — is a key indicator of mental agility.",
        "category": "context"
    },
    {
        "message": "Your responses are confidential and used solely to generate your personal development profile.",
        "category": "guidance"
    },
]

_shown_indices = set()

def _reset_pool():
    global _shown_indices
    _shown_indices = set()

async def get_llm_insight(context: str = "general") -> dict:
    """
    Try to generate an insight from Ollama. If Ollama is unavailable,
    fall back to the curated insight pool.

    Args:
        context: A hint about the current assessment phase, e.g.
                 "stress_questionnaire", "burnout_questionnaire", "cognitive_game", "general"
    """

    try:
        import ollama as ollama_lib
        import os
        ollama_host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
        client = ollama_lib.AsyncClient(host=ollama_host)
        prompt = _build_prompt(context)
        response = await client.chat(
            model="llama3",
            messages=[{"role": "user", "content": prompt}],
        )
        message = response["message"]["content"].strip()

        if 20 < len(message) < 500:
            return {"message": message, "category": "llm", "source": "ollama"}
    except Exception as e:
        logger.debug(f"Ollama unavailable, using fallback pool: {e}")

    return _get_fallback_insight()

def _build_prompt(context: str) -> str:
    context_hints = {
        "stress": "The user is currently answering questions about their perceived stress levels.",
        "burnout": "The user is evaluating their emotional exhaustion and job burnout.",
        "wrqol": "The user is reflecting on their work-related quality of life.",
        "wellbeing": "The user is assessing their overall mental wellbeing.",
        "anxiety": "The user is being evaluated for anxiety indicators.",
        "cognitive_game": "The user is playing an interactive cognitive assessment game.",
        "general": "The user is going through a mental health screening assessment.",
    }
    hint = context_hints.get(context, context_hints["general"])

    personas = [
        "A highly analytical neuroscientist who drops a fascinating, bite-sized brain fact related to mental effort.",
        "A deeply empathetic philosopher who shares a profound, poetic thought about human resilience.",
        "A witty, slightly sarcastic but highly encouraging coach who talks like a sports mentor.",
        "A zen-like mindfulness guru who speaks about being present and letting go of performance anxiety.",
        "A modern, relatable therapist who uses everyday analogies (like batteries, computers, or weather) to validate the user's effort."
    ]
    persona = random.choice(personas)

    return (
        f"You are generating a loading-screen insight for a psychological screening tool. "
        f"{hint} "
        f"Adopt the following persona strictly: {persona} "
        f"Generate exactly ONE short (1-2 sentences), highly engaging, unique, and memorable message for the user. "
        f"DO NOT sound like a typical boring AI. DO NOT start with 'Remember' or 'It's okay' or 'You're doing great'. "
        f"Make it punchy, thought-provoking, or fascinating. Do NOT use clinical jargon or diagnose."
    )

def _get_fallback_insight() -> dict:
    global _shown_indices
    available = [i for i in range(len(FALLBACK_INSIGHTS)) if i not in _shown_indices]
    if not available:
        _reset_pool()
        available = list(range(len(FALLBACK_INSIGHTS)))

    idx = random.choice(available)
    _shown_indices.add(idx)
    insight = FALLBACK_INSIGHTS[idx]
    return {**insight, "source": "curated"}
