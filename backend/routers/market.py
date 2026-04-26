"""Market Intelligence — Polymarket only (Gamma + CLOB + Data APIs)."""
import json
import httpx
from fastapi import APIRouter, Query
from config import POLYMARKET_API_URL, POLYMARKET_CLOB_URL

router = APIRouter(prefix="/api/market", tags=["market"])

POLYMARKET_DATA_URL = "https://data-api.polymarket.com"

# ─── Multi-Location Extraction ────────────────────────────────
# Returns a LIST of locations so we can place duplicate dots

EVENT_LOCATION_MAP = {
    # US Politics
    "election": ["Washington D.C."], "white house": ["Washington D.C."],
    "president": ["Washington D.C."], "trump": ["Washington D.C."],
    "biden": ["Washington D.C."], "congress": ["Washington D.C."],
    "senate": ["Washington D.C."], "supreme court": ["Washington D.C."],
    "scotus": ["Washington D.C."], "fed ": ["Washington D.C."],
    "federal reserve": ["Washington D.C."], "sec ": ["Washington D.C."],
    "impeach": ["Washington D.C."], "executive order": ["Washington D.C."],
    "pentagon": ["Washington D.C."],
    # Finance
    "wall street": ["New York"], "nasdaq": ["New York"],
    "s&p 500": ["New York"], "s&p500": ["New York"],
    "dow jones": ["New York"], "nyse": ["New York"],
    "stock market": ["New York"], "bitcoin": ["New York"],
    "crypto": ["New York"], "ethereum": ["New York"],
    # Tech
    "openai": ["San Francisco"], "apple ": ["San Francisco"],
    "google ": ["San Francisco"], "meta ": ["San Francisco"],
    "spacex": ["Los Angeles"], "tesla": ["Austin"],
    "amazon": ["Seattle"], "microsoft": ["Seattle"],
    # Entertainment
    "hollywood": ["Los Angeles"], "oscars": ["Los Angeles"],
    "grammy": ["Los Angeles"], "super bowl": ["New York"],
    "nfl": ["New York"], "nba": ["New York"],
    # Sports
    "premier league": ["London"], "champions league": ["London"],
    "la liga": ["Madrid"], "serie a": ["Rome"],
    "bundesliga": ["Berlin"], "ligue 1": ["Paris"],
    "real madrid": ["Madrid"], "barcelona": ["Barcelona"],
    "manchester": ["Manchester"], "liverpool": ["Liverpool"],
    "arsenal": ["London"], "chelsea": ["London"],
    "bayern": ["Munich"], "psg": ["Paris"],
    "eurovision": ["Europe"],
    # International orgs
    "nato": ["Brussels"], "european union": ["Brussels"],
    "eu ": ["Brussels"], "un ": ["New York"],
    "united nations": ["New York"], "world bank": ["Washington D.C."],
    "imf": ["Washington D.C."], "opec": ["Vienna"],
    # People → countries
    "putin": ["Moscow"], "xi jinping": ["Beijing"],
    "zelensky": ["Kyiv"], "netanyahu": ["Jerusalem"],
    "modi": ["Delhi"], "macron": ["Paris"],
    "starmer": ["London"], "trudeau": ["Ottawa"],
}

LOCATIONS_LIST = [
    "London", "New York", "Paris", "Tokyo", "Singapore", "Hong Kong", "Dubai",
    "Sydney", "Melbourne", "Toronto", "Vancouver", "Berlin", "Munich",
    "Frankfurt", "Madrid", "Barcelona", "Rome", "Milan", "Beijing", "Shanghai",
    "Mumbai", "Delhi", "Bangalore", "Seoul", "Bangkok", "Jakarta", "Istanbul",
    "Moscow", "Chicago", "San Francisco", "Los Angeles", "Miami", "Houston",
    "Dallas", "Austin", "Seattle", "Boston", "Denver", "Atlanta", "Phoenix",
    "Las Vegas", "Philadelphia", "Detroit", "Minneapolis", "Nashville",
    "Tel Aviv", "Jerusalem", "Cairo", "Riyadh", "Abu Dhabi", "Doha",
    "Lagos", "Nairobi", "Johannesburg", "Cape Town",
    "Sao Paulo", "Rio de Janeiro", "Buenos Aires", "Lima", "Bogota",
    "Mexico City", "Santiago", "Taipei", "Manila", "Hanoi",
    "Kuala Lumpur", "Auckland", "Dublin", "Edinburgh", "Amsterdam",
    "Brussels", "Zurich", "Geneva", "Vienna", "Prague", "Warsaw",
    "Budapest", "Athens", "Lisbon", "Copenhagen", "Stockholm", "Oslo",
    "Helsinki",
    # Countries
    "United States", "USA", "Canada", "Mexico", "Brazil", "Argentina",
    "United Kingdom", "UK", "France", "Germany", "Italy", "Spain",
    "Japan", "China", "India", "Australia", "South Korea", "North Korea",
    "Russia", "Ukraine", "Israel", "Palestine", "Gaza", "Iran", "Iraq",
    "Saudi Arabia", "Turkey", "Egypt", "Nigeria", "South Africa",
    "Taiwan", "Pakistan", "Afghanistan", "Syria", "Lebanon", "Yemen",
    "Venezuela", "Cuba", "Colombia", "Peru", "Chile",
    "Indonesia", "Philippines", "Vietnam", "Thailand", "Malaysia",
    "Poland", "Netherlands", "Belgium", "Switzerland", "Austria",
    "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Greece",
    # US States
    "California", "Texas", "Florida", "Georgia", "Pennsylvania", "Arizona",
    "Nevada", "Ohio", "Michigan", "Wisconsin", "North Carolina", "Virginia",
    "Colorado", "Oregon", "Illinois", "Massachusetts", "Tennessee",
]


def extract_locations(title: str) -> list[str]:
    """Extract ALL matching locations from a market title. Returns a list."""
    title_lower = title.lower()
    found = []

    # Check event-to-location map
    for key, cities in EVENT_LOCATION_MAP.items():
        if key in title_lower:
            for c in cities:
                if c not in found:
                    found.append(c)

    # Check explicit location mentions
    for loc in LOCATIONS_LIST:
        if loc.lower() in title_lower and loc not in found:
            found.append(loc)

    return found


# ─── Headlines (Globe Data) ──────────────────────────────────

@router.get("/headlines")
async def get_market_headlines():
    """Fetch ALL Polymarket events with pagination. Returns multi-location items."""
    all_items = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        offset = 0
        limit = 100
        max_pages = 15  # Up to 1500 events

        for _ in range(max_pages):
            try:
                resp = await client.get(
                    f"{POLYMARKET_API_URL}/events",
                    params={
                        "limit": limit,
                        "offset": offset,
                        "active": "true",
                        "closed": "false",
                        "order": "volume",
                        "ascending": "false",
                    },
                )
                if resp.status_code != 200:
                    break

                events = resp.json()
                if not events:
                    break

                for e in events:
                    title = e.get("title")
                    if not title:
                        continue

                    locations = extract_locations(title)
                    if not locations:
                        continue

                    # Extract outcomes from all markets in the event
                    outcomes = []
                    description = e.get("description", "")
                    end_date = None
                    condition_id = None
                    
                    for m in e.get("markets", []):
                        m_title = m.get("groupItemTitle") or m.get("title") or "Outcome"
                        m_prob = 0
                        m_token_id = None
                        
                        try:
                            prices = json.loads(m.get("outcomePrices", "[]"))
                            if prices:
                                m_prob = round(float(prices[0]) * 100, 1)
                        except: pass
                        
                        try:
                            tokens = json.loads(m.get("clobTokenIds", "[]"))
                            if tokens:
                                m_token_id = tokens[0]
                        except: pass
                        
                        outcomes.append({
                            "title": m_title,
                            "probability": m_prob,
                            "token_id": m_token_id,
                            "condition_id": m.get("conditionId")
                        })
                        
                        # Use first market for shared metadata
                        if not end_date:
                            end_date = m.get("endDate")
                        if not condition_id:
                            condition_id = m.get("conditionId")

                    # Primary probability for the main dot/ticker (highest outcome or first)
                    primary_prob = outcomes[0]["probability"] if outcomes else None
                    if outcomes and len(outcomes) > 2:
                        # For multi-choice, find the most likely outcome
                        primary_prob = max(o["probability"] for o in outcomes)

                    all_items.append({
                        "title": title,
                        "locations": locations,
                        "probability": primary_prob,
                        "outcomes": outcomes, # All choices
                        "volume": e.get("volume", 0),
                        "liquidity": e.get("liquidity", 0),
                        "source": "Polymarket",
                        "image": e.get("image") or e.get("icon"),
                        "url": f"https://polymarket.com/event/{e.get('slug')}",
                        "token_id": outcomes[0]["token_id"] if outcomes else None,
                        "condition_id": condition_id,
                        "end_date": end_date,
                        "description": description,
                    })

                offset += limit
                if len(events) < limit:
                    break
            except Exception:
                break

    return {"headlines": all_items}


# ─── Price History (CLOB API) ─────────────────────────────────

@router.get("/price-history")
async def get_price_history(
    token_id: str = Query("", description="Polymarket CLOB token ID"),
    interval: str = Query("1d", description="1h, 6h, 1d, 1w, 1m, max"),
):
    """Fetch price history from CLOB API."""
    history = []
    if not token_id:
        return {"history": history}

    fidelity_map = {"1h": 1, "6h": 5, "1d": 10, "1w": 60, "1m": 120, "max": 360}
    fidelity = fidelity_map.get(interval, 10)

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.get(
                f"{POLYMARKET_CLOB_URL}/prices-history",
                params={"market": token_id, "interval": interval,
                        "fidelity": fidelity},
            )
            if resp.status_code == 200:
                data = resp.json()
                raw = data.get("history", data) if isinstance(data, dict) else data
                if isinstance(raw, list):
                    history = [{"t": pt.get("t"), "p": pt.get("p")} for pt in raw]
        except Exception:
            pass

    return {"history": history}


# ─── Trades (Data API) ───────────────────────────────────────

@router.get("/trades")
async def get_market_trades(
    condition_id: str = Query("", description="Polymarket condition ID"),
    token_id: str = Query("", description="Polymarket token ID"),
):
    """Fetch recent trades from the Polymarket Data API."""
    trades = []
    if not condition_id and not token_id:
        return {"trades": trades}

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            params = {"limit": 50}
            if condition_id:
                params["market"] = condition_id
            if token_id:
                params["asset_id"] = token_id

            resp = await client.get(
                f"{POLYMARKET_DATA_URL}/trades",
                params=params,
            )
            if resp.status_code == 200:
                data = resp.json()
                raw = data if isinstance(data, list) else data.get("data", data.get("trades", []))
                if isinstance(raw, list):
                    for t in raw:
                        side_raw = t.get("side", "")
                        trades.append({
                            "time": t.get("timestamp") or t.get("matchTime") or t.get("created_at", ""),
                            "position": t.get("outcome", "Yes"),
                            "value": float(t.get("size", 0)),
                            "price": float(t.get("price", 0)),
                            "side": side_raw.upper() if side_raw else "BUY",
                        })
        except Exception:
            pass

    return {"trades": trades}
