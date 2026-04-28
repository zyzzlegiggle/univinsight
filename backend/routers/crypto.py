"""Crypto — CoinGecko + DeFi Llama + Fear & Greed (all free, no keys)."""
import httpx
from fastapi import APIRouter, Query

router = APIRouter(prefix="/api/crypto", tags=["crypto"])

COINGECKO_BASE = "https://api.coingecko.com/api/v3"

# Map common names/tickers to CoinGecko IDs
COIN_ALIASES = {
    "bitcoin": "bitcoin", "btc": "bitcoin",
    "ethereum": "ethereum", "eth": "ethereum",
    "solana": "solana", "sol": "solana",
    "dogecoin": "dogecoin", "doge": "dogecoin",
    "xrp": "ripple", "ripple": "ripple",
    "cardano": "cardano", "ada": "cardano",
    "polygon": "matic-network", "matic": "matic-network",
    "avalanche": "avalanche-2", "avax": "avalanche-2",
    "chainlink": "chainlink", "link": "chainlink",
    "polkadot": "polkadot", "dot": "polkadot",
    "litecoin": "litecoin", "ltc": "litecoin",
    "tron": "tron", "trx": "tron",
    "shiba": "shiba-inu", "shib": "shiba-inu",
    "pepe": "pepe",
}

# Map coins to DeFi Llama protocol slugs
DEFI_PROTOCOLS = {
    "ethereum": "ethereum",
    "solana": "solana",
    "avalanche-2": "avalanche",
    "matic-network": "polygon",
    "cardano": "cardano",
}


def resolve_coin_id(query: str) -> str | None:
    """Try to match a query string to a CoinGecko coin ID."""
    q = query.lower().strip()
    # Direct match
    if q in COIN_ALIASES:
        return COIN_ALIASES[q]
    # Substring match (e.g. "bitcoin price" -> "bitcoin")
    for alias, cg_id in COIN_ALIASES.items():
        if alias in q:
            return cg_id
    return None


async def _fetch_defi_tvl(client: httpx.AsyncClient, chain: str) -> dict | None:
    """Fetch DeFi TVL data from DeFi Llama (free, no key)."""
    try:
        resp = await client.get(
            f"https://api.llama.fi/v2/historicalChainTvl/{chain}",
            timeout=10.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                # Get last 30 data points
                recent = data[-30:]
                return {
                    "chain": chain,
                    "current_tvl": recent[-1].get("tvl", 0) if recent else 0,
                    "dates": [str(p.get("date", "")) for p in recent],
                    "values": [p.get("tvl", 0) for p in recent],
                }
    except Exception as e:
        print(f"[DeFi] TVL error for {chain}: {e}")
    return None


async def _fetch_fear_greed(client: httpx.AsyncClient) -> dict | None:
    """Fetch crypto Fear & Greed Index (free, no key)."""
    try:
        resp = await client.get(
            "https://api.alternative.me/fng/",
            params={"limit": 1, "format": "json"},
            timeout=8.0,
        )
        if resp.status_code == 200:
            data = resp.json().get("data", [])
            if data:
                return {
                    "value": int(data[0]["value"]),
                    "label": data[0]["value_classification"],
                }
    except Exception:
        pass
    return None


@router.get("")
async def get_crypto_data(q: str = Query(..., description="Coin name or ticker")):
    coin_id = resolve_coin_id(q)
    if not coin_id:
        return {"found": False, "coin_id": None, "error": f"No coin match for '{q}'"}

    result = {
        "found": True,
        "coin_id": coin_id,
        "summary": None,
        "sparkline": None,
        "defi_tvl": None,
        "fear_greed": None,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        # ── CoinGecko price data ──
        try:
            resp = await client.get(
                f"{COINGECKO_BASE}/coins/{coin_id}",
                params={
                    "localization": "false",
                    "tickers": "false",
                    "market_data": "true",
                    "community_data": "false",
                    "developer_data": "false",
                    "sparkline": "true",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                md = data.get("market_data", {})
                result["summary"] = {
                    "name": data.get("name"),
                    "symbol": data.get("symbol", "").upper(),
                    "image": data.get("image", {}).get("small"),
                    "current_price": md.get("current_price", {}).get("usd"),
                    "market_cap": md.get("market_cap", {}).get("usd"),
                    "market_cap_rank": md.get("market_cap_rank"),
                    "price_change_24h": md.get("price_change_percentage_24h"),
                    "price_change_7d": md.get("price_change_percentage_7d"),
                    "price_change_30d": md.get("price_change_percentage_30d"),
                    "high_24h": md.get("high_24h", {}).get("usd"),
                    "low_24h": md.get("low_24h", {}).get("usd"),
                    "total_volume": md.get("total_volume", {}).get("usd"),
                    "circulating_supply": md.get("circulating_supply"),
                    "max_supply": md.get("max_supply"),
                    "ath": md.get("ath", {}).get("usd"),
                    "ath_change_pct": md.get("ath_change_percentage", {}).get("usd"),
                }
                sparkline = md.get("sparkline_7d", {}).get("price", [])
                if sparkline:
                    step = max(1, len(sparkline) // 50)
                    result["sparkline"] = sparkline[::step]
            elif resp.status_code == 429:
                result["error"] = "Rate limited by CoinGecko. Try again shortly."
            else:
                result["error"] = f"CoinGecko returned {resp.status_code}"
        except Exception as e:
            result["error"] = str(e)

        # ── DeFi Llama TVL ──
        chain_slug = DEFI_PROTOCOLS.get(coin_id)
        if chain_slug:
            result["defi_tvl"] = await _fetch_defi_tvl(client, chain_slug)

        # ── Fear & Greed Index ──
        result["fear_greed"] = await _fetch_fear_greed(client)

    return result
