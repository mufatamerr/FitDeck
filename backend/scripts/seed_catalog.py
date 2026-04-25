from pathlib import Path
import sys
import json
import os
import uuid

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from app.db import db  # noqa: E402
from app.models.clothing_item import ClothingItem  # noqa: E402

from dotenv import load_dotenv  # noqa: E402
import requests  # noqa: E402
import cloudinary  # noqa: E402
import cloudinary.uploader  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "catalog_seed" / "manifest.json"


def _cloudinary_configured() -> bool:
    return bool(
        os.environ.get("CLOUDINARY_CLOUD_NAME")
        and os.environ.get("CLOUDINARY_API_KEY")
        and os.environ.get("CLOUDINARY_API_SECRET")
    )


def _configure_cloudinary():
    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )


def _download_bytes(url: str) -> bytes:
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.content


def _upload_bytes_to_cloudinary(
    *,
    file_bytes: bytes,
    public_id: str,
    folder: str = "fitdeck/catalog",
    resource_type: str = "image",
):
    if not _cloudinary_configured():
        raise RuntimeError("Cloudinary env vars are not set")
    _configure_cloudinary()
    res = cloudinary.uploader.upload(
        file_bytes,
        public_id=public_id,
        folder=folder,
        resource_type=resource_type,
        overwrite=True,
    )
    return res["secure_url"]


def _read_manifest():
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    items = data.get("items") or []
    if not isinstance(items, list):
        raise ValueError("manifest.items must be a list")
    return items


def main():
    load_dotenv(ROOT / ".env")
    app = create_app()
    with app.app_context():
        rows = _read_manifest()
        for row in rows:
            brand = row.get("brand")
            name = row.get("name")
            category = row.get("category")
            if not (brand and name and category):
                print("Skipping invalid row (missing brand/name/category)")
                continue

            source_url = row.get("source_url")
            image_url = row.get("image_url")
            try_on_asset_url = row.get("try_on_asset_url") or image_url

            # upload to Cloudinary if configured
            if _cloudinary_configured() and image_url:
                img_bytes = _download_bytes(image_url)
                public_id = f"{brand}-{name}-image".lower().replace(" ", "-")
                image_url = _upload_bytes_to_cloudinary(
                    file_bytes=img_bytes, public_id=public_id
                )
            if _cloudinary_configured() and try_on_asset_url:
                asset_bytes = _download_bytes(try_on_asset_url)
                public_id = f"{brand}-{name}-tryon".lower().replace(" ", "-")
                try_on_asset_url = _upload_bytes_to_cloudinary(
                    file_bytes=asset_bytes, public_id=public_id
                )

            item = ClothingItem.query.filter_by(
                source="catalog", name=name, brand=brand
            ).first()
            if not item:
                item = ClothingItem(
                    id=uuid.uuid4().hex,
                    name=name,
                    brand=brand,
                    category=category,
                    source="catalog",
                    owner_id=None,
                    trending_score=int(row.get("trending_score") or 80),
                    is_active=True,
                )
                db.session.add(item)

            item.category = category
            item.source_url = source_url
            item.image_url = image_url
            item.try_on_asset = try_on_asset_url
            item.style_tags = row.get("style_tags") or []
            item.color_tags = row.get("color_tags") or []
            item.gender_tags = row.get("gender_tags") or []
            item.is_active = True

        db.session.commit()
        print(f"Seeded/updated {len(rows)} catalog items from manifest.")


if __name__ == "__main__":
    main()

