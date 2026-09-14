"""
Airavata LLM Provider for TAT Learning System
===============================================
Thin wrapper over the Ollama API that routes requests to the
local Airavata model. Accepts RAG context and formats prompts
per the required clinical reasoning structure.

Fully compatible with existing Ollama infrastructure.
No new API library required — uses ollama.chat() internally.
"""

import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class AiravataProvider:
    """
    Airavata LLM provider that uses Ollama as the backend.

    Provides structured prompt formatting with RAG context:
        REFERENCE MATERIAL:  [retrieved passages]
        PATIENT NARRATIVE:   [story text]
        TASK:                [analysis instructions]
    """

    def __init__(
        self,
        model_name: str = "hf.co/therandomuser03/Airavata-Q4_K_M-GGUF:Q4_K_M",
        temperature: float = 0.3,
        base_url: Optional[str] = None,
    ):
        self.model_name = model_name
        self.temperature = temperature
        self.base_url = base_url
        logger.info(f"AiravataProvider initialized: model={model_name}")

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        rag_context: str = "",
        narrative: str = "",
    ) -> str:
        """
        Generate a response using the Airavata model via Ollama.

        Args:
            system_prompt: System instructions / guardrails.
            user_prompt:   The original task prompt.
            rag_context:   Pre-formatted REFERENCE MATERIAL block
                          (from RAGEngine.format_context).
            narrative:     The patient's TAT narrative text.

        Returns:
            Generated text string. Empty string on failure.
        """
        import ollama

        full_prompt = self._build_structured_prompt(
            user_prompt=user_prompt,
            rag_context=rag_context,
            narrative=narrative,
        )

        safe_prompt = full_prompt[:4000]

        try:
            response = ollama.chat(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": safe_prompt},
                ],
                options={"temperature": self.temperature},
            )
            return self._extract_text(response)

        except Exception as e:
            logger.error(f"Airavata generation failed: {e}")
            return ""

    def _build_structured_prompt(
        self,
        user_prompt: str,
        rag_context: str = "",
        narrative: str = "",
    ) -> str:
        """
        Build a structured prompt with RAG context injected.
        Falls back to plain prompt if no RAG context.
        """
        parts = []

        if rag_context:
            parts.append(rag_context)
            parts.append("")

        if narrative:
            parts.append("PATIENT NARRATIVE:")
            parts.append(narrative[:1000])
            parts.append("")

        parts.append(user_prompt)

        return "\n".join(parts)

    def _extract_text(self, response: Any) -> str:
        """Extract text from Ollama response (same logic as OllamaHumanizer)."""
        try:
            if isinstance(response, dict):
                if "message" in response and isinstance(response["message"], dict):
                    return response["message"].get("content", "").strip()
                elif "response" in response:
                    return response.get("response", "").strip()
        except Exception as e:
            logger.warning(f"Response parsing error: {e}")
        return ""
