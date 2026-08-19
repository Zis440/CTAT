
import argparse
import base64
import hashlib
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
BACKEND_ROOT = SCRIPT_DIR.parent
DATA_DIR = BACKEND_ROOT / "data"
CARDS_DIR = DATA_DIR / "tat_cards"
ANNOTATIONS_FILE = DATA_DIR / "tat_vision_annotations.json"

OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

ANNOTATION_PROMPT = """You are a clinical psychologist analyzing a Thematic Apperception Test (TAT) card.
This is a grayscale illustration from the 1930s-1940s used in psychological assessment.

Analyze this image OBJECTIVELY and provide a structured description. Report ONLY what you can see — do not infer emotions or stories.

Respond in this EXACT JSON format (no markdown, no extra text):
{
  "people": [
    {
      "description": "brief description of this person",
      "approximate_age": "child/adolescent/young_adult/middle_aged/elderly",
      "apparent_gender": "male/female/ambiguous",
      "posture": "standing/sitting/lying/crouching/leaning/other",
      "facial_expression": "describe what you see or 'not visible'",
      "position_in_scene": "foreground/midground/background/left/right/center"
    }
  ],
  "objects": [
    {
      "name": "object name",
      "description": "brief description",
      "position": "where in the scene",
      "clinical_relevance": "none/low/medium/high"
    }
  ],
  "scene": {
    "setting": "indoor/outdoor/ambiguous",
    "environment": "describe the location (room, field, etc.)",
    "lighting": "bright/dim/dark/mixed/dramatic",
    "atmosphere": "describe the overall visual mood"
  },
  "interactions": [
    {
      "between": "who is interacting with whom",
      "type": "physical/visual/spatial/none",
      "description": "what the interaction looks like"
    }
  ],
  "spatial_layout": "describe the overall composition and arrangement of elements",
  "people_count": 0,
  "key_visual_elements": ["list", "of", "most", "notable", "elements"]
}"""

def compute_file_hash(filepath: str) -> str:
    """Compute SHA-256 hash of file contents."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return f"sha256:{h.hexdigest()[:16]}"

def load_annotations() -> dict:
    """Load existing annotations from disk."""
    if ANNOTATIONS_FILE.exists():
        try:
            with open(ANNOTATIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"  ⚠ Could not load existing annotations: {e}")
    return {}

def save_annotations(annotations: dict):
    """Save annotations to disk with pretty formatting."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(ANNOTATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(annotations, f, indent=2, ensure_ascii=False)
    print(f"  💾 Saved to {ANNOTATIONS_FILE}")

def find_card_images() -> dict:
    """Discover all TAT card images in the data directory.
    Returns dict of card_id -> image_path."""
    cards = {}
    if not CARDS_DIR.exists():
        print(f"  ❌ Cards directory not found: {CARDS_DIR}")
        return cards

    for f in sorted(CARDS_DIR.iterdir()):
        if f.suffix.lower() in IMAGE_EXTENSIONS:
            card_id = f.stem

            if card_id not in cards:
                cards[card_id] = str(f)

    return cards

def image_to_base64(image_path: str) -> str:
    """Read image and encode as base64 string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

def call_ollama_vlm(image_path: str, model: str = "llava:7b", timeout: int = 300) -> dict:
    """Send image + prompt to Ollama VLM and parse JSON response."""
    import urllib.request
    import urllib.error

    img_b64 = image_to_base64(image_path)

    payload = json.dumps({
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": ANNOTATION_PROMPT,
                "images": [img_b64]
            }
        ],
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 2048,
        }
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{OLLAMA_BASE_URL}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as e:
        raise ConnectionError(
            f"Could not connect to Ollama at {OLLAMA_BASE_URL}. "
            f"Is Ollama running? Error: {e}"
        )

    content = result.get("message", {}).get("content", "")
    if not content:
        raise ValueError("Ollama returned empty response")

    json_text = content.strip()
    if json_text.startswith("```"):

        lines = json_text.split("\n")
        start = next((i for i, l in enumerate(lines) if l.strip().startswith("{")), 0)
        end = next((i for i in range(len(lines) - 1, -1, -1) if l.strip().startswith("}")), len(lines))

        json_text = "\n".join(lines)

        json_text = json_text.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError:

        brace_start = json_text.find("{")
        brace_end = json_text.rfind("}") + 1
        if brace_start >= 0 and brace_end > brace_start:
            try:
                parsed = json.loads(json_text[brace_start:brace_end])
            except json.JSONDecodeError:
                print(f"  ⚠ Could not parse VLM response as JSON. Raw response saved.")
                parsed = {"raw_response": content, "parse_error": True}
        else:
            parsed = {"raw_response": content, "parse_error": True}

    return parsed

def annotate_card(card_id: str, image_path: str, model: str, annotations: dict,
                  force: bool = False) -> bool:
    """Annotate a single card. Returns True if annotation was updated."""
    file_hash = compute_file_hash(image_path)

    existing = annotations.get(card_id)
    if existing and not force:
        if existing.get("file_hash") == file_hash:
            print(f"  ⏭️  {card_id}: unchanged (hash match) — skipping")
            return False

    print(f"  🔍 {card_id}: Annotating with {model}...")
    start = time.time()

    try:
        vlm_result = call_ollama_vlm(image_path, model=model)
    except Exception as e:
        print(f"  ❌ {card_id}: VLM failed — {e}")
        return False

    elapsed = time.time() - start

    annotation = {
        "file_hash": file_hash,
        "image_path": str(image_path),
        "annotated_at": datetime.now().isoformat(),
        "model_used": model,
        "annotation_time_seconds": round(elapsed, 1),

        "people": vlm_result.get("people", []),
        "people_count": vlm_result.get("people_count", len(vlm_result.get("people", []))),
        "objects": vlm_result.get("objects", []),
        "scene": vlm_result.get("scene", {}),
        "interactions": vlm_result.get("interactions", []),
        "spatial_layout": vlm_result.get("spatial_layout", ""),
        "key_visual_elements": vlm_result.get("key_visual_elements", []),

        "detected_entities": _build_detected_entities(vlm_result),
        "has_vision_data": True,
        "raw_detections": (
            len(vlm_result.get("people", []))
            + len(vlm_result.get("objects", []))
        ),
    }

    if vlm_result.get("parse_error"):
        annotation["parse_error"] = True
        annotation["raw_response"] = vlm_result.get("raw_response", "")

    annotations[card_id] = annotation
    print(f"  ✅ {card_id}: Done ({elapsed:.1f}s) — {annotation['people_count']} people, "
          f"{len(annotation['objects'])} objects")
    return True

def _build_detected_entities(vlm_result: dict) -> list:
    """Convert VLM output to the detected_entities format the engine expects."""
    entities = []

    for p in vlm_result.get("people", []):
        entities.append({
            "entity": "person",
            "confidence": 0.95,
            "source": "vlm",
            "description": p.get("description", ""),
            "posture": p.get("posture", ""),
            "expression": p.get("facial_expression", ""),
            "age_group": p.get("approximate_age", ""),
            "gender": p.get("apparent_gender", ""),
            "position": p.get("position_in_scene", ""),
        })

    for o in vlm_result.get("objects", []):
        entities.append({
            "entity": o.get("name", "unknown"),
            "confidence": 0.90,
            "source": "vlm",
            "description": o.get("description", ""),
            "position": o.get("position", ""),
            "clinical_relevance": o.get("clinical_relevance", "none"),
        })

    return entities

def main():
    parser = argparse.ArgumentParser(description="Annotate TAT cards with VLM")
    parser.add_argument("--force", action="store_true",
                        help="Re-annotate all cards regardless of hash")
    parser.add_argument("--card", type=str, default=None,
                        help="Annotate a single card by ID (e.g., Card_6)")
    parser.add_argument("--model", type=str, default="llava:7b",
                        help="Ollama VLM model to use (default: llava:7b)")
    args = parser.parse_args()

    print("=" * 60)
    print("TAT Card Visual Annotation — VLM Pipeline")
    print("=" * 60)

    cards = find_card_images()
    if not cards:
        print("❌ No card images found. Exiting.")
        sys.exit(1)
    print(f"\n📁 Found {len(cards)} card images in {CARDS_DIR}")

    if args.card:
        if args.card in cards:
            cards = {args.card: cards[args.card]}
        else:
            print(f"❌ Card '{args.card}' not found. Available: {list(cards.keys())}")
            sys.exit(1)

    annotations = load_annotations()
    print(f"📋 Existing annotations: {len(annotations)} cards\n")

    updated = 0
    total = len(cards)
    for i, (card_id, image_path) in enumerate(cards.items(), 1):
        print(f"[{i}/{total}] Processing {card_id}...")
        if annotate_card(card_id, image_path, args.model, annotations, force=args.force):
            updated += 1

            save_annotations(annotations)

    print(f"\n{'=' * 60}")
    print(f"✅ Complete: {updated} cards annotated, {total - updated} skipped (unchanged)")
    print(f"📄 Annotations file: {ANNOTATIONS_FILE}")
    print(f"{'=' * 60}")

if __name__ == "__main__":
    main()
