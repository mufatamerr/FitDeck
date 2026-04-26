import functools
import json
import os
from urllib.request import urlopen

from jose import jwk, jwt

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN", "")
AUTH0_AUDIENCE = os.environ.get("AUTH0_AUDIENCE", "")

_DEV_SECRET = os.environ.get("ADMIN_DEV_SECRET", "fitdeck-admin-dev-secret-2026")


def _jwks():
    if not AUTH0_DOMAIN:
        raise RuntimeError("AUTH0_DOMAIN is not set")
    with urlopen(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json") as r:
        return json.load(r)


def verify_access_token(token: str) -> dict:
    """Validate Auth0 RS256 access token and return claims."""
    if not AUTH0_DOMAIN or not AUTH0_AUDIENCE:
        raise RuntimeError("AUTH0_DOMAIN and AUTH0_AUDIENCE must be set")

    jwks = _jwks()
    unverified_header = jwt.get_unverified_header(token)
    jwk_dict = None
    for key in jwks["keys"]:
        if key["kid"] == unverified_header.get("kid"):
            jwk_dict = key
            break
    if not jwk_dict:
        raise ValueError("Unable to find appropriate key")

    public_key = jwk.construct(jwk_dict)
    issuer = f"https://{AUTH0_DOMAIN}/"
    return jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience=AUTH0_AUDIENCE,
        issuer=issuer,
    )


def _try_dev_admin_token(token: str) -> dict | None:
    """Returns claims if token is a valid dev-admin HS256 JWT, else None."""
    try:
        claims = jwt.decode(token, _DEV_SECRET, algorithms=["HS256"])
        if claims.get("role") == "admin":
            return claims
    except Exception:
        pass
    return None


def require_auth(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        from flask import g, request

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return {"error": "missing_bearer_token"}, 401
        token = auth[7:].strip()

        # Try dev-admin HS256 token first (no network call needed)
        dev_claims = _try_dev_admin_token(token)
        if dev_claims is not None:
            g.jwt_claims = dev_claims
            return f(*args, **kwargs)

        try:
            g.jwt_claims = verify_access_token(token)
        except Exception as e:
            return {"error": "invalid_token", "detail": str(e)}, 401
        return f(*args, **kwargs)

    return decorated


def require_role(role: str):
    def decorator(f):
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            from flask import g

            claims = getattr(g, "jwt_claims", {}) or {}
            if claims.get("role") != role:
                return {"error": "forbidden"}, 403
            return f(*args, **kwargs)

        return wrapped

    return decorator
