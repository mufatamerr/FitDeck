import uuid
from pathlib import Path

from flask import Blueprint, g, request, send_from_directory

from app.auth0_jwt import require_auth
from app.db import db
from app.models.clothing_item import ClothingItem
from app.services.vision import (
    annotate_image,
    infer_category_from_labels,
    parse_labels_and_colors,
)

wardrobe_bp = Blueprint("wardrobe", __name__)

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@wardrobe_bp.get("")
@require_auth
def list_wardrobe():
    owner_id = g.jwt_claims.get("sub")
    items = (
        ClothingItem.query.filter_by(source="personal", owner_id=owner_id, is_active=True)
        .order_by(ClothingItem.created_at.desc())
        .limit(100)
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
                "source": i.source,
            }
            for i in items
        ]
    }


@wardrobe_bp.delete("/<item_id>")
@require_auth
def delete_item(item_id: str):
    owner_id = g.jwt_claims.get("sub")
    item = ClothingItem.query.filter_by(id=item_id, owner_id=owner_id, source="personal").first()
    if not item:
        return {"error": "not_found"}, 404
    item.is_active = False
    db.session.commit()
    return {"ok": True}


@wardrobe_bp.get("/media/<path:filename>")
def media(filename: str):
    return send_from_directory(UPLOADS_DIR, filename)


@wardrobe_bp.post("/upload")
@require_auth
def upload():
    owner_id = g.jwt_claims.get("sub")
    if "image" not in request.files:
        return {"error": "missing_image"}, 400

    f = request.files["image"]
    image_bytes = f.read()
    vision, vision_err = annotate_image(image_bytes)
    labels, colors = parse_labels_and_colors(vision)

    inferred_category = infer_category_from_labels(labels)
    category = request.form.get("category") or inferred_category or "shirt"

    # Store the uploaded image to disk so it can render in UI and be used in Builder.
    ext = Path(f.filename or "").suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        ext = ".jpg"
    file_id = uuid.uuid4().hex
    filename = f"{file_id}{ext}"
    (UPLOADS_DIR / filename).write_bytes(image_bytes)
    base = request.host_url.rstrip("/")
    image_url = f"{base}/wardrobe/media/{filename}"

    # Optional: transparent PNG from client-side background removal
    try_on_asset_url = image_url
    if "try_on_asset" in request.files:
        a = request.files["try_on_asset"]
        asset_bytes = a.read()
        asset_name = f"{file_id}.tryon.png"
        (UPLOADS_DIR / asset_name).write_bytes(asset_bytes)
        try_on_asset_url = f"{base}/wardrobe/media/{asset_name}"

    item = ClothingItem(
        id=uuid.uuid4().hex,
        name=request.form.get("name") or "My item",
        brand=request.form.get("brand"),
        category=category,
        style_tags=labels[:5],
        color_tags=colors[:3],
        vision_labels=vision,
        image_url=image_url,
        try_on_asset=try_on_asset_url,
        source="personal",
        owner_id=owner_id,
        trending_score=0,
        is_active=True,
    )
    db.session.add(item)
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
        },
        "vision_error": vision_err,
        "inferred_category": inferred_category,
    }

