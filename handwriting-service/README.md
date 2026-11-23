# NeuroSync Handwriting Analyzer Microservice

Stateless Python microservice for local handwriting recognition with EasyOCR, with optional text interpretation using Groq. Designed to be called by the Node/Express backend.

## Setup

```bash
# Run these commands from the repository root in PowerShell
cd handwriting-service
py -3.11 -m venv .venv

# Install EasyOCR and the service dependencies into its isolated environment
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Optional: replace CPU-only PyTorch with the CUDA 12.8 build
.\.venv\Scripts\python.exe -m pip install --index-url https://download.pytorch.org/whl/cu128 --extra-index-url https://pypi.org/simple torch==2.9.0+cu128 torchvision==0.24.0+cu128
```

The handwriting service has its own `.venv` because its pinned NumPy version differs from the ML sidecar. From the repository root, `npm run handwriting:start` starts the service. EasyOCR downloads its English recognition models on its first analysis request and uses CUDA when available, falling back to CPU. Set `GROQ_API_KEY` in the repository's `.env` to enable optional text interpretation; OCR itself runs locally without an API key.

## Running the Service

```bash
# From handwriting-service, start the service using its environment
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001

# Service will be available at http://localhost:8001
# API docs at http://localhost:8001/docs
```

## Testing Locally

### Via Streamlit (interactive UI):
```bash
streamlit run frontend/app.py
```

### Via curl:
```bash
curl -X POST http://localhost:8001/api/v1/analyze \
  -F "file=@test_handwriting.jpg"
```

### Via pytest:
```bash
pytest tests/
```

## API Endpoint

**POST /api/v1/analyze**

Accepts: JPEG, PNG, or WEBP images (max 10MB)

Response:
```json
{
  "status": "success",
  "literal_transcription": "exact text as written",
  "ai_interpretation": {
    "intended_text": "corrected text",
    "pattern_analysis": ["pattern 1", "pattern 2"]
  }
}
```

## Architecture

- **app/main.py**: FastAPI application with CORS
- **app/config.py**: Configuration and validation
- **app/core/vision_ocr.py**: EasyOCR recognition and optional Groq interpretation
- **app/api/routes.py**: API endpoints
- **frontend/app.py**: Streamlit testing UI (dev only)

## Notes

- Service is completely stateless — no database, no session storage, no child/consent logic
- Image processing is done in-memory only
- OCR runs locally using EasyOCR; Groq interpretation is optional
- CORS is configured to allow requests from the Node app (default: http://localhost:3000)
