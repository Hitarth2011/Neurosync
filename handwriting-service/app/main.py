"""Main FastAPI application for EasyOCR handwriting analyzer"""
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import ALLOWED_ORIGINS, SERVICE_NAME, SERVICE_VERSION, SERVICE_BACKEND
from app.api.routes import router

for stream in (sys.stdout, sys.stderr):
    if hasattr(stream, "reconfigure"):
        stream.reconfigure(errors="backslashreplace")

# Do NOT pre-warm EasyOCR models — load them lazily on first request
# This avoids importing anthropic/httpx at startup which can cause proxies conflicts

app = FastAPI(
    title=SERVICE_NAME,
    description="Microservice for analyzing handwritten text using EasyOCR (100% FREE)",
    version=SERVICE_VERSION
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "backend": SERVICE_BACKEND,
        "cost": "FREE - EasyOCR (No API fees)",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
