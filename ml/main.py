"""
main.py — FastAPI ML sidecar for NeuroSync.

Endpoints:
  POST /embed    — Extract MFCC embedding from an uploaded audio file
  POST /predict  — Run nearest-centroid prediction for a profile
  POST /retrain  — Fit and save a classifier for a profile
  GET  /health   — Health check
"""

import os
import tempfile
from io import BytesIO
from pathlib import Path
from threading import Lock

# Load .env from parent directory (neurosync root) so FFMPEG_PATH etc. are available
_env_file = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(_env_file):
    with open(_env_file, encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if not _line or _line.startswith("#") or "=" not in _line:
                continue
            _k, _, _v = _line.partition("=")
            _k = _k.strip()
            _v = _v.strip().strip('"').strip("'")
            if _k and _k not in os.environ:
                os.environ[_k] = _v

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from embedder import extract_embedding, MODEL_NAME
from classifier import PrototypeClassifier

app = FastAPI(title="NeuroSync ML Sidecar", version="1.0.0")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)
VISION_MODEL_PATH = Path(os.environ.get(
    "VISION_MODEL_PATH",
    str(Path(__file__).resolve().parent.parent / "yolo11n.pt"),
))
VISION_DEVICE = os.environ.get("VISION_DEVICE", "cpu")
VISION_CONFIDENCE = 0.25
VISION_MAX_DETECTIONS = 10
MAX_FRAME_BYTES = 2 * 1024 * 1024
MAX_FRAME_PIXELS = 40_000_000
_vision_model = None
_vision_model_lock = Lock()


def _predict_vision_frame(image_path: str):
    """Run one inference safely on FastAPI's worker thread pool."""
    global _vision_model

    from ultralytics import YOLO

    with _vision_model_lock:
        if _vision_model is None:
            _vision_model = YOLO(str(VISION_MODEL_PATH))
        return _vision_model.predict(
            source=image_path,
            conf=VISION_CONFIDENCE,
            device=VISION_DEVICE,
            max_det=VISION_MAX_DETECTIONS,
            verbose=False,
        )[0]


def model_path_for(profile_id: str) -> str:
    return os.path.join(MODELS_DIR, f"{profile_id}.json")


# ─── Request / Response schemas ────────────────────────────────────────────────

class MeaningItem(BaseModel):
    id: str
    title: str


class PredictRequest(BaseModel):
    profileId: str
    embeddingVector: list[float]
    meanings: list[MeaningItem]


class TrainingExample(BaseModel):
    embeddingVector: list[float]
    meaningId: str


class RetrainRequest(BaseModel):
    profileId: str
    trainingData: list[TrainingExample]


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Simple health check."""
    return {"status": "ok"}


@app.post("/embed")
async def embed(audio: UploadFile = File(...)):
    """
    Accept an audio file, extract a 124-dim MFCC+delta embedding, return as JSON.
    The file is saved to a temp path, processed, then deleted.
    """
    # Write to a temporary file
    suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        content = await audio.read()
        tmp.write(content)

    try:
        vector = extract_embedding(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Embedding extraction failed: {str(e)}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return {"vector": vector, "model": MODEL_NAME}


@app.post("/detect-objects")
async def detect_objects(frame: UploadFile = File(...)):
    """Detect common visible objects in one temporary still frame.

    This endpoint deliberately accepts a single image, not video. The image is
    written only to a temporary file required by the model and is always
    deleted before responding. Detections describe visible objects, never a
    person's identity, intent, safety, or task completion.
    """
    allowed_types = {"image/jpeg", "image/png", "image/webp"}
    if frame.content_type not in allowed_types:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, or WebP still frames are supported")

    # Read at most one byte beyond the limit so oversized uploads are rejected
    # without first copying the entire request body into memory.
    content = await frame.read(MAX_FRAME_BYTES + 1)
    if not content or len(content) > MAX_FRAME_BYTES:
        raise HTTPException(status_code=413, detail="Frame must be between 1 byte and 2 MB")

    try:
        from PIL import Image, UnidentifiedImageError
    except ImportError as error:
        raise HTTPException(status_code=503, detail="Image validation is unavailable; install the vision dependencies.") from error

    expected_format = {
        "image/jpeg": "JPEG",
        "image/png": "PNG",
        "image/webp": "WEBP",
    }[frame.content_type]
    try:
        with Image.open(BytesIO(content)) as image:
            if image.format != expected_format:
                raise HTTPException(status_code=415, detail="Frame content does not match its image content type")
            if image.width * image.height > MAX_FRAME_PIXELS:
                raise HTTPException(status_code=413, detail="Frame dimensions are too large")
            image.verify()
    except UnidentifiedImageError as error:
        raise HTTPException(status_code=422, detail="Uploaded frame is not a valid supported image") from error
    except OSError as error:
        raise HTTPException(status_code=422, detail="Uploaded frame could not be decoded") from error

    suffix = Path(frame.filename or "frame.jpg").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        suffix = ".jpg"

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = tmp.name
        tmp.write(content)

    try:
        if not VISION_MODEL_PATH.is_file():
            raise HTTPException(
                status_code=503,
                detail="Vision model weights are unavailable. Run the static vision test once to download yolo11n.pt.",
            )

        try:
            result = await run_in_threadpool(_predict_vision_frame, tmp_path)
        except ImportError as error:
            raise HTTPException(
                status_code=503,
                detail="Vision detector is not installed. Install ml/vision-requirements.txt first.",
            ) from error
        except Exception as error:
            raise HTTPException(status_code=503, detail=f"Vision model could not run: {error}") from error

        detections = []
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            detections.append({
                "label": str(result.names[class_id]),
                "confidence": round(float(box.conf[0].item()), 4),
                "boundingBoxXYXY": [round(float(value), 1) for value in box.xyxy[0].tolist()],
            })
        return {
            "status": "success" if detections else "uncertain",
            "model": VISION_MODEL_PATH.stem,
            "detections": detections,
            "limitation": "Visible objects only. This does not identify people or prove an action, intent, safety, or task completion.",
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.post("/predict")
def predict(req: PredictRequest):
    """
    Load the classifier for a profile and return top-N predictions.
    Returns { error: "no_model" } if the model has not been trained yet.
    """
    path = model_path_for(req.profileId)

    if not os.path.exists(path):
        return JSONResponse(
            status_code=200,
            content={
                "error": "no_model",
                "message": f"No trained model found for profile {req.profileId}. "
                           "Please complete the training phase and retrain first.",
            },
        )

    clf = PrototypeClassifier()
    try:
        clf.load(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model: {str(e)}")

    if not clf.is_trained():
        return JSONResponse(
            status_code=200,
            content={
                "error": "no_model",
                "message": "Model file exists but contains no trained centroids.",
            },
        )

    try:
        results = clf.predict(req.embeddingVector, top_n=3)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Prediction failed: {str(e)}")

    if not results:
        raise HTTPException(status_code=422, detail="Prediction returned no results")

    top = results[0]
    alternatives = results[1:]

    return {
        "topMeaningId": top["meaningId"],
        "topConfidence": top["confidence"],
        "alternatives": [
            {"meaningId": r["meaningId"], "confidence": r["confidence"]}
            for r in alternatives
        ],
    }


@app.post("/retrain")
def retrain(req: RetrainRequest):
    """
    Fit a new PrototypeClassifier on the provided training data and persist it.
    Returns { modelPath, examplesCount, meaningCount }.
    """
    if not req.trainingData:
        raise HTTPException(status_code=422, detail="trainingData must not be empty")

    embeddings = [ex.embeddingVector for ex in req.trainingData]
    meaning_ids = [ex.meaningId for ex in req.trainingData]

    clf = PrototypeClassifier()
    try:
        clf.fit(embeddings, meaning_ids)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Training failed: {str(e)}")

    path = model_path_for(req.profileId)
    try:
        clf.save(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save model: {str(e)}")

    unique_meanings = len(set(meaning_ids))

    return {
        "modelPath": path,
        "examplesCount": len(req.trainingData),
        "meaningCount": unique_meanings,
    }
