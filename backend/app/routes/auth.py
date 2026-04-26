from flask import Blueprint, g, request

from app.auth0_jwt import require_auth
from app.db import db
from app.models.user_record import UserRecord

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/sync")
@require_auth
def sync():
    """
    Called after Auth0 login (SPA) with access token.
    Returns identity + custom claims (e.g. role from Post-Login Action).
    """
    claims = g.jwt_claims
    sub = claims.get("sub")
    email = claims.get("email") or claims.get("https://fitdeck-api/email")
    jwt_name = claims.get("name") or claims.get("nickname")
    role = claims.get("role", "user")

    body = request.get_json(silent=True) or {}
    display_name = body.get("display_name") or jwt_name

    user = UserRecord.query.filter_by(auth0_id=sub).first()
    if not user:
        user = UserRecord(auth0_id=sub, email=email, name=display_name, role=role)
        db.session.add(user)
    else:
        user.email = email or user.email
        if display_name:
            user.name = display_name
        user.role = role or user.role
    db.session.commit()

    return {
        "auth0_id": sub,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "onboarding_done": bool(user.onboarding_done),
    }
