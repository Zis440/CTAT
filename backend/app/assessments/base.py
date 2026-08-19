# app/assessments/base.py

from abc import ABC, abstractmethod
from typing import Any


class BaseAssessment(ABC):
    """
    Every psychometric test module MUST inherit this class and implement
    all abstract methods. This ensures a consistent interface across all
    test types so the generic API routes work with any test.

    When building a new test:
      1. Create app/assessments/<test_name>/pipeline.py
      2. Subclass BaseAssessment
      3. Implement all @abstractmethod methods below
      4. Register in app/assessments/registry.py
    """

    @property
    @abstractmethod
    def slug(self) -> str:
        """Unique identifier. Must match frontend registry.ts slug."""
        ...

    @abstractmethod
    async def run(self, narrative: str, context: dict) -> dict[str, Any]:
        """Run the full analysis pipeline. Returns structured result dict."""
        ...

    @abstractmethod
    async def aggregate(self, card_results: list[dict]) -> dict[str, Any]:
        """Aggregate results across multiple cards / inputs."""
        ...

    @abstractmethod
    async def generate_report(self, session_data: dict) -> bytes:
        """Generate and return the clinical PDF report as bytes."""
        ...