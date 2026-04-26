"""
Dev-only admin auth + stats endpoints.
No existing backend code is modified — this is an additive-only module.

POST /dev-admin/login       → returns a short-lived HS256 JWT for the admin UI
GET  /dev-admin/stats       → DB overview + API key configuration status
GET  /dev-admin/users       → all UserRecord rows
GET  /dev-admin/catalog     → all ClothingItem rows
"""

import os
from datetime import datetime, timedelta
from functools import wraps

from flask import Blueprint, g, jsonify, request
from jose import jwt

admin_dev_bp = Blueprint("admin_dev", __name__)

_SECRET = os.environ.get("ADMIN_DEV_SECRET", "fitdeck-admin-dev-secret-2026")
_USER   = os.environ.get("ADMIN_DEV_USER",   "admin")
_PASS   = os.environ.get("ADMIN_DEV_PASS",   "fitdeck2026")


# ── helpers ─────────────────────────────────────────────────────────────────

def _make_token() -> str:
    payload = {
        "sub":   "admin-dev",
        "role":  "admin",
        "email": "admin@fitdeck.dev",
        "iat":   datetime.utcnow(),
        "exp":   datetime.utcnow() + timedelta(hours=8),
    }
    return jwt.encode(payload, _SECRET, algorithm="HS256")


def _require_dev_admin(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth  = request.headers.get("Authorization", "")
        token = auth.removeprefix("Bearer ").strip()
        if not token:
            return jsonify({"error": "Missing token"}), 401
        try:
            claims = jwt.decode(token, _SECRET, algorithms=["HS256"])
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        if claims.get("role") != "admin":
            return jsonify({"error": "Forbidden"}), 403
        g.dev_admin_claims = claims
        return f(*args, **kwargs)
    return wrapper


# ── routes ───────────────────────────────────────────────────────────────────

@admin_dev_bp.post("/login")
def dev_admin_login():
    data = request.get_json(silent=True) or {}
    if data.get("username") != _USER or data.get("password") != _PASS:
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({"token": _make_token(), "email": "admin@fitdeck.dev"})


@admin_dev_bp.get("/stats")
@_require_dev_admin
def dev_admin_stats():
    from app.db import db
    from app.models.clothing_item import ClothingItem
    from app.models.outfit import Outfit
    from app.models.user_record import UserRecord

    users         = db.session.execute(db.select(UserRecord)).scalars().all()
    catalog_items = db.session.execute(
        db.select(ClothingItem).where(ClothingItem.source == "catalog")
    ).scalars().all()
    wardrobe_items = db.session.execute(
        db.select(ClothingItem).where(ClothingItem.source == "personal")
    ).scalars().all()
    outfits = db.session.execute(db.select(Outfit)).scalars().all()
    saved   = [o for o in outfits if o.is_saved]

    return jsonify({
        "db": {
            "users":          len(users),
            "catalog_items":  len(catalog_items),
            "wardrobe_items": len(wardrobe_items),
            "outfits_total":  len(outfits),
            "outfits_saved":  len(saved),
            "db_url":         os.environ.get("DATABASE_URL", "sqlite:///fitdeck.db"),
        },
        "services": {
            "auth0":        bool(os.environ.get("AUTH0_DOMAIN")),
            "gemma_ai":     bool(os.environ.get("GOOGLE_AI_STUDIO_API_KEY")),
            "vision":       bool(os.environ.get("GOOGLE_CLOUD_VISION_API_KEY")),
            "elevenlabs":   bool(os.environ.get("ELEVENLABS_API_KEY")),
            "openweather":  bool(os.environ.get("OPENWEATHER_API_KEY")),
            "cloudinary":   bool(os.environ.get("CLOUDINARY_CLOUD_NAME")),
            "removebg":     bool(os.environ.get("REMOVEBG_API_KEY")),
            "fashn":        bool(os.environ.get("FASHN_API_KEY")),
        },
    })


@admin_dev_bp.get("/users")
@_require_dev_admin
def dev_admin_users():
    from app.db import db
    from app.models.user_record import UserRecord

    rows = db.session.execute(db.select(UserRecord).order_by(UserRecord.created_at.desc())).scalars().all()
    return jsonify([
        {
            "id":              r.id,
            "auth0_id":        r.auth0_id,
            "email":           r.email,
            "name":            r.name,
            "role":            r.role,
            "onboarding_done": r.onboarding_done,
            "created_at":      r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ])


@admin_dev_bp.get("/catalog")
@_require_dev_admin
def dev_admin_catalog():
    from app.db import db
    from app.models.clothing_item import ClothingItem

    rows = db.session.execute(
        db.select(ClothingItem).order_by(ClothingItem.created_at.desc())
    ).scalars().all()
    return jsonify([
        {
            "id":        r.id,
            "name":      r.name,
            "brand":     r.brand,
            "category":  r.category,
            "source":    r.source,
            "is_active": r.is_active,
            "image_url": r.image_url,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ])
