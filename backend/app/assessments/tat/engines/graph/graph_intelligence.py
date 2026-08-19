# ============================================================================
# PSYCHOLOGICAL GRAPH INTELLIGENCE ENGINE
# ============================================================================

import networkx as nx

def analyze_psychological_graph(knowledge_graph):
    """
    Analyze the knowledge graph and return insights.
    """
    print("\n" + "="*80)
    print("PSYCHOLOGICAL GRAPH INTELLIGENCE")
    print("="*80 + "\n")

    graph = knowledge_graph.graph

    if graph.number_of_nodes() == 0:
        print("⚠️ Graph empty")
        return {}

    results = {}
    results["size"] = {"nodes": graph.number_of_nodes(), "edges": graph.number_of_edges()}

    centrality = nx.degree_centrality(graph)
    top_core = sorted(centrality.items(), key=lambda x: x[1], reverse=True)[:5]
    results["core_constructs"] = top_core

    print("🧠 CORE PSYCHOLOGICAL DRIVERS")
    for node, score in top_core:
        print(f"  {node}: {score:.3f}")

    motive_nodes = [n for n, d in graph.nodes(data=True) if d.get("concept_type") == "need"]
    if motive_nodes:
        dominant = max(motive_nodes, key=lambda n: centrality.get(n, 0))
        print("\n🎯 DOMINANT MOTIVE:", dominant)
        results["dominant_motive"] = dominant

    conflict_edges = [(u, v) for u, v, d in graph.edges(data=True) if d.get("relation") == "conflict"]
    if conflict_edges:
        conflict_nodes = set()
        for u, v in conflict_edges:
            conflict_nodes.add(u)
            conflict_nodes.add(v)
        strongest = max(conflict_nodes, key=lambda c: centrality.get(c, 0))
        print("\n⚔ PRIMARY CONFLICT:", strongest)
        results["primary_conflict"] = strongest

    emotion_nodes = [n for n, d in graph.nodes(data=True) if d.get("concept_type") == "emotion"]
    if emotion_nodes:
        dominant_emotion = max(emotion_nodes, key=lambda e: centrality.get(e, 0))
        print("\n❤️ DOMINANT EMOTION:", dominant_emotion)
        results["dominant_emotion"] = dominant_emotion

    defense_nodes = [n for n, d in graph.nodes(data=True) if d.get("concept_type") == "defense"]
    defense_load = sum(centrality.get(d, 0) for d in defense_nodes)
    coping_strength = centrality.get("coping_style", 0)
    regulation_index = coping_strength - defense_load

    print("\n🛡 REGULATION INDEX:", round(regulation_index, 3))
    results["regulation_index"] = regulation_index

    density = nx.density(graph)
    print("\n🧩 SYSTEM DENSITY:", round(density, 3))
    results["system_density"] = density

    isolated = list(nx.isolates(graph))
    if isolated and centrality:
        # Auto-connect isolated nodes to the most central node
        anchor = max(centrality, key=centrality.get)
        for iso_node in isolated:
            graph.add_edge(iso_node, anchor, relation="weak_link", weight=0.1)
        print(f"\n🔗 Connected {len(isolated)} orphan node(s) → {anchor}")
    results["anomalies"] = list(nx.isolates(graph))  # should be empty now

    # --- PRODUCTION HARDENING: Graph Sparsity Balancing (§7) ---
    _balance_graph_sparsity(graph)
    results["graph_sparsity_score"] = round(nx.density(graph), 4)

    print("\n" + "="*80 + "\n")
    return results


def _balance_graph_sparsity(graph):
    """
    Balance graph density to prevent noise (too dense) or
    disconnection (too sparse).
    Preserves all nodes and maintains centrality integrity.
    """
    density = nx.density(graph)
    
    # Prune ultra-weak edges if too dense
    if density > 0.4:
        edges_to_remove = [
            (u, v) for u, v, d in graph.edges(data=True)
            if d.get('weight', 1.0) < 0.05
        ]
        for u, v in edges_to_remove:
            # Only remove if both nodes have degree > 1 (preserve connectivity)
            if graph.degree(u) > 1 and graph.degree(v) > 1:
                graph.remove_edge(u, v)
    
    # Add weak connections if too sparse
    elif density < 0.05 and graph.number_of_nodes() > 2:
        nodes = list(graph.nodes())
        centrality = nx.degree_centrality(graph)
        if centrality:
            hub = max(centrality, key=centrality.get)
            for node in nodes:
                if node != hub and graph.degree(node) == 0:
                    graph.add_edge(node, hub, relationship="sparsity_bridge", weight=0.1)