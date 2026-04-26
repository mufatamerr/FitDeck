import base64
import os
from datetime import datetime, timezone

import requests
from flask import Blueprint, jsonify, request

from app.auth0_jwt import require_auth


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
        if "base64," not in s:
            return None
        s = s.split("base64,", 1)[1]
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
    Single-step try-on. Frontend chains calls for multi-garment outfits.

    Request JSON:
      - image_base64: base64/data-URL of the person image (first call)
      - model_image_url: public URL of person image (subsequent calls, pass previous result_image_url)
      - garment_src: base64/data-URL or public URL of the garment

    Response:
      - result_image_url: Fashn CDN URL of the composited result
    """
    body = request.get_json(silent=True) or {}

    # Person image — either base64 (first call) or URL (chained calls)
    img_b64     = (body.get("image_base64") or "").strip()
    model_url   = (body.get("model_image_url") or "").strip()
    garment_src = (body.get("garment_src") or "").strip()

    if not img_b64 and not model_url:
        return jsonify({"detail": "missing image_base64 or model_image_url"}), 400
    if not garment_src:
        return jsonify({"detail": "missing garment_src"}), 400

    # Validate base64 if provided
    if img_b64 and not _b64_image_to_bytes(img_b64):
        return jsonify({"detail": "invalid image_base64"}), 400

    fashn_key = os.environ.get("FASHN_API_KEY", "").strip()
    if not fashn_key:
        return jsonify({"detail": "FASHN_API_KEY is not configured"}), 400

    model_image = img_b64 if img_b64 else model_url
    try:
        result_url = _fashn_run_tryon(model_image=model_image, garment_image=garment_src, api_key=fashn_key)
    except Exception as e:
        return jsonify({"detail": str(e) or "fashn_error"}), 400

    return {"result_image_url": result_url}

