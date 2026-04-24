"""Trends — Google Trends via pytrends (free, no key, but rate-limited)."""
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/trends", tags=["trends"])


@router.get("")
async def get_trends_data(
    location: str = Query(..., description="Location or keyword"),
):
    interest = None
    related = []
    error = None

    try:
        from pytrends.request import TrendReq

        pytrends = TrendReq(hl="en-US", tz=360)
        pytrends.build_payload([location], timeframe="today 3-m")

        # Interest over time
        iot = pytrends.interest_over_time()
        if not iot.empty and location in iot.columns:
            interest = {
                "dates": [d.strftime("%Y-%m-%d") for d in iot.index],
                "values": iot[location].tolist(),
            }

        # Related queries
        rq = pytrends.related_queries()
        if location in rq and rq[location].get("top") is not None:
            top = rq[location]["top"]
            related = top["query"].head(10).tolist()

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
