import httpx

key = "cf6329bfd6c8bf25b9b1a77d9026e833"

# Test 1: AND (space = implicit AND) with 'in' filter
r1 = httpx.get("https://gnews.io/api/v4/search", params={"apikey": key, "q": "iranian regime fall", "lang": "en", "max": 10, "in": "title,description"}, timeout=15)
a1 = r1.json().get("articles", [])
print(f"Test 1 (AND + in=title,desc): {len(a1)} articles")

# Test 2: OR keywords with 'in' filter
r2 = httpx.get("https://gnews.io/api/v4/search", params={"apikey": key, "q": "iranian OR regime OR fall", "lang": "en", "max": 10, "in": "title,description"}, timeout=15)
a2 = r2.json().get("articles", [])
print(f"Test 2 (OR + in=title,desc): {len(a2)} articles")

# Test 3: OR keywords WITHOUT 'in' filter
r3 = httpx.get("https://gnews.io/api/v4/search", params={"apikey": key, "q": "iranian OR regime", "lang": "en", "max": 10}, timeout=15)
a3 = r3.json().get("articles", [])
print(f"Test 3 (OR, no in filter): {len(a3)} articles")

# Test 4: Simple single keyword, no in filter
r4 = httpx.get("https://gnews.io/api/v4/search", params={"apikey": key, "q": "Iran", "lang": "en", "max": 10}, timeout=15)
a4 = r4.json().get("articles", [])
print(f"Test 4 (single word Iran): {len(a4)} articles")

# Test 5: Typical niche market
r5 = httpx.get("https://gnews.io/api/v4/search", params={"apikey": key, "q": "bitcoin price", "lang": "en", "max": 10}, timeout=15)
a5 = r5.json().get("articles", [])
print(f"Test 5 (bitcoin price): {len(a5)} articles")

# Test 6: Very niche market title like "Will Trump win?"
r6 = httpx.get("https://gnews.io/api/v4/search", params={"apikey": key, "q": "Trump", "lang": "en", "max": 10}, timeout=15)
a6 = r6.json().get("articles", [])
print(f"Test 6 (Trump): {len(a6)} articles")
