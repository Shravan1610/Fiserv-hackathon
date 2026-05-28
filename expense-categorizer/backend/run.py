import os
import ssl
from pathlib import Path

from dotenv import load_dotenv

# Load .env before app imports so SSL + model settings apply everywhere
load_dotenv(Path(__file__).resolve().parent / ".env")

if os.getenv("GEMINI_INSECURE_SSL", "").lower() in ("1", "true", "yes"):
    ssl._create_default_https_context = ssl._create_unverified_context

try:
    import certifi
    _ca = certifi.where()
    os.environ.setdefault("SSL_CERT_FILE", _ca)
    os.environ.setdefault("REQUESTS_CA_BUNDLE", _ca)
    os.environ.setdefault("GRPC_DEFAULT_SSL_ROOTS_FILE_PATH", _ca)
except ImportError:
    pass

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(debug=True, port=port, host="127.0.0.1")
