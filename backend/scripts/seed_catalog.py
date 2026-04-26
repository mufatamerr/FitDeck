from pathlib import Path
import sys
import json
import os
import uuid
import re

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from app.db import db  # noqa: E402
from app.models.clothing_item import ClothingItem  # noqa: E402

from dotenv import load_dotenv  # noqa: E402
import requests  # noqa: E402
import cloudinary  # noqa: E402
import cloudinary.uploader  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "catalog_seed" / "manifest.json"
LOCAL_CATALOG_DIR = BACKEND_ROOT / "uploads" / "catalog"
API_BASE_URL = os.environ.get("API_BASE_URL", "http://127.0.0.1:5000")


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
    r = requests.get(url, timeout=30, headers={"User-Agent": "FitDeck/1.0"})
    r.raise_for_status()
    return r.content


def _removebg(image_bytes: bytes, bg_color: str = "ffffff") -> bytes | None:
    """Remove background via remove.bg. Returns processed image bytes or None on failure."""
    api_key = os.environ.get("REMOVEBG_API_KEY", "").strip()
    if not api_key:
        return None
    try:
        resp = requests.post(
            "https://api.remove.bg/v1.0/removebg",
            headers={"X-Api-Key": api_key},
            files={"image_file": ("image.jpg", image_bytes, "image/jpeg")},
            data={"size": "regular", "bg_color": bg_color, "format": "png"},
            timeout=30,
        )
        if resp.status_code == 200:
            return resp.content
        print(f"  remove.bg warning: {resp.status_code} {resp.text[:120]}")
    except Exception as exc:
        print(f"  remove.bg error: {exc}")
    return None


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _save_local(file_bytes: bytes, filename: str) -> str:
    LOCAL_CATALOG_DIR.mkdir(parents=True, exist_ok=True)
    (LOCAL_CATALOG_DIR / filename).write_bytes(file_bytes)
    return f"{API_BASE_URL}/uploads/catalog/{filename}"


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


def _process_image(source_url: str, slug: str) -> str:
    """
    Download source image, run through remove.bg (white bg),
    upload to Cloudinary if configured, else save locally.
    Returns the final URL to use in the DB.
    """
    try:
        img_bytes = _download_bytes(source_url)
    except Exception as exc:
        print(f"  Download failed: {exc}")
        return source_url

    # Apply remove.bg for a clean white background
    processed = _removebg(img_bytes, bg_color="ffffff")
    final_bytes = processed if processed is not None else img_bytes
    ext = "png" if processed is not None else "jpg"
    filename = f"{slug}.{ext}"

    if _cloudinary_configured():
        try:
            return _upload_bytes_to_cloudinary(file_bytes=final_bytes, public_id=slug)
        except Exception as exc:
            print(f"  Cloudinary upload failed: {exc}")

    # Fall back to local file serving
    return _save_local(final_bytes, filename)


def _read_manifest():
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    items = data.get("items") or []
    if not isinstance(items, list):
        raise ValueError("manifest.items must be a list")
    return items


def main():
    load_dotenv(ROOT / ".env")
    load_dotenv(BACKEND_ROOT / ".env")
    app = create_app()
    with app.app_context():
        rows = _read_manifest()
        seeded = 0
        for row in rows:
            brand = row.get("brand")
            name = row.get("name")
            category = row.get("category")
            if not (brand and name and category):
                print("Skipping invalid row (missing brand/name/category)")
                continue

            source_url = row.get("source_url") or row.get("image_url") or ""
            raw_image_url = row.get("image_url") or ""

            print(f"Processing: {brand} — {name}")
            slug = _slugify(f"{brand}-{name}")

            if raw_image_url:
                image_url = _process_image(raw_image_url, f"{slug}-img")
            else:
                image_url = raw_image_url

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
            item.try_on_asset = image_url  # white-bg PNG works well for Fashn.ai
            item.style_tags = row.get("style_tags") or []
            item.color_tags = row.get("color_tags") or []
            item.gender_tags = row.get("gender_tags") or []
            item.price_usd = row.get("price_usd")
            item.is_active = True
            seeded += 1

        db.session.commit()
        print(f"\nSeeded/updated {seeded} catalog items.")


if __name__ == "__main__":
    main()

