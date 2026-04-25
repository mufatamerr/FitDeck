from datetime import datetime

from app.db import db


class Outfit(db.Model):
    __tablename__ = "outfit"

    id = db.Column(db.String(64), primary_key=True)  # uuid-ish string
    owner_id = db.Column(db.String(255), nullable=False, index=True)  # auth0_id
    name = db.Column(db.String(255), nullable=True)
    is_saved = db.Column(db.Boolean, nullable=False, default=False)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

