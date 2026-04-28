from fastapi import APIRouter
import httpx
import asyncio
import random
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/activity", tags=["activity"])

class RecentTrade(BaseModel):
    market_id: str
    title: str
    type: str # "buy" or "sell"
    price: float
    current_price: float
    timestamp: float
    locations: List[str]

# Cache of markets to rotate through
_market_pool = []

@router.get("/recent-trades", response_model=List[RecentTrade])
async def get_recent_trades():
    global _market_pool
    
    # 1. Ensure we have a pool of markets to check
    if not _market_pool:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Fetch top markets from Polymarket CLOB
                resp = await client.get("https://clob.polymarket.com/markets?limit=100&active=true")
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        _market_pool = data
                    elif isinstance(data, dict) and "data" in data:
                        _market_pool = data["data"]
                    else:
                        _market_pool = []
        except Exception as e:
            print(f"[Activity] Failed to fetch pool: {e}")
            return []

    if not _market_pool or not isinstance(_market_pool, list):
        return []

    # 2. Pick a random subset to check for activity
    # We pick from the middle of the list often to get varied activity
    sample = random.sample(_market_pool, min(len(_market_pool), 4))
    trades = []

    async with httpx.AsyncClient(timeout=5.0) as client:
        for mkt in sample:
            try:
                tokens = mkt.get("tokens", [])
                if not tokens: continue
                
                # Pick the first token (usually the primary outcome)
                token_id = tokens[0].get("token_id")
                if not token_id: continue
                
                # Fetch trades for this specific token
                # Documentation check: CLOB /trades takes token_id
                t_resp = await client.get(f"https://clob.polymarket.com/trades?token_id={token_id}&limit=1")
                
                if t_resp.status_code == 200:
                    data = t_resp.json()
                    if data and isinstance(data, list) and len(data) > 0:
                        trade = data[0]
                        
                        # Calculate price (0.0 to 1.0 -> 0 to 100)
                        price = float(trade.get("price", 0.5)) * 100
                        current_price = float(tokens[0].get("price", 0.5)) * 100
                        
                        trades.append(RecentTrade(
                            market_id=mkt.get("condition_id", ""),
                            title=mkt.get("question", "Unknown Market"),
                            type=trade.get("side", "buy").lower(),
                            price=price,
                            current_price=current_price,
                            timestamp=float(trade.get("timestamp", 0)),
                            locations=[]
                        ))
            except Exception as e:
                # print(f"[Activity] Error for market {mkt.get('question')}: {e}")
                continue

    # Sort by timestamp (newest first)
    trades.sort(key=lambda x: x.timestamp, reverse=True)
    return trades
