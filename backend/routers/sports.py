import httpx
from fastapi import APIRouter, Query
from config import SPORTSDB_API_URL

router = APIRouter(prefix="/api/sports", tags=["sports"])


@router.get("")
async def get_sports_data(
    location: str = Query(..., description="City or location name"),
    country: str = Query("", description="Country name"),
):
    teams = []

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

    return {
        "location": location,
        "teams": teams,
        "note": "Team metadata from TheSportsDB."
    }

