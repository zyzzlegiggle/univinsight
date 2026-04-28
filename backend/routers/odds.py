"""Odds — The Odds API for live bookmaker odds (free key, 500 req/month)."""
import httpx
from fastapi import APIRouter, Query
from config import ODDS_API_KEY

router = APIRouter(prefix="/api/odds", tags=["odds"])


@router.get("")
async def get_odds(q: str = Query(..., description="Sport or event keyword")):
    """
    Fetch live sports odds from bookmakers.
    Free API key — register at https://the-odds-api.com/#get-access
    500 requests/month on free tier.
    """
    if not ODDS_API_KEY:
        return {"events": [], "message": "No ODDS_API_KEY configured."}

    # Map common sport keywords to Odds API sport keys
    SPORT_MAP = {
        "nfl": "americanfootball_nfl",
        "football": "americanfootball_nfl",
        "nba": "basketball_nba",
        "basketball": "basketball_nba",
        "mlb": "baseball_mlb",
        "baseball": "baseball_mlb",
        "nhl": "ice_hockey_nhl",
        "hockey": "ice_hockey_nhl",
        "soccer": "soccer_epl",
        "premier league": "soccer_epl",
        "epl": "soccer_epl",
        "mma": "mma_mixed_martial_arts",
        "ufc": "mma_mixed_martial_arts",
        "boxing": "boxing_boxing",
        "cricket": "cricket_ipl",
        "tennis": "tennis_atp_french_open",
    }

    q_lower = q.lower()
    sport_key = None
    for keyword, key in SPORT_MAP.items():
        if keyword in q_lower:
            sport_key = key
            break

    if not sport_key:
        # Default to upcoming sports across all
        sport_key = "upcoming"

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds",
                params={
                    "apiKey": ODDS_API_KEY,
                    "regions": "us",
                    "markets": "h2h",
                    "oddsFormat": "american",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                events = []
                for e in data[:8]:  # Limit to 8 events
                    bookmakers = e.get("bookmakers", [])
                    best_odds = {}
                    if bookmakers:
                        market = bookmakers[0].get("markets", [{}])[0]
                        for outcome in market.get("outcomes", []):
                            best_odds[outcome["name"]] = outcome["price"]

                    events.append({
                        "home": e.get("home_team", ""),
                        "away": e.get("away_team", ""),
                        "sport": e.get("sport_title", ""),
                        "start": e.get("commence_time", ""),
                        "odds": best_odds,
                    })
                return {"events": events, "sport": sport_key, "total": len(events)}
            elif resp.status_code == 401:
                return {"events": [], "error": "Invalid ODDS_API_KEY"}
    except Exception as e:
        print(f"[Odds] Error: {e}")
    return {"events": [], "error": "Failed to fetch odds"}
