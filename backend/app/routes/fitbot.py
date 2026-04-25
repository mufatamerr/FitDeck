import os

import requests
from flask import Blueprint, g, request, Response

from app.auth0_jwt import require_auth

fitbot_bp = Blueprint("fitbot", __name__)


def _weather_forecast(location: str):
    key = os.environ.get("OPENWEATHER_API_KEY")
    if not key:
        return None, "OPENWEATHER_API_KEY is not set"
    r = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"q": location, "appid": key, "units": "metric"},
        timeout=15,
    )
    if r.status_code >= 400:
        return None, f"Weather error: {r.status_code}"
    return r.json(), None


def _gemma_reply(prompt: str):
    key = os.environ.get("GOOGLE_AI_STUDIO_API_KEY")
    if not key:
        return None, "GOOGLE_AI_STUDIO_API_KEY is not set"

    # Use Generative Language API. Model string can be adjusted later.
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemma-2-2b-it:generateContent"
    r = requests.post(
        url,
        headers={"x-goog-api-key": key},
        json={"contents": [{"role": "user", "parts": [{"text": prompt}]}]},
        timeout=30,
    )
    if r.status_code >= 400:
        return None, f"Gemma error: {r.status_code}"
    data = r.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        text = None
    return text, None


@fitbot_bp.post("")
@require_auth
def chat():
    body = request.get_json(silent=True) or {}
    message = (body.get("message") or "").strip()
    location = (body.get("location") or "").strip() or "Mississauga,CA"
    include_weather = bool(body.get("include_weather"))

    if not message:
        return {"error": "missing_message"}, 400

    weather = None
    weather_err = None
    if include_weather:
        weather, weather_err = _weather_forecast(location)

    weather_text = ""
    if weather:
        try:
            weather_text = (
                f"Weather now in {location}: {weather['main']['temp']}°C, "
                f"{weather['weather'][0]['description']}."
            )
        except Exception:
            weather_text = ""

    prompt = (
        "You are FitDeck's AI stylist. Be concise, practical, and confident.\n\n"
        f"{weather_text}\n\n"
        f"User: {message}"
    ).strip()

    reply, gemma_err = _gemma_reply(prompt)
    if not reply:
        return {"reply": "FitBot isn’t configured yet.", "detail": gemma_err or weather_err}
    return {"reply": reply, "weather_error": weather_err}


@fitbot_bp.post("/speak")
@require_auth
def speak():
    key = os.environ.get("ELEVENLABS_API_KEY")
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
    if not key:
        return {"error": "ELEVENLABS_API_KEY is not set"}, 400

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return {"error": "missing_text"}, 400

    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        },
        stream=True,
        timeout=30,
    )
    if r.status_code >= 400:
        return {"error": "elevenlabs_error", "detail": str(r.status_code)}, 400

    return Response(r.iter_content(chunk_size=4096), content_type="audio/mpeg")

