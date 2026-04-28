"""
UnivInsight — FastAPI Backend
Aggregates data from prediction markets, finance, sports, climate, and trends APIs.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import market, finance, climate, sports, trends, news, crypto, wiki, context, agent

app = FastAPI(
    title="UnivInsight API",
    description="Backend API for the UnivInsight universal insight platform.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
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
app.include_router(news.router)
app.include_router(crypto.router)
app.include_router(wiki.router)
app.include_router(context.router)
app.include_router(agent.router)


@app.get("/")
async def root():
    return {"message": "UnivInsight API is running."}


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
