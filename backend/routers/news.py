import httpx
import re
import feedparser
import asyncio
from fastapi import APIRouter
from config import GNEWS_API_KEY, CURRENTS_API_KEY

router = APIRouter(prefix="/api/news", tags=["news"])

RSS_FEEDS = [
    {"name": "BBC News", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
    {"name": "Reuters World", "url": "https://www.reutersagency.com/feed/?best-topics=world&post_type=best"},
    {"name": "NYT Top Stories", "url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml"},
    {"name": "The Guardian", "url": "https://www.theguardian.com/world/rss"},
    {"name": "WSJ World News", "url": "https://feeds.a.dj.com/rss/RSSWorldNews.xml"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml"},
]

def extract_keywords(text: str) -> list[str]:
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
        'price', 'value', 'market', 'level', 'reached', 'before', 'after'
    }
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    words = [w for w in clean.lower().split() if w not in stopwords and len(w) > 2]
    # Return up to 6 significant words
    return words[:6]


def calculate_relevance(title: str, description: str, keywords: list[str]) -> float:
    """Calculate a relevance score from 0.0 to 1.0 based on keyword density."""
    if not keywords: return 0.0
    text = (title + " " + description).lower()
    matches = sum(1 for kw in keywords if kw in text)
    return matches / len(keywords)


# ── Source 1: RSS Feeds (Curated, reliable) ───────────────────
async def _fetch_rss(keywords: list[str]) -> list[dict]:
    """Fetch from reputable RSS feeds and filter by keywords."""
    articles = []

    async def parse_feed(feed_info):
        try:
            d = await asyncio.to_thread(feedparser.parse, feed_info["url"])
            found = []
            for entry in d.entries[:25]:
                title = entry.get("title", "")
                summary = entry.get("summary", "")
                
                score = calculate_relevance(title, summary, keywords)
                
                # Strict threshold: at least 2 keywords or high density
                if score >= 0.4 or (len(keywords) <= 2 and score >= 0.5):
                    image = ""
                    if "media_content" in entry and len(entry.media_content) > 0:
                        image = entry.media_content[0].get("url", "")
                    elif "links" in entry:
                        for link in entry.links:
                            if link.get("rel") == "enclosure" and "image" in link.get("type", ""):
                                image = link.get("href", "")
                                break

                    found.append({
                        "title": title,
                        "url": entry.get("link", ""),
                        "image": image,
                        "site": feed_info["name"],
                        "published": entry.get("published", ""),
                        "description": summary,
                        "source": "rss",
                        "relevance": score
                    })
            return found
        except Exception as e:
            print(f"[RSS] Error parsing {feed_info['name']}: {e}")
            return []

    results = await asyncio.gather(*(parse_feed(f) for f in RSS_FEEDS))
    for r in results:
        articles.extend(r)
    
    return articles


# ── Source 2: GDELT (free, no key, unlimited) ──────────────────
async def _fetch_gdelt(client: httpx.AsyncClient, keywords: list[str]) -> list[dict]:
    """GDELT Doc API — returns articles with title, url, image, domain, date."""
    query = " ".join(keywords)
    try:
        resp = await client.get(
            "https://api.gdeltproject.org/api/v2/doc/doc",
            params={
                "query": query,
                "mode": "ArtList",
                "format": "json",
                "maxrecords": 20,
                "sourcelang": "eng",
            },
            timeout=12.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            articles = []
            for art in data.get("articles", []):
                title = art.get("title", "")
                articles.append({
                    "title": title,
                    "url": art.get("url", ""),
                    "image": art.get("socialimage", ""),
                    "site": art.get("domain", ""),
                    "published": art.get("seendate", ""),
                    "description": "", 
                    "source": "gdelt",
                    "relevance": calculate_relevance(title, "", keywords)
                })
            return articles
    except Exception as e:
        print(f"[GDELT] Error: {e}")
    return []


# ── Source 3: GNews (100 req/day, key required) ────────────────
async def _fetch_gnews(client: httpx.AsyncClient, keywords: list[str]) -> list[dict]:
    if not GNEWS_API_KEY:
        return []
    # Use exact match if possible, or just the space-separated words (AND logic)
    query = " ".join(keywords)
    try:
        resp = await client.get(
            "https://gnews.io/api/v4/search",
            params={
                "apikey": GNEWS_API_KEY,
                "q": query,
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
                "relevance": calculate_relevance(a.get("title", ""), a.get("description", ""), keywords)
            } for a in data.get("articles", [])]
    except Exception as e:
        print(f"[GNews] Error: {e}")
    return []


# ── Source 4: Currents API (600 req/day, key required) ─────────
async def _fetch_currents(client: httpx.AsyncClient, keywords: list[str]) -> list[dict]:
    if not CURRENTS_API_KEY:
        return []
    query = " ".join(keywords)
    try:
        resp = await client.get(
            "https://api.currentsapi.services/v1/search",
            params={
                "apiKey": CURRENTS_API_KEY,
                "keywords": query,
                "language": "en",
                "type": 1,
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
                "relevance": calculate_relevance(a.get("title", ""), a.get("description", ""), keywords)
            } for a in data.get("news", [])[:10]]
    except Exception as e:
        print(f"[Currents] Error: {e}")
    return []


def _deduplicate_and_sort(articles: list[dict]) -> list[dict]:
    """Deduplicate articles and sort by relevance score."""
    seen = set()
    unique = []
    # Sort by relevance first so we keep the most relevant duplicate
    sorted_articles = sorted(articles, key=lambda x: x.get("relevance", 0), reverse=True)
    
    for art in sorted_articles:
        domain = art.get("site", "").lower().replace("www.", "")
        title_slug = art.get("title", "")[:40].lower()
        key = f"{domain}:{title_slug}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(art)
        
    return unique


@router.get("/related")
async def get_related_info(q: str):
    keywords = extract_keywords(q)
    if not keywords:
        keywords = q.split()[:4]

    print(f"[News] Targeted search: {keywords}")

    async with httpx.AsyncClient() as client:
        rss_task = asyncio.create_task(_fetch_rss(keywords))
        gdelt_task = asyncio.create_task(_fetch_gdelt(client, keywords))
        gnews_task = asyncio.create_task(_fetch_gnews(client, keywords))
        currents_task = asyncio.create_task(_fetch_currents(client, keywords))

        rss_results = await rss_task
        gnews_results = await gnews_task
        currents_results = await currents_task
        gdelt_results = await gdelt_task

    all_articles = rss_results + gnews_results + currents_results + gdelt_results
    
    # Clean up results and sort by relevance
    final_articles = _deduplicate_and_sort(all_articles)
    
    # Filter out very low relevance results (below 30% match)
    filtered = [a for a in final_articles if a.get("relevance", 0) >= 0.3]

    return {
        "articles": filtered[:20],
        "total": len(filtered),
        "query_used": " ".join(keywords),
        "sources": {
            "rss": len(rss_results),
            "gdelt": len(gdelt_results),
            "gnews": len(gnews_results),
            "currents": len(currents_results),
        }
    }
