"""Related Info — GNews.io for news related to prediction markets."""
import httpx
import re
from fastapi import APIRouter
from config import GNEWS_API_KEY

router = APIRouter(prefix="/api/news", tags=["news"])


def extract_keywords(text: str) -> str:
    """Pull the most meaningful words from a market title for searching."""
    stopwords = {
        'will', 'be', 'the', 'is', 'at', 'in', 'on', 'of', 'for', 'to',
        'reach', 'by', 'who', 'what', 'where', 'when', 'how', 'than',
        'more', 'less', 'about', 'become', 'win', 'lose', 'happen',
        'yes', 'no', 'before', 'after', 'does', 'did', 'do', 'has',
        'have', 'had', 'are', 'was', 'were', 'been', 'being', 'and',
        'but', 'not', 'with', 'this', 'that', 'from', 'above', 'below',
        'whether', 'either', 'both', 'between', 'among', 'through',
        'highest', 'lowest', 'increase', 'decrease', 'total', 'over', 'under',
    }
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    words = [w for w in clean.lower().split() if w not in stopwords and len(w) > 2]
    # Use fewer keywords (top 3) for broader matching
    return " ".join(words[:3])


GNEWS_SEARCH_URL = "https://gnews.io/api/v4/search"


@router.get("/related")
async def get_related_info(q: str):
    """
    Fetches news articles related to a prediction market title using GNews.io.
    """
    if not GNEWS_API_KEY:
        return {"articles": [], "total": 0, "message": "No GNEWS_API_KEY configured."}

    keywords = extract_keywords(q)
    if not keywords:
        # Fallback to first few words
        keywords = " ".join(q.split()[:3])

    # Convert spaces to OR for maximum discovery
    query = " OR ".join(keywords.split())

    params = {
        "apikey": GNEWS_API_KEY,
        "q": query,
        "lang": "en",
        "max": 10,
        "sortby": "relevance",
    }

    print(f"[GNews] Searching: '{query}'")


    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(GNEWS_SEARCH_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

            articles = []
            for art in data.get("articles", []):
                articles.append({
                    "title": art.get("title", "Untitled"),
                    "url": art.get("url"),
                    "published": art.get("publishedAt"),
                    "description": art.get("description", ""),
                    "image": art.get("image"),
                    "site": art.get("source", {}).get("name", "News"),
                })

            return {
                "articles": articles,
                "total": data.get("totalArticles", 0),
                "query_used": keywords,
            }

    except httpx.HTTPStatusError as e:
        print(f"[GNews] HTTP Error: {e.response.status_code} - {e.response.text[:200]}")
        return {"articles": [], "error": f"API Error: {e.response.status_code}"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"articles": [], "error": str(e)}
