#!/usr/bin/env python3
"""Initialize PaddleOCR models on first startup."""
import os
from pathlib import Path
import sys

def init_paddle():
    """Download and cache PaddleOCR models."""
    print("=" * 60)
    print("🔄 PaddleOCR Initialization")
    print("=" * 60)
    
    # Set up cache directory
    cache_dir = Path.home() / ".paddleocr"
    cache_dir.mkdir(parents=True, exist_ok=True)
    os.environ['PADDLEOCR_HOME'] = str(cache_dir)
    print(f"📁 Cache directory: {cache_dir}")
    print()
    
    # Import PaddleOCR
    try:
        from paddleocr import PaddleOCR
        print("✅ PaddleOCR module loaded")
    except ImportError as e:
        print(f"❌ Failed to import PaddleOCR: {e}")
        print("   Run: py -m pip install paddleocr paddlepaddle")
        sys.exit(1)
    
    # Initialize OCR with models download
    print("📥 Downloading PaddleOCR models (this may take 1-3 minutes on first run)...")
    print("   • Detection model (~36MB)")
    print("   • Recognition model (~58MB)")
    print("   • Classification model (~3.5MB)")
    print()
    
    try:
        ocr = PaddleOCR(
            use_textline_orientation=True,
            use_doc_orientation_classify=True,
            lang='en'
        )
        print()
        print("=" * 60)
        print("✅ SUCCESS: PaddleOCR initialized and models cached")
        print("=" * 60)
        print()
        print("📊 Model Summary:")
        print(f"   • Cache location: {cache_dir}")
        print("   • Models are now ready for handwriting analysis")
        print("   • Subsequent runs will load from cache (30+ seconds faster)")
        print()
        return True
    except Exception as e:
        print()
        print("=" * 60)
        print(f"❌ FAILED: {e}")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    init_paddle()
