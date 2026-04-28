"""Politics — Congress.gov API for bill tracking (free key required)."""
import httpx
from fastapi import APIRouter, Query
from config import CONGRESS_API_KEY

router = APIRouter(prefix="/api/politics", tags=["politics"])


@router.get("/bills")
async def search_bills(q: str = Query(..., description="Search term for bills")):
    """
    Search Congress.gov for recent bills related to a topic.
    Free API key required — register at https://api.congress.gov/sign-up/
    """
    if not CONGRESS_API_KEY:
        return {"bills": [], "message": "No CONGRESS_API_KEY configured."}

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                "https://api.congress.gov/v3/bill",
                params={
                    "api_key": CONGRESS_API_KEY,
                    "query": q,
                    "limit": 8,
                    "sort": "updateDate desc",
                    "format": "json",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                bills = []
                for b in data.get("bills", []):
                    bills.append({
                        "number": f"{b.get('type', '')}{b.get('number', '')}",
                        "title": b.get("title", ""),
                        "congress": b.get("congress"),
                        "latest_action": b.get("latestAction", {}).get("text", ""),
                        "action_date": b.get("latestAction", {}).get("actionDate", ""),
                        "url": b.get("url", ""),
                        "origin_chamber": b.get("originChamber", ""),
                    })
                return {"bills": bills, "total": len(bills)}
    except Exception as e:
        print(f"[Politics] Congress.gov error: {e}")
    return {"bills": [], "error": "Failed to fetch bills"}
