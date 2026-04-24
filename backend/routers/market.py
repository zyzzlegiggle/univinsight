"""Market Forecast — Polymarket + Metaculus (both free, no key needed)."""
import httpx
from fastapi import APIRouter, Query
from config import POLYMARKET_API_URL, METACULUS_API_URL, KALSHI_API_URL

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("")
async def get_market_data(
    location: str = Query(..., description="Location name (city or country)"),
    country: str = Query("", description="Country name for fallback"),
):
    polymarket_items = []
    metaculus_items = []
    kalshi_items = []
    search_terms = [location]
    if country and country.lower() != location.lower():
        search_terms.append(country)

    async with httpx.AsyncClient(timeout=15.0) as client:
        # ── Polymarket ──────────────────────────────
        # ... (existing Polymarket code) ...
        try:
            resp = await client.get(
                f"{POLYMARKET_API_URL}/markets",
                params={"limit": 200, "active": "true", "closed": "false", "order": "volume", "ascending": "false"},
            )
            if resp.status_code == 200:
                markets = resp.json()
                for m in markets:
                    q = (m.get("question") or "").lower()
                    desc = (m.get("description") or "").lower()
                    if any(term.lower() in q or term.lower() in desc for term in search_terms):
                        price = None
                        try:
                            prices = m.get("outcomePrices", "")
                            if prices:
                                import json
                                parsed = json.loads(prices)
                                if parsed:
                                    price = round(float(parsed[0]) * 100, 1)
                        except Exception:
                            pass

                        # Build URL from the parent event slug (not the market slug)
                        event_slug = ""
                        events = m.get("events", [])
                        if events and len(events) > 0:
                            event_slug = events[0].get("slug", "")

                        polymarket_items.append({
                            "title": m.get("question", ""),
                            "probability": price,
                            "volume": m.get("volume", "0"),
                            "image": m.get("image", ""),
                            "url": f"https://polymarket.com/event/{event_slug}" if event_slug else "",
                        })
                        if len(polymarket_items) >= 12:
                            break
        except Exception:
            pass

        # ── Kalshi ──────────────────────────────────
        try:
            resp = await client.get(
                f"{KALSHI_API_URL}/markets",
                params={"status": "open", "limit": 200},
            )
            if resp.status_code == 200:
                data = resp.json()
                markets = data.get("markets", [])
                for m in markets:
                    title = m.get("title", "")
                    subtitle = m.get("subtitle", "") or m.get("yes_sub_title", "")
                    combined = (title + " " + subtitle).lower()
                    if any(term.lower() in combined for term in search_terms):
                        # Parse yes price — comes as dollar string like "0.6500"
                        prob = None
                        try:
                            raw = m.get("last_price_dollars") or m.get("yes_bid_dollars")
                            if raw and float(raw) > 0:
                                prob = round(float(raw) * 100, 1)
                        except Exception:
                            pass

                        event_ticker = m.get("event_ticker", m.get("ticker", ""))
                        kalshi_items.append({
                            "title": title,
                            "subtitle": subtitle,
                            "probability": prob,
                            "url": f"https://kalshi.com/markets/{event_ticker}",
                            "ticker": m.get("ticker"),
                        })
                        if len(kalshi_items) >= 12:
                            break
        except Exception:
            pass

        # ── Metaculus ───────────────────────────────
        for term in search_terms:
            try:
                resp = await client.get(
                    f"{METACULUS_API_URL}/questions/",
                    params={"search": term, "status": "open", "limit": 8, "type": "forecast"},
                    headers={"Accept": "application/json"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results_list = data.get("results", [])
                    for q in results_list:
                        if any(item["title"] == q.get("title") for item in metaculus_items):
                            continue
                        prediction = q.get("community_prediction", {})
                        full = prediction.get("full", {}) if prediction else {}
                        metaculus_items.append({
                            "title": q.get("title", ""),
                            "prediction": full.get("q2"),
                            "url": f"https://www.metaculus.com{q.get('page_url', '')}",
                            "votes": q.get("number_of_predictions", 0),
                        })
                    if len(metaculus_items) >= 12:
                        break
            except Exception:
                pass

    return {
        "location": location,
        "polymarket": polymarket_items,
        "metaculus": metaculus_items,
        "kalshi": kalshi_items,
    }


@router.get("/headlines")
async def get_market_headlines():
    """Fetch top trending markets for the ticker bar."""
    items = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{POLYMARKET_API_URL}/markets",
                params={"limit": 20, "active": "true", "closed": "false", "order": "volume", "ascending": "false"},
            )
            if resp.status_code == 200:
                markets = resp.json()
                for m in markets:
                    # Skip if missing basic info
                    if not m.get("question") or not m.get("outcomePrices"):
                        continue

                    price = None
                    try:
                        parsed = import_json(m.get("outcomePrices", "[]"))
                        if parsed:
                            price = round(float(parsed[0]) * 100, 1)
                    except Exception:
                        pass

                    # Parent event info
                    event = {}
                    events = m.get("events", [])
                    if events:
                        event = events[0]

                    items.append({
                        "title": m.get("question"),
                        "probability": price,
                        "change": round(m.get("oneDayPriceChange", 0) * 100, 1),
                        "image": m.get("image") or event.get("image"),
                        "url": f"https://polymarket.com/event/{event.get('slug')}" if event.get("slug") else ""
                    })
                    if len(items) >= 12:
                        break
        except Exception:
            pass

    return {"headlines": items}


def import_json(s):
    import json
    return json.loads(s)
