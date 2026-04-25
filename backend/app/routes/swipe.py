from flask import Blueprint, g, request

from app.auth0_jwt import require_auth
from app.db import db
from app.models.outfit import Outfit

swipe_bp = Blueprint("swipe", __name__)


@swipe_bp.post("")
@require_auth
def swipe():
    owner_id = g.jwt_claims.get("sub")
    body = request.get_json(silent=True) or {}
    outfit_id = body.get("outfit_id")
    direction = body.get("direction")
    if direction not in ("left", "right"):
        return {"error": "invalid_direction"}, 400
    if not outfit_id:
        return {"error": "missing_outfit_id"}, 400

    outfit = Outfit.query.filter_by(id=outfit_id, owner_id=owner_id).first()
    if not outfit:
        return {"error": "not_found"}, 404

    if direction == "right":
        outfit.is_saved = True

    db.session.commit()
    return {"ok": True, "saved": bool(outfit.is_saved)}

