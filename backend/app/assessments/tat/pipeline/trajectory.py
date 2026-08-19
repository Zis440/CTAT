# ============================================================================
# TRAJECTORY COMPARISON FUNCTION
# ============================================================================

from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from app.core.longitudinal_tracker import LongitudinalTracker

def compare_with_previous_trajectory(patient_id, current_aggregated,
                                     current_graph_insights, project_root):
    """
    Compare current session with previous trajectory data.
    Returns formatted comparison for returning users.
    """
    print("\n" + "="*80)
    print("📊 TRAJECTORY COMPARISON - RETURNING PATIENT ANALYSIS")
    print("="*80)

    comparison_results = {
        "is_returning": False,
        "previous_sessions": 0,
        "metrics_delta": {},
        "stability_score": 0,
        "clinical_notes": [],
        "trajectory_plot_path": None
    }

    try:
        tracker = LongitudinalTracker(patient_id)
        history = tracker.load_history()

        if not history or len(history) < 1:
            print("\n  ℹ No previous sessions found for comparison.")
            return comparison_results

        comparison_results["is_returning"] = True
        comparison_results["previous_sessions"] = len(history)

        print(f"\n  📈 Previous Sessions Found: {len(history)}")
        print(f"  🆕 Current Session: Session {len(history) + 1}")
        print("\n  " + "-"*50)

        last_session = history[-1]
        last_aggregated = last_session.get("aggregated", {})

        metrics_to_compare = [
            "anxiety_level",
            "conflict_internal",
            "conflict_interpersonal",
            "hero_ego_strength",
            "overall_confidence"
        ]

        print("\n  📉 METRIC COMPARISON (Previous → Current):")

        for metric in metrics_to_compare:
            prev_value = last_aggregated.get(metric, 0)
            curr_value = current_aggregated.get(metric, 0)
            delta = curr_value - prev_value

            comparison_results["metrics_delta"][metric] = {
                "previous": prev_value,
                "current": curr_value,
                "delta": delta,
                "direction": "improved" if delta > 5 else "declined" if delta < -5 else "stable"
            }

            if delta > 5:
                arrow = "↑↑"
                color = "✅"
            elif delta > 2:
                arrow = "↑"
                color = "📈"
            elif delta < -5:
                arrow = "↓↓"
                color = "⚠️"
            elif delta < -2:
                arrow = "↓"
                color = "📉"
            else:
                arrow = "→"
                color = "⚪"

            metric_name = metric.replace("_", " ").title()
            print(f"    {color} {metric_name:25} {prev_value:3.0f} → {curr_value:3.0f} {arrow} ({delta:+.1f})")

        avg_abs_delta = np.mean([abs(d["delta"]) for d in comparison_results["metrics_delta"].values()])
        stability_score = max(0, 100 - avg_abs_delta * 2)
        comparison_results["stability_score"] = round(stability_score, 1)

        print(f"\n  📊 Stability Score: {comparison_results['stability_score']}/100")
        if stability_score >= 80:
            print("      Highly stable profile")
        elif stability_score >= 60:
            print("      Moderately stable with some variation")
        elif stability_score >= 40:
            print("      Notable fluctuations detected")
        else:
            print("      Significant instability - may indicate acute phase")

        print("\n  🧠 CLINICAL TRAJECTORY NOTES:")

        anxiety_delta = comparison_results["metrics_delta"]["anxiety_level"]["delta"]
        if anxiety_delta > 10:
            comparison_results["clinical_notes"].append("⚠ Marked increase in anxiety indicators - consider stress assessment")
            print("    • ⚠ Marked increase in anxiety indicators - consider stress assessment")
        elif anxiety_delta > 5:
            comparison_results["clinical_notes"].append("📈 Moderate anxiety elevation - monitor situational factors")
            print("    • 📈 Moderate anxiety elevation - monitor situational factors")
        elif anxiety_delta < -10:
            comparison_results["clinical_notes"].append("✅ Significant anxiety reduction - therapeutic progress")
            print("    • ✅ Significant anxiety reduction - therapeutic progress")

        ego_delta = comparison_results["metrics_delta"]["hero_ego_strength"]["delta"]
        if ego_delta > 10:
            comparison_results["clinical_notes"].append("💪 Substantial ego strength development")
            print("    • 💪 Substantial ego strength development")
        elif ego_delta < -10:
            comparison_results["clinical_notes"].append("⚠ Ego strength decline - possible stress overload")
            print("    • ⚠ Ego strength decline - possible stress overload")

        internal_delta = comparison_results["metrics_delta"]["conflict_internal"]["delta"]
        interpersonal_delta = comparison_results["metrics_delta"]["conflict_interpersonal"]["delta"]

        if internal_delta > 10 and interpersonal_delta > 10:
            comparison_results["clinical_notes"].append("🔥 Worsening conflict patterns - clinical attention recommended")
            print("    • 🔥 Worsening conflict patterns - clinical attention recommended")
        elif internal_delta < -10 and interpersonal_delta < -10:
            comparison_results["clinical_notes"].append("🌟 Significant conflict resolution - notable improvement")
            print("    • 🌟 Significant conflict resolution - notable improvement")

        if current_graph_insights and current_graph_insights.get("core_constructs"):
            prev_constructs = last_session.get("graph_insights", {}).get("core_constructs", [])
            if prev_constructs:
                prev_top = [c[0] for c in prev_constructs[:3]]
                curr_top = [c[0] for c in current_graph_insights.get("core_constructs", [])[:3]]
                persistent = set(prev_top) & set(curr_top)
                if persistent:
                    print(f"\n    🔄 Persistent Constructs: {', '.join(persistent)}")
                    comparison_results["clinical_notes"].append(f"Persistent themes: {', '.join(persistent)}")

        if len(history) >= 1:
            try:
                plt.figure(figsize=(12, 6))
                sessions = list(range(1, len(history) + 1))
                for metric in metrics_to_compare[:3]:
                    values = [s.get("aggregated", {}).get(metric, 0) for s in history]
                    plt.plot(sessions, values, marker='o', label=metric.replace("_", " ").title(), linewidth=2)
                current_values = [current_aggregated.get(m, 0) for m in metrics_to_compare[:3]]
                plt.scatter([len(history)+1]*len(current_values), current_values, marker='*', s=200, color='red', label='Current', zorder=5)
                plt.xlabel("Session Number")
                plt.ylabel("Score")
                plt.title(f"Patient {patient_id} - Longitudinal Trajectory")
                plt.legend()
                plt.grid(True, alpha=0.3)
                plt.tight_layout()

                viz_dir = project_root / "outputs" / "trajectories"
                viz_dir.mkdir(parents=True, exist_ok=True)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                plot_path = viz_dir / f"trajectory_{patient_id}_{timestamp}.png"
                plt.savefig(plot_path, dpi=150, bbox_inches="tight")
                plt.close()
                comparison_results["trajectory_plot_path"] = str(plot_path)
                print(f"\n  📊 Trajectory plot saved: {plot_path.name}")
            except Exception as e:
                print(f"\n  ⚠ Trajectory plot generation failed: {e}")

        print("\n" + "="*80)

    except Exception as e:
        print(f"\n  ⚠ Trajectory comparison failed: {e}")
        comparison_results["error"] = str(e)

    return comparison_results