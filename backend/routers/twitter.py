import os
import httpx
import random
import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/twitter", tags=["twitter"])

X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN")

# Polymarket User ID: 1261335549215989760 (confirmed via /2/users/by/username/Polymarket)
POLYMARKET_USER_ID = "1261335549215989760"

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

# In-memory cache for the session (Only real tweets)
CACHED_TWEETS = []

@router.get("/polymarket", response_model=List[TweetData])
async def get_polymarket_tweets(history: bool = False):
    global CACHED_TWEETS
    
    # Always refresh token from env to handle live changes
    token = os.getenv("X_BEARER_TOKEN")

    # If no token is provided, we do NOT activate mock data.
    # We return an empty list to disable the social feed functionality gracefully.
    if not token or token.strip() == "":
        return []

    if history and CACHED_TWEETS:
        # If we have cached real tweets, return them
        return CACHED_TWEETS[:20]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"https://api.twitter.com/2/users/{POLYMARKET_USER_ID}/tweets"
            # Limit history to 20 to maintain high quality and lower API costs
            params = {
                "max_results": 20 if history else 5,
                "tweet.fields": "created_at,author_id",
                "exclude": "retweets,replies"
            }
            headers = {"Authorization": f"Bearer {token}"}
            
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code != 200:
                print(f"[Twitter] API Error {resp.status_code}: {resp.text}")
                # No mock fallback on error
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
            
            # Keep only the latest 20 real tweets in cache
            CACHED_TWEETS.sort(key=lambda x: x.created_at, reverse=True)
            CACHED_TWEETS = CACHED_TWEETS[:20]
            
            return CACHED_TWEETS if history else new_results
    except Exception as e:
        print(f"[Twitter] Error: {e}")
        return CACHED_TWEETS if history else []
    except Exception as e:
        print(f"[Twitter] Error: {e}")
        return CACHED_TWEETS if history else []
