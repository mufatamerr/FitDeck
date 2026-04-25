import os

from flask import Flask
from flask_cors import CORS

from app.routes.auth import auth_bp


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "dev-change-me")

    origins = [
        os.environ.get("FRONTEND_URL", "http://localhost:5173"),
        "http://127.0.0.1:5173",
    ]
    CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)

    app.register_blueprint(auth_bp, url_prefix="/auth")

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "fitdeck-api"}

    return app
