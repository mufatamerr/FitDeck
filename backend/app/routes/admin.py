from flask import Blueprint

from app.auth0_jwt import require_auth, require_role
from app.models.user_record import UserRecord

admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/users")
@require_auth
@require_role("admin")
def users():
    rows = UserRecord.query.order_by(UserRecord.created_at.desc()).limit(200).all()
    return {
        "users": [
            {
                "auth0_id": u.auth0_id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "onboarding_done": bool(u.onboarding_done),
                "created_at": u.created_at.isoformat(),
            }
            for u in rows
        ]
    }

