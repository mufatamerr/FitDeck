import os
import re
from datetime import datetime, timezone

import requests
from flask import Blueprint, Response, jsonify, request

from app.auth0_jwt import require_auth
from app.services import fitbot_config

fitbot_bp = Blueprint("fitbot", __name__)

_DAY_NAMES = [
    ("monday", 0),
    ("tuesday", 1),
    ("wednesday", 2),
    ("thursday", 3),
    ("friday", 4),
    ("saturday", 5),
    ("sunday", 6),
]


def _weekday_from_message(message: str) -> int | None:
    m = message.lower()
    for name, idx in _DAY_NAMES:
        if name in m:
            return idx
    return None


def _extract_location_hint(message: str) -> str | None:
    """Rough '... in Mississauga' / '... in Toronto' capture for forecast query."""
    m = message.strip()
    match = re.search(r"\bin\s+([A-Za-z][A-Za-z\s'.-]{1,48})(?:\s*[,.?]|$)", m, re.I)
    if not match:
        return None
    loc = match.group(1).strip().rstrip("., ")
    if len(loc) < 2:
        return None
    if not re.search(r"[a-zA-Z]", loc):
        return None
    return loc


def _weather_current(location: str):
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


def _weather_forecast_5day(location: str):
    key = os.environ.get("OPENWEATHER_API_KEY")
    if not key:
        return None, "OPENWEATHER_API_KEY is not set"
    r = requests.get(
        "https://api.openweathermap.org/data/2.5/forecast",
        params={"q": location, "appid": key, "units": "metric", "cnt": 40},
        timeout=20,
    )
    if r.status_code >= 400:
        return None, f"Forecast error: {r.status_code}"
    return r.json(), None


def _summarize_forecast_day(forecast: dict, target_weekday: int) -> str | None:
    slots = []
    for item in forecast.get("list") or []:
        dt = datetime.fromtimestamp(int(item["dt"]), tz=timezone.utc)
        if dt.weekday() != target_weekday:
            continue
        slots.append(item)
    if not slots:
        return None
    # Prefer a midday slot if present
    slots.sort(key=lambda x: abs(datetime.fromtimestamp(int(x["dt"]), tz=timezone.utc).hour - 12))
    pick = slots[len(slots) // 2]
    try:
        main = pick["main"]
        w0 = (pick.get("weather") or [{}])[0]
        dt = datetime.fromtimestamp(int(pick["dt"]), tz=timezone.utc)
        day_name = _DAY_NAMES[target_weekday][0].title()
        return (
            f"{day_name} ({dt.strftime('%Y-%m-%d')} ~{dt.strftime('%H:%M')} UTC): "
            f"{main.get('temp')}°C, {w0.get('description', 'conditions')} — "
            f"feels like {main.get('feels_like')}°C, {main.get('humidity', '?')}% humidity."
        )
    except Exception:
        return None


def _format_current_outfit(payload) -> str:
    if not payload or not isinstance(payload, dict):
        return ""
    name = (payload.get("name") or "").strip()
    items = payload.get("items") or []
    if not isinstance(items, list) or not items:
        return ""
    lines = []
    if name:
        lines.append(f"Current outfit name: {name}.")
    lines.append("Current outfit items:")
    for it in items[:8]:
        if not isinstance(it, dict):
            continue
        nm = (it.get("name") or "?").strip()
        br = (it.get("brand") or "").strip()
        cat = (it.get("category") or "?").strip()
        lines.append(f"- {nm} ({cat})" + (f", {br}" if br else ""))
    return "\n".join(lines)


def _gemma_reply(prompt: str):
    key = os.environ.get("GOOGLE_AI_STUDIO_API_KEY")
    if not key:
        return None, "GOOGLE_AI_STUDIO_API_KEY is not set"

    model = fitbot_config.gemma_model()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    r = requests.post(
        url,
        headers={"x-goog-api-key": key},
        json={"contents": [{"role": "user", "parts": [{"text": prompt}]}]},
        timeout=45,
    )
    if r.status_code >= 400:
        hint = (r.text or "").strip().replace("\n", " ")[:220]
        suffix = f" — {hint}" if hint else ""
        return None, f"Gemma error: {r.status_code}{suffix}"
    data = r.json()
    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        text = None
    return text, None


@fitbot_bp.get("/config")
@require_auth
def bot_config():
    """Safe flags for the SPA — no API secrets."""
    return {
        "default_location": fitbot_config.default_location(),
        "default_include_weather": fitbot_config.include_weather_default(),
        "gemma_model": fitbot_config.gemma_model(),
        "gemma_configured": fitbot_config.gemma_configured(),
        "weather_configured": fitbot_config.weather_configured(),
        "tts_configured": fitbot_config.tts_configured(),
        "tts_voice_id": fitbot_config.elevenlabs_voice_id(),
    }


@fitbot_bp.post("")
@require_auth
def chat():
    body = request.get_json(silent=True) or {}
    message = (body.get("message") or "").strip()
    location = (body.get("location") or "").strip() or fitbot_config.default_location()
    raw_inc = body.get("include_weather")
    if raw_inc is None:
        include_weather = fitbot_config.include_weather_default()
    else:
        include_weather = bool(raw_inc)
    current_outfit = body.get("current_outfit")

    if not message:
        return {"error": "missing_message"}, 400

    hint_loc = _extract_location_hint(message)
    forecast_loc = hint_loc if hint_loc else location
    if hint_loc and "," not in forecast_loc:
        forecast_loc = f"{forecast_loc},CA"

    weather_text = ""
    weather_err = None
    target_wd = _weekday_from_message(message) if include_weather else None

    if include_weather and target_wd is not None:
        forecast, weather_err = _weather_forecast_5day(forecast_loc)
        if forecast:
            summary = _summarize_forecast_day(forecast, target_wd)
            if summary:
                weather_text = f"Weather forecast for {forecast_loc}: {summary}"
            else:
                weather_text = (
                    f"No matching slot in the 5-day forecast for that weekday in {forecast_loc}."
                )
        elif weather_err:
            weather_text = ""
    elif include_weather:
        weather, weather_err = _weather_current(location)
        if weather:
            try:
                weather_text = (
                    f"Current weather in {location}: {weather['main']['temp']}°C, "
                    f"{weather['weather'][0]['description']}."
                )
            except Exception:
                weather_text = ""

    outfit_ctx = _format_current_outfit(current_outfit)

    prompt_parts = [
        "You are FitDeck's AI stylist. Be concise, practical, and confident.",
    ]
    extra = fitbot_config.extra_system_instructions()
    if extra:
        prompt_parts.append(extra)
    if outfit_ctx:
        prompt_parts.append("\n" + outfit_ctx)
    if weather_text:
        prompt_parts.append("\n" + weather_text)
    prompt_parts.append(f"\nUser: {message}")
    prompt = "\n".join(prompt_parts).strip()

    reply, gemma_err = _gemma_reply(prompt)
    if not reply:
        err = gemma_err or weather_err
        if gemma_err == "GOOGLE_AI_STUDIO_API_KEY is not set":
            fallback = "FitBot isn’t configured yet."
        else:
            fallback = "FitBot couldn’t generate a reply. Check the detail below or your Gemma model name."
        return {"reply": fallback, "detail": err}
    return {"reply": reply, "weather_error": weather_err}


@fitbot_bp.post("/speak")
@require_auth
def speak():
    key = os.environ.get("ELEVENLABS_API_KEY")
    voice_id = fitbot_config.elevenlabs_voice_id()
    if not key or not str(key).strip():
        return jsonify({"error": "ELEVENLABS_API_KEY is not set"}), 400

    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "missing_text"}), 400

    vs = fitbot_config.elevenlabs_voice_settings()
    r = requests.post(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
        headers={"xi-api-key": key, "Content-Type": "application/json"},
        json={
            "text": text,
            "model_id": fitbot_config.elevenlabs_model_id(),
            "voice_settings": vs,
        },
        stream=True,
        timeout=60,
    )
    if r.status_code >= 400:
        snippet = (r.text or "").strip()[:500] or str(r.status_code)
        return jsonify({"error": "elevenlabs_error", "detail": snippet}), 400

    return Response(
        r.iter_content(chunk_size=4096),
        content_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )
