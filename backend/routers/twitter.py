import os
import httpx
import random
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/twitter", tags=["twitter"])

X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN")

# Polymarket User ID: 1215309325946114048
POLYMARKET_USER_ID = "1215309325946114048"

class TweetData(BaseModel):
    id: str
    text: str
    created_at: str
    author_id: str
    locations: List[str]
    url: str

# Re-use the keyword-to-location mapping from market.py logic
# For simplicity, we define a core set here or we could import it if structured as a module
TWEET_LOCATION_KEYWORDS = {
    "election": ["Washington D.C."], "trump": ["Washington D.C."], "biden": ["Washington D.C."],
    "fed ": ["Washington D.C."], "bitcoin": ["New York"], "crypto": ["New York"],
    "stock": ["New York"], "war": ["Ukraine", "Middle East"], "israel": ["Jerusalem"],
    "gaza": ["Gaza"], "ukraine": ["Kyiv"], "russia": ["Moscow"], "china": ["Beijing"],
    "super bowl": ["New York"], "oscars": ["Los Angeles"], "openai": ["San Francisco"],
    "apple": ["San Francisco"], "google": ["San Francisco"]
}

def extract_tweet_locations(text: str) -> List[str]:
    text_lower = text.lower()
    found = []
    for key, cities in TWEET_LOCATION_KEYWORDS.items():
        if key in text_lower:
            found.extend(cities)
    
    # Simple list deduplication
    return list(set(found)) if found else ["Washington D.C."] # Default to DC if no location found for Polymarket tweets

# In-memory cache for the session
CACHED_TWEETS = []

@router.get("/polymarket", response_model=List[TweetData])
async def get_polymarket_tweets(history: bool = False):
    global CACHED_TWEETS

    if history and CACHED_TWEETS:
        return CACHED_TWEETS

    if not X_BEARER_TOKEN:
        mock_pool = [
            {
                "id": "mock_1",
                "text": "🔥 NEW HIGH: US Election 2024 volume just crossed $500M! #Polymarket #Election2024",
                "created_at": "2026-04-28T12:00:00Z",
                "author_id": POLYMARKET_USER_ID,
                "locations": ["Washington D.C."],
                "url": "https://x.com/polymarket"
            },
            {
                "id": "mock_2",
                "text": "Bitcoin $100k? Traders are currently pricing in a 65% chance by end of Q2. 🚀 #BTC #Crypto",
                "created_at": "2026-04-28T12:05:00Z",
                "author_id": POLYMARKET_USER_ID,
                "locations": ["New York"],
                "url": "https://x.com/polymarket"
            },
            {
                "id": "mock_3",
                "text": "Will the Fed cut rates in June? New high-stakes market just went live. 🏛️ #Finance",
                "created_at": "2026-04-28T12:10:00Z",
                "author_id": POLYMARKET_USER_ID,
                "locations": ["Washington D.C."],
                "url": "https://x.com/polymarket"
            },
            {
                "id": "mock_4",
                "text": "London's Mayor Election: Check the latest odds on Polymarket. 🇬🇧 #London",
                "created_at": "2026-04-28T12:15:00Z",
                "author_id": POLYMARKET_USER_ID,
                "locations": ["London"],
                "url": "https://x.com/polymarket"
            }
        ]
        if history:
            CACHED_TWEETS = [TweetData(**t) for t in mock_pool]
            return CACHED_TWEETS
        
        # In mock mode, just simulate one "new" tweet
        new_raw = random.choice(mock_pool)
        new_tweet = TweetData(**new_raw)
        if not any(t.id == new_tweet.id for t in CACHED_TWEETS):
            CACHED_TWEETS.append(new_tweet)
        return [new_tweet]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://api.twitter.com/2/users/{POLYMARKET_USER_ID}/tweets"
            params = {
                "max_results": 10 if history else 5,
                "tweet.fields": "created_at,author_id",
                "exclude": "retweets,replies"
            }
            headers = {"Authorization": f"Bearer {X_BEARER_TOKEN}"}
            
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                return CACHED_TWEETS if history else []
            
            data = resp.json()
            raw_tweets = data.get("data", [])
            
            new_results = []
            for t in raw_tweets:
                tweet_id = t["id"]
                if not any(ct.id == tweet_id for ct in CACHED_TWEETS):
                    td = TweetData(
                        id=tweet_id,
                        text=t["text"],
                        created_at=t["created_at"],
                        author_id=t["author_id"],
                        locations=extract_tweet_locations(t["text"]),
                        url=f"https://x.com/polymarket/status/{tweet_id}"
                    )
                    new_results.append(td)
                    CACHED_TWEETS.append(td)
            
            CACHED_TWEETS.sort(key=lambda x: x.created_at, reverse=True)
            return CACHED_TWEETS if history else new_results
    except Exception as e:
        print(f"[Twitter] Error: {e}")
        return CACHED_TWEETS if history else []
