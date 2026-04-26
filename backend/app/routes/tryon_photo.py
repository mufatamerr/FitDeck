import base64
import os
import re
from datetime import datetime, timezone

import requests
from flask import Blueprint, jsonify, request

from app.auth0_jwt import require_auth
from app.services.cloudinary_upload import upload_image_bytes


tryon_photo_bp = Blueprint("tryon_photo", __name__)

FASHN_BASE_URL = "https://api.fashn.ai/v1"


def _b64_image_to_bytes(data_url_or_b64: str) -> bytes | None:
    """
    Accepts:
    - data URL: data:image/jpeg;base64,...
    - raw base64
    """
    if not isinstance(data_url_or_b64, str):
        return None
    s = data_url_or_b64.strip()
    if not s:
        return None
    if s.startswith("data:"):
        m = re.match(r"^data:image/\\w+;base64,(.+)$", s)
        if not m:
            return None
        s = m.group(1)
    try:
        return base64.b64decode(s, validate=True)
    except Exception:
        return None


def _fashn_run_tryon(*, model_image: str, garment_image: str, api_key: str) -> str:
    """
    Runs FASHN tryon-v1.6 and returns a single output URL.
    model_image and garment_image may be URLs or base64 data URLs.
    """
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
    run = requests.post(
        f"{FASHN_BASE_URL}/run",
        headers=headers,
        json={
            "model_name": "tryon-v1.6",
            "inputs": {
                "model_image": model_image,
                "garment_image": garment_image,
                "garment_photo_type": "auto",
                "output_format": "jpeg",
                "return_base64": False,
                "num_samples": 1,
            },
        },
        timeout=60,
    )
    if run.status_code >= 400:
        snippet = (run.text or "").strip()[:800] or str(run.status_code)
        raise RuntimeError(f"FASHN /run error: {snippet}")
    run_data = run.json() if run.headers.get("content-type", "").startswith("application/json") else {}
    pred_id = run_data.get("id") if isinstance(run_data, dict) else None
    if not pred_id:
        raise RuntimeError("FASHN did not return a prediction id")

    # Poll for completion (docs: /status/<id>)
    deadline = datetime.now(tz=timezone.utc).timestamp() + 140
    while datetime.now(tz=timezone.utc).timestamp() < deadline:
        st = requests.get(f"{FASHN_BASE_URL}/status/{pred_id}", headers=headers, timeout=30)
        if st.status_code >= 400:
            snippet = (st.text or "").strip()[:800] or str(st.status_code)
            raise RuntimeError(f"FASHN /status error: {snippet}")
        data = st.json() if st.headers.get("content-type", "").startswith("application/json") else {}
        status = (data.get("status") or "").strip() if isinstance(data, dict) else ""
        if status == "completed":
            out = data.get("output") if isinstance(data, dict) else None
            if isinstance(out, list) and out and isinstance(out[0], str) and out[0].strip():
                return out[0].strip()
            raise RuntimeError("FASHN completed but returned no output URL")
        if status in ("failed", "canceled", "cancelled"):
            err = data.get("error") if isinstance(data, dict) else None
            raise RuntimeError(f"FASHN failed: {err or 'unknown_error'}")
        # starting / in_queue / processing
        # Sleep a bit without importing time (keep deps minimal)
        import time

        time.sleep(2.5)

    raise RuntimeError("FASHN timed out")


@tryon_photo_bp.post("/photo")
@require_auth
def tryon_photo():
    """
    Deepfake-style photo try-on (provider-backed).

    Request JSON:
      - image_base64: data URL or raw base64 (camera frame)
      - items: [{ id, category, try_on_asset?, image_url? }]
      - outfit_name?: string

    Response:
      - result_image_url: string (Cloudinary)
    """
    body = request.get_json(silent=True) or {}
    img_b64 = (body.get("image_base64") or "").strip()
    items = body.get("items") or []
    if not img_b64:
        return jsonify({"detail": "missing image_base64"}), 400
    if not isinstance(items, list) or not items:
        return jsonify({"detail": "missing items"}), 400

    frame_bytes = _b64_image_to_bytes(img_b64)
    if not frame_bytes:
        return jsonify({"detail": "invalid image_base64"}), 400

    garment_urls: list[str] = []
    for it in items[:8]:
        if not isinstance(it, dict):
            continue
        url = (it.get("try_on_asset") or it.get("image_url") or "").strip()
        if url:
            garment_urls.append(url)
    if not garment_urls:
        return jsonify({"detail": "items have no usable image_url/try_on_asset"}), 400

    # Use FASHN if configured. (No local GPU required; this is provider-backed.)
    fashn_key = os.environ.get("FASHN_API_KEY", "").strip()

    out_bytes: bytes | None = None
    if fashn_key:
        # FASHN accepts base64, but in practice it's picky about prefixes/encodings.
        # Upload the camera frame to Cloudinary first and pass a normal URL.
        ts_in = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        try:
            model_url = upload_image_bytes(
                file_bytes=frame_bytes,
                public_id=f"tryon_input_{ts_in}",
                folder="fitdeck/tryon-input",
            )
        except Exception as e:
            return jsonify({"detail": str(e) or "cloudinary_upload_failed"}), 400

        # FASHN try-on supports one garment image per run.
        # For multi-item outfits, apply sequentially in a deterministic order.
        # This is a pragmatic MVP (shirt -> jacket -> pants -> shoes).
        order = {"shirt": 0, "jacket": 1, "pants": 2, "shoes": 3, "accessory": 4}
        ordered = []
        for it in items:
            if not isinstance(it, dict):
                continue
            url = (it.get("try_on_asset") or it.get("image_url") or "").strip()
            cat = (it.get("category") or "").strip()
            if url:
                ordered.append((order.get(cat, 99), url))
        ordered.sort(key=lambda x: x[0])
        garment_ordered_urls = [u for _, u in ordered][:4] or garment_urls[:1]

        model_image = model_url
        try:
            last_url = ""
            for gu in garment_ordered_urls:
                last_url = _fashn_run_tryon(model_image=model_image, garment_image=gu, api_key=fashn_key)
                model_image = last_url
        except Exception as e:
            return jsonify({"detail": str(e) or "fashn_error"}), 400

        rr = requests.get(last_url, timeout=60)
        if rr.status_code < 400:
            out_bytes = rr.content
    else:
        # Fallback: generic provider (optional).
        provider_url = os.environ.get("TRYON_DEEPFAKE_API_URL", "").strip()
        provider_key = os.environ.get("TRYON_DEEPFAKE_API_KEY", "").strip()
        if not provider_url or not provider_key:
            return (
                jsonify(
                    {
                        "detail": "Deepfake try-on is not configured. Set FASHN_API_KEY or TRYON_DEEPFAKE_API_URL/TRYON_DEEPFAKE_API_KEY on the backend.",
                    }
                ),
                400,
            )

        r = requests.post(
            provider_url,
            headers={
                "Authorization": f"Bearer {provider_key}",
                "Content-Type": "application/json",
            },
            json={
                "person_image_base64": img_b64,
                "garment_image_urls": garment_urls,
            },
            timeout=120,
        )
        if r.status_code >= 400:
            snippet = (r.text or "").strip()[:800] or str(r.status_code)
            return jsonify({"detail": "tryon_provider_error", "provider_detail": snippet}), 400

        data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        result_url = (data.get("result_image_url") or "").strip() if isinstance(data, dict) else ""
        result_b64 = (data.get("result_image_base64") or "").strip() if isinstance(data, dict) else ""

        if result_b64:
            out_bytes = _b64_image_to_bytes(result_b64)
        elif result_url:
            rr = requests.get(result_url, timeout=60)
            if rr.status_code < 400:
                out_bytes = rr.content

    if not out_bytes:
        return jsonify({"detail": "provider returned no result image"}), 400

    ts = datetime.now(tz=timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    public_id = f"tryon_{ts}"
    try:
        uploaded = upload_image_bytes(
            file_bytes=out_bytes,
            public_id=public_id,
            folder="fitdeck/tryon",
        )
    except Exception as e:
        return jsonify({"detail": str(e) or "cloudinary_upload_failed"}), 400

    return {"result_image_url": uploaded}

