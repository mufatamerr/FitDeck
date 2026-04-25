import uuid

from flask import Blueprint, g, request

from app.auth0_jwt import require_auth
from app.db import db
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
    return {
        "outfits": [
            {
                "id": o.id,
                "name": o.name,
                "created_at": o.created_at.isoformat(),
                "updated_at": o.updated_at.isoformat(),
            }
            for o in outfits
        ]
    }


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
    for cid in item_ids:
        db.session.add(OutfitItem(outfit_id=outfit_id, clothing_item_id=str(cid)))
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

