"""
UnivInsight — FastAPI Backend
Aggregates data from prediction markets, finance, sports, climate, and trends APIs.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import market, finance, climate, sports, trends

app = FastAPI(
    title="UnivInsight API",
    description="Backend API for the UnivInsight universal insight platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(market.router)
app.include_router(finance.router)
app.include_router(climate.router)
app.include_router(sports.router)
app.include_router(trends.router)


@app.get("/")
async def root():
    return {"message": "UnivInsight API is running."}


@app.get("/health")
async def health():
    return {"status": "ok"}
