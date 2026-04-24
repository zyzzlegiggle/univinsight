"""Climate — Open-Meteo API (completely free, no key needed)."""
import httpx
from fastapi import APIRouter, Query
from config import OPEN_METEO_API_URL

router = APIRouter(prefix="/api/climate", tags=["climate"])


@router.get("")
async def get_climate_data(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    location: str = Query("", description="Location name"),
):
    result = {
        "location": location,
        "current": None,
        "forecast": None,
        "historical": None,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        # ── Current Weather + 7-day Forecast ────────
        try:
            resp = await client.get(
                f"{OPEN_METEO_API_URL}/forecast",
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "current": "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code",
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
                    "timezone": "auto",
                    "forecast_days": 7,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                result["current"] = {
                    "temperature": current.get("temperature_2m"),
                    "feels_like": current.get("apparent_temperature"),
                    "humidity": current.get("relative_humidity_2m"),
                    "wind_speed": current.get("wind_speed_10m"),
                    "weather_code": current.get("weather_code"),
                }
                daily = data.get("daily", {})
                if daily.get("time"):
                    result["forecast"] = {
                        "dates": daily["time"],
                        "temp_max": daily.get("temperature_2m_max", []),
                        "temp_min": daily.get("temperature_2m_min", []),
                        "precipitation": daily.get("precipitation_sum", []),
                        "weather_codes": daily.get("weather_code", []),
                    }
        except Exception:
            pass

        # ── Historical (last 30 days) ───────────────
        try:
            from datetime import date, timedelta
            end = date.today()
            start = end - timedelta(days=30)
            resp = await client.get(
                f"{OPEN_METEO_API_URL}/forecast",
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                    "timezone": "auto",
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                daily = data.get("daily", {})
                if daily.get("time"):
                    result["historical"] = {
                        "dates": daily["time"],
                        "temp_max": daily.get("temperature_2m_max", []),
                        "temp_min": daily.get("temperature_2m_min", []),
                        "precipitation": daily.get("precipitation_sum", []),
                    }
        except Exception:
            pass

    return result
