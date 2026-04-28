"""DigitalOcean GenAI Agent — OpenAI-compatible Chat Completions API."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
import json
from config import DO_AGENT_ENDPOINT, DO_AGENT_ACCESS_KEY

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ClassifyRequest(BaseModel):
    titles: list[str]


class ChatRequest(BaseModel):
    message: str
    context: dict


async def _call_do_agent(user_message: str) -> str:
    """
    Call the DigitalOcean GenAI Agent using the OpenAI-compatible
    chat completions API.

    Endpoint: POST {base_url}/api/v1/chat/completions
    Auth:     Bearer token
    Body:     {"messages": [{"role": "user", "content": "..."}], "stream": false}
    Response: {"choices": [{"message": {"content": "..."}}]}
    """
    if not DO_AGENT_ENDPOINT or not DO_AGENT_ACCESS_KEY:
        raise HTTPException(status_code=503, detail="Agent not configured")

    base = DO_AGENT_ENDPOINT.rstrip("/")
    url = f"{base}/api/v1/chat/completions"

    payload = {
        "messages": [
            {"role": "user", "content": user_message}
        ],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=60.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {DO_AGENT_ACCESS_KEY}",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

            # OpenAI-compatible response: data.choices[0].message.content
            choices = data.get("choices", [])
            if choices:
                return choices[0].get("message", {}).get("content", "No response content.")
            return "Agent returned empty choices."

    except httpx.HTTPStatusError as e:
        print(f"[Agent] DO returned {e.response.status_code}: {e.response.text[:500]}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"DO Agent error: {e.response.text[:200]}",
        )
    except httpx.ConnectError as e:
        print(f"[Agent] Connection failed: {e}")
        raise HTTPException(status_code=502, detail="Cannot reach DO Agent")
    except Exception as e:
        print(f"[Agent] Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/classify")
async def classify_markets(req: ClassifyRequest):
    """Classify market titles via DO Agent."""
    if not DO_AGENT_ENDPOINT or not DO_AGENT_ACCESS_KEY:
        return {"results": []}

    prompt = (
        "Classify these market titles. Return ONLY a JSON array. "
        'Each item: {"index": int, "categories": ["crypto","finance","sports","climate"], "entity": "string"}\n'
    )
    for i, t in enumerate(req.titles):
        prompt += f"{i}. {t}\n"

    try:
        text = await _call_do_agent(prompt)
        return {"results": _parse_agent_json(text)}
    except Exception as e:
        print(f"[Agent] Classification failed: {e}")
        return {"results": []}


@router.post("/chat")
async def chat_with_agent(req: ChatRequest):
    """Chat with the DO Agent about a specific market."""
    prompt = f"{req.message}\n\n### Market Context:\n{json.dumps(req.context, indent=2)}"
    text = await _call_do_agent(prompt)
    return {"response": text}


def _parse_agent_json(text: str):
    """Extract a JSON array from possibly markdown-wrapped agent output."""
    try:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text)
    except Exception:
        return []
