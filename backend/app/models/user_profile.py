from datetime import datetime

from app.db import db


class UserProfile(db.Model):
    __tablename__ = "user_profile"

    id = db.Column(db.Integer, primary_key=True)
    auth0_id = db.Column(db.String(255), unique=True, nullable=False, index=True)

    style_tags = db.Column(db.JSON, nullable=True)
    brand_prefs = db.Column(db.JSON, nullable=True)
    color_prefs = db.Column(db.JSON, nullable=True)
    gender_pref = db.Column(db.String(50), nullable=True)
    location = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

