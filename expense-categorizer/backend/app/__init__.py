from flask import Flask, jsonify
from flask_cors import CORS

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
    CORS(app, origins=["http://localhost:3000"])

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({"error": "File too large (max 10 MB)"}), 413

    @app.errorhandler(500)
    def server_error(_e):
        return jsonify({"error": "Internal server error"}), 500

    from .routes import main
    app.register_blueprint(main)
    return app
