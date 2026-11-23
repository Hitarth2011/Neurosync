"""EasyOCR analyzer for handwriting recognition - PRIMARY SERVICE"""
import io
import json
import re
import os
import urllib.request
import urllib.error
from pathlib import Path
from PIL import Image
import numpy as np

# Load environment variables from .env file
from dotenv import load_dotenv

# Load .env from the handwriting-service root (two levels up from this file)
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)

# Import EasyOCR
import easyocr
import torch

# Initialize EasyOCR reader (lazy loading)
_reader = None

def get_ocr_reader():
    """Lazy-load EasyOCR reader (only initialised once per process)."""
    global _reader
    if _reader is None:
        cache_dir = Path.home() / ".easyocr"
        cache_dir.mkdir(parents=True, exist_ok=True)
        os.environ["EASYOCR_HOME"] = str(cache_dir)
        use_gpu = torch.cuda.is_available()
        device = "CUDA" if use_gpu else "CPU"
        print(f"🔄 Initialising EasyOCR ({device} mode)…")
        _reader = easyocr.Reader(["en"], gpu=use_gpu, verbose=False)
        print("✅ EasyOCR ready")
    return _reader


def _call_groq(api_key: str, literal_text: str) -> tuple[str, list]:
    """
    Call Groq via urllib (stdlib only — no third-party HTTP client needed).
    Returns (corrected_text, patterns_list).
    Falls back to literal_text + empty list on any error.
    """
    prompt = (
        "You are a learning specialist analysing a child's handwriting for dyslexia patterns.\n\n"
        f"HANDWRITTEN TEXT DETECTED:\n\"{literal_text}\"\n\n"
        "Respond with ONLY valid JSON, no other text:\n"
        "{\n"
        "  \"corrected_text\": \"what the child meant to write\",\n"
        "  \"patterns\": [\"pattern1\", \"pattern2\"]\n"
        "}\n\n"
        "Pattern examples: \"b/d reversal\", \"p/q reversal\", "
        "\"phonetic spelling: 'sed' for 'said'\", \"irregular spacing\", \"inconsistent sizing\".\n"
        "Use an empty array if no patterns are found."
    )

    payload = json.dumps({
        "model": "llama3-8b-8192",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 500,
        "temperature": 0.2,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        groq_text = body["choices"][0]["message"]["content"]
        print(f"✅ Groq replied: {groq_text[:80]}")

        # Extract JSON block from the response
        m = re.search(r"\{.*\}", groq_text, re.DOTALL)
        parsed = json.loads(m.group() if m else groq_text)
        corrected = parsed.get("corrected_text", literal_text)
        patterns  = parsed.get("patterns", [])
        if not isinstance(patterns, list):
            patterns = []
        return corrected, patterns

    except urllib.error.HTTPError as e:
        print(f"⚠️  Groq HTTP {e.code}: {e.read().decode()[:120]}")
    except urllib.error.URLError as e:
        print(f"⚠️  Groq network error: {e.reason}")
    except (json.JSONDecodeError, KeyError, AttributeError) as e:
        print(f"⚠️  Groq parse error: {e}")
    except Exception as e:
        print(f"⚠️  Groq unexpected error: {e}")

    # Fallback
    return literal_text, []


def analyze_handwriting(image_bytes: bytes) -> dict:
    """
    Analyse handwriting from raw image bytes.
    1. EasyOCR extracts literal text.
    2. Groq interprets + detects patterns.

    Returns dict with keys:
        literal_transcription, intended_text, pattern_analysis
    """
    try:
        print(f"🔍 Image size: {len(image_bytes)} bytes")

        # ── Load & validate image ───────────────────────────────────────
        image = Image.open(io.BytesIO(image_bytes))
        print(f"📸 Format={image.format}, Size={image.size}, Mode={image.mode}")

        if image.format not in ("JPEG", "PNG", "WEBP"):
            raise ValueError(f"Unsupported format: {image.format}")

        # Flatten transparency to white background
        if image.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", image.size, (255, 255, 255))
            mask = image.split()[-1] if image.mode == "RGBA" else None
            bg.paste(image, mask=mask)
            image = bg
        elif image.mode != "RGB":
            image = image.convert("RGB")

        image_array = np.array(image)

        # ── EasyOCR ────────────────────────────────────────────────────
        ocr = get_ocr_reader()
        print("🔄 Running EasyOCR…")
        results = ocr.readtext(image_array, detail=1)
        print(f"✅ EasyOCR found {len(results)} region(s)")

        if not results:
            print("⚠️  No text detected")
            return {
                "literal_transcription": "",
                "intended_text": "",
                "pattern_analysis": [],
            }

        lines = []
        for bbox, text, conf in results:
            lines.append(text)
            print(f"  📝 '{text}' (conf {conf:.2f})")

        literal = "\n".join(lines).strip()
        print(f"📄 Literal ({len(lines)} lines): {literal[:100]}")

        # ── Groq interpretation ────────────────────────────────────────
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        if groq_key:
            print("🧠 Calling Groq…")
            corrected, patterns = _call_groq(groq_key, literal)
        else:
            print("⚠️  No GROQ_API_KEY found — returning literal only")
            corrected, patterns = literal, []

        return {
            "literal_transcription": literal,
            "intended_text": corrected,
            "pattern_analysis": patterns,
        }

    except Image.UnidentifiedImageError as exc:
        raise ValueError("Invalid or corrupted image file") from exc
    except Exception as exc:
        import traceback
        print(f"❌ analyze_handwriting error: {exc}")
        print(f"TRACEBACK:\n{traceback.format_exc()}")
        raise ValueError(f"Handwriting analysis failed: {exc}") from exc
