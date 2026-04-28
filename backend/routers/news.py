"""News — Multi-source waterfall: GDELT (free, unlimited) → GNews → Currents."""
import httpx
import re
from fastapi import APIRouter
from config import GNEWS_API_KEY, CURRENTS_API_KEY

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
    return " ".join(words[:4])


# ── Source 1: GDELT (free, no key, unlimited) ──────────────────
async def _fetch_gdelt(client: httpx.AsyncClient, query: str) -> list[dict]:
    """GDELT Doc API — returns articles with title, url, image, domain, date."""
    try:
        resp = await client.get(
            "https://api.gdeltproject.org/api/v2/doc/doc",
            params={
                "query": query,
                "mode": "ArtList",
                "format": "json",
                "maxrecords": 15,
                "sourcelang": "eng",
            },
            timeout=12.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            articles = []
            for art in data.get("articles", []):
                articles.append({
                    "title": art.get("title", ""),
                    "url": art.get("url", ""),
                    "image": art.get("socialimage", ""),
                    "site": art.get("domain", ""),
                    "published": art.get("seendate", ""),
                    "description": "",  # GDELT doesn't provide descriptions
                    "source": "gdelt",
                })
            return articles
    except Exception as e:
        print(f"[GDELT] Error: {e}")
    return []


# ── Source 2: GNews (100 req/day, key required) ────────────────
async def _fetch_gnews(client: httpx.AsyncClient, query: str) -> list[dict]:
    if not GNEWS_API_KEY:
        return []
    try:
        resp = await client.get(
            "https://gnews.io/api/v4/search",
            params={
                "apikey": GNEWS_API_KEY,
                "q": " OR ".join(query.split()),
                "lang": "en",
                "max": 10,
                "sortby": "relevance",
            },
            timeout=12.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return [{
                "title": a.get("title", ""),
                "url": a.get("url", ""),
                "image": a.get("image", ""),
                "site": a.get("source", {}).get("name", ""),
                "published": a.get("publishedAt", ""),
                "description": a.get("description", ""),
                "source": "gnews",
            } for a in data.get("articles", [])]
    except Exception as e:
        print(f"[GNews] Error: {e}")
    return []


# ── Source 3: Currents API (600 req/day, key required) ─────────
async def _fetch_currents(client: httpx.AsyncClient, query: str) -> list[dict]:
    if not CURRENTS_API_KEY:
        return []
    try:
        resp = await client.get(
            "https://api.currentsapi.services/v1/search",
            params={
                "apiKey": CURRENTS_API_KEY,
                "keywords": query,
                "language": "en",
                "type": 1,  # news
            },
            timeout=12.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            return [{
                "title": a.get("title", ""),
                "url": a.get("url", ""),
                "image": a.get("image", "None") if a.get("image") != "None" else "",
                "site": a.get("author", ""),
                "published": a.get("published", ""),
                "description": a.get("description", ""),
                "source": "currents",
            } for a in data.get("news", [])[:10]]
    except Exception as e:
        print(f"[Currents] Error: {e}")
    return []


def _deduplicate(articles: list[dict]) -> list[dict]:
    """Deduplicate articles by domain, keeping the first occurrence."""
    seen_domains = set()
    unique = []
    for art in articles:
        domain = art.get("site", "").lower().replace("www.", "")
        if domain and domain in seen_domains:
            continue
        if domain:
            seen_domains.add(domain)
        unique.append(art)
    return unique


@router.get("/related")
async def get_related_info(q: str):
    """
    Multi-source news waterfall:
    1. GDELT (free, unlimited) — primary
    2. GNews (100/day) — adds descriptions
    3. Currents (600/day) — additional coverage
    Merge and deduplicate.
    """
    keywords = extract_keywords(q)
    if not keywords:
        keywords = " ".join(q.split()[:3])

    print(f"[News] Waterfall search: '{keywords}'")

    async with httpx.AsyncClient() as client:
        # Fire all sources in parallel
        import asyncio
        gdelt_task = asyncio.create_task(_fetch_gdelt(client, keywords))
        gnews_task = asyncio.create_task(_fetch_gnews(client, keywords))
        currents_task = asyncio.create_task(_fetch_currents(client, keywords))

        gdelt_results = await gdelt_task
        gnews_results = await gnews_task
        currents_results = await currents_task

    # Merge: prioritize GNews/Currents (have descriptions), then GDELT
    all_articles = gnews_results + currents_results + gdelt_results
    unique = _deduplicate(all_articles)

    return {
        "articles": unique[:15],
        "total": len(unique),
        "query_used": keywords,
        "sources": {
            "gdelt": len(gdelt_results),
            "gnews": len(gnews_results),
            "currents": len(currents_results),
        }
    }
