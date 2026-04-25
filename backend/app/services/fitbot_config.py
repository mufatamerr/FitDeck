"""FitBot env-driven settings (Gemma, OpenWeather, ElevenLabs)."""

import os


def default_location() -> str:
    """OpenWeather `q` parameter, e.g. Mississauga,CA or London,UK."""
    v = (os.environ.get("FITBOT_DEFAULT_LOCATION") or "Mississauga,CA").strip()
    return v or "Mississauga,CA"


def gemma_model() -> str:
    # Same AI Studio key; model id must exist for generateContent (many gemma-2-* ids 404 now).
    # Override with e.g. gemma-4-26b-a4b-it or gemini-2.5-flash after listing models for your key.
    return (os.environ.get("FITBOT_GEMMA_MODEL") or "gemini-2.0-flash").strip() or "gemini-2.0-flash"


def extra_system_instructions() -> str:
    """Optional extra lines after the base stylist persona (outfit/weather still appended)."""
    return (os.environ.get("FITBOT_EXTRA_INSTRUCTIONS") or "").strip()


def include_weather_default() -> bool:
    v = (os.environ.get("FITBOT_INCLUDE_WEATHER") or "true").strip().lower()
    return v in ("1", "true", "yes", "on")


def elevenlabs_voice_id() -> str:
    return (os.environ.get("ELEVENLABS_VOICE_ID") or "21m00Tcm4TlvDq8ikWAM").strip()


def elevenlabs_model_id() -> str:
    return (os.environ.get("FITBOT_ELEVENLABS_MODEL") or "eleven_monolingual_v1").strip()


def elevenlabs_voice_settings() -> dict[str, float]:
    try:
        stability = float(os.environ.get("FITBOT_VOICE_STABILITY", "0.5"))
    except ValueError:
        stability = 0.5
    try:
        similarity = float(os.environ.get("FITBOT_VOICE_SIMILARITY", "0.75"))
    except ValueError:
        similarity = 0.75
    return {"stability": stability, "similarity_boost": similarity}


def gemma_configured() -> bool:
    return bool(os.environ.get("GOOGLE_AI_STUDIO_API_KEY", "").strip())


def weather_configured() -> bool:
    return bool(os.environ.get("OPENWEATHER_API_KEY", "").strip())


def tts_configured() -> bool:
    return bool(os.environ.get("ELEVENLABS_API_KEY", "").strip())
