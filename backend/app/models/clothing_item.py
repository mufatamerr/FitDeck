from datetime import datetime

from app.db import db


class ClothingItem(db.Model):
    __tablename__ = "clothing_item"

    id = db.Column(db.String(64), primary_key=True)  # uuid-ish string

    name = db.Column(db.String(255), nullable=False)
    brand = db.Column(db.String(255), nullable=True, index=True)
    category = db.Column(db.String(50), nullable=False, index=True)

    style_tags = db.Column(db.JSON, nullable=True)
    gender_tags = db.Column(db.JSON, nullable=True)
    color_tags = db.Column(db.JSON, nullable=True)

    price_usd = db.Column(db.Float, nullable=True)
    image_url = db.Column(db.Text, nullable=True)
    try_on_asset = db.Column(db.Text, nullable=True)  # transparent PNG url
    source_url = db.Column(db.Text, nullable=True)

    vision_labels = db.Column(db.JSON, nullable=True)
    trending_score = db.Column(db.Integer, nullable=False, default=50)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    source = db.Column(db.String(20), nullable=False, index=True)  # catalog|personal
    owner_id = db.Column(db.String(255), nullable=True, index=True)  # auth0_id for personal

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

