import uuid
from pathlib import Path

from flask import Blueprint, request

from app.auth0_jwt import require_auth, require_role
from app.db import db
from app.models.clothing_item import ClothingItem
from app.models.user_record import UserRecord
from app.services import cloudinary_upload
from app.services.vision import (
    annotate_image,
    infer_category_from_labels,
    parse_labels_and_colors,
    suggested_name_from_labels,
)

admin_bp = Blueprint("admin", __name__)

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
DRAFTS_DIR = UPLOADS_DIR / "admin_drafts"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DRAFTS_DIR.mkdir(parents=True, exist_ok=True)

_ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _normalize_ext(filename: str | None) -> str:
    ext = Path(filename or "").suffix.lower()
    if ext not in _ALLOWED_EXT:
        return ".jpg"
    return ext


def _split_tags(raw: str | None) -> list[str]:
    if not raw or not raw.strip():
        return []
    parts = [p.strip().lower() for p in raw.replace(";", ",").split(",")]
    return [p for p in parts if p]


@admin_bp.get("/users")
@require_auth
@require_role("admin")
def users():
    rows = UserRecord.query.order_by(UserRecord.created_at.desc()).limit(200).all()
    return {
        "users": [
            {
                "auth0_id": u.auth0_id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "onboarding_done": bool(u.onboarding_done),
                "created_at": u.created_at.isoformat(),
            }
            for u in rows
        ]
    }


@admin_bp.get("/catalog")
@require_auth
@require_role("admin")
def list_admin_catalog():
    items = (
        ClothingItem.query.filter_by(source="catalog")
        .order_by(ClothingItem.created_at.desc())
        .limit(200)
        .all()
    )
    return {
        "items": [
            {
                "id": i.id,
                "name": i.name,
                "brand": i.brand,
                "category": i.category,
                "image_url": i.image_url,
                "try_on_asset": i.try_on_asset,
                "style_tags": i.style_tags or [],
                "color_tags": i.color_tags or [],
                "is_active": bool(i.is_active),
                "created_at": i.created_at.isoformat(),
            }
            for i in items
        ]
    }


@admin_bp.post("/catalog/draft")
@require_auth
@require_role("admin")
def catalog_draft():
    if "image" not in request.files:
        return {"error": "missing_image"}, 400
    f = request.files["image"]
    image_bytes = f.read()
    if not image_bytes:
        return {"error": "empty_image"}, 400

    ext = _normalize_ext(f.filename)
    draft_id = uuid.uuid4().hex
    draft_path = DRAFTS_DIR / f"{draft_id}{ext}"
    draft_path.write_bytes(image_bytes)

    vision, vision_err = annotate_image(image_bytes)
    labels, colors = parse_labels_and_colors(vision)
    inferred = infer_category_from_labels(labels)

    return {
        "draft_id": draft_id,
        "ext": ext,
        "suggested_name": suggested_name_from_labels(labels),
        "suggested_category": inferred or "shirt",
        "style_tags": labels[:8],
        "color_tags": colors[:4],
        "vision_error": vision_err,
    }


@admin_bp.post("/catalog/commit")
@require_auth
@require_role("admin")
def catalog_commit():
    draft_id = request.form.get("draft_id", "").strip()
    ext = request.form.get("ext", "").strip().lower()
    if not draft_id or ext not in _ALLOWED_EXT:
        return {"error": "invalid_draft"}, 400

    draft_path = DRAFTS_DIR / f"{draft_id}{ext}"
    if not draft_path.is_file():
        return {"error": "draft_not_found"}, 404

    image_bytes = draft_path.read_bytes()
    name = (request.form.get("name") or "").strip() or "Catalog item"
    brand = (request.form.get("brand") or "").strip() or None
    category = (request.form.get("category") or "").strip() or "shirt"

    style_raw = request.form.get("style_tags")
    color_raw = request.form.get("color_tags")
    style_tags = _split_tags(style_raw)
    color_tags = _split_tags(color_raw)

    vision_full, _ = annotate_image(image_bytes)
    labels, colors = parse_labels_and_colors(vision_full)
    if not style_tags:
        style_tags = labels[:8]
    if not color_tags:
        color_tags = colors[:4]

    item_id = uuid.uuid4().hex
    base = request.host_url.rstrip("/")

    if cloudinary_upload.configured():
        try:
            image_url = cloudinary_upload.upload_image_bytes(
                file_bytes=image_bytes,
                public_id=item_id,
                folder="fitdeck/admin-catalog",
            )
        except Exception as e:  # noqa: BLE001
            return {"error": "cloudinary_upload_failed", "detail": str(e)}, 500
        try_on_asset_url = image_url
    else:
        filename = f"cat-{item_id}{ext}"
        (UPLOADS_DIR / filename).write_bytes(image_bytes)
        image_url = f"{base}/wardrobe/media/{filename}"
        try_on_asset_url = image_url

    if "try_on_asset" in request.files:
        a = request.files["try_on_asset"]
        asset_bytes = a.read()
        if asset_bytes:
            asset_name = f"cat-{item_id}.tryon.png"
            (UPLOADS_DIR / asset_name).write_bytes(asset_bytes)
            try_on_asset_url = f"{base}/wardrobe/media/{asset_name}"

    item = ClothingItem(
        id=item_id,
        name=name,
        brand=brand,
        category=category,
        style_tags=style_tags[:12],
        color_tags=color_tags[:6],
        vision_labels=vision_full,
        image_url=image_url,
        try_on_asset=try_on_asset_url,
        source="catalog",
        owner_id=None,
        trending_score=50,
        is_active=True,
    )
    db.session.add(item)
    db.session.commit()

    try:
        draft_path.unlink(missing_ok=True)
    except OSError:
        pass

    return {
        "item": {
            "id": item.id,
            "name": item.name,
            "brand": item.brand,
            "category": item.category,
            "image_url": item.image_url,
            "try_on_asset": item.try_on_asset,
            "style_tags": item.style_tags or [],
            "color_tags": item.color_tags or [],
        }
    }


@admin_bp.patch("/catalog/<item_id>")
@require_auth
@require_role("admin")
def patch_catalog_item(item_id: str):
    item = ClothingItem.query.filter_by(id=item_id, source="catalog").first()
    if not item:
        return {"error": "not_found"}, 404
    body = request.get_json(silent=True) or {}
    if "is_active" in body:
        item.is_active = bool(body["is_active"])
    if "name" in body and isinstance(body["name"], str):
        item.name = body["name"].strip() or item.name
    if "brand" in body:
        item.brand = (body["brand"] or None) if isinstance(body["brand"], str) else item.brand
    if "category" in body and isinstance(body["category"], str):
        item.category = body["category"].strip() or item.category
    if "style_tags" in body and isinstance(body["style_tags"], list):
        item.style_tags = [str(x).lower() for x in body["style_tags"] if str(x).strip()][:12]
    if "color_tags" in body and isinstance(body["color_tags"], list):
        item.color_tags = [str(x) for x in body["color_tags"] if str(x).strip()][:6]
    db.session.commit()
    return {
        "item": {
            "id": item.id,
            "name": item.name,
            "brand": item.brand,
            "category": item.category,
            "image_url": item.image_url,
            "try_on_asset": item.try_on_asset,
            "style_tags": item.style_tags or [],
            "color_tags": item.color_tags or [],
            "is_active": bool(item.is_active),
        }
    }
