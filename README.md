# UnivInsight

UnivInsight is a real-time intelligence dashboard that aggregates prediction markets, social media signals, and multi-source news into a unified analytical workspace. It uses a custom Intelligence Mesh to visualize the relationships between global events and market probabilities.

---

## System Architecture

UnivInsight follows a decoupled architecture designed for high performance and agentic analysis.

```mermaid
graph TD
    User((User)) <--> Frontend[Next.js Dashboard]
    Frontend <--> Proxy[/api Rewrite]
    Proxy <--> Backend[FastAPI Intelligence Layer]
    
    subgraph "Intelligence Layer"
        Backend --> PM[Polymarket CLOB/API]
        Backend --> News[GDELT / RSS / GNews]
        Backend --> Finance[FRED / AlphaVantage]
        Backend --> Social[X Bearer API]
        Backend --> AI[DO GenAI Agent / Gemini]
    end
    
    subgraph "Visualization"
        Frontend --> Map[Mapbox GL / Intelligence Mesh]
        Frontend --> Charts[Chart.js / Real-time Delta]
    end
```

---

## Key Features

- **Global Intelligence Mesh**: A high-performance Mapbox GL interface visualizing the physical locations of market outcomes and real-time social activity.
- **Agentic Analysis**: Integrated DigitalOcean GenAI Agent that performs deep-dive market research by synthesizing news sentiment, historical prices, and social trends.
- **Social Signal Integration**: Real-time X (Twitter) tracking that visually connects social signals to specific market dots on the map.
- **Multi-Source News Intelligence**: High-integrity news waterfall pulling from Reuters, BBC, NYT, and GDELT with semantic relevance scoring.
- **Professional Finance Tooling**: Real-time order books, trade notifications, and historical price volatility charts using FRED and AlphaVantage data.

---

## Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Framer Motion |
| **State/UI** | React Hooks, Lucide Icons, Mapbox GL JS |
| **Charts** | Chart.js with custom Crosshair and Sparkline plugins |
| **Backend** | FastAPI (Python 3.10+), Httpx, Pydantic, Feedparser |
| **AI/ML** | Gemini 1.5 Pro (Classification), GPT-oss 120b (Agent) |

---

## Quick Start

### 1. Prerequisites
- **Python 3.10+** and **Node.js 18+**
- **Core API Keys**: Mapbox, Gemini, X (Twitter), and DigitalOcean Agent.
- **Finance API Keys**: FRED and AlphaVantage (for full economic data).

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py
```

### 3. Frontend Setup
```bash
cd frontend-next
npm install
npm run dev
```

---
