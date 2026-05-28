from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

def create_app():
    load_dotenv()
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:3000"])
    from .routes import main
    app.register_blueprint(main)
    return app
