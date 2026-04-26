"""
UnivInsight — Backend Configuration
Loads API keys and URLs from environment variables.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
FRED_API_KEY = os.getenv("FRED_API_KEY", "")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")

# External API Base URLs
POLYMARKET_API_URL = os.getenv("POLYMARKET_API_URL", "https://gamma-api.polymarket.com")
POLYMARKET_CLOB_URL = os.getenv("POLYMARKET_CLOB_URL", "https://clob.polymarket.com")
METACULUS_API_URL = os.getenv("METACULUS_API_URL", "https://www.metaculus.com/api2")
FRED_API_URL = os.getenv("FRED_API_URL", "https://api.stlouisfed.org/fred")
ALPHA_VANTAGE_API_URL = os.getenv("ALPHA_VANTAGE_API_URL", "https://www.alphavantage.co/query")
OPEN_METEO_API_URL = os.getenv("OPEN_METEO_API_URL", "https://api.open-meteo.com/v1")
SPORTSDB_API_URL = os.getenv("SPORTSDB_API_URL", "https://www.thesportsdb.com/api/v1/json/3")
KALSHI_API_URL = os.getenv("KALSHI_API_URL", "https://api.elections.kalshi.com/trade-api/v2")
GNEWS_API_KEY = os.getenv("GNEWS_API_KEY", "")
