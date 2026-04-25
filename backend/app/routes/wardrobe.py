import os
import uuid
from pathlib import Path

import requests
from flask import Blueprint, g, request, send_from_directory

from app.auth0_jwt import require_auth
from app.db import db
from app.models.clothing_item import ClothingItem

wardrobe_bp = Blueprint("wardrobe", __name__)

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _infer_category(labels: list[str]) -> str | None:
    s = " ".join(labels).lower()
    if any(k in s for k in ["shoe", "sneaker", "boot", "trainer", "heel"]):
        return "shoes"
    if any(k in s for k in ["pants", "trousers", "jean", "jeans", "denim", "leggings", "shorts"]):
        return "pants"
    if any(k in s for k in ["jacket", "coat", "hoodie", "sweater", "blazer", "outerwear"]):
        return "jacket"
    if any(k in s for k in ["shirt", "t-shirt", "tshirt", "top", "blouse", "polo"]):
        return "shirt"
    if any(k in s for k in ["bag", "cap", "hat", "belt", "accessory", "watch"]):
        return "accessory"
    return None


def _vision_annotate(image_bytes: bytes):
    key = os.environ.get("GOOGLE_CLOUD_VISION_API_KEY")
    if not key:
        return None, "GOOGLE_CLOUD_VISION_API_KEY is not set"
    url = f"https://vision.googleapis.com/v1/images:annotate?key={key}"
    b64 = __import__("base64").b64encode(image_bytes).decode("utf-8")
    payload = {
        "requests": [
            {
                "image": {"content": b64},
                "features": [
                    {"type": "LABEL_DETECTION", "maxResults": 10},
                    {"type": "IMAGE_PROPERTIES", "maxResults": 5},
                ],
            }
        ]
    }
    r = requests.post(url, json=payload, timeout=20)
    if r.status_code >= 400:
        return None, f"Vision error: {r.status_code}"
    return r.json(), None


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
    vision, vision_err = _vision_annotate(image_bytes)

    labels = []
    colors = []
    if vision and "responses" in vision and vision["responses"]:
        resp = vision["responses"][0]
        for l in resp.get("labelAnnotations", [])[:8]:
            desc = l.get("description")
            if desc:
                labels.append(desc.lower())
        props = (resp.get("imagePropertiesAnnotation") or {}).get("dominantColors") or {}
        for c in (props.get("colors") or [])[:5]:
            rgb = (c.get("color") or {})
            colors.append(f"rgb({rgb.get('red',0)},{rgb.get('green',0)},{rgb.get('blue',0)})")

    inferred_category = _infer_category(labels)
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

