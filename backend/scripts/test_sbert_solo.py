import sys
import os
from pathlib import Path

# Add backend directory to path so imports work
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Supress excessive warnings
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"

from app.config import SystemConfig
from app.assessments.tat.engines.nlp.enhanced_nlp import EnhancedNLPProcessor
from app.assessments.tat.engines.nlp.semantic_narrative_engine import SemanticNarrativeEngine
from app.assessments.tat.engines.inference.murray_inference_engine import MurrayInferenceEngine
from app.assessments.tat.engines.inference.defense_inference_engine import DefenseInferenceEngine

print("Initializing SBERT and NLP models... (this might take a few seconds)")
config = SystemConfig()
nlp_processor = EnhancedNLPProcessor(config)

semantic_engine = SemanticNarrativeEngine(nlp_processor)
murray_engine = MurrayInferenceEngine(nlp_processor)
defense_engine = DefenseInferenceEngine(nlp_processor)

print("\n" + "="*50)
print(" SBERT SOLO TESTER READY")
print("="*50)
print("Type any sentence from a patient story to see what SBERT detects.")
print("Type 'quit' to exit.\n")

while True:
    try:
        sentence = input("\nEnter a test sentence: ")
        if sentence.lower() in ['quit', 'exit', 'q']:
            break
            
        if not sentence.strip():
            continue
            
        print(f"\nAnalyzing: '{sentence}'")
        
        # 1. Parse text into structured events (just like the real pipeline)
        events = semantic_engine.parse_story(sentence)
        event_dicts = [e.to_dict() for e in events]
        
        # 2. Test Murray Inference
        murray_result = murray_engine.infer_from_events(event_dicts)
        
        # 3. Test Defense Inference
        defense_result = defense_engine.infer_from_events(event_dicts)
        
        print("\n--- Murray Needs (Matches > 10% confidence) ---")
        dominant = murray_result.get('dominant_needs', [])
        if not dominant:
            print("  (No strong needs detected)")
        for need, prob in dominant:
            print(f"  > {need}: {prob:.1%} match")
            
        print("\n--- Environmental Presses (Top 2) ---")
        for press, prob in murray_result.get('presses', [])[:2]:
            print(f"  > {press}: {prob:.1%} match")
            
        print("\n--- Defense Mechanisms (Top 2) ---")
        if not defense_result:
            print("  (No strong defenses detected)")
        for d in defense_result[:2]:
            print(f"  > {d.get('defense')}: {d.get('confidence', 0):.1%} match")
            
    except KeyboardInterrupt:
        break
    except Exception as e:
        print(f"Error analyzing sentence: {e}")

print("\nExiting SBERT Tester.")
