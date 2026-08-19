"""
Quantitative Scorer
-------------------
Provides traditional TAT scoring metrics, now augmented with semantic features.
"""

import numpy as np
from typing import Dict, Any
from app.assessments.tat.engines.nlp.enhanced_nlp import EnhancedNLPProcessor
from app.utils.production_utils import round_metric, compute_volatility, compute_affective_integration

class QuantitativeScorer:
    def __init__(self, nlp_processor: EnhancedNLPProcessor):
        self.nlp = nlp_processor

    def score_story(self, story_text: str, events: list = None) -> Dict[str, Any]:
        """
        Compute quantitative scores.
        """

        words = story_text.split()
        word_count = len(words)
        sentences = story_text.count('.') + story_text.count('!') + story_text.count('?')
        sentences = max(sentences, 1)
        avg_sentence_length = word_count / sentences

        sentiment = self.nlp.get_sentiment(story_text)
        valence = sentiment['compound']

        emotions = self.nlp.detect_emotions(story_text)
        primary_emotion = emotions[0][0] if emotions else None

        unique_words = len(set(w.lower() for w in words))
        complexity = min(100, (unique_words / word_count * 100) if word_count > 0 else 0)

        if events:
            num_events = max(len(events), 1)

            ANXIETY_EMOTIONS = {'fear', 'nervousness', 'anxiety', 'sadness',
                                'grief', 'remorse', 'disappointment', 'confusion'}
            CONFLICT_EMOTIONS = {'anger', 'annoyance', 'disgust', 'disapproval'}

            negative_events = 0
            anxiety_emotion_events = 0
            conflict_emotion_events = 0
            for e in events:
                emo = (e.get('emotion') or '').lower()
                val = e.get('valence', 0)
                if val < 0 or emo in ANXIETY_EMOTIONS or emo in CONFLICT_EMOTIONS:
                    negative_events += 1
                if emo in ANXIETY_EMOTIONS:
                    anxiety_emotion_events += 1
                if emo in CONFLICT_EMOTIONS:
                    conflict_emotion_events += 1

            obstacle_events = sum(1 for e in events
                                  if e.get('event_type') in ('obstacle', 'defense'))
            conflict_internal = min(100, ((negative_events + obstacle_events) / num_events) * 50 + 10)

            interpersonal = sum(1 for e in events
                                if e.get('agent') and e.get('target')
                                and (e.get('valence', 0) < 0
                                     or (e.get('emotion') or '').lower() in CONFLICT_EMOTIONS))

            raw_interpersonal = (interpersonal / num_events) * 80 + 5
            max_possible = 80 + 5
            conflict_interpersonal = min(100, (raw_interpersonal / max_possible) * 100)

            agent_events = [e for e in events if e.get('agent')]
            ego_strength = np.mean([e.get('valence', 0) for e in agent_events]) * 50 + 50 if agent_events else 50

            neg_intensities = [abs(e.get('valence', 0)) for e in events if e.get('valence', 0) < 0]
            valence_anxiety = (sum(neg_intensities) / num_events) * 100 if neg_intensities else 0
            emotion_anxiety = (anxiety_emotion_events / num_events) * 80
            anxiety_level = min(100, max(valence_anxiety, emotion_anxiety, max(0, -valence * 50)))

            event_valences = [e.get('valence', 0) for e in events]
            valence_std = float(np.std(event_valences)) if len(event_valences) > 1 else 0.0
            emotional_stability = max(0, min(100, 100 - valence_std * 100))

            peak_anxiety_index = round_metric(max(abs(e.get('valence', 0)) for e in events if e.get('valence', 0) < 0) * 100 if any(e.get('valence', 0) < 0 for e in events) else 0.0)

            emotional_volatility_index = round_metric(compute_volatility(event_valences) * 100)

            mean_neg = float(np.mean([abs(v) for v in event_valences if v < 0])) if any(v < 0 for v in event_valences) else 0.0
            max_neg = max([abs(v) for v in event_valences if v < 0], default=0.0)
            conflict_escalation_flag = bool(max_neg > 1.5 * mean_neg) if mean_neg > 0 else False

            event_emotions = [e.get('emotion', '') for e in events if e.get('emotion')]
            emotional_transition_count = sum(1 for i in range(1, len(event_emotions)) if event_emotions[i] != event_emotions[i-1])

            agents = [e.get('agent') for e in events if e.get('agent')]
            unique_agents = len(set(agents)) if agents else 1
            agent_consistency = min(1.0, len(agents) / num_events) if agents else 0.5
            reality_testing_raw = min(100, (agent_consistency * 70) + (min(unique_agents, 5) / 5 * 30))

            if reality_testing_raw > 90:
                if complexity > 70 and unique_agents >= 2:
                    reality_testing = min(90, reality_testing_raw)
                else:
                    reality_testing = min(88, reality_testing_raw)
            else:
                reality_testing = reality_testing_raw

            structured = sum(1 for e in events if e.get('agent') or e.get('emotion') or e.get('goal'))
            narrative_coherence = min(100, (structured / num_events) * 100)

            self_reflective_tokens = {
                'thought', 'thinking', 'wonder', 'wondered', 'wondering',
                'realize', 'realized', 'realizing', 'felt', 'feeling',
                'decide', 'decided', 'deciding', 'know', 'knew', 'knowing',
                'understand', 'understood', 'understanding', 'believe', 'believed',
                'remember', 'remembered', 'forgot', 'reflect', 'reflected',
                'internal', 'myself', 'himself', 'herself', 'themselves',
                'consider', 'considered', 'judge', 'judged', 'aware', 'notice',
                'evaluate', 'evaluating', 'differentiate', 'perspective', 'monitor',
                'internalize', 'internalized', 'self'
            }

            cognitive_markers = sum(1 for w in words if w.lower() in self_reflective_tokens)

            base_interpersonal = (interpersonal / max(1, num_events)) * 40

            reflective_density = min(1.0, cognitive_markers / max(1, num_events * 2.5))
            reflective_bonus = reflective_density * 60

            social_cognition = min(100.0, max(base_interpersonal, reflective_bonus) + (min(base_interpersonal, reflective_bonus) * 0.5) + 10.0)
        else:
            conflict_internal = 50
            conflict_interpersonal = 50
            ego_strength = 50
            anxiety_level = max(0, -valence * 50)
            emotional_stability = 50
            reality_testing = 50
            narrative_coherence = 50
            social_cognition = 30

        if not events:
            peak_anxiety_index = 0.0
            emotional_volatility_index = 0.0
            conflict_escalation_flag = False
            emotional_transition_count = 0

        affective_integration = compute_affective_integration(
            events if events else [], words
        )

        scores_out = {
            'word_count': word_count,
            'sentence_count': sentences,
            'avg_sentence_length': round_metric(avg_sentence_length),
            'sentiment_compound': round_metric(valence),
            'primary_emotion': primary_emotion,
            'complexity': round_metric(complexity),
            'conflict_internal': round_metric(conflict_internal),
            'conflict_interpersonal': round_metric(conflict_interpersonal),
            'ego_strength': round_metric(ego_strength),
            'hero_ego_strength': round_metric(ego_strength),
            'anxiety_level': round_metric(anxiety_level),
            'emotional_stability': round_metric(emotional_stability),
            'reality_testing': round_metric(reality_testing),
            'narrative_coherence': round_metric(narrative_coherence),
            'social_cognition': round_metric(social_cognition),
            'overall_confidence': round_metric(min(100, word_count * 0.5)),

            'peak_anxiety_index': round_metric(peak_anxiety_index),
            'emotional_volatility_index': round_metric(emotional_volatility_index),
            'conflict_escalation_flag': conflict_escalation_flag,
            'emotional_transition_count': emotional_transition_count,

            'affective_integration': round_metric(affective_integration, 2),
        }

        from app.utils.production_utils import compute_confidence_interval
        n_ev = len(events) if events else 1
        ci_keys = ['conflict_internal', 'conflict_interpersonal', 'ego_strength',
                    'anxiety_level', 'emotional_stability', 'reality_testing',
                    'narrative_coherence', 'social_cognition']
        scores_out['confidence_intervals'] = {
            k: compute_confidence_interval(float(scores_out[k]), n_ev)
            for k in ci_keys if k in scores_out
        }

        dist_notes = []
        if word_count < 50:
            dist_notes.append(f"Short narrative ({word_count} words) — scores may have wider confidence bands")
        if events and len(events) < 3:
            dist_notes.append(f"Low event count ({len(events)}) — dimension granularity may be reduced")
        scores_out['score_distribution_notes'] = dist_notes

        rt_val = scores_out.get('reality_testing', 50)
        rt_ci = scores_out.get('confidence_intervals', {}).get('reality_testing', {})
        rt_note = f"Reality Testing: {rt_val:.1f}"
        if rt_ci:
            rt_note += f" ± {rt_ci.get('margin', 0):.1f}"
        if rt_val > 80:
            rt_note += " — High agent consistency and situated event structure"
        elif rt_val > 40:
            rt_note += " — Balanced narrative coherence"
        else:
            rt_note += " — Limited structural coherence"
        scores_out['reality_testing_justification'] = rt_note

        return scores_out
