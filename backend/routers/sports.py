"""Sports — TheSportsDB + NewsAPI.org for sports news."""
import httpx
from fastapi import APIRouter, Query
from config import SPORTSDB_API_URL, NEWS_API_URL, NEWS_API_KEY

router = APIRouter(prefix="/api/sports", tags=["sports"])


@router.get("")
async def get_sports_data(
    location: str = Query(..., description="City or location name"),
    country: str = Query("", description="Country name"),
):
    teams = []
    news = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        # ── Teams (TheSportsDB) ────────────────────
        try:
            resp = await client.get(
                f"{SPORTSDB_API_URL}/searchteams.php",
                params={"t": location},
            )
            if resp.status_code == 200:
                data = resp.json()
                raw = data.get("teams") or []
                for t in raw[:6]:
                    teams.append({
                        "name": t.get("strTeam", ""),
                        "sport": t.get("strSport", ""),
                        "league": t.get("strLeague", ""),
                        "logo": t.get("strBadge", "") or t.get("strTeamBadge", ""),
                        "stadium": t.get("strStadium", ""),
                        "year_formed": t.get("intFormedYear", ""),
                    })
        except Exception:
            pass

        # ── News (NewsAPI.org) ──────────────────────
        if NEWS_API_KEY:
            try:
                # Search for sports news in the location + country
                search_query = location
                if country:
                    search_query = f"{location} {country}"

                resp = await client.get(
                    NEWS_API_URL,
                    params={
                        "q": search_query,
                        "category": "sports",
                        "apiKey": NEWS_API_KEY,
                        "pageSize": 5,
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    articles = data.get("articles", [])
                    for art in articles:
                        if not art.get("title") or "[Removed]" in art.get("title"):
                            continue
                        news.append({
                            "title": art.get("title"),
                            "source": art.get("source", {}).get("name"),
                            "url": art.get("url"),
                            "image": art.get("urlToImage"),
                            "published": art.get("publishedAt"),
                        })
            except Exception:
                pass

    return {
        "location": location,
        "teams": teams,
        "news": news,
        "has_news_key": bool(NEWS_API_KEY),
        "note": "Team metadata from TheSportsDB. Sports news from NewsAPI.org."
    }
