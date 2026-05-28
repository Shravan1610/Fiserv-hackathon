"""OCR service: Tesseract first, Gemini Vision fallback.

Pipeline:
  1. Read upload (image or PDF) into a PIL Image.
  2. Preprocess (grayscale, sharpen, contrast, autocontrast).
  3. Run Tesseract.
  4. If Tesseract output is empty / too short, fall back to Gemini Vision.
"""

import io
import os
import logging
from typing import Optional

import pytesseract
from PIL import Image, ImageFilter, ImageEnhance, ImageOps
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

MIN_OCR_CHARS = 25  # below this we treat tesseract output as a failure

_GEMINI_READY = False
try:
    import google.generativeai as genai
    _key = os.getenv("GEMINI_API_KEY")
    if _key:
        genai.configure(api_key=_key)
        _vision_model = genai.GenerativeModel("gemini-1.5-flash")
        _GEMINI_READY = True
except Exception as e:
    log.warning("Gemini vision unavailable: %s", e)


def _load_image(file_storage) -> Image.Image:
    """Load an uploaded file (image or single-page PDF) into a PIL image."""
    raw = file_storage.read()
    name = (getattr(file_storage, "filename", "") or "").lower()

    if name.endswith(".pdf") or raw[:4] == b"%PDF":
        try:
            from pdf2image import convert_from_bytes
            pages = convert_from_bytes(raw, dpi=300, first_page=1, last_page=1)
            if not pages:
                raise ValueError("PDF has no pages")
            return pages[0].convert("RGB")
        except Exception as e:
            raise RuntimeError(f"PDF processing failed (install poppler + pdf2image): {e}")

    return Image.open(io.BytesIO(raw)).convert("RGB")


def preprocess(image: Image.Image) -> Image.Image:
    """Tighten contrast + sharpen for receipt-style images."""
    img = image.convert("L")
    img = ImageOps.autocontrast(img, cutoff=2)
    img = img.filter(ImageFilter.SHARPEN)
    img = ImageEnhance.Contrast(img).enhance(1.8)
    return img


def _tesseract_ocr(image: Image.Image) -> str:
    config = "--oem 3 --psm 6"  # block of text, default LSTM engine
    try:
        return pytesseract.image_to_string(image, lang="eng", config=config).strip()
    except pytesseract.TesseractNotFoundError:
        log.error("Tesseract binary not installed on PATH.")
        return ""
    except Exception as e:
        log.warning("Tesseract failed: %s", e)
        return ""


def _gemini_vision_ocr(image: Image.Image) -> str:
    if not _GEMINI_READY:
        return ""
    try:
        prompt = (
            "Transcribe ALL text visible in this receipt verbatim. "
            "Preserve line breaks. Do not summarize. Do not add commentary."
        )
        response = _vision_model.generate_content([prompt, image])
        return (response.text or "").strip()
    except Exception as e:
        log.warning("Gemini vision OCR failed: %s", e)
        return ""


def run_ocr(file_storage) -> str:
    """Public entry point used by routes.py.

    Returns raw text; callers (extraction agent) handle empty strings.
    """
    image = _load_image(file_storage)
    pre = preprocess(image)

    text = _tesseract_ocr(pre)
    if len(text) >= MIN_OCR_CHARS:
        log.info("OCR via tesseract: %d chars", len(text))
        return text

    log.info("Tesseract weak (%d chars) — falling back to Gemini Vision", len(text))
    fallback = _gemini_vision_ocr(image)
    return fallback or text
