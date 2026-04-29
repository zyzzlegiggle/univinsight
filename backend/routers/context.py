"""
Context Detection — Hybrid system for market categorization.

Layer 1: Keyword rules with exclusion patterns (instant, free, always available)
Layer 2: Gemini Flash LLM classification (smart, cheap, used at scrape time)

Categories are computed once when markets are fetched, not per user click.
"""
import re
import json
import asyncio
from functools import lru_cache
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/context", tags=["context"])

# ─── Valid Categories ─────────────────────────────────
VALID_CATEGORIES = ["climate", "sports", "crypto", "finance", "politics", "entertainment", "tech", "science", "social"]

# ─── Layer 1: Keyword Rules with Exclusions ───────────
# Format: (keyword_set, exclusion_set)
# A category matches if ANY keyword is found AND NO exclusion is found.

RULES: dict[str, tuple[set[str], set[str]]] = {
    "climate": (
        {
            "temperature", "weather", "heat wave", "heatwave", "cold snap",
            "hurricane", "tornado", "climate change", "flood", "drought",
            "snow", "celsius", "fahrenheit", "wildfire", "storm", "cyclone",
            "monsoon", "el nino", "la nina", "global warming", "ice cap",
        },
        # Exclusions: avoid tagging "climate bill" as weather
        {"bill", "legislation", "regulation", "policy", "act of", "vote on"},
    ),
    "sports": (
        {
            "nba", "nfl", "nhl", "mlb", "fifa", "ufc", "boxing", "tennis",
            "soccer", "basketball", "baseball", "hockey", "championship",
            "super bowl", "world cup", "champions league", "playoffs", "finals",
            "premier league", "la liga", "serie a", "bundesliga", "ligue 1",
            "grand slam", "wimbledon", "olympics", "f1", "formula 1",
            "mma", "wrestling", "cricket", "rugby",
        },
        # Exclusions: avoid "Super Bowl ads" being tagged sports
        {"advertisement", "commercial", "halftime show"},
    ),
    "crypto": (
        {
            "bitcoin", "btc", "ethereum", "eth", "solana", "sol",
            "dogecoin", "doge", "xrp", "ripple", "cardano", "ada",
            "polygon", "matic", "avalanche", "avax", "chainlink", "link",
            "polkadot", "dot", "litecoin", "ltc", "shiba", "pepe",
            "memecoin", "defi", "blockchain", "token price",
            "crypto price", "bitcoin price", "eth price",
        },
        # Exclusions: "crypto regulation" is politics, not crypto data
        {"regulation", "ban", "legislation", "bill", "sec lawsuit", "hearing"},
    ),
    "finance": (
        {
            "gdp", "inflation", "unemployment rate", "interest rate",
            "federal reserve", "fed rate", "stock market", "s&p 500",
            "nasdaq", "dow jones", "recession", "cpi", "treasury",
            "bond yield", "tariff", "trade deficit", "debt ceiling",
        },
        # Exclusions: avoid false positives from casual mentions
        set(),
    ),
    "politics": (
        {
            "election", "president", "congress", "senate", "vote",
            "impeach", "executive order", "supreme court", "legislation",
            "governor", "mayor", "democrat", "republican", "parliament",
            "prime minister", "referendum", "ballot",
        },
        set(),
    ),
    "entertainment": (
        {
            "oscars", "grammy", "emmy", "movie", "film", "album",
            "box office", "streaming", "netflix", "disney", "spotify",
            "concert", "tour", "celebrity", "tv show", "series finale",
            "billboard", "award show",
        },
        set(),
    ),
    "tech": (
        {
            "openai", "chatgpt", "artificial intelligence", " ai ",
            "apple launch", "iphone", "google launch", "tesla",
            "spacex", "rocket launch", "starship", "autonomous",
            "quantum computing",
        },
        set(),
    ),
    "science": (
        {
            "earthquake", "tsunami", "volcano", "eruption", "asteroid",
            "pandemic", "virus", "vaccine", "outbreak", "who declares",
            "nasa", "space mission", "mars", "moon landing",
        },
        set(),
    ),
    "social": (
        {
            "polymarket", "tweet", "post", "x.com", "twitter", "social media",
            "announcement", "live now", "odds update",
        },
        set(),
    ),
}


def keyword_classify(title: str) -> list[str]:
    """Layer 1: Fast keyword matching with exclusion rules."""
    t = title.lower()
    categories = []

    for category, (keywords, exclusions) in RULES.items():
        # Check if any keyword matches
        matched = False
        for kw in keywords:
            if kw in t:
                matched = True
                break
        if not matched:
            continue

        # Check if any exclusion matches — if so, skip this category
        excluded = False
        for ex in exclusions:
            if ex in t:
                excluded = True
                break
        if excluded:
            continue

        categories.append(category)

    return categories


# ─── Layer 2: Gemini Flash LLM ────────────────────────

_gemini_model = None


def _get_gemini_model():
    """Lazy-load the Gemini model to avoid import errors when key is missing."""
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model

    from config import GEMINI_API_KEY
    if not GEMINI_API_KEY:
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-3.1-flash-lite-preview")
        return _gemini_model
    except Exception as e:
        print(f"[Context] Failed to init Gemini: {e}")
        return None


def _extract_json_from_text(text: str):
    """Robustly extract JSON from potential LLM chatter."""
    try:
        # Try to find JSON block
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        
        # Clean up common artifacts
        text = text.strip()
        return json.loads(text)
    except Exception:
        return None


CLASSIFY_PROMPT = """You are a market category classifier for a prediction market platform.

Given a list of market titles, classify each into one or more categories from this exact list:
climate, sports, crypto, finance, politics, entertainment, tech, science

Rules:
- Only use categories from the list above. Do not invent new ones.
- A market can have 0 categories (if none fit well) or multiple.
- Be conservative. Only tag a category if showing data for that category would genuinely help a trader understand the market.
- "Will crypto be regulated?" is politics, NOT crypto (showing a Bitcoin price chart would be misleading).
- "Bitcoin price above $100k?" IS crypto (price chart is directly relevant).
- "Will Tesla stock rise?" is finance AND tech.
- "Who wins the Super Bowl?" is sports. "Super Bowl halftime performer?" is entertainment.

Also extract the primary entity/subject for each market (for Wikipedia lookup).
Keep entities to 1-4 words, focusing on the main noun (person, place, thing).

Respond ONLY with valid JSON. Format:
[
  {"index": 0, "categories": ["crypto"], "entity": "Bitcoin"},
  {"index": 1, "categories": ["politics"], "entity": "US Congress"},
  ...
]

Market titles:
"""


# In-memory cache for LLM results (persists for server lifetime)
_llm_cache: dict[str, dict] = {}


async def llm_classify_batch(titles: list[str]) -> list[dict]:
    """
    Classify a batch of market titles.
    Priority: 1) Gemini Flash  2) Keyword rules
    """
    from config import GEMINI_API_KEY

    results = [None] * len(titles)

    # ── Check Cache for remaining gaps ──
    for i, t in enumerate(titles):
        if results[i] is None and t in _llm_cache:
            results[i] = _llm_cache[t]

    # ── Try Gemini Flash for remaining gaps (limit to 30 more) ──
    if GEMINI_API_KEY:
        uncached_indices = [i for i, r in enumerate(results) if r is None]
        if uncached_indices:
            # Only classify first 30 uncached to keep it fast
            to_classify_indices = uncached_indices[:30]
            uncached_titles = [titles[i] for i in to_classify_indices]
            
            model = _get_gemini_model()
            if model:
                prompt = CLASSIFY_PROMPT
                for j, t in enumerate(uncached_titles):
                    prompt += f"{j}. {t}\n"
                
                try:
                    response = await asyncio.to_thread(model.generate_content, prompt)
                    parsed = _extract_json_from_text(response.text.strip())
                    if isinstance(parsed, list):
                        for item in parsed:
                            idx = item.get("index", -1)
                            if 0 <= idx < len(uncached_titles):
                                cats = [c for c in item.get("categories", []) if c in VALID_CATEGORIES]
                                result = {"categories": cats, "entity": item.get("entity", "")}
                                real_idx = to_classify_indices[idx]
                                results[real_idx] = result
                                _llm_cache[titles[real_idx]] = result
                except Exception as e:
                    print(f"[Context] Gemini classification failed: {e}")

    # ── Final fallback: keyword rules ──
    for i in range(len(results)):
        if results[i] is None:
            results[i] = {
                "categories": keyword_classify(titles[i]),
                "entity": extract_entity(titles[i]),
            }
            _llm_cache[titles[i]] = results[i]

    return results


def extract_entity(title: str) -> str:
    """Extract the most likely named entity from a market title for Wikipedia lookup."""
    patterns = [
        r"^will\s+", r"^what\s+", r"^who\s+", r"^when\s+",
        r"\s+by\s+\d{4}.*$", r"\s+before\s+\d{4}.*$", r"\s+in\s+\d{4}.*$",
        r"\?$", r"^does\s+", r"^is\s+", r"^are\s+",
    ]
    clean = title
    for p in patterns:
        clean = re.sub(p, "", clean, flags=re.IGNORECASE)

    words = clean.strip().split()
    proper = []
    for w in words:
        if len(w) > 0 and w[0].isupper() and w.lower() not in {"yes", "no", "the", "will", "be"}:
            proper.append(w)
        elif proper:
            break

    if proper:
        return " ".join(proper[:4])
    return " ".join(words[:3])


# ─── API Endpoint (for manual testing / fallback) ────

@router.get("")
async def detect_context(q: str = Query(..., description="Market title")):
    """Classify a single market title. Uses LLM if available, keywords otherwise."""
    results = await llm_classify_batch([q])
    r = results[0]
    return {
        "title": q,
        "categories": r["categories"],
        "entity": r["entity"],
    }


@router.get("/batch")
async def detect_context_batch(titles: str = Query(..., description="JSON-encoded list of titles")):
    """Classify multiple titles at once (used by the scraper)."""
    try:
        title_list = json.loads(titles)
    except Exception:
        return {"error": "Invalid JSON list"}

    results = await llm_classify_batch(title_list)
    return {"results": results}
