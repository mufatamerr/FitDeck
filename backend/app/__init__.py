import os

from flask import Flask
from flask_cors import CORS

from app.routes.auth import auth_bp
from app.routes.catalog import catalog_bp
from app.routes.outfits import outfits_bp
from app.routes.swipe import swipe_bp
from app.routes.wardrobe import wardrobe_bp
from app.routes.fitbot import fitbot_bp
from app.routes.admin import admin_bp
from app.routes.tryon_photo import tryon_photo_bp


def create_app():
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "dev-change-me")

    origins = [
        os.environ.get("FRONTEND_URL", "http://localhost:5173"),
        "http://127.0.0.1:5173",
    ]
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

    return app
