# backend/services/llm.py
import os
from dotenv import load_dotenv
import json
import requests
from typing import Optional

load_dotenv()

# --- Common config ---
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "ollama").lower()

# Ollama
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

# OpenRouter
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-72b-instruct")


def _ollama_generate(
    prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 1200,
) -> str:
    """
    Call a local Ollama server and return the full concatenated text.
    """
    m = model or OLLAMA_MODEL
    url = f"{OLLAMA_URL}/api/generate"

    resp = requests.post(
        url,
        json={
            "model": m,
            "prompt": prompt,
            "temperature": temperature,
            "options": {"num_predict": max_tokens},
        },
        stream=True,
        timeout=300,
    )
    resp.raise_for_status()

    chunks = []
    for line in resp.iter_lines():
        if not line:
            continue
        try:
            data = json.loads(line.decode("utf-8"))
        except Exception:
            continue
        text = data.get("response")
        if text:
            chunks.append(text)
        if data.get("done"):
            break
    return "".join(chunks).strip()


def _openrouter_generate(
    prompt: str,
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 1200,
) -> str:
    """
    Call OpenRouter's chat completions endpoint and return the text.
    """
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")

    m = model or OPENROUTER_MODEL
    url = "https://openrouter.ai/api/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        # Optional attribution headers – nice to have, but not required.
        "HTTP-Referer": "https://ai-study-assistant.local",
        "X-Title": "AI Study Assistant (Prakhar MCS Project)",
    }

    body = {
        "model": m,
        "messages": [
            {
                "role": "system",
                "content": "You are a precise assistant used inside a study assistant app.",
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    resp = requests.post(url, headers=headers, json=body, timeout=300)
    resp.raise_for_status()
    data = resp.json()

    # choices[0].message.content can be a string or list of segments
    choice = (data.get("choices") or [{}])[0]
    msg = choice.get("message", {})
    content = msg.get("content", "")
    if isinstance(content, list):
        # Some providers return a list of parts; join them.
        content = "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in content)
    return str(content).strip()


def llm_complete(
    prompt: str,
    *,
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 1200,
) -> str:
    """
    Single entry point for all higher-level code.

    Uses LLM_PROVIDER env:
    - "ollama"     -> local Ollama server
    - "openrouter" -> OpenRouter cloud API
    """
    provider = LLM_PROVIDER

    if provider == "openrouter":
        return _openrouter_generate(
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    # default / fallback: ollama
    return _ollama_generate(
        prompt=prompt,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )
