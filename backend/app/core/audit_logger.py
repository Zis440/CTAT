"""
Audit Logging System for TAT
Provides complete decision traceability for research and potential clinical use
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import hashlib
from pathlib import Path

@dataclass
class ScoringDecision:
    """Record of a single scoring decision"""
    timestamp: str
    dimension: str
    score: float
    confidence: float
    method: str
    evidence: List[str]
    reasoning: str
    uncertainty_level: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class AuditRecord:
    """Complete audit record for a TAT analysis"""

    session_id: str
    timestamp: str
    system_version: str

    patient_id: Optional[str]
    card_id: str
    story_text: str
    story_hash: str

    patient_age: Optional[int]
    patient_gender: Optional[str]
    patient_education: Optional[str]
    presenting_issue: Optional[str]

    scoring_decisions: List[ScoringDecision] = field(default_factory=list)

    final_scores: Dict[str, float] = field(default_factory=dict)
    overall_score: float = 0.0
    clinical_interpretation: Dict[str, Any] = field(default_factory=dict)

    medication_recommendations: List[Dict[str, Any]] = field(default_factory=list)

    manual_overrides: List[Dict[str, Any]] = field(default_factory=list)

    config_hash: str = ""

    aggregation_steps: List[Dict[str, Any]] = field(default_factory=list)
    volatility_triggers: List[Dict[str, Any]] = field(default_factory=list)
    input_quality: List[Dict[str, Any]] = field(default_factory=list)

    rag_passages: List[Dict[str, Any]] = field(default_factory=list)
    rag_scores: List[float] = field(default_factory=list)
    rag_generation_time: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'session_id': self.session_id,
            'timestamp': self.timestamp,
            'system_version': self.system_version,
            'patient_id': self.patient_id,
            'card_id': self.card_id,
            'story_hash': self.story_hash,
            'patient_context': {
                'age': self.patient_age,
                'gender': self.patient_gender,
                'education': self.patient_education,
                'presenting_issue': self.presenting_issue
            },
            'scoring_decisions': [d.to_dict() for d in self.scoring_decisions],
            'final_scores': self.final_scores,
            'overall_score': self.overall_score,
            'clinical_interpretation': self.clinical_interpretation,
            'medication_recommendations': self.medication_recommendations,
            'manual_overrides': self.manual_overrides,
            'config_hash': self.config_hash,
            'rag_passages': self.rag_passages,
            'rag_scores': self.rag_scores,
            'rag_generation_time': self.rag_generation_time,
            'aggregation_steps': self.aggregation_steps,
            'volatility_triggers': self.volatility_triggers,
            'input_quality': self.input_quality,
        }

class AuditLogger:
    """
    Comprehensive audit logging for TAT system
    Ensures complete traceability for research and potential forensic use
    """

    def __init__(self, output_dir: str = "audit_logs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.current_record: Optional[AuditRecord] = None
        self.system_version = "1.0.0-research"

    def start_session(
        self,
        patient_id: Optional[str],
        card_id: str,
        story_text: str,
        patient_age: Optional[int] = None,
        patient_gender: Optional[str] = None,
        patient_education: Optional[str] = None,
        presenting_issue: Optional[str] = None
    ) -> str:
        """Start a new audit session"""

        session_id = self._generate_session_id()
        story_hash = self._hash_text(story_text)

        self.current_record = AuditRecord(
            session_id=session_id,
            timestamp=datetime.now().isoformat(),
            system_version=self.system_version,
            patient_id=patient_id,
            card_id=card_id,
            story_text=story_text,
            story_hash=story_hash,
            patient_age=patient_age,
            patient_gender=patient_gender,
            patient_education=patient_education,
            presenting_issue=presenting_issue
        )

        return session_id

    def log_scoring_decision(
        self,
        dimension: str,
        score: float,
        confidence: float,
        method: str,
        evidence: List[str],
        reasoning: str,
        uncertainty_level: str = "medium"
    ):
        """Log a single scoring decision"""

        if not self.current_record:
            raise ValueError("No active session. Call start_session() first.")

        decision = ScoringDecision(
            timestamp=datetime.now().isoformat(),
            dimension=dimension,
            score=score,
            confidence=confidence,
            method=method,
            evidence=evidence,
            reasoning=reasoning,
            uncertainty_level=uncertainty_level
        )

        self.current_record.scoring_decisions.append(decision)

    def log_final_scores(
        self,
        scores: Dict[str, float],
        overall_score: float,
        clinical_interpretation: Dict[str, Any]
    ):
        """Log final aggregated scores"""

        if not self.current_record:
            raise ValueError("No active session.")

        self.current_record.final_scores = scores
        self.current_record.overall_score = overall_score
        self.current_record.clinical_interpretation = clinical_interpretation

    def log_medication_recommendations(self, recommendations: List[Dict[str, Any]]):
        """Log medication recommendations"""

        if not self.current_record:
            raise ValueError("No active session.")

        self.current_record.medication_recommendations = recommendations

    def log_manual_override(
        self,
        dimension: str,
        original_score: float,
        new_score: float,
        clinician_id: str,
        reason: str
    ):
        """Log manual score adjustment by clinician"""

        if not self.current_record:
            raise ValueError("No active session.")

        override = {
            'timestamp': datetime.now().isoformat(),
            'dimension': dimension,
            'original_score': original_score,
            'new_score': new_score,
            'clinician_id': clinician_id,
            'reason': reason
        }

        self.current_record.manual_overrides.append(override)

    def log_aggregation_step(self, metric: str, mean: float, peak: float, volatility: float, final: float):
        """Log dual-layer aggregation computation step"""
        if self.current_record:
            self.current_record.aggregation_steps.append({
                "timestamp": datetime.now().isoformat(),
                "metric": metric,
                "mean": mean,
                "peak": peak,
                "volatility": volatility,
                "final": final
            })

    def log_volatility_trigger(self, metric: str, value: float, threshold: float):
        """Log volatility alerts that cross threshold"""
        if self.current_record:
            self.current_record.volatility_triggers.append({
                "timestamp": datetime.now().isoformat(),
                "metric": metric,
                "value": value,
                "threshold": threshold
            })

    def log_input_quality(self, card_id: str, quality_result: Dict[str, Any]):
        """Log narrative input quality assessment"""
        if self.current_record:
            self.current_record.input_quality.append({
                "timestamp": datetime.now().isoformat(),
                "card_id": card_id,
                "quality_result": quality_result
            })

    def finalize_session(self, config: Dict[str, Any] = None) -> str:
        """Finalize and save audit record"""

        if not self.current_record:
            raise ValueError("No active session.")

        if config:
            self.current_record.config_hash = self._hash_dict(config)

        filename = f"audit_{self.current_record.session_id}.json"
        filepath = self.output_dir / filename

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self.current_record.to_dict(), f, indent=2, ensure_ascii=False)

        session_id = self.current_record.session_id
        self.current_record = None

        return str(filepath)

    def verify_reproducibility(self, session_id: str, story_text: str) -> bool:
        """Verify that a story matches the recorded hash"""

        filepath = self.output_dir / f"audit_{session_id}.json"

        if not filepath.exists():
            return False

        with open(filepath, 'r', encoding='utf-8') as f:
            record = json.load(f)

        expected_hash = record['story_hash']
        actual_hash = self._hash_text(story_text)

        return expected_hash == actual_hash

    def _generate_session_id(self) -> str:
        """Generate unique session ID"""
        timestamp = datetime.now().isoformat()
        return hashlib.sha256(timestamp.encode()).hexdigest()[:16]

    def _hash_text(self, text: str) -> str:
        """Generate SHA256 hash of text"""
        return hashlib.sha256(text.encode('utf-8')).hexdigest()

    def _hash_dict(self, data: Dict) -> str:
        """Generate hash of dictionary (for config)"""
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_str.encode('utf-8')).hexdigest()

_global_logger: Optional[AuditLogger] = None

def get_audit_logger(output_dir: str = "audit_logs") -> AuditLogger:
    """Get or create global audit logger"""
    global _global_logger

    if _global_logger is None:
        _global_logger = AuditLogger(output_dir)

    return _global_logger

if __name__ == "__main__":

    logger = AuditLogger("test_audit_logs")

    session_id = logger.start_session(
        patient_id="P001",
        card_id="Card_1",
        story_text="A young woman sits alone, feeling sad and isolated.",
        patient_age=25,
        patient_gender="female"
    )

    logger.log_scoring_decision(
        dimension="affective_integration",
        score=6.5,
        confidence=0.35,
        method="heuristic",
        evidence=["sad", "isolated", "alone"],
        reasoning="Keyword-based heuristic scoring",
        uncertainty_level="high"
    )

    logger.log_scoring_decision(
        dimension="social_cognition",
        score=4.2,
        confidence=0.35,
        method="heuristic",
        evidence=["alone", "isolated"],
        reasoning="Limited social interaction in narrative",
        uncertainty_level="high"
    )

    logger.log_final_scores(
        scores={"affective_integration": 6.5, "social_cognition": 4.2},
        overall_score=5.35,
        clinical_interpretation={"concerns": ["social isolation", "low mood"]}
    )

    filepath = logger.finalize_session(config={"version": "1.0.0"})

    print(f"Audit log saved to: {filepath}")

    is_valid = logger.verify_reproducibility(
        session_id,
        "A young woman sits alone, feeling sad and isolated."
    )
    print(f"Reproducibility verified: {is_valid}")
