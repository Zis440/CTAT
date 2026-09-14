"""
Groq LLM Service for CoreThematics
Fast, Cloud-hosted LLM integration for Clinical Humanization and Screening Insights.
Compatible with Render deployment using GROQ_API_KEY.
"""

import os
import logging
from typing import List, Dict, Optional, Any
import httpx

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")


def _get_api_key() -> str:
    return os.getenv("GROQ_API_KEY", "").strip()


def is_groq_available() -> bool:
    """Check if Groq API key is configured."""
    return bool(_get_api_key())


def call_groq_chat(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    timeout: float = 30.0,
) -> Optional[str]:
    """
    Synchronous call to Groq API.
    Returns response content or None on failure.
    """
    api_key = _get_api_key()
    if not api_key:
        return None

    model_name = model or os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 CoreThematics/2.0",
    }
    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(GROQ_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"Groq API call failed (model={model_name}): {e}")
        return None


async def call_groq_chat_async(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    timeout: float = 30.0,
) -> Optional[str]:
    """
    Asynchronous call to Groq API.
    Returns response content or None on failure.
    """
    api_key = _get_api_key()
    if not api_key:
        return None

    model_name = model or os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 CoreThematics/2.0",
    }
    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"Groq async API call failed (model={model_name}): {e}")
        return None
