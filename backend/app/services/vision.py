import base64
import os

import requests


def annotate_image(image_bytes: bytes):
    key = os.environ.get("GOOGLE_CLOUD_VISION_API_KEY")
    if not key:
        return None, "GOOGLE_CLOUD_VISION_API_KEY is not set"
    url = f"https://vision.googleapis.com/v1/images:annotate?key={key}"
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    payload = {
        "requests": [
            {
                "image": {"content": b64},
                "features": [
                    {"type": "LABEL_DETECTION", "maxResults": 15},
                    {"type": "IMAGE_PROPERTIES", "maxResults": 5},
                ],
            }
        ]
    }
    r = requests.post(url, json=payload, timeout=20)
    if r.status_code >= 400:
        return None, f"Vision error: {r.status_code}"
    return r.json(), None


def parse_labels_and_colors(vision: dict | None):
    labels: list[str] = []
    colors: list[str] = []
    if not vision or "responses" not in vision or not vision["responses"]:
        return labels, colors
    resp = vision["responses"][0]
    for l in resp.get("labelAnnotations", [])[:12]:
        desc = l.get("description")
        if desc:
            labels.append(desc.lower())
    props = (resp.get("imagePropertiesAnnotation") or {}).get("dominantColors") or {}
    for c in (props.get("colors") or [])[:5]:
        rgb = c.get("color") or {}
        colors.append(
            f"rgb({rgb.get('red',0)},{rgb.get('green',0)},{rgb.get('blue',0)})"
        )
    return labels, colors


def infer_category_from_labels(labels: list[str]) -> str | None:
    s = " ".join(labels).lower()
    if any(k in s for k in ["shoe", "sneaker", "boot", "trainer", "heel", "footwear"]):
        return "shoes"
    if any(
        k in s
        for k in [
            "pants",
            "trousers",
            "jean",
            "jeans",
            "denim",
            "leggings",
            "shorts",
            "skirt",
        ]
    ):
        return "pants"
    if any(
        k in s
        for k in ["jacket", "coat", "hoodie", "sweater", "blazer", "outerwear", "cardigan"]
    ):
        return "jacket"
    if any(k in s for k in ["shirt", "t-shirt", "tshirt", "top", "blouse", "polo", "tee"]):
        return "shirt"
    if any(k in s for k in ["bag", "cap", "hat", "belt", "accessory", "watch", "scarf"]):
        return "accessory"
    return None


def suggested_name_from_labels(labels: list[str]) -> str:
    if not labels:
        return "Catalog item"
    return labels[0].title()
