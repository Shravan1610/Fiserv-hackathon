"""Shared Gemini API settings loaded from environment."""

import base64
import io
import logging
import os
import ssl

# SSL roots (must run before google.generativeai is imported)
try:
    import certifi
    _ca = certifi.where()
    os.environ["SSL_CERT_FILE"] = _ca
    os.environ["REQUESTS_CA_BUNDLE"] = _ca
    os.environ["GRPC_DEFAULT_SSL_ROOTS_FILE_PATH"] = _ca
except ImportError:
    pass

from pathlib import Path

from dotenv import load_dotenv

# Always load backend/.env (Flask cwd may not be the backend folder)
_BACKEND_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(_BACKEND_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
GEMINI_TRANSPORT = os.getenv("GEMINI_TRANSPORT", "rest")
_INSECURE_SSL = os.getenv("GEMINI_INSECURE_SSL", "false").lower() in ("1", "true", "yes")

log = logging.getLogger(__name__)

if _INSECURE_SSL:
    import urllib3
    import requests

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    ssl._create_default_https_context = ssl._create_unverified_context
    _session_request = requests.Session.request

    def _insecure_request(self, method, url, **kwargs):
        kwargs["verify"] = False
        return _session_request(self, method, url, **kwargs)

    requests.Session.request = _insecure_request

_configured = False
_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def _rest_verify() -> bool:
    return not _INSECURE_SSL


def _generate_content_rest(parts: list) -> str:
    """Call Gemini REST API directly (works with GEMINI_INSECURE_SSL=true)."""
    import requests

    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set")

    url = f"{_API_BASE}/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    body = {"contents": [{"parts": parts}]}
    response = requests.post(
        url,
        json=body,
        verify=_rest_verify(),
        timeout=90,
    )
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]


def generate_text(prompt: str) -> str:
    """Text-only Gemini call. Uses REST when insecure SSL is enabled."""
    if _INSECURE_SSL:
        return _generate_content_rest([{"text": prompt}])
    configure_gemini()
    import google.generativeai as genai
    model = genai.GenerativeModel(GEMINI_MODEL)
    return model.generate_content(prompt).text


def generate_with_image(prompt: str, image) -> str:
    """Gemini vision call with a PIL Image."""
    if _INSECURE_SSL:
        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
        return _generate_content_rest([
            {"text": prompt},
            {"inline_data": {"mime_type": "image/png", "data": b64}},
        ])
    configure_gemini()
    import google.generativeai as genai
    model = genai.GenerativeModel(GEMINI_MODEL)
    return model.generate_content([prompt, image]).text


def configure_gemini() -> None:
    """Configure the Gemini SDK client (used when secure SSL works)."""
    global _configured
    if _configured or not GEMINI_API_KEY:
        return
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_API_KEY, transport=GEMINI_TRANSPORT)
    _configured = True


def get_generative_model():
    """Return SDK GenerativeModel (prefer generate_text / generate_with_image)."""
    configure_gemini()
    import google.generativeai as genai
    return genai.GenerativeModel(GEMINI_MODEL)
