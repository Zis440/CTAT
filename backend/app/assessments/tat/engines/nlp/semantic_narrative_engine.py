"""
Semantic Narrative Engine
-------------------------
Converts a TAT story into structured psychological events using only models, no keyword lists.
"""

import spacy
import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict
from .enhanced_nlp import EnhancedNLPProcessor

@dataclass
class NarrativeEvent:
    """Represents a single psychological event in the story."""
    text: str
    event_type: str  # 'intention', 'obstacle', 'emotion', 'action', 'outcome', 'defense', 'resolution'
    agent: Optional[str] = None
    target: Optional[str] = None
    goal: Optional[str] = None
    emotion: Optional[str] = None
    valence: float = 0.0  # -1 to 1
    intensity: float = 0.0
    need_activated: Optional[str] = None
    press_activated: Optional[str] = None
    conflict_intensity: float = 0.0
    defense_mechanism: Optional[str] = None
    resolution_success: Optional[float] = None  # 0-1

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items() if v is not None}


class SemanticNarrativeEngine:
    """
    Parses a story into narrative events using NLP.
    No hardcoded keywords – uses model predictions.
    """

    def __init__(self, nlp_processor: EnhancedNLPProcessor):
        self.nlp = nlp_processor.nlp  # spaCy model
        self.processor = nlp_processor

    def parse_story(self, story_text: str, culture_key: str = None) -> List[NarrativeEvent]:
        """
        Main entry: parse story into events.

        Parameters
        ----------
        story_text : str
            The raw TAT narrative.
        culture_key : str, optional
            Cultural profile key (e.g., 'indian') for code-switching normalization.
            If provided, common regional terms are translated to English before parsing.
        """
        # Apply code-switching normalization if culture is specified
        if culture_key:
            try:
                from app.core.cultural_profiles import normalize_code_switching
                story_text = normalize_code_switching(story_text, culture_key)
            except ImportError:
                pass  # cultural_profiles not available; continue with raw text

        doc = self.nlp(story_text)
        sentences = list(doc.sents)

        events = []
        for sent in sentences:
            sent_events = self._parse_sentence(sent)
            events.extend(sent_events)

        return events

    def _parse_sentence(self, sent: spacy.tokens.Span) -> List[NarrativeEvent]:
        """
        Convert a single sentence into one or more events using models.
        """
        # Get emotions for the sentence
        emotions = self.processor.detect_emotions(sent.text)
        # Get sentiment
        sentiment = self.processor.get_sentiment(sent.text)
        valence = sentiment['compound']

        # Determine primary emotion (if any)
        primary_emotion = emotions[0][0] if emotions else None
        intensity = emotions[0][1] if emotions else 0.0

        # Classify event type using a simple model: we use sentence embeddings
        # and compare to prototypical sentences for each type.
        # For now, we use a heuristic based on dependency structure (still no keywords).
        # In production, you would train a classifier.
        event_type = self._classify_event_type(sent)

        # Extract agent and target using dependency parsing
        agent = self._extract_agent(sent.root)
        target = self._extract_target(sent.root)
        goal = self._extract_goal(sent.root, sent)

        # Create event
        event = NarrativeEvent(
            text=sent.text,
            event_type=event_type,
            agent=agent,
            target=target,
            goal=goal,
            emotion=primary_emotion,
            valence=valence,
            intensity=intensity,
            # Other fields filled later by other engines
        )
        return [event]

    def _classify_event_type(self, sent: spacy.tokens.Span) -> str:
        """
        Use sentence embeddings and similarity to prototype sentences.
        Prototypes are defined below; they are NOT keywords but full sentences.
        """
        # Define prototype sentences for each event type (these are static data, not keywords)
        prototypes = {
            'intention': [
                "The boy wants to become a doctor.",
                "She hopes to find a friend.",
                "They plan to run away.",
                "He desires to be accepted."
            ],
            'obstacle': [
                "But his father refused.",
                "However, she was too poor.",
                "The door was locked.",
                "They faced many difficulties."
            ],
            'emotion': [
                "She felt sad.",
                "He was angry.",
                "They were happy.",
                "Fear gripped him."
            ],
            'action': [
                "He ran to the store.",
                "She picked up the book.",
                "They talked for hours.",
                "The man opened the door."
            ],
            'outcome': [
                "In the end, he succeeded.",
                "Finally, they were reunited.",
                "It turned out well.",
                "She never saw him again."
            ],
            'defense': [
                "He denied everything.",
                "She blamed her sister.",
                "He made excuses.",
                "She ignored the problem."
            ],
            'resolution': [
                "They decided to compromise.",
                "He accepted his fate.",
                "She moved on with her life.",
                "They forgave each other."
            ]
        }
        # Encode prototype sentences
        all_protos = []
        proto_labels = []
        for typ, sentences in prototypes.items():
            all_protos.extend(sentences)
            proto_labels.extend([typ] * len(sentences))
        # Encode the input sentence
        sent_emb = self.processor.get_embeddings([sent.text])[0]
        proto_embs = self.processor.get_embeddings(all_protos)
        # Compute cosine similarities
        similarities = np.dot(proto_embs, sent_emb) / (np.linalg.norm(proto_embs, axis=1) * np.linalg.norm(sent_emb))
        best_idx = np.argmax(similarities)
        return proto_labels[best_idx]

    def _extract_agent(self, root: spacy.tokens.Token) -> Optional[str]:
        """Extract subject of the root verb."""
        for child in root.children:
            if child.dep_ in ("nsubj", "nsubjpass"):
                # Return the whole noun phrase
                return ' '.join([t.text for t in child.subtree])
        return None

    def _extract_target(self, root: spacy.tokens.Token) -> Optional[str]:
        """Extract direct object of the root verb."""
        for child in root.children:
            if child.dep_ in ("dobj", "attr", "pobj"):
                return ' '.join([t.text for t in child.subtree])
        return None

    def _extract_goal(self, root: spacy.tokens.Token, sent: spacy.tokens.Span) -> Optional[str]:
        """Extract goal phrase (e.g., complement clauses after 'to')."""
        for token in sent:
            if token.dep_ == "xcomp" and token.head == root:
                return token.text
        return None