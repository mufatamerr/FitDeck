import os
import time

import requests
from flask import Blueprint, request

from app.auth0_jwt import require_auth

tryon_bp = Blueprint("tryon", __name__)

FASHN_BASE = "https://api.fashn.ai/v1"



@tryon_bp.post("/generate")
@require_auth
def generate():
    """
    Accepts:
      person_image   – base64 JPEG of webcam snapshot (no data URI prefix)
      garment_image  – URL of the garment (Cloudinary etc.) or base64 PNG
      category       – tops | bottoms | one-pieces
    Returns: { result_url }
    """
    data = request.get_json(silent=True) or {}

    person_input  = data.get("person_image", "").strip()
    person_is_url = bool(data.get("person_is_url", False))
    garment_image = data.get("garment_image", "").strip()
    category      = data.get("category", "tops")

    if not person_input or not garment_image:
        return {"error": "person_image and garment_image are required"}, 400

    fashn_key = os.environ.get("FASHN_API_KEY", "").strip()
    if not fashn_key:
        return {"error": "FASHN_API_KEY is not configured"}, 503

    headers = {
        "Authorization": f"Bearer {fashn_key}",
        "Content-Type": "application/json",
    }

    # person_is_url=True means it's a Fashn.ai result URL from a previous generation
    if person_is_url or person_input.startswith("http"):
        model_image = person_input                              # URL — Fashn.ai can fetch it
    elif person_input.startswith("data:"):
        model_image = person_input                              # already a data URI
    else:
        model_image = f"data:image/jpeg;base64,{person_input}" # raw base64 from webcam

    # ── Start generation ──────────────────────────────────────────────────────
    try:
        run_resp = requests.post(
            f"{FASHN_BASE}/run",
            headers=headers,
            json={
                "model_name": "tryon-v1.6",
                "inputs": {
                    "model_image":   model_image,
                    "garment_image": garment_image,
                    "category":      category,
                },
            },
            timeout=30,
        )
    except requests.RequestException as e:
        return {"error": f"Fashn.ai request failed: {e}"}, 502

    if not run_resp.ok:
        return {"error": run_resp.text}, run_resp.status_code

    run_data = run_resp.json()
    pred_id  = run_data.get("id") or run_data.get("prediction_id")
    if not pred_id:
        return {"error": f"No prediction id in Fashn.ai response: {run_data}"}, 502

    # ── Poll for result: every 2 s, up to 30 attempts (60 s total) ───────────
    for _ in range(30):
        time.sleep(2)
        try:
            status_resp = requests.get(
                f"{FASHN_BASE}/status/{pred_id}",
                headers=headers,
                timeout=15,
            )
        except requests.RequestException:
            continue

        if not status_resp.ok:
            continue

        status_data = status_resp.json()
        status      = status_data.get("status", "")

        if status == "completed":
            output = status_data.get("output") or []
            # output may be a list of URLs or a list of dicts with a "url" key
            first = output[0] if output else None
            url   = first if isinstance(first, str) else (first or {}).get("url") if first else None
            if url:
                return {"result_url": url}
            return {"error": f"Fashn.ai returned no output URL: {output}"}, 502

        if status in ("failed", "error", "cancelled"):
            raw_err = status_data.get("error", f"Generation {status}")
            # always stringify — Fashn.ai sometimes returns a dict here
            err_msg = raw_err if isinstance(raw_err, str) else str(raw_err)
            return {"error": err_msg}, 500

    return {"error": "Timed out waiting for Fashn.ai result"}, 504
