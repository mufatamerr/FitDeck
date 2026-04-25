import uuid

from flask import Blueprint, g, request

from app.auth0_jwt import require_auth
from app.db import db
from app.models.clothing_item import ClothingItem
from app.models.outfit import Outfit
from app.models.outfit_item import OutfitItem

outfits_bp = Blueprint("outfits", __name__)


@outfits_bp.get("")
@require_auth
def list_outfits():
    owner_id = g.jwt_claims.get("sub")
    outfits = (
        Outfit.query.filter_by(owner_id=owner_id, is_saved=True)
        .order_by(Outfit.updated_at.desc())
        .all()
    )
    out = []
    for o in outfits:
        links = OutfitItem.query.filter_by(outfit_id=o.id).all()
        ids = [l.clothing_item_id for l in links]
        items = []
        if ids:
            rows = ClothingItem.query.filter(ClothingItem.id.in_(ids)).all()
            by_id = {r.id: r for r in rows}
            for cid in ids:
                r = by_id.get(cid)
                if not r:
                    continue
                items.append(
                    {
                        "id": r.id,
                        "name": r.name,
                        "brand": r.brand,
                        "category": r.category,
                        "image_url": r.image_url,
                        "try_on_asset": r.try_on_asset,
                        "style_tags": r.style_tags or [],
                        "color_tags": r.color_tags or [],
                        "source": r.source,
                    }
                )
        out.append(
            {
                "id": o.id,
                "name": o.name,
                "created_at": o.created_at.isoformat(),
                "updated_at": o.updated_at.isoformat(),
                "items": items,
            }
        )
    return {"outfits": out}


@outfits_bp.get("/<outfit_id>")
@require_auth
def get_outfit(outfit_id: str):
    owner_id = g.jwt_claims.get("sub")
    o = Outfit.query.filter_by(id=outfit_id, owner_id=owner_id).first()
    if not o:
        return {"error": "not_found"}, 404

    links = OutfitItem.query.filter_by(outfit_id=o.id).all()
    ids = [l.clothing_item_id for l in links]
    rows = ClothingItem.query.filter(ClothingItem.id.in_(ids)).all() if ids else []
    by_id = {r.id: r for r in rows}
    items = []
    for cid in ids:
        r = by_id.get(cid)
        if not r:
            continue
        items.append(
            {
                "id": r.id,
                "name": r.name,
                "brand": r.brand,
                "category": r.category,
                "image_url": r.image_url,
                "try_on_asset": r.try_on_asset,
                "style_tags": r.style_tags or [],
                "color_tags": r.color_tags or [],
                "source": r.source,
            }
        )
    return {"id": o.id, "name": o.name, "items": items}


@outfits_bp.post("")
@require_auth
def create_outfit():
    owner_id = g.jwt_claims.get("sub")
    body = request.get_json(silent=True) or {}
    item_ids = body.get("item_ids") or []
    name = body.get("name")

    outfit_id = uuid.uuid4().hex
    outfit = Outfit(id=outfit_id, owner_id=owner_id, name=name, is_saved=False)
    db.session.add(outfit)
    # also store category for convenience
    rows = ClothingItem.query.filter(ClothingItem.id.in_([str(i) for i in item_ids])).all()
    by_id = {r.id: r for r in rows}
    for cid in item_ids:
        cid_s = str(cid)
        db.session.add(
            OutfitItem(
                outfit_id=outfit_id,
                clothing_item_id=cid_s,
                category=(by_id.get(cid_s).category if by_id.get(cid_s) else None),
            )
        )
    db.session.commit()

    return {"outfit_id": outfit_id}


@outfits_bp.post("/save")
@require_auth
def save_outfit():
    owner_id = g.jwt_claims.get("sub")
    body = request.get_json(silent=True) or {}
    outfit_id = body.get("outfit_id")
    if not outfit_id:
        return {"error": "missing_outfit_id"}, 400

    outfit = Outfit.query.filter_by(id=outfit_id, owner_id=owner_id).first()
    if not outfit:
        return {"error": "not_found"}, 404
    outfit.is_saved = True
    db.session.commit()
    return {"ok": True}

