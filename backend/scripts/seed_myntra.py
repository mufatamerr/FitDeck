"""
Seed the FitDeck catalog from the Myntra dataset.

Usage (from backend/):
    python scripts/seed_myntra.py

Reads:  ~/Downloads/archive/styles.csv
        ~/Downloads/archive/images/<id>.jpg
Uploads images to Cloudinary, inserts ClothingItem rows.
"""

import csv
import os
import sys
import uuid
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

DATASET_DIR  = Path.home() / "Downloads" / "archive"
IMAGES_DIR   = DATASET_DIR / "images"
STYLES_CSV   = DATASET_DIR / "styles.csv"

SAMPLES_PER_CATEGORY = 12

# Myntra articleType → FitDeck category
CATEGORY_MAP: dict[str, str] = {
    "Tshirts":          "shirt",
    "Shirts":           "shirt",
    "Tops":             "shirt",
    "Kurtas":           "shirt",
    "Casual Shirts":    "shirt",
    "Formal Shirts":    "shirt",
    "Jeans":            "pants",
    "Track Pants":      "pants",
    "Shorts":           "pants",
    "Trousers":         "pants",
    "Leggings":         "pants",
    "Jackets":          "jacket",
    "Sweaters":         "jacket",
    "Sweatshirts":      "jacket",
    "Coats":            "jacket",
    "Blazers":          "jacket",
    "Windcheater":      "jacket",
    "Casual Shoes":     "shoes",
    "Sports Shoes":     "shoes",
    "Heels":            "shoes",
    "Formal Shoes":     "shoes",
    "Sandals":          "shoes",
    "Flip Flops":       "shoes",
    "Flats":            "shoes",
    "Watches":          "accessory",
    "Handbags":         "accessory",
    "Sunglasses":       "accessory",
    "Wallets":          "accessory",
    "Belts":            "accessory",
    "Backpacks":        "accessory",
    "Caps":             "accessory",
    "Jewellery Set":    "accessory",
    "Earrings":         "accessory",
    "Necklace and Chains": "accessory",
}


def configure_cloudinary():
    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )


def upload_image(image_path: Path, public_id: str) -> str:
    result = cloudinary.uploader.upload(
        str(image_path),
        public_id=public_id,
        folder="fitdeck/catalog",
        overwrite=False,
        resource_type="image",
    )
    return result["secure_url"]


def pick_samples() -> list[dict]:
    """Read CSV, filter to mapped categories, pick SAMPLES_PER_CATEGORY each."""
    buckets: dict[str, list[dict]] = {c: [] for c in set(CATEGORY_MAP.values())}

    with open(STYLES_CSV, encoding="utf-8", errors="ignore") as f:
        for row in csv.DictReader(f):
            article = row.get("articleType", "")
            fit_cat = CATEGORY_MAP.get(article)
            if not fit_cat:
                continue
            img_path = IMAGES_DIR / f"{row['id'].strip()}.jpg"
            if not img_path.exists():
                continue
            if len(buckets[fit_cat]) < SAMPLES_PER_CATEGORY:
                buckets[fit_cat].append({
                    "id":       row["id"].strip(),
                    "name":     row["productDisplayName"].strip(),
                    "brand":    "Myntra",
                    "category": fit_cat,
                    "color":    row.get("baseColour", "").strip().lower(),
                    "gender":   row.get("gender", "").strip().lower(),
                    "usage":    row.get("usage", "").strip().lower(),
                    "season":   row.get("season", "").strip().lower(),
                    "article":  article.lower(),
                    "img_path": img_path,
                })
            if all(len(v) >= SAMPLES_PER_CATEGORY for v in buckets.values()):
                break

    samples = [item for group in buckets.values() for item in group]
    print(f"Selected {len(samples)} items across {len(buckets)} categories")
    for cat, items in buckets.items():
        print(f"  {cat}: {len(items)}")
    return samples


def seed():
    from app import create_app
    from app.db import db
    from app.models.clothing_item import ClothingItem

    configure_cloudinary()
    app = create_app()

    samples = pick_samples()

    with app.app_context():
        uploaded = 0
        skipped  = 0

        for item in samples:
            existing = ClothingItem.query.filter_by(
                source="catalog", name=item["name"], brand=item["brand"]
            ).first()

            if existing:
                print(f"  [skip] {item['name']}")
                skipped += 1
                continue

            public_id = f"myntra-{item['id']}"
            print(f"  [upload] {item['name']} ({item['category']}) ...", end=" ", flush=True)
            try:
                image_url = upload_image(item["img_path"], public_id)
                print("ok")
            except Exception as e:
                print(f"FAILED: {e}")
                continue

            style_tags = [t for t in [item["usage"], item["season"], item["article"]] if t]
            color_tags = [item["color"]] if item["color"] else []
            gender_tags = [item["gender"]] if item["gender"] else []

            db.session.add(ClothingItem(
                id=uuid.uuid4().hex,
                name=item["name"],
                brand=item["brand"],
                category=item["category"],
                image_url=image_url,
                style_tags=style_tags,
                color_tags=color_tags,
                gender_tags=gender_tags,
                source="catalog",
                owner_id=None,
                is_active=True,
                trending_score=75,
            ))
            uploaded += 1

        db.session.commit()
        print(f"\nDone — {uploaded} inserted, {skipped} already existed.")


if __name__ == "__main__":
    seed()
