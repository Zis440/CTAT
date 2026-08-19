"""
VisualAnalysisEngine v2.0 — VLM-Powered + Manual Facts Hybrid

PRIMARY:  Pre-computed VLM annotations from tat_vision_annotations.json
          (auto-generated at startup via Ollama LLaVA for new/changed cards)
FALLBACK: Hardcoded manual facts for all 20 standard TAT cards
LEGACY:   Faster R-CNN still available via analyze_image_cnn() if needed

Change detection via SHA-256 file hashing ensures annotations stay in sync
with actual card images. Auto-annotation runs in a background thread so the
server starts instantly — cards are upgraded silently as LLaVA processes them.
"""

import os
import json
import base64
import hashlib
import logging
import threading
import urllib.request
import urllib.error
from pathlib import Path
from PIL import Image

logger = logging.getLogger(__name__)


def _image_to_base64(image_path: str) -> str:
    """Read image file and return base64-encoded string."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _parse_vlm_json(content: str) -> dict:
    """Extract and parse JSON from a VLM response, handling markdown fences."""
    text = content.strip()
    # Strip markdown fences if present
    if "```" in text:
        text = text.replace("```json", "").replace("```", "").strip()
    # Find outermost JSON object
    start = text.find("{")
    end = text.rfind("}") + 1
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass
    return {"parse_error": True, "raw_response": content}


# Supported image extensions (priority order)
_IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"]

# Clinical annotation prompt for LLaVA
_ANNOTATION_PROMPT = """You are a clinical psychologist analyzing a Thematic Apperception Test (TAT) card.
This is a grayscale illustration from the 1930s-1940s used in psychological assessment.

Analyze this image OBJECTIVELY and provide a structured description. Report ONLY what you can see — do not infer emotions or stories.

Respond ONLY with valid JSON in this EXACT format (no markdown, no extra text):
{
  "people": [
    {
      "description": "brief description of this person",
      "approximate_age": "child/adolescent/young_adult/middle_aged/elderly",
      "apparent_gender": "male/female/ambiguous",
      "posture": "standing/sitting/lying/crouching/leaning/other",
      "facial_expression": "describe what you see or not visible",
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
    "environment": "describe the location",
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
  "spatial_layout": "describe the overall composition",
  "people_count": 0,
  "key_visual_elements": ["list", "of", "most", "notable", "elements"]
}"""

try:
    import torch
    from torchvision.models.detection import fasterrcnn_resnet50_fpn, FasterRCNN_ResNet50_FPN_Weights
    import torchvision.transforms.functional as F
    _TORCH_AVAILABLE = True
except ImportError:
    _TORCH_AVAILABLE = False


class VisualAnalysisEngine:
    """
    Hybrid engine for extracting objective visual facts from TAT cards.

    Priority order:
    1. VLM annotations (tat_vision_annotations.json) — richest data
       Auto-updated at startup via Ollama LLaVA for new/changed cards.
    2. Manual facts table — authoritative baseline for standard TAT cards
    3. CNN (Faster R-CNN) — legacy fallback for unrecognized images
    """

    # Lock to prevent concurrent writes to annotations file
    _save_lock = threading.Lock()

    def __init__(self, config, enable_cnn: bool = False,
                 ollama_url: str = "http://127.0.0.1:11434",
                 vlm_model: str = "llava:7b"):
        self.config = config
        self._ollama_url = ollama_url
        self._vlm_model = vlm_model
        self._auto_annotate_thread: threading.Thread | None = None
        self.cache_dir = self.config.MODEL_CACHE_DIR / "vision_cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # VLM annotations (primary source)
        # __file__ = backend/app/engines/visual/visual_analysis_engine.py → 4x parent = backend/
        self._backend_root = Path(__file__).parent.parent.parent.parent.resolve()
        self._cards_dir = self._backend_root / "data" / "tat_cards"
        self._annotations_file = self._backend_root / "data" / "tat_vision_annotations.json"
        self.vlm_annotations = self._load_vlm_annotations()

        # CNN (only if explicitly enabled — saves ~200MB RAM)
        self.cnn_model = None
        self.cnn_weights = None
        self.cnn_categories = None
        self._enable_cnn = enable_cnn
        if enable_cnn:
            self._initialize_cnn()

        # Legacy cache for CNN results
        self._cnn_cache_file = self.cache_dir / "tat_vision_features.json"
        self._cnn_cache = {}
        if enable_cnn:
            self._load_cnn_cache()

    # =========================================================================
    # VLM ANNOTATION LOADING
    # =========================================================================

    def _load_vlm_annotations(self) -> dict:
        """Load pre-computed VLM annotations from disk."""
        if self._annotations_file.exists():
            try:
                with open(self._annotations_file, "r", encoding="utf-8") as f:
                    annotations = json.load(f)
                count = len(annotations)
                if count > 0:
                    logger.info(f"VLM annotations loaded: {count} cards")
                    print(f"  [VLM] Annotations loaded: {count} cards")
                return annotations
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Could not load VLM annotations: {e}")
        else:
            logger.info("No VLM annotations file found — using manual facts only")
        return {}

    # =========================================================================
    # AUTO-ANNOTATION (background thread)
    # =========================================================================

    def start_auto_annotation(self):
        """
        Scan the cards directory for new or changed images and annotate them
        using Ollama LLaVA in a background thread. Returns immediately — the
        server is NOT blocked while annotation runs.

        Call this once from main.py after the engine is initialized.
        """
        if self._auto_annotate_thread and self._auto_annotate_thread.is_alive():
            logger.info("Auto-annotation already running — skipping duplicate start")
            return

        self._auto_annotate_thread = threading.Thread(
            target=self._auto_annotate_worker,
            name="vlm-auto-annotate",
            daemon=True  # Won't block server shutdown
        )
        self._auto_annotate_thread.start()
        logger.info("[VLM] Auto-annotation started in background")
        print("  [VLM] Auto-annotation started in background thread")

    def _auto_annotate_worker(self):
        """Background worker: find and annotate new/changed cards."""
        try:
            cards = self._discover_card_images()
            if not cards:
                logger.info("Auto-annotation: no card images found")
                return

            pending = []
            for card_id, image_path in cards.items():
                current_hash = self._compute_file_hash(image_path)
                stored = self.vlm_annotations.get(card_id, {})
                if stored.get("file_hash") != current_hash:
                    pending.append((card_id, image_path, current_hash))

            if not pending:
                print("  [OK] VLM annotations up-to-date - no cards need re-annotation")
                logger.info("Auto-annotation: all cards up-to-date")
                return

            print(f"  [VLM] Auto-annotation: {len(pending)} card(s) need annotation: "
                  f"{[c for c, _, _ in pending]}")

            # Check Ollama + LLaVA availability before processing
            if not self._check_ollama_available():
                print(f"  [WARN] Auto-annotation: Ollama not reachable at {self._ollama_url} - skipped")
                logger.warning("Auto-annotation skipped: Ollama not reachable")
                return

            if not self._check_model_available(self._vlm_model):
                print(f"  [WARN] Auto-annotation: model '{self._vlm_model}' not found in Ollama")
                print(f"    Run: ollama pull {self._vlm_model}")
                logger.warning(f"Auto-annotation skipped: model {self._vlm_model} not available")
                return

            updated = 0
            for card_id, image_path, current_hash in pending:
                try:
                    print(f"  [VLM] Auto-annotating {card_id} with {self._vlm_model}...")
                    vlm_result = self._call_vlm(image_path)
                    annotation = self._build_annotation(card_id, image_path, current_hash, vlm_result)

                    # Thread-safe update of in-memory + on-disk annotations
                    with VisualAnalysisEngine._save_lock:
                        self.vlm_annotations[card_id] = annotation
                        self._save_vlm_annotations()

                    updated += 1
                    print(f"  [OK] {card_id} annotated: "
                          f"{annotation['people_count']} people, "
                          f"{len(annotation['objects'])} objects")

                except Exception as e:
                    logger.warning(f"Auto-annotation failed for {card_id}: {e}")
                    print(f"  [WARN] Auto-annotation failed for {card_id}: {e}")

            print(f"  [DONE] Auto-annotation complete: {updated}/{len(pending)} cards annotated")

        except Exception as e:
            logger.error(f"Auto-annotation worker crashed: {e}")
            print(f"  [ERR] Auto-annotation worker error: {e}")

    def _discover_card_images(self) -> dict:
        """Scan cards directory and return {card_id: image_path}."""
        cards = {}
        if not self._cards_dir.exists():
            return cards
        for f in sorted(self._cards_dir.iterdir()):
            if f.suffix.lower() in _IMAGE_EXTENSIONS:
                card_id = f.stem  # e.g., "Card_6"
                if card_id not in cards:  # first match wins (priority order)
                    cards[card_id] = str(f)
        return cards

    def _check_ollama_available(self, timeout: int = 5) -> bool:
        """Quick ping to Ollama server."""
        try:
            req = urllib.request.Request(f"{self._ollama_url}/api/tags")
            with urllib.request.urlopen(req, timeout=timeout):
                return True
        except Exception:
            return False

    def _check_model_available(self, model: str, timeout: int = 5) -> bool:
        """Check if a specific model is available in Ollama."""
        try:
            req = urllib.request.Request(f"{self._ollama_url}/api/tags")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name", "") for m in data.get("models", [])]
                return any(model in m for m in models)
        except Exception:
            return False

    def _call_vlm(self, image_path: str, timeout: int = 300) -> dict:
        """Send image to Ollama LLaVA and return parsed JSON."""
        img_b64 = _image_to_base64(image_path)
        payload = json.dumps({
            "model": self._vlm_model,
            "messages": [{
                "role": "user",
                "content": _ANNOTATION_PROMPT,
                "images": [img_b64]
            }],
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 2048}
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self._ollama_url}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        content = result.get("message", {}).get("content", "")
        if not content:
            raise ValueError("Ollama returned empty response")
        return _parse_vlm_json(content)

    def _build_annotation(self, card_id: str, image_path: str,
                          file_hash: str, vlm_result: dict) -> dict:
        """Convert VLM output into a full annotation entry."""
        import time
        people = vlm_result.get("people", [])
        objects = vlm_result.get("objects", [])
        return {
            "file_hash": file_hash,
            "image_path": image_path,
            "annotated_at": __import__("datetime").datetime.now().isoformat(),
            "model_used": self._vlm_model,
            "people": people,
            "people_count": vlm_result.get("people_count", len(people)),
            "objects": objects,
            "scene": vlm_result.get("scene", {}),
            "interactions": vlm_result.get("interactions", []),
            "spatial_layout": vlm_result.get("spatial_layout", ""),
            "key_visual_elements": vlm_result.get("key_visual_elements", []),
            "detected_entities": self._build_detected_entities(people, objects),
            "has_vision_data": True,
            "raw_detections": len(people) + len(objects),
            **({
                "parse_error": True,
                "raw_response": vlm_result.get("raw_response", "")
            } if vlm_result.get("parse_error") else {})
        }

    def _build_detected_entities(self, people: list, objects: list) -> list:
        """Convert VLM people/objects to the detected_entities format."""
        entities = []
        for p in people:
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
        for o in objects:
            entities.append({
                "entity": o.get("name", "unknown"),
                "confidence": 0.90,
                "source": "vlm",
                "description": o.get("description", ""),
                "position": o.get("position", ""),
                "clinical_relevance": o.get("clinical_relevance", "none"),
            })
        return entities

    def _save_vlm_annotations(self):
        """Persist VLM annotations to disk (call inside _save_lock)."""
        try:
            with open(self._annotations_file, "w", encoding="utf-8") as f:
                json.dump(self.vlm_annotations, f, indent=2, ensure_ascii=False)
        except IOError as e:
            logger.error(f"Failed to save VLM annotations: {e}")

    # =========================================================================
    def _compute_file_hash(self, filepath: str) -> str:
        """Compute SHA-256 hash for change detection."""
        h = hashlib.sha256()
        try:
            with open(filepath, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    h.update(chunk)
            return f"sha256:{h.hexdigest()[:16]}"
        except IOError:
            return ""

    def _is_annotation_current(self, card_id: str, image_path: str) -> bool:
        """Check if VLM annotation matches the current image file."""
        annotation = self.vlm_annotations.get(card_id)
        if not annotation:
            return False
        stored_hash = annotation.get("file_hash", "")
        if not stored_hash:
            return True  # No hash stored — trust the annotation
        current_hash = self._compute_file_hash(image_path)
        return stored_hash == current_hash

    # =========================================================================
    # MAIN ANALYSIS METHOD
    # =========================================================================

    def analyze_image(self, image_path: str, card_id: str) -> dict:
        """
        Analyze a TAT card image using the best available data source.

        Priority:
        1. VLM annotations (if available and hash matches)
        2. Manual facts (hardcoded for all 20 standard TAT cards)
        3. CNN inference (only if enabled)
        """
        card_id_str = str(card_id)

        # --- Priority 1: VLM annotations ---
        if card_id_str in self.vlm_annotations:
            annotation = self.vlm_annotations[card_id_str]
            # Hash check: if image changed since annotation, fall through
            if self._is_annotation_current(card_id_str, image_path):
                result = self._vlm_to_result(annotation)
                # Still supplement with manual facts (adds expected_figure_types)
                result = self._supplement_with_manual_facts(card_id, result)
                return result
            else:
                logger.warning(
                    f"VLM annotation for {card_id_str} is stale (image changed). "
                    f"Run: python scripts/annotate_tat_cards.py --card {card_id_str}"
                )

        # --- Priority 2: Manual facts only (no CNN needed) ---
        result = self._empty_result()
        result = self._supplement_with_manual_facts(card_id, result)

        # If manual facts provided data, we're good
        if result["detected_entities"]:
            result["has_vision_data"] = True
            result["raw_detections"] = len(result["detected_entities"])
            # Estimate people_count from manual facts
            people_keywords = {"boy", "girl", "man", "woman", "figure"}
            for entity in result["detected_entities"]:
                name = entity.get("entity", "").lower()
                if any(kw in name for kw in people_keywords):
                    result["people_count"] += 1
            return result

        # --- Priority 3: CNN fallback (only if enabled) ---
        if self._enable_cnn and self.cnn_model:
            return self.analyze_image_cnn(image_path, card_id)

        return result

    # =========================================================================
    # VLM RESULT CONVERSION
    # =========================================================================

    def _vlm_to_result(self, annotation: dict) -> dict:
        """Convert VLM annotation to the standard result format."""
        return {
            "detected_entities": annotation.get("detected_entities", []),
            "people_count": annotation.get("people_count", 0),
            "raw_detections": annotation.get("raw_detections", 0),
            "has_vision_data": True,
            # Rich VLM fields
            "people": annotation.get("people", []),
            "objects": annotation.get("objects", []),
            "scene": annotation.get("scene", {}),
            "interactions": annotation.get("interactions", []),
            "spatial_layout": annotation.get("spatial_layout", ""),
            "key_visual_elements": annotation.get("key_visual_elements", []),
            # Metadata
            "source": "vlm",
            "model_used": annotation.get("model_used", "unknown"),
            "annotated_at": annotation.get("annotated_at", ""),
        }

    # =========================================================================
    # EMPTY RESULT
    # =========================================================================

    def _empty_result(self) -> dict:
        return {
            "detected_entities": [],
            "people_count": 0,
            "raw_detections": 0,
            "has_vision_data": False,
        }

    # =========================================================================
    # MANUAL FACTS (ALL 20 STANDARD TAT CARDS)
    # =========================================================================

    def _supplement_with_manual_facts(self, card_id: str, result: dict) -> dict:
        """
        Inject known objective facts for all 20 standard TAT cards.
        Also adds expected_figure_types so downstream analysis can cross-reference
        detected figure_classifications against clinically expected archetypes.
        Confidence is 1.0 for manual facts (authoritative).
        """
        card_id_str = str(card_id).lower().replace("card", "").replace("_", "").strip()

        # === All 20 standard TAT cards: objects + expected figure types ===
        all_cards = {
            "1": {
                "objects": ["violin", "boy"],
                "expected_figure_types": ["Hero"],
            },
            "2": {
                "objects": ["farm", "horse", "books", "pregnant woman", "young woman"],
                "expected_figure_types": ["Hero", "Authority Figure", "Caregiver"],
            },
            "3bm": {
                "objects": ["revolver", "object on floor", "figure slumped"],
                "expected_figure_types": ["Hero"],
            },
            "3gf": {
                "objects": ["woman at door", "open door"],
                "expected_figure_types": ["Hero"],
            },
            "4": {
                "objects": ["woman", "man", "pin-up picture"],
                "expected_figure_types": ["Hero", "Romantic Figure"],
            },
            "5": {
                "objects": ["woman", "doorway", "room", "lamp"],
                "expected_figure_types": ["Authority Figure", "Caregiver"],
            },
            "6bm": {
                "objects": ["older woman", "young man", "window"],
                "expected_figure_types": ["Hero", "Authority Figure"],
            },
            "6gf": {
                "objects": ["woman seated", "older man", "pipe"],
                "expected_figure_types": ["Hero", "Authority Figure"],
            },
            "7bm": {
                "objects": ["older man", "younger man", "conversation"],
                "expected_figure_types": ["Hero", "Authority Figure"],
            },
            "7gf": {
                "objects": ["older woman", "girl", "doll", "book"],
                "expected_figure_types": ["Hero", "Caregiver"],
            },
            "8bm": {
                "objects": ["rifle", "surgery", "young man", "operating scene"],
                "expected_figure_types": ["Hero", "Authority Figure", "Antagonist"],
            },
            "8gf": {
                "objects": ["woman", "window", "daydreaming posture"],
                "expected_figure_types": ["Hero"],
            },
            "9bm": {
                "objects": ["four men", "lying in grass", "rifles"],
                "expected_figure_types": ["Hero", "Peer"],
            },
            "9gf": {
                "objects": ["two women", "beach", "running woman"],
                "expected_figure_types": ["Hero", "Antagonist"],
            },
            "10": {
                "objects": ["man", "woman", "embrace"],
                "expected_figure_types": ["Hero", "Romantic Figure"],
            },
            "11": {
                "objects": ["rocky road", "cliff", "serpent", "strange creatures"],
                "expected_figure_types": ["Threat Object", "Symbolic Object"],
            },
            "12m": {
                "objects": ["boy on bed", "old man", "hand over face"],
                "expected_figure_types": ["Hero", "Authority Figure"],
            },
            "12f": {
                "objects": ["old woman", "young woman", "portrait"],
                "expected_figure_types": ["Hero", "Authority Figure"],
            },
            "13mf": {
                "objects": ["woman in bed", "man standing", "books", "lamp"],
                "expected_figure_types": ["Hero", "Romantic Figure"],
            },
            "14": {
                "objects": ["silhouette", "window", "dark room"],
                "expected_figure_types": ["Hero"],
            },
            "15": {
                "objects": ["graveyard", "gaunt man", "tombstones"],
                "expected_figure_types": ["Hero", "Symbolic Object"],
            },
            "16": {
                "objects": [],  # blank card
                "expected_figure_types": [],
            },
            "17bm": {
                "objects": ["rope", "man climbing", "nude figure"],
                "expected_figure_types": ["Hero"],
            },
            "17gf": {
                "objects": ["bridge", "woman", "crowd below", "sun"],
                "expected_figure_types": ["Hero"],
            },
            "18bm": {
                "objects": ["man grabbed from behind", "three hands"],
                "expected_figure_types": ["Hero", "Antagonist"],
            },
            "18gf": {
                "objects": ["woman strangling another", "staircase"],
                "expected_figure_types": ["Hero", "Antagonist"],
            },
            "19": {
                "objects": ["snow", "cabin", "swirling clouds"],
                "expected_figure_types": ["Symbolic Object"],
            },
            "20": {
                "objects": ["man leaning on lamppost", "night"],
                "expected_figure_types": ["Hero"],
            },
        }

        existing_names = {e["entity"].lower() for e in result["detected_entities"]}
        card_data = all_cards.get(card_id_str, {})

        # Inject missing objects
        for item in card_data.get("objects", []):
            if item.lower() not in existing_names:
                result["detected_entities"].append({
                    "entity": item,
                    "confidence": 1.0,
                    "source": "manual_fact"
                })

        # Add expected_figure_types for downstream cross-reference
        result["expected_figure_types"] = card_data.get("expected_figure_types", [])

        return result

    # =========================================================================
    # LEGACY CNN (OPTIONAL — only loaded if enable_cnn=True)
    # =========================================================================

    def _initialize_cnn(self):
        """Load Faster R-CNN model (legacy mode)."""
        if not _TORCH_AVAILABLE:
            print("[WARN] VisualAnalysisEngine: PyTorch not available. CNN disabled.")
            return

        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"[CNN] Initializing CNN (legacy mode) on {device}...")
        try:
            self.cnn_weights = FasterRCNN_ResNet50_FPN_Weights.DEFAULT
            self.cnn_model = fasterrcnn_resnet50_fpn(weights=self.cnn_weights, progress=False)
            self.cnn_model.eval()
            self.cnn_model.to(device)
            self.cnn_categories = self.cnn_weights.meta["categories"]
            self._cnn_device = device
            
            self.validate_model_files()
            print("  [OK] CNN model loaded and validated (legacy fallback).")
        except Exception as e:
            print(f"[WARN] Failed to load CNN: {e}")
            self.cnn_model = None

    def validate_model_files(self):
        """Explicitly validate model weights and expected input dimensions before inference."""
        if not self.cnn_model:
            raise RuntimeError("CNN model is not initialized.")
        
        try:
            # Explicit validation of expected input tensor (3 channels, 224x224 minimum)
            dummy_tensor = torch.zeros((1, 3, 224, 224), device=self._cnn_device)
            with torch.no_grad():
                _ = self.cnn_model(dummy_tensor)
        except Exception as e:
            raise RuntimeError(f"CNN model validation failed. Tensor dimension mismatch or missing weights: {e}")

    def _load_cnn_cache(self):
        """Load legacy CNN cache."""
        if self._cnn_cache_file.exists():
            try:
                with open(self._cnn_cache_file, 'r') as f:
                    self._cnn_cache = json.load(f)
            except Exception:
                self._cnn_cache = {}

    def _save_cnn_cache(self):
        """Save legacy CNN cache."""
        try:
            with open(self._cnn_cache_file, 'w') as f:
                json.dump(self._cnn_cache, f, indent=2)
        except Exception:
            pass

    def analyze_image_cnn(self, image_path: str, card_id: str) -> dict:
        """Legacy CNN analysis — only called if CNN is enabled and VLM/manual fail."""
        if str(card_id) in self._cnn_cache:
            return self._cnn_cache[str(card_id)]

        if not self.cnn_model or not os.path.exists(image_path):
            return self._empty_result()

        try:
            image = Image.open(image_path).convert("RGB")
            img_tensor = F.to_tensor(image).unsqueeze(0).to(self._cnn_device)

            with torch.no_grad():
                predictions = self.cnn_model(img_tensor)[0]

            detected_entities = []
            people_count = 0
            threshold = 0.5

            for i, score in enumerate(predictions['scores']):
                if score > threshold:
                    label_idx = predictions['labels'][i].item()
                    label_name = self.cnn_categories[label_idx]
                    if label_name == "person":
                        people_count += 1
                    detected_entities.append({
                        "entity": label_name,
                        "confidence": round(score.item(), 2),
                        "source": "cnn"
                    })

            unique_entities = {}
            for e in detected_entities:
                name = e['entity']
                if name not in unique_entities or e['confidence'] > unique_entities[name]['confidence']:
                    unique_entities[name] = e

            result = {
                "detected_entities": list(unique_entities.values()),
                "people_count": people_count,
                "raw_detections": len(detected_entities),
                "has_vision_data": True,
                "source": "cnn",
            }

            result = self._supplement_with_manual_facts(card_id, result)
            self._cnn_cache[str(card_id)] = result
            self._save_cnn_cache()
            return result

        except Exception as e:
            print(f"  [WARN] CNN error analyzing {image_path}: {e}")
            return self._empty_result()


# =========================================================================
# PERCEPTUAL DISTORTION EVALUATION (standalone, unchanged)
# =========================================================================

def evaluate_perceptual_distortions(visual_data: dict, narrative_events: list, story_text: str) -> list:
    """
    Compares objective CNN visual data against the subjective patient narrative.
    v2.0: Uses spaCy NER entities from narrative_events for person-counting
    (not keyword heuristics), and synonym-expanded object matching for omissions.
    Returns a list of detected distortions/hallucinations/omissions.
    """
    distortions = []
    if not visual_data.get("has_vision_data"):
        return distortions

    story_lower = story_text.lower()

    # =========================================================================
    # Check 1: People Count via NER (NLP-based, not keyword heuristic)
    # =========================================================================
    actual_people = visual_data.get("people_count", 0)

    ner_persons = set()
    for ev in narrative_events:
        for ent in ev.get("entities", []):
            if isinstance(ent, dict):
                if ent.get("label") in ("PERSON", "PER"):
                    ner_persons.add(ent.get("text", "").lower())
            elif isinstance(ent, (list, tuple)) and len(ent) >= 2:
                if ent[1] in ("PERSON", "PER"):
                    ner_persons.add(str(ent[0]).lower())
    narrative_person_count = len(ner_persons)

    if actual_people > 0 and narrative_person_count > actual_people + 2:
        distortions.append({
            "type": "hallucinatory_addition",
            "severity": "high",
            "detail": (
                f"Card depicts ~{actual_people} person(s); narrative includes "
                f"{narrative_person_count} distinct named/referenced persons (NER-detected)."
            )
        })

    if actual_people == 0 and narrative_person_count > 0:
        distortions.append({
            "type": "hallucinatory_addition",
            "severity": "moderate",
            "detail": (
                f"No people detected in image (CNN), but narrative references "
                f"{narrative_person_count} person(s) by NER."
            )
        })

    # =========================================================================
    # Check 2: High-valence object omission (synonym-expanded)
    # =========================================================================
    HIGH_VALENCE_SYNONYMS = [
        {"rifle", "gun", "revolver", "pistol", "firearm", "weapon", "shotgun"},
        {"knife", "blade", "dagger", "sword"},
        {"surgery", "operation", "scalpel", "operating", "blood", "wound"},
        {"violin", "instrument", "fiddle", "music", "bow"},
        {"rope", "noose", "hanging", "strangling"},
    ]

    for entity_info in visual_data.get("detected_entities", []):
        obj_name = entity_info.get("entity", "").lower()

        synonym_group = None
        for group in HIGH_VALENCE_SYNONYMS:
            if obj_name in group or any(token in obj_name for token in group):
                synonym_group = group
                break

        if synonym_group:
            mentioned = any(syn in story_lower for syn in synonym_group)
            if not mentioned:
                distortions.append({
                    "type": "perceptual_omission",
                    "severity": "high",
                    "detail": (
                        f"High-valence object '{obj_name}' (or synonyms) not mentioned in narrative "
                        f"(possible avoidance/denial of: {', '.join(sorted(synonym_group))})"
                    )
                })

    # =========================================================================
    # Check 3: Gender mismatch (NER gender vs expected figure types)
    # =========================================================================
    expected_types = visual_data.get("expected_figure_types", [])
    if expected_types:
        male_signals = sum(1 for ev in narrative_events for tok in ev.get("tokens", [])
                           if isinstance(tok, dict) and tok.get("text", "").lower() in {
                               "he", "him", "his", "man", "boy", "father", "son"
                           })
        female_signals = sum(1 for ev in narrative_events for tok in ev.get("tokens", [])
                             if isinstance(tok, dict) and tok.get("text", "").lower() in {
                                 "she", "her", "woman", "girl", "mother", "daughter"
                             })
        if male_signals > 5 and female_signals == 0 and ner_persons:
            distortions.append({
                "type": "gender_projection",
                "severity": "low",
                "detail": "Narrative uses exclusively male pronouns/references; may reflect gender projection."
            })
        elif female_signals > 5 and male_signals == 0 and ner_persons:
            distortions.append({
                "type": "gender_projection",
                "severity": "low",
                "detail": "Narrative uses exclusively female pronouns/references; may reflect gender projection."
            })

    return distortions
