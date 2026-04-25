import uuid
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from app.db import db  # noqa: E402
from app.models.clothing_item import ClothingItem  # noqa: E402


SEED = [
    {
        "name": "FitDeck Dri-FIT Tee",
        "brand": "FitDeck",
        "category": "shirt",
        "image_url": "https://dummyimage.com/800x800/7c3aed/ffffff.png&text=SHIRT",
        "try_on_asset": "https://dummyimage.com/800x800/7c3aed/ffffff.png&text=SHIRT",
        "style_tags": ["athletic"],
        "color_tags": ["violet"],
    },
    {
        "name": "FitDeck Track Pants",
        "brand": "FitDeck",
        "category": "pants",
        "image_url": "https://dummyimage.com/800x800/111827/ffffff.png&text=PANTS",
        "try_on_asset": "https://dummyimage.com/800x800/111827/ffffff.png&text=PANTS",
        "style_tags": ["streetwear"],
        "color_tags": ["black"],
    },
    {
        "name": "FitDeck Windbreaker",
        "brand": "FitDeck",
        "category": "jacket",
        "image_url": "https://dummyimage.com/800x800/0ea5e9/ffffff.png&text=JACKET",
        "try_on_asset": "https://dummyimage.com/800x800/0ea5e9/ffffff.png&text=JACKET",
        "style_tags": ["sport"],
        "color_tags": ["blue"],
    },
    {
        "name": "FitDeck Sneakers",
        "brand": "FitDeck",
        "category": "shoes",
        "image_url": "https://dummyimage.com/800x800/f59e0b/111827.png&text=SHOES",
        "try_on_asset": "https://dummyimage.com/800x800/f59e0b/111827.png&text=SHOES",
        "style_tags": ["casual"],
        "color_tags": ["gold"],
    },
]


def main():
    app = create_app()
    with app.app_context():
        for row in SEED:
            exists = (
                ClothingItem.query.filter_by(
                    source="catalog", name=row["name"], brand=row["brand"]
                ).first()
                is not None
            )
            if exists:
                continue
            item = ClothingItem(
                id=uuid.uuid4().hex,
                name=row["name"],
                brand=row["brand"],
                category=row["category"],
                image_url=row["image_url"],
                try_on_asset=row["try_on_asset"],
                style_tags=row.get("style_tags", []),
                color_tags=row.get("color_tags", []),
                source="catalog",
                owner_id=None,
                trending_score=80,
                is_active=True,
            )
            db.session.add(item)
        db.session.commit()
        print("Seeded catalog items.")


if __name__ == "__main__":
    main()

