"""Trends — Google Trends via pytrends (free, no key, but rate-limited)."""
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/trends", tags=["trends"])


import re

def extract_keywords(text: str) -> str:
    """Simplify market title for better Google Trends matching."""
    stopwords = {'will', 'be', 'the', 'is', 'at', 'in', 'on', 'of', 'for', 'to', 'reach', 'by', 'yes', 'no', 'before', 'after'}
    clean = re.sub(r'[^a-zA-Z0-9\s]', '', text)
    words = [w for w in clean.lower().split() if w not in stopwords and len(w) > 2]
    return " ".join(words[:2]) # Use only top 2 keywords for broad matching

@router.get("")
async def get_trends_data(
    location: str = Query(..., description="Location or keyword"),
):
    interest = None
    related = []
    error = None

    try:
        from pytrends.request import TrendReq
        
        query = extract_keywords(location) or location
        print(f"[Trends] Querying: '{query}' (Original: '{location}')")

        pytrends = TrendReq(hl="en-US", tz=360)
        pytrends.build_payload([query], timeframe="today 3-m")

        # Interest over time
        iot = pytrends.interest_over_time()
        if not iot.empty and query in iot.columns:
            interest = {
                "dates": [d.strftime("%Y-%m-%d") for d in iot.index],
                "values": iot[query].tolist(),
            }

        # Related queries
        rq = pytrends.related_queries()
        if query in rq:
            # Top Queries
            if rq[query].get("top") is not None:
                related.extend(rq[query]["top"]["query"].head(10).tolist())
            # Rising Queries (emerging trends)
            if rq[query].get("rising") is not None:
                related.extend(rq[query]["rising"]["query"].head(10).tolist())

        # Related topics
        rt = pytrends.related_topics()
        if query in rt:
            # Top Topics
            if rt[query].get("top") is not None:
                related.extend(rt[query]["top"]["topic_title"].head(10).tolist())
            # Rising Topics (breakout interest)
            if rt[query].get("rising") is not None:
                related.extend(rt[query]["rising"]["topic_title"].head(10).tolist())
        
        # Remove duplicates while preserving order
        seen = set()
        related = [x for x in related if x and not (x.lower() in seen or seen.add(x.lower()))]

    except ImportError:
        error = "pytrends not installed. Run: pip install pytrends"
    except Exception as e:
        error = f"Google Trends rate limited or unavailable: {str(e)[:120]}"

    return {
        "location": location,
        "interest_over_time": interest,
        "related_queries": related,
        "error": error,
    }
