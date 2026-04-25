from flask import Blueprint, request

from app.auth0_jwt import require_auth
from app.db import db
from app.models.clothing_item import ClothingItem

catalog_bp = Blueprint("catalog", __name__)


@catalog_bp.get("")
@require_auth
def list_catalog():
    category = request.args.get("category")
    brand = request.args.get("brand")
    limit = min(int(request.args.get("limit", "30")), 100)
    offset = max(int(request.args.get("offset", "0")), 0)

    q = ClothingItem.query.filter_by(source="catalog", is_active=True)
    if category:
        q = q.filter(ClothingItem.category == category)
    if brand:
        q = q.filter(ClothingItem.brand == brand)

    items = (
        q.order_by(ClothingItem.trending_score.desc(), ClothingItem.created_at.desc())
        .offset(offset)
        .limit(limit)
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
        ],
        "limit": limit,
        "offset": offset,
    }

