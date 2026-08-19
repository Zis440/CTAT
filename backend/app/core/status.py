# ============================================================================
# SYSTEM STATUS DISPLAY
# ============================================================================

from pathlib import Path

def display_system_status(learning_stats, saved_paths, aggregated, knowledge_graph):
    """
    Display full system status.
    """
    print("\n" + "="*80)
    print("SYSTEM STATUS")
    print("="*80 + "\n")

    # -------------------------------------------------
    # LEARNING
    # -------------------------------------------------
    print("📚 LEARNING SYSTEM")
    print("  Total Concepts:", learning_stats.get("concepts_after", 0))
    print("  Learned This Session:", learning_stats.get("concepts_learned_this_session", 0))

    kg_info = learning_stats.get("knowledge_graph_size", {})
    print("  Knowledge Graph:", kg_info.get("nodes", 0), "nodes,", kg_info.get("edges", 0), "edges")

    if "graph_insights" in learning_stats:
        graph_insights = learning_stats["graph_insights"]
        if graph_insights.get("core_constructs"):
            print("\n  Key Psychological Constructs:")
            for construct, score in graph_insights["core_constructs"][:3]:
                print(f"    • {construct} (centrality: {score:.3f})")

    # -------------------------------------------------
    # SESSION OUTPUT
    # -------------------------------------------------
    print("\n📁 SESSION OUTPUT")
    if isinstance(saved_paths, dict):
        report_path = saved_paths.get("report_path")
        session_path = saved_paths.get("session_path")
        viz_paths = saved_paths.get("viz_paths", [])
        report_name = Path(report_path).name if report_path and isinstance(report_path, (str, Path)) else "Not generated"
        session_name = Path(session_path).name if session_path and isinstance(session_path, (str, Path)) else "Not saved"
        viz_count = len(viz_paths) if viz_paths else 0
    else:
        report_name = "N/A"
        session_name = "N/A"
        viz_count = len(saved_paths) if saved_paths else 0

    print("  Report:", report_name)
    print("  Session:", session_name)
    print("  Visualizations:", viz_count)

    print("\n" + "="*80)
    print("✅ SYSTEM STATUS: OPERATIONAL")
    print("="*80 + "\n")

    # -------------------------------------------------
    # GRAPH CENTRALITY
    # -------------------------------------------------
    print("\n🧠 GRAPH CENTRALITY")
    try:
        centrality = knowledge_graph.compute_centrality_metrics()
        for node, score in centrality.get("top_degree_nodes", []):
            print(" ", node, ":", round(score, 3))
    except Exception as e:
        print("  ⚠ Centrality unavailable:", e)

    # -------------------------------------------------
    # ANOMALIES
    # -------------------------------------------------
    print("\n⚠ Graph Anomalies")
    try:
        anomalies = knowledge_graph.detect_graph_anomalies()
        if anomalies:
            for node in anomalies:
                print("  -", node)
        else:
            print("  None detected")
    except Exception as e:
        print("  ⚠ Detection unavailable:", e)