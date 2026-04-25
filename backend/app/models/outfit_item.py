from app.db import db


class OutfitItem(db.Model):
    __tablename__ = "outfit_item"

    id = db.Column(db.Integer, primary_key=True)
    outfit_id = db.Column(db.String(64), nullable=False, index=True)
    clothing_item_id = db.Column(db.String(64), nullable=False, index=True)
    category = db.Column(db.String(50), nullable=True)  # cached convenience

