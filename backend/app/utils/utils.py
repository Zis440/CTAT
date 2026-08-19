"""
Shared utility functions for the Psyichub backend.
"""
import json
from pathlib import Path
from typing import Dict, Any

def make_serializable(obj, depth=0):
    """Recursively convert numpy/torch/Path types to JSON-safe Python types."""
    if depth > 100:
        print(f"Recursion depth exceeded returning string! {type(obj)}")
        return str(obj)

    if obj is None:
        return obj
    if isinstance(obj, (int, float, str, bool)):
        return obj
    if isinstance(obj, Path):
        return str(obj)
    if isinstance(obj, dict):
        return {str(k): make_serializable(v, depth + 1) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [make_serializable(v, depth + 1) for v in obj]
    if hasattr(obj, 'item'):
        return obj.item()
    if hasattr(obj, 'tolist'):
        return obj.tolist()
    try:
        json.dumps(obj)
        return obj
    except (TypeError, ValueError):
        return str(obj)

def compute_historical_comparison(
    current_agg: Dict[str, Any], past_agg: Dict[str, Any]
) -> Dict[str, Any]:
    """Compare current psychometrics with a previous session to track progress."""
    try:
        def get_val(agg, key):

            val = agg.get(key)
            if val is None and 'dimension_scores' in agg:
                val = agg['dimension_scores'].get(key)
            if not val and val != 0:
                return 0.0
            try:
                return float(val)
            except (ValueError, TypeError):
                return 0.0

        def scale(val):
            return (val / 10.0) if val > 15 else val

        metrics_to_track = {
            'anxiety_level': {'lower_is_better': True, 'label': 'Anxiety'},
            'conflict_internal': {'lower_is_better': True, 'label': 'Internal Conflict'},
            'conflict_interpersonal': {'lower_is_better': True, 'label': 'Interpersonal Conflict'},
            'hero_ego_strength': {'lower_is_better': False, 'label': 'Ego Strength'},
            'reality_testing': {'lower_is_better': False, 'label': 'Reality Testing'},
            'affective_integration': {'lower_is_better': False, 'label': 'Affective Integration'}
        }

        comparisons = []
        for key, config in metrics_to_track.items():
            curr = scale(get_val(current_agg, key))
            past = scale(get_val(past_agg, key))

            diff = curr - past
            if abs(diff) < 0.2:
                trend = "stable"
                is_better = None
            else:
                trend = "up" if diff > 0 else "down"
                is_better = (diff < 0) == config['lower_is_better']

            comparisons.append({
                'metric': config['label'],
                'current': round(curr, 2),
                'past': round(past, 2),
                'diff': round(diff, 2),
                'trend': trend,
                'is_better': is_better
            })

        return {'metrics': comparisons}
    except Exception as e:
        print(f"Error computing historical comparison: {e}")
        return {}
