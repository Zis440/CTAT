"""
Knowledge Graph Engine for TAT Rule-Based Scoring System
Stores and queries TAT scoring rules from manuals (not a learning system)

PRODUCTION-GRADE VERSION (AUDITED, FIXED, EXTENDED & CONNECTIVITY-SAFE)
"""

import networkx as nx
from typing import List, Dict, Any, Optional
from collections import defaultdict
from pathlib import Path
import pickle
import logging
import threading
from datetime import datetime
import numpy as np

logger = logging.getLogger("KnowledgeGraphEngine")
logger.setLevel(logging.INFO)

class KnowledgeGraphEngine:
    """
    Rule-Based Knowledge Graph Engine for TAT scoring.
    """

    def __init__(self, config, rule_extractor=None, rule_validator=None, nlp_processor=None):

        self.config = config
        self.graph = nx.DiGraph()

        self.rule_extractor = rule_extractor
        self.rule_validator = rule_validator
        self.nlp_processor = nlp_processor

        self.concept_counter: Dict[str, int] = {}
        self._rules_cache: List[Dict[str, Any]] = []
        self._processed_rule_ids: set = set()

        self._lock = threading.Lock()

        self._initialize_core_nodes()

        logger.info("KnowledgeGraphEngine initialized")

    def _initialize_core_nodes(self):
        core_nodes = [
            "conflict_internal",
            "conflict_interpersonal",
            "anxiety_level",
            "coping_style",
            "defense"
        ]

        for node in core_nodes:
            if node not in self.graph:
                self.graph.add_node(node, type="dimension", concept_type="dimension", activation=0.1)

        core_edges = [
            ("anxiety_level", "conflict_internal", "influences", 0.4),
            ("anxiety_level", "coping_style", "triggers", 0.4),
            ("conflict_internal", "defense", "activates", 0.5),
            ("conflict_interpersonal", "anxiety_level", "influences", 0.4),
            ("conflict_interpersonal", "coping_style", "triggers", 0.4),
            ("defense", "coping_style", "modulates", 0.5),
        ]
        for a, b, rel, w in core_edges:
            if not self.graph.has_edge(a, b):
                self.graph.add_edge(a, b, relationship=rel, weight=w)

        for d in ["repression", "suppression", "avoidance", "denial"]:
            self.graph.add_node(d, type="defense", concept_type="defense", activation=0.1)
            self.graph.add_edge("defense", d, relationship="contains", weight=1.0)
            self.graph.add_edge(d, "coping_style", relationship="affects", weight=0.6)

    def add_concept(self, name, concept_type="concept"):
        """
        Safely add a concept node with proper typing.
        Thread-safe, prevents duplicates, ensures consistent attributes.
        """
        if not name or not isinstance(name, str):
            return

        with self._lock:
            if not self.graph.has_node(name):
                self.graph.add_node(
                    name,
                    type="concept",
                    concept_type=concept_type,
                    activation=0.1,
                    created_at=str(datetime.utcnow())
                )
                logger.debug(f"Added concept: {name}")

    def add_relation(self, a, b, relation="related", weight=0.5):
        """
        Safely add a relation between two nodes.
        Creates missing nodes automatically, prevents duplicate edges,
        ensures consistent relationship typing.
        """
        if not a or not b:
            return

        with self._lock:

            if not self.graph.has_node(a):
                self.add_concept(a, concept_type="inferred")

            if not self.graph.has_node(b):
                self.add_concept(b, concept_type="inferred")

            if not self.graph.has_edge(a, b):
                self.graph.add_edge(
                    a, b,
                    relationship=relation,
                    weight=weight,
                    created_at=str(datetime.utcnow())
                )
                logger.debug(f"Added relation: {a} --{relation}--> {b}")

    def has_concept(self, name):
        """Check if concept exists in graph."""
        return self.graph.has_node(name) if name else False

    def get_neighbors(self, name):
        """Safely get neighbors of a node."""
        if name and self.graph.has_node(name):
            try:
                return list(self.graph.neighbors(name))
            except Exception:
                return []
        return []

    def get_node_attributes(self, name):
        """Safely get node attributes."""
        if name and self.graph.has_node(name):
            return dict(self.graph.nodes[name])
        return {}

    def get_edge_attributes(self, a, b):
        """Safely get edge attributes."""
        if a and b and self.graph.has_edge(a, b):
            return dict(self.graph.edges[a, b])
        return {}

    def size(self):
        """Get graph size statistics."""
        return {
            "nodes": self.graph.number_of_nodes(),
            "edges": self.graph.number_of_edges()
        }

    @property
    def concept_nodes(self) -> List[str]:
        concepts = set()

        if self.rule_extractor and hasattr(self.rule_extractor, "learned_concepts"):
            learned = self.rule_extractor.learned_concepts
            if isinstance(learned, (list, set)):
                concepts.update(learned)
            elif isinstance(learned, dict):
                concepts.update(learned.keys())

        if self.rule_validator and hasattr(self.rule_validator, "validated_concepts"):
            concepts.update(self.rule_validator.validated_concepts)

        for node, data in self.graph.nodes(data=True):
            if data.get("type") == "concept":
                concepts.add(node)

        return list(concepts)

    def _add_rule_node(self, rule: Any, idx: int):

        if isinstance(rule, dict):
            rule_id = rule.get("rule_id", rule.get("id", f"rule_{idx}"))
            rule_text = rule.get("rule_text", rule.get("text", ""))
            confidence = rule.get("confidence", 0.7)
            category = rule.get("category", rule.get("rule_type", "general"))
            source = rule.get("source_pdf", rule.get("source", "unknown"))
        else:
            rule_id = getattr(rule, "rule_id", getattr(rule, "id", f"rule_{idx}"))
            rule_text = getattr(rule, "rule_text", getattr(rule, "text", ""))
            confidence = getattr(rule, "confidence", 0.7)
            category = getattr(rule, "category", getattr(rule, "rule_type", "general"))
            source = getattr(rule, "source_pdf", getattr(rule, "source", "unknown"))

        if rule_id in self._processed_rule_ids:
            return

        self.graph.add_node(
            rule_id,
            type="rule",
            rule_text=rule_text,
            confidence=confidence,
            category=category,
            source=source,
            created_at=str(datetime.utcnow()),
            activation=confidence
        )

        self._rules_cache.append({
            "rule_id": rule_id,
            "rule_text": rule_text,
            "confidence": confidence,
            "category": category,
            "source": source
        })

        self._processed_rule_ids.add(rule_id)

        try:
            concepts = self._extract_concepts_from_rule(rule_text)
            for concept in concepts:
                self._add_concept_with_weak_link(concept, rule_id)
        except Exception as e:
            logger.error(f"Concept extraction error: {e}")

        self._link_rule_to_dimensions(rule_id, rule_text)

    def _add_concept_with_weak_link(self, concept: str, rule_id: str):

        if concept not in self.graph:
            self.graph.add_node(concept, type="concept", activation=0.1)

        self.concept_counter[concept] = self.concept_counter.get(concept, 0) + 1
        count = self.concept_counter[concept]

        weight = min(1.0, 0.25 + (count - 1) * 0.15)
        edge_type = "strong" if weight >= 0.7 else "weak"

        self.graph.add_edge(
            concept,
            rule_id,
            relationship="applies_to",
            weight=weight,
            edge_type=edge_type
        )

    def _link_rule_to_dimensions(self, rule_id: str, rule_text: str):

        text = rule_text.lower()

        if any(k in text for k in ["authority", "parent", "pressure", "conflict"]):
            self.graph.add_edge(rule_id, "conflict_interpersonal", relationship="influences", weight=0.7)

        if any(k in text for k in ["guilt", "shame", "torn", "inner"]):
            self.graph.add_edge(rule_id, "conflict_internal", relationship="influences", weight=0.6)

        if any(k in text for k in ["anxiety", "fear", "worry", "nervous"]):
            self.graph.add_edge(rule_id, "anxiety_level", relationship="influences", weight=0.6)

        if any(k in text for k in ["avoid", "withdraw", "suppress", "defense"]):
            self.graph.add_edge(rule_id, "defense", relationship="activates", weight=0.6)

        if any(k in text for k in ["cope", "adjust", "manage", "balance"]):
            self.graph.add_edge(rule_id, "coping_style", relationship="supports", weight=0.6)

    def build_graph(self, rules: List):

        if not rules:
            logger.warning("No rules provided to build_graph")
            return

        with self._lock:
            self.graph.clear()
            self._initialize_core_nodes()
            self._rules_cache.clear()
            self._processed_rule_ids.clear()
            self.concept_counter.clear()

            for idx, rule in enumerate(rules):
                self._add_rule_node(rule, idx)

            min_conn = getattr(self.config, 'GRAPH_MIN_CONNECTIVITY', 1)
            anchor = "core_self"
            if anchor not in self.graph:
                self.graph.add_node(anchor, type="anchor", activation=0.1)
            for node in self.graph.nodes():
                if self.graph.degree(node) == 0 and node != anchor:

                    self.graph.add_edge(node, anchor, relationship="weak", weight=0.1)

        logger.info(f"Graph built with {self.graph.number_of_nodes()} nodes")

    def learn_incremental(self, rules: List):

        if not rules:
            return

        with self._lock:
            for idx, rule in enumerate(rules):
                self._add_rule_node(rule, idx)

    def _extract_concepts_from_rule(self, rule_text: str) -> List[str]:

        keywords = [
            "emotional", "cognitive", "social", "interpersonal",
            "anxiety", "depression", "conflict", "attachment",
            "trauma", "coping", "defense", "ego", "reality"
        ]

        rule_lower = rule_text.lower()
        return [k for k in keywords if k in rule_lower]

    def detect_graph_anomalies(self, min_degree: int = 2) -> List[str]:
        """
        Detect nodes with unusually low connectivity.
        Ignores core system anchors and rule nodes (they are expected to have low degree).
        """

        IGNORE_LOW_CONNECTIVITY = {
            "motivation_system",
            "interpersonal_dynamics",
            "coping_style",
            "defense",
            "conflict_internal",
            "conflict_interpersonal",
            "anxiety_level",
            "anxiety",
            "repression",
            "suppression",
            "avoidance",
            "denial",
            "core_self"
        }

        anomalies = []

        if self.graph is None:
            return anomalies

        for node in self.graph.nodes:
            try:

                if node in IGNORE_LOW_CONNECTIVITY:
                    continue

                if node.startswith("RULE_") or node.startswith("rule_"):
                    continue

                node_data = self.graph.nodes[node]
                if node_data.get("type") == "rule":
                    continue

                if self.graph.degree(node) < min_degree:
                    anomalies.append(node)
            except Exception:
                continue

        return anomalies

    def compute_centrality_metrics(self, top_k: int = 10) -> Dict[str, Any]:

        if self.graph.number_of_nodes() == 0:
            return {}

        degree_centrality = nx.degree_centrality(self.graph)

        def _strip_np(val: str) -> str:
            if isinstance(val, str):
                if val.startswith('n') and len(val) > 1 and val[1].isupper(): return val[1:]
                if val.startswith('p') and len(val) > 1 and val[1].isupper(): return val[1:]
            return str(val)

        top_degree = sorted(
            [(_strip_np(k), v) for k, v in degree_centrality.items()],
            key=lambda x: x[1],
            reverse=True
        )[:top_k]

        return {
            "top_degree_nodes": top_degree,
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges()
        }

    def save(self, filepath: Path):
        """Save graph and data with proper context manager and numpy conversion."""

        def convert_numpy(obj):
            if isinstance(obj, np.generic):
                return obj.item()
            elif isinstance(obj, dict):
                return {k: convert_numpy(v) for k, v in obj.items()}
            elif isinstance(obj, (list, tuple)):
                return [convert_numpy(i) for i in obj]
            return obj

        data = {
            "graph": self.graph,
            "rules_cache": convert_numpy(self._rules_cache),
            "concept_counter": convert_numpy(self.concept_counter),
            "processed_rule_ids": convert_numpy(self._processed_rule_ids)
        }
        with open(filepath, "wb") as f:
            pickle.dump(data, f)

    def load(self, filepath: Path):
        with open(filepath, "rb") as f:
            data = pickle.load(f)

        self.graph = data["graph"]
        self._rules_cache = data["rules_cache"]
        self.concept_counter = data["concept_counter"]
        self._processed_rule_ids = data.get("processed_rule_ids", set())

    def get_scoring_transparency_report(self) -> Dict[str, Any]:

        rules_by_category = defaultdict(int)

        for rule in self._rules_cache:
            rules_by_category[rule.get("category", "general")] += 1

        return {
            "total_rules": len(self._rules_cache),
            "rules_by_category": dict(rules_by_category),
            "overall_approach": "rule-based",
            "generated_at": str(datetime.utcnow())
        }
