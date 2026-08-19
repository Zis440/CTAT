import json
import logging
import base64
import os
import glob

logger = logging.getLogger(__name__)

STORY_DIMENSIONS = [
    "Hero Identification", "Main Need", "Main Conflict", "Emotional Tone",
    "Outcome", "Social Relationships", "Coping Style", "Future Expectation",
    "Anxiety Level"
]

def _get_image_base64(card_id: str) -> str:
    """Finds the image for the given card_id and returns it as a base64 string."""
    try:
        file_map = {
            "card_1": "Card 3.webp",
            "card_2": "Card 6.webp",
            "card_3": "Card 11.webp",
            "card_4": "Card 28.webp"
        }
        filename = file_map.get(card_id)
        if not filename:
            logger.warning(f"No image mapping found for {card_id}")
            return None
            
        filepath = os.path.abspath(os.path.join(
            os.path.dirname(__file__), 
            '..', '..', '..', '..', '..', '..', 'frontend', 'public', 'story_cards', 
            filename
        ))
        
        if not os.path.exists(filepath):
            logger.warning(f"Image not found on disk: {filepath}")
            return None
            
        # Attempt to convert WEBP to JPG if Pillow is installed
        if filepath.lower().endswith('.webp'):
            jpg_path = filepath.rsplit('.', 1)[0] + '.jpg'
            if not os.path.exists(jpg_path):
                try:
                    from PIL import Image
                    with Image.open(filepath) as img:
                        img.convert('RGB').save(jpg_path, 'JPEG')
                    filepath = jpg_path
                    logger.info(f"Converted {filepath} to JPEG for LLaVA compatibility.")
                except ImportError:
                    logger.warning("Pillow not installed; sending WEBP directly to Ollama.")
                except Exception as e:
                    logger.warning(f"Failed to convert WEBP: {e}")
            else:
                filepath = jpg_path
                
        return filepath
    except Exception as e:
        logger.warning(f"Failed to resolve image for {card_id}: {e}")
        return None

def calculate_context_scores(dimensions: dict, patient_context: dict) -> dict:
    """Calculates all scores based on the Context-Aware Architecture formulas."""
    if not patient_context:
        patient_context = {}
        
    # Default parameters if not provided
    age_group = patient_context.get("age_group", "Adult")
    living_condition = patient_context.get("living_condition", "Neutral")
    environment = patient_context.get("environment_type", "Neutral")
    ses = patient_context.get("socioeconomic_status", "Middle")
    
    # 1. Base Story Score
    total_dim = 0
    for dim in STORY_DIMENSIONS:
        total_dim += dimensions.get(dim, 50)
    base_story_score = total_dim / max(1, len(STORY_DIMENSIONS))
    
    # 2. Age Congruence Score (Simplified approximation as LLM extracting themes is complex, 
    # we'll use a placeholder heuristic or rely on LLM to provide 'Observed Age-Appropriate Themes')
    observed_themes = dimensions.get("Observed Age-Appropriate Themes", 50)
    expected_themes = 100 # Normalization baseline
    age_congruence_score = min(100, (observed_themes / expected_themes) * 100)
    
    # 3. Living Condition Stress Index
    lc_map = {
        "Highly Supportive": 20,
        "Moderately Supportive": 40,
        "Neutral": 50,
        "Conflict Prone": 70,
        "Highly Stressful": 90,
        "Living Alone": 60,
        "With Roommates": 55,
        "Care Facility": 75
    }
    # Find closest match or default to 50
    lc_index = lc_map.get(living_condition, 50)
    
    # 4. Environmental Pressure Score (EPS)
    env_map = {
        "Highly Supportive": 20,
        "Moderately Supportive": 40,
        "Neutral": 50,
        "Conflict Prone": 70,
        "Highly Stressful": 90,
        "Financially Challenged": 80,
        "Academically Pressured": 75,
        "Socially Isolated": 85,
        "High Achievement Environment": 60,
        "Trauma Exposed Environment": 95,
        "Corporate/Office": 60,
        "Remote/Work From Home": 45,
        "High-Risk/Industrial": 80,
        "Clinical": 70
    }
    eps = env_map.get(environment, 50)
    
    # 5. Family Support Score (FSS)
    fss = 100 - lc_index # Inverse relationship approximation
    
    # 6. Socioeconomic Adjustment
    ses_map = {
        "Low": 20,
        "Lower Middle": 40,
        "Middle": 60,
        "Upper Middle": 80,
        "High": 100
    }
    ses_score = ses_map.get(ses, 60)
    
    # 7. Psychological Context Score (PCS)
    pcs = (
        (0.30 * lc_index) +
        (0.25 * eps) +
        (0.20 * age_congruence_score) +
        (0.15 * fss) +
        (0.10 * ses_score)
    )
    
    # 8. Final Interpretation Score
    final_score = (0.80 * base_story_score) + (0.20 * pcs)
    
    return {
        "BaseStoryScore": round(base_story_score, 2),
        "AgeCongruenceScore": round(age_congruence_score, 2),
        "LivingConditionStressIndex": round(lc_index, 2),
        "EnvironmentalPressureScore": round(eps, 2),
        "FamilySupportScore": round(fss, 2),
        "PsychologicalContextScore": round(pcs, 2),
        "FinalInterpretationScore": round(final_score, 2)
    }

def get_story_traits(stories_data: list, patient_context: dict = None) -> dict:
    """
    Evaluates Story Assessments and applies Context-Aware Scoring.
    """
    if not stories_data or not any(s.get("story_text", "").strip() for s in stories_data):
        dims = _get_fallback_dimensions()
        scores = calculate_context_scores(dims, patient_context)
        return {"dimensions": dims, "scores": scores, "narrative_summary": "Insufficient data for full analysis."}

    combined_stories = ""
    images = []
    
    for idx, data in enumerate(stories_data):
        card_id = data.get("card_id", f"card_{idx+1}")
        story = data.get("story_text", "").strip()
        if not story:
            continue
            
        combined_stories += f"--- Story {idx+1} (Based on Image {idx+1}) ---\n" \
                            f"USER'S WRITTEN STORY:\n{story}\n\n"
        
        img_b64 = _get_image_base64(card_id)
        if img_b64:
            images.append(img_b64)

    prompt = (
        "You are an expert clinical psychologist evaluating a Story Assessment.\n"
        "INSTRUCTIONS:\n"
        "Evaluate the user's stories collectively. Extract the following 9 dimensions and score them from 0 to 100.\n"
        "Dimensions: Hero Identification, Main Need, Main Conflict, Emotional Tone, Outcome, Social Relationships, Coping Style, Future Expectation, Anxiety Level.\n"
        "Additionally, provide a value for 'Observed Age-Appropriate Themes' (0-100).\n"
        "Finally, write a 'Context-Aware Narrative Summary' (a short paragraph) integrating these findings.\n\n"
        f"{combined_stories}\n\n"
        "Return the result as a valid JSON object where keys are the dimension names and values are integers (0-100). The summary should be a string key 'narrative_summary'.\n"
        "Example:\n"
        '{"Hero Identification": 70, "Main Need": 60, "Observed Age-Appropriate Themes": 80, "narrative_summary": "The patient..."}'
    )

    try:
        import os
        from ollama import Client
        ollama_host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")
        client = Client(host=ollama_host)
        
        message = {'role': 'user', 'content': prompt}
        # Removed images to dramatically speed up generation. 
        # The projective text written by the user is sufficient for the analysis.
            
        logger.info(f"Sending text to Ollama llama3 model for rapid analysis...")
        response = client.chat(model='llama3', messages=[message], format='json')

        content = response['message']['content']
        json_start = content.find('{')
        json_end = content.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            json_str = content[json_start:json_end]
            # Try cleaning up invalid escape sequences like \' which LLMs often generate
            json_str = json_str.replace("\\'", "'")
            parsed = json.loads(json_str)
            
            # Ensure dimensions are present
            dimensions = {}
            for dim in STORY_DIMENSIONS + ["Observed Age-Appropriate Themes"]:
                val = parsed.get(dim, 50)
                try:
                    dimensions[dim] = int(val)
                except:
                    dimensions[dim] = 50
                    
            narrative = parsed.get("narrative_summary", "Analysis completed.")
            
            # Compute math scores
            scores = calculate_context_scores(dimensions, patient_context)
            
            return {
                "dimensions": dimensions,
                "scores": scores,
                "narrative_summary": narrative
            }
        else:
            logger.warning(f"Ollama response did not contain valid JSON: {content}")
            dims = _get_fallback_dimensions()
            scores = calculate_context_scores(dims, patient_context)
            return {"dimensions": dims, "scores": scores, "narrative_summary": "Failed to parse analysis."}

    except Exception as e:
        logger.warning(f"Ollama LLaVA analysis unavailable ({e}), using fallback.")
        dims = _get_fallback_dimensions()
        scores = calculate_context_scores(dims, patient_context)
        return {"dimensions": dims, "scores": scores, "narrative_summary": "Analysis unavailable."}

def _get_fallback_dimensions() -> dict:
    """Template-based fallback when Ollama is unavailable."""
    return {
        "Hero Identification": 50,
        "Main Need": 50,
        "Main Conflict": 50,
        "Emotional Tone": 50,
        "Outcome": 50,
        "Social Relationships": 50,
        "Coping Style": 50,
        "Future Expectation": 50,
        "Anxiety Level": 50,
        "Observed Age-Appropriate Themes": 50
    }
