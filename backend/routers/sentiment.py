"""Sentiment — Fear & Greed Index + GDELT Media Tone (all free, no keys)."""
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/sentiment", tags=["sentiment"])


@router.get("/fear-greed")
async def get_fear_greed(limit: int = Query(30, description="Number of days of history")):
    """
    Crypto Fear & Greed Index from Alternative.me.
    Free, no API key, no rate limit.
    Returns daily sentiment scores (0-100) with labels.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.alternative.me/fng/",
                params={"limit": limit, "format": "json"},
            )
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                return {
                    "found": True,
                    "current": data[0] if data else None,
                    "history": [{
                        "value": int(d["value"]),
                        "label": d["value_classification"],
                        "timestamp": int(d["timestamp"]),
                    } for d in data],
                }
    except Exception as e:
        print(f"[Sentiment] Fear & Greed error: {e}")
    return {"found": False, "current": None, "history": []}


@router.get("/tone")
async def get_media_tone(q: str = Query(..., description="Search term")):
    """
    GDELT Media Tone Analysis.
    Free, no API key, no rate limit.
    Returns average media tone for a topic over time.
    Negative = negative coverage, Positive = positive coverage.
    """
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                "https://api.gdeltproject.org/api/v2/doc/doc",
                params={
                    "query": q,
                    "mode": "ToneChart",
                    "format": "json",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                timeline = data.get("timeline", [])
                if timeline and len(timeline) > 0:
                    series = timeline[0].get("data", [])
                    dates = [p.get("date", "") for p in series]
                    values = [p.get("value", 0) for p in series]
                    return {
                        "found": True,
                        "dates": dates,
                        "values": values,
                        "avg_tone": sum(values) / len(values) if values else 0,
                    }
    except Exception as e:
        print(f"[Sentiment] GDELT tone error: {e}")
    return {"found": False, "dates": [], "values": [], "avg_tone": 0}
