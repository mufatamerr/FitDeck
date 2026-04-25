from flask import Blueprint, g, request

from app.auth0_jwt import require_auth

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
    return {
        "auth0_id": sub,
        "email": claims.get("email") or claims.get("https://fitdeck-api/email"),
        "name": claims.get("name") or claims.get("nickname"),
        "role": claims.get("role", "user"),
        "onboarding_done": False,
    }
