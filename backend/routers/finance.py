"""Finance — FRED + Alpha Vantage + World Bank (World Bank is free, no key)."""
import httpx
from fastapi import APIRouter, Query
from config import FRED_API_KEY, ALPHA_VANTAGE_API_KEY, FRED_API_URL, ALPHA_VANTAGE_API_URL

router = APIRouter(prefix="/api/finance", tags=["finance"])

# Common FRED series IDs mapped to friendly names
FRED_SERIES = {
    "GDP": "GDPC1",          # Real GDP (quarterly)
    "Unemployment": "UNRATE", # Unemployment rate (monthly)
    "CPI": "CPIAUCSL",       # Consumer Price Index (monthly)
    "Interest Rate": "FEDFUNDS",  # Federal Funds Rate
}


async def fetch_fred_series(client: httpx.AsyncClient, series_id: str, limit: int = 60):
    """Fetch a FRED time series. Returns (dates, values) tuple."""
    if not FRED_API_KEY:
        return None
    try:
        resp = await client.get(
            f"{FRED_API_URL}/series/observations",
            params={
                "series_id": series_id,
                "api_key": FRED_API_KEY,
                "file_type": "json",
                "sort_order": "desc",
                "limit": limit,
            },
        )
        if resp.status_code == 200:
            obs = resp.json().get("observations", [])
            obs.reverse()
            dates = [o["date"] for o in obs if o["value"] != "."]
            values = [float(o["value"]) for o in obs if o["value"] != "."]
            return {"dates": dates, "values": values}
    except Exception:
        pass
    return None


async def fetch_alpha_vantage(client: httpx.AsyncClient, symbol: str):
    """Fetch daily stock data from Alpha Vantage."""
    if not ALPHA_VANTAGE_API_KEY:
        return None
    try:
        resp = await client.get(
            ALPHA_VANTAGE_API_URL,
            params={
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "apikey": ALPHA_VANTAGE_API_KEY,
                "outputsize": "compact",
            },
        )
        if resp.status_code == 200:
            data = resp.json()
            ts = data.get("Time Series (Daily)", {})
            if not ts:
                return None
            items = sorted(ts.items())[-60:]  # Last 60 days
            dates = [d for d, _ in items]
            values = [float(v["4. close"]) for _, v in items]
            return {"dates": dates, "values": values}
    except Exception:
        pass
    return None


async def _fetch_world_bank(client: httpx.AsyncClient, country: str) -> dict | None:
    """
    Fetch key indicators from World Bank API (free, no key).
    Returns GDP, population, inflation for a country.
    """
    # Map common country names to ISO codes
    COUNTRY_MAP = {
        "united states": "USA", "us": "USA", "usa": "USA", "america": "USA",
        "united kingdom": "GBR", "uk": "GBR", "britain": "GBR", "england": "GBR",
        "china": "CHN", "japan": "JPN", "germany": "DEU", "france": "FRA",
        "india": "IND", "brazil": "BRA", "canada": "CAN", "australia": "AUS",
        "mexico": "MEX", "south korea": "KOR", "korea": "KOR",
        "russia": "RUS", "italy": "ITA", "spain": "ESP",
        "indonesia": "IDN", "turkey": "TUR", "saudi arabia": "SAU",
        "argentina": "ARG", "nigeria": "NGA", "south africa": "ZAF",
        "egypt": "EGY", "pakistan": "PAK", "thailand": "THA",
        "vietnam": "VNM", "philippines": "PHL", "malaysia": "MYS",
        "colombia": "COL", "chile": "CHL", "peru": "PER",
        "poland": "POL", "netherlands": "NLD", "sweden": "SWE",
        "switzerland": "CHE", "norway": "NOR", "denmark": "DNK",
        "ireland": "IRL", "new zealand": "NZL", "singapore": "SGP",
        "hong kong": "HKG", "taiwan": "TWN", "israel": "ISR",
        "uae": "ARE", "qatar": "QAT", "kuwait": "KWT",
    }

    code = COUNTRY_MAP.get(country.lower().strip(), "")
    if not code:
        # Try using the raw input as a code
        code = country.upper()[:3]

    indicators = {
        "GDP (Current US$)": "NY.GDP.MKTP.CD",
        "Population": "SP.POP.TOTL",
        "Inflation (CPI %)": "FP.CPI.TOTL.ZG",
        "GDP Growth (%)": "NY.GDP.MKTP.KD.ZG",
    }

    result = {}
    for name, indicator in indicators.items():
        try:
            resp = await client.get(
                f"https://api.worldbank.org/v2/country/{code}/indicator/{indicator}",
                params={"format": "json", "per_page": 5, "date": "2019:2025"},
                timeout=8.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 1:
                    entries = [e for e in data[1] if e.get("value") is not None]
                    if entries:
                        result[name] = {
                            "latest_value": entries[0]["value"],
                            "year": entries[0]["date"],
                            "country": entries[0].get("country", {}).get("value", ""),
                        }
        except Exception:
            pass

    return result if result else None


@router.get("")
async def get_finance_data(
    location: str = Query(...),
    country: str = Query("", description="Country name for regional data"),
):
    has_fred = bool(FRED_API_KEY)
    has_av = bool(ALPHA_VANTAGE_API_KEY)
    result = {
        "location": location,
        "country": country or location,
        "has_fred_key": has_fred,
        "has_alpha_vantage_key": has_av,
        "series": {},
        "stock": None,
        "world_bank": None,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Fetch FRED series
        if has_fred:
            for name, sid in FRED_SERIES.items():
                data = await fetch_fred_series(client, sid)
                if data:
                    result["series"][name] = data

        # Fetch stock index (SPY as default US index)
        if has_av:
            result["stock"] = await fetch_alpha_vantage(client, "SPY")

        # Fetch World Bank indicators (free, no key)
        country_name = country or location
        if country_name:
            result["world_bank"] = await _fetch_world_bank(client, country_name)

    return result
