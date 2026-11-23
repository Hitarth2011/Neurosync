"""Configuration for Handwriting Service - EasyOCR"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent / ".env")

# EasyOCR Configuration (pure Python, no external dependencies)
EASYOCR_LANGUAGE = os.getenv("EASYOCR_LANGUAGE", "en").strip()

# CORS Configuration
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS]

# Image validation
SUPPORTED_FORMATS = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Service info
SERVICE_NAME = "NeuroSync Handwriting Analyzer"
SERVICE_VERSION = "2.0.0"
SERVICE_BACKEND = "EasyOCR"  # Changed from Tesseract/PaddleOCR to EasyOCR

# No API key required - EasyOCR is local & free
API_KEY_REQUIRED = False
