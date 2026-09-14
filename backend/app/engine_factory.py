"""
Engine Factory - On-demand lazy instantiation of TAT ML engines.
Enables the application to boot at ~65MB RAM instead of ~480MB,
preventing Render 512MB memory limit warnings and OOM restarts.
"""

import gc
import os
from pathlib import Path
from typing import Any, Dict

PROJECT_ROOT = Path(__file__).parent.parent.resolve()

def get_or_create_engine(name: str, registry: Dict[str, Any]) -> Any:
    """Instantiate the requested engine on first use and store in registry."""
    if name in registry and registry[name] is not None:
        return registry[name]

    from app.config import SystemConfig
    from app.api.dependencies import KG_GRAPH_FILE, SESSION_DIR

    system_config = SystemConfig()
    engine = None

    try:
        if name == "session_manager":
            from app.services.patient_intake import SessionManager
            engine = SessionManager(SESSION_DIR)

        elif name == "knowledge_graph":
            from app.assessments.tat.engines.graph.knowledge_graph_engine import KnowledgeGraphEngine
            engine = KnowledgeGraphEngine(config=system_config)
            if KG_GRAPH_FILE.exists():
                engine.load(KG_GRAPH_FILE)
                engine._graph_built = True
            else:
                engine._graph_built = False

        elif name == "nlp_processor":
            from app.assessments.tat.engines.nlp.enhanced_nlp import EnhancedNLPProcessor
            engine = EnhancedNLPProcessor(system_config)

        elif name == "semantic_engine":
            nlp = get_or_create_engine("nlp_processor", registry)
            from app.assessments.tat.engines.nlp.semantic_narrative_engine import SemanticNarrativeEngine
            engine = SemanticNarrativeEngine(nlp)

        elif name == "defense_engine":
            nlp = get_or_create_engine("nlp_processor", registry)
            from app.assessments.tat.engines.inference.defense_inference_engine import DefenseInferenceEngine
            engine = DefenseInferenceEngine(nlp)

        elif name == "murray_engine":
            nlp = get_or_create_engine("nlp_processor", registry)
            from app.assessments.tat.engines.inference.murray_inference_engine import MurrayInferenceEngine
            engine = MurrayInferenceEngine(nlp)

        elif name == "theme_engine":
            nlp = get_or_create_engine("nlp_processor", registry)
            from app.assessments.tat.engines.nlp.theme_detection_engine import ThemeDetectionEngine
            engine = ThemeDetectionEngine(nlp)

        elif name == "relational_engine":
            nlp = get_or_create_engine("nlp_processor", registry)
            from app.assessments.tat.engines.graph.relational_field_engine import RelationalFieldEngine
            engine = RelationalFieldEngine(nlp)

        elif name == "conflict_engine":
            nlp = get_or_create_engine("nlp_processor", registry)
            from app.assessments.tat.engines.nlp.conflict_aspect_engine import ConflictAspectEngine
            engine = ConflictAspectEngine(nlp)

        elif name == "quantitative_scorer":
            nlp = get_or_create_engine("nlp_processor", registry)
            from app.assessments.tat.engines.scoring.quantitative_scorer import QuantitativeScorer
            engine = QuantitativeScorer(nlp)

        elif name == "scoring_engine":
            kg = get_or_create_engine("knowledge_graph", registry)
            from app.assessments.tat.engines.scoring.scoring_engine import TATScoringEngine
            engine = TATScoringEngine(system_config, kg)

        elif name == "multicard_engine":
            nlp = get_or_create_engine("nlp_processor", registry)
            defense = get_or_create_engine("defense_engine", registry)
            murray = get_or_create_engine("murray_engine", registry)
            theme = get_or_create_engine("theme_engine", registry)
            relational = get_or_create_engine("relational_engine", registry)
            from app.assessments.tat.pipeline.multicard_dynamics_engine import MulticardDynamicsEngine
            engine = MulticardDynamicsEngine(
                nlp,
                murray_engine=murray,
                theme_engine=theme,
                relational_engine=relational,
                defense_engine=defense,
            )

        elif name == "environment_classifier":
            from app.assessments.tat.engines.visual.environment_classifier import EnvironmentClassifier
            engine = EnvironmentClassifier()

        elif name == "visual_engine":
            from app.assessments.tat.engines.visual.visual_analysis_engine import VisualAnalysisEngine
            engine = VisualAnalysisEngine(config=system_config)

        elif name == "medication_engine":
            from app.assessments.tat.engines.clinical.medication_engine import MedicationEngine
            engine = MedicationEngine(
                medication_csv_path=PROJECT_ROOT / "data" / "remedies_dataset" / "MEDICATION.csv"
            )

        elif name == "ollama_humanizer":
            from app.services.ollama_humanizer import OllamaHumanizer
            engine = OllamaHumanizer(rag_engine=None, airavata_provider=None)

        elif name == "feedback_store":
            engine = {}

    except Exception as e:
        print(f"[WARN] Lazy-init for {name} failed: {e}", flush=True)
        engine = None

    registry[name] = engine
    try:
        gc.collect()
    except Exception:
        pass

    return engine
