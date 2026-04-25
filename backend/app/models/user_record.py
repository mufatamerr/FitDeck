from datetime import datetime

from app.db import db


class UserRecord(db.Model):
    __tablename__ = "user_record"

    id = db.Column(db.Integer, primary_key=True)
    auth0_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), nullable=True, index=True)
    name = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(50), nullable=False, default="user")
    onboarding_done = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

