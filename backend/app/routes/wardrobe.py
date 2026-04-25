import os
import uuid

import requests
from flask import Blueprint, g, request

from app.auth0_jwt import require_auth
from app.db import db
from app.models.clothing_item import ClothingItem

wardrobe_bp = Blueprint("wardrobe", __name__)


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


@wardrobe_bp.post("/upload")
@require_auth
def upload():
    owner_id = g.jwt_claims.get("sub")
    if "image" not in request.files:
        return {"error": "missing_image"}, 400

    f = request.files["image"]
    image_bytes = f.read()
    vision, vision_err = _vision_annotate(image_bytes)

    # MVP: store raw upload only; use data URLs later or Cloudinary
    # For now we do not persist bytes; we just create an item with tags and no image_url.
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

    item = ClothingItem(
        id=uuid.uuid4().hex,
        name=request.form.get("name") or "My item",
        brand=request.form.get("brand"),
        category=request.form.get("category") or "shirt",
        style_tags=labels[:5],
        color_tags=colors[:3],
        vision_labels=vision,
        image_url=None,
        try_on_asset=None,
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
            "style_tags": item.style_tags or [],
            "color_tags": item.color_tags or [],
        },
        "vision_error": vision_err,
    }

