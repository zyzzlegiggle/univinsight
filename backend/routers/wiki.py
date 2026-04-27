"""Wikipedia — REST API for entity summaries (completely free, no key)."""
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/wiki", tags=["wiki"])

WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary"


@router.get("")
async def get_wiki_summary(q: str = Query(..., description="Entity or topic to look up")):
    """
    Fetches a Wikipedia summary for a given query.
    Uses the REST API which returns structured JSON with extract, thumbnail, etc.
    """
    result = {"found": False, "title": None, "extract": None, "thumbnail": None, "url": None}

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        try:
            # Wikipedia REST API uses underscores for spaces
            slug = q.strip().replace(" ", "_")
            resp = await client.get(
                f"{WIKI_API}/{slug}",
                headers={"User-Agent": "UnivInsight/1.0 (prediction-market-tool)"},
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("type") == "standard":
                    result["found"] = True
                    result["title"] = data.get("title")
                    result["extract"] = data.get("extract")
                    result["thumbnail"] = data.get("thumbnail", {}).get("source")
                    result["url"] = data.get("content_urls", {}).get("desktop", {}).get("page")
            # If direct lookup fails, try search
            if not result["found"]:
                search_resp = await client.get(
                    "https://en.wikipedia.org/w/api.php",
                    params={
                        "action": "opensearch",
                        "search": q,
                        "limit": 1,
                        "format": "json",
                    },
                    headers={"User-Agent": "UnivInsight/1.0"},
                )
                if search_resp.status_code == 200:
                    search_data = search_resp.json()
                    if len(search_data) >= 4 and search_data[1]:
                        best_title = search_data[1][0]
                        slug2 = best_title.replace(" ", "_")
                        resp2 = await client.get(
                            f"{WIKI_API}/{slug2}",
                            headers={"User-Agent": "UnivInsight/1.0"},
                        )
                        if resp2.status_code == 200:
                            data2 = resp2.json()
                            if data2.get("type") == "standard":
                                result["found"] = True
                                result["title"] = data2.get("title")
                                result["extract"] = data2.get("extract")
                                result["thumbnail"] = data2.get("thumbnail", {}).get("source")
                                result["url"] = data2.get("content_urls", {}).get("desktop", {}).get("page")
        except Exception as e:
            result["error"] = str(e)

    return result
