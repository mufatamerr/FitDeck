import os

import cloudinary
import cloudinary.uploader


def configured() -> bool:
    return bool(
        os.environ.get("CLOUDINARY_CLOUD_NAME")
        and os.environ.get("CLOUDINARY_API_KEY")
        and os.environ.get("CLOUDINARY_API_SECRET")
    )


def _configure():
    cloudinary.config(
        cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
        api_key=os.environ["CLOUDINARY_API_KEY"],
        api_secret=os.environ["CLOUDINARY_API_SECRET"],
        secure=True,
    )


def upload_image_bytes(*, file_bytes: bytes, public_id: str, folder: str = "fitdeck/admin-catalog") -> str:
    if not configured():
        raise RuntimeError("Cloudinary env vars are not set")
    _configure()
    res = cloudinary.uploader.upload(
        file_bytes,
        public_id=public_id,
        folder=folder,
        resource_type="image",
        overwrite=True,
    )
    return res["secure_url"]
