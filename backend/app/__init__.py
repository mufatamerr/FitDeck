import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from app.db import init_db
from app.routes.auth import auth_bp
from app.routes.catalog import catalog_bp
from app.routes.outfits import outfits_bp
from app.routes.swipe import swipe_bp
from app.routes.wardrobe import wardrobe_bp
from app.routes.fitbot import fitbot_bp
from app.routes.admin import admin_bp
from app.routes.tryon_photo import tryon_photo_bp


def create_app():
    # Load env even when the app is started without backend/run.py (e.g. some IDE / flask run setups).
    # parent: .../backend/app → .../backend → repo root (folder that contains /backend)
    _repo_root = Path(__file__).resolve().parent.parent.parent
    _backend = Path(__file__).resolve().parent.parent
    _repo_env = _repo_root / ".env"
    _backend_env = _backend / ".env"
    # override=True: shell-exported empty values won't block real keys from the file.
    load_dotenv(_repo_env, override=True)
    load_dotenv(_backend_env, override=True)

    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "dev-change-me")
    app.config["FITDECK_REPO_DOTENV"] = str(_repo_env)
    app.config["FITDECK_REPO_DOTENV_EXISTS"] = _repo_env.is_file()
    app.config["FITDECK_BACKEND_DOTENV_EXISTS"] = _backend_env.is_file()

    init_db(app)

    # Allow both 5173 and 5174 for local dev (Vite may auto-bump ports).
    origins = list(
        {
            os.environ.get("FRONTEND_URL", "http://localhost:5173"),
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        }
    )
    CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=True)

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(catalog_bp, url_prefix="/catalog")
    app.register_blueprint(outfits_bp, url_prefix="/outfits")
    app.register_blueprint(swipe_bp, url_prefix="/swipe")
    app.register_blueprint(wardrobe_bp, url_prefix="/wardrobe")
    app.register_blueprint(fitbot_bp, url_prefix="/fitbot")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(tryon_photo_bp, url_prefix="/tryon")

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "fitdeck-api"}

    @app.get("/health/bootstrap")
    def health_bootstrap():
        """Which .env paths exist (no secrets). Use when FitBot keys show missing in the UI."""
        return {
            "repo_dotenv_path": app.config.get("FITDECK_REPO_DOTENV"),
            "repo_dotenv_exists": bool(app.config.get("FITDECK_REPO_DOTENV_EXISTS")),
            "backend_dotenv_exists": bool(app.config.get("FITDECK_BACKEND_DOTENV_EXISTS")),
            "fitbot_gemma_configured": bool(os.environ.get("GOOGLE_AI_STUDIO_API_KEY", "").strip()),
            "fitbot_weather_configured": bool(os.environ.get("OPENWEATHER_API_KEY", "").strip()),
            "fitbot_tts_configured": bool(os.environ.get("ELEVENLABS_API_KEY", "").strip()),
        }

    return app
