"""Central Gemini configuration (google-genai SDK).

Every Gemini call in the backend goes through ``generate_text`` or
``generate_with_image`` here. Agents and routes never import the SDK
directly. Model name, API key, and thinking level are all driven by .env.
"""

from __future__ import annotations

import base64
import io
import logging
import os
import ssl
from pathlib import Path
from typing import Optional

# --- SSL hardening (run before any SDK import) ---
try:
    import certifi
    _CA_BUNDLE = certifi.where()
    os.environ.setdefault("SSL_CERT_FILE", _CA_BUNDLE)
    os.environ.setdefault("REQUESTS_CA_BUNDLE", _CA_BUNDLE)
    os.environ.setdefault("GRPC_DEFAULT_SSL_ROOTS_FILE_PATH", _CA_BUNDLE)
except ImportError:
    pass

from dotenv import load_dotenv

# Always load backend/.env (Flask cwd may not be the backend folder)
_BACKEND_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(_BACKEND_DIR / ".env")

GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
GEMINI_THINKING_LEVEL: str = os.getenv("GEMINI_THINKING_LEVEL", "MINIMAL")
_INSECURE_SSL: bool = os.getenv("GEMINI_INSECURE_SSL", "false").lower() in (
    "1", "true", "yes", "on",
)

log = logging.getLogger(__name__)
log.info("Gemini model resolved: %s (thinking=%s)", GEMINI_MODEL, GEMINI_THINKING_LEVEL)
print(
    f"[gemini] model={GEMINI_MODEL} thinking={GEMINI_THINKING_LEVEL}",
    flush=True,
)

if _INSECURE_SSL:
    import requests
    import urllib3

    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    ssl._create_default_https_context = ssl._create_unverified_context  # type: ignore[attr-defined]
    _orig_request = requests.Session.request

    def _patched_request(self, method, url, **kwargs):
        kwargs["verify"] = False
        return _orig_request(self, method, url, **kwargs)

    requests.Session.request = _patched_request  # type: ignore[assignment]


_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
_client = None  # lazy genai.Client


def _get_client():
    """Return a cached ``genai.Client``. Raises if ``GEMINI_API_KEY`` is unset."""
    global _client
    if _client is not None:
        return _client
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set")
    from google import genai

    _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _build_config():
    from google.genai import types

    return types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(thinking_level=GEMINI_THINKING_LEVEL),
    )


def generate_text(prompt: str) -> str:
    """Text-only Gemini call. Uses REST when insecure SSL is enabled."""
    if _INSECURE_SSL:
        return _generate_content_rest([{"text": prompt}])

    from google.genai import types

    client = _get_client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            )
        ],
        config=_build_config(),
    )
    return (response.text or "").strip()


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

    from google.genai import types

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    image_bytes = buffer.getvalue()

    client = _get_client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                    types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                ],
            )
        ],
        config=_build_config(),
    )
    return (response.text or "").strip()


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
        verify=not _INSECURE_SSL,
        timeout=90,
    )
    response.raise_for_status()
    data = response.json()
    return data["candidates"][0]["content"]["parts"][0]["text"]
