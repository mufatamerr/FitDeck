from flask import Blueprint, request
import os

import requests

from app.auth0_jwt import require_auth
from app.db import db
from app.models.clothing_item import ClothingItem

catalog_bp = Blueprint("catalog", __name__)
SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")


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


@catalog_bp.get("/search")
@require_auth
def search_catalog():
    query = (request.args.get("q") or "").strip()
    if not query:
        return {"error": "Query parameter 'q' is required"}, 400

    if not SERPER_API_KEY:
        return {"error": "Search is not configured"}, 503

    blocked_terms = [
        "knife", "knives", "blade", "sword", "dagger", "machete", "axe", "hatchet",
        "gun", "guns", "firearm", "pistol", "rifle", "shotgun", "revolver", "glock",
        "ammo", "ammunition", "bullet", "weapon", "weapons", "explosive", "grenade", "bomb",
        "drug", "drugs", "weed", "cannabis", "cocaine", "heroin", "meth",
        "porn", "nude", "nsfw", "sex", "xxx",
        "food", "alcohol", "cigarette", "tobacco",
    ]
    lower_query = query.lower()
    if any(term in lower_query for term in blocked_terms):
        return {"error": "Search query not allowed"}, 400

    safe_query = f"{query} clothing fashion apparel"
    try:
        res = requests.post(
            "https://google.serper.dev/shopping",
            headers={
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            json={"q": safe_query, "num": 20, "gl": "us"},
            timeout=30,
        )
    except requests.RequestException:
        return {"error": "Search provider unavailable"}, 502

    if not res.ok:
        return {"error": f"Search provider error: {res.text[:200]}"}, 502

    data = res.json()
    results = data.get("shopping") or []
    products = [
        {
            "title": row.get("title"),
            "source": row.get("source"),
            "link": row.get("link"),
            "price": row.get("price"),
            "imageUrl": row.get("imageUrl"),
            "rating": row.get("rating"),
        }
        for row in results
        if row.get("title") and row.get("link") and row.get("imageUrl")
    ]
    return {"products": products}
