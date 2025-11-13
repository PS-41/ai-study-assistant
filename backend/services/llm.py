import requests
import os
import json

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

def ollama_generate(model: str, prompt: str, temperature: float = 0.2, max_tokens: int = 512) -> str:
    """
    Call Ollama's generate API and return the full text (concatenate streamed chunks).
    """
    url = f"{OLLAMA_URL}/api/generate"
    resp = requests.post(url, json={
        "model": model,
        "prompt": prompt,
        "temperature": temperature,
        "options": {"num_predict": max_tokens}
    }, stream=True, timeout=300)

    resp.raise_for_status()
    out = []
    for line in resp.iter_lines():
        if not line:
            continue
        try:
            data = json.loads(line.decode("utf-8"))
            if "response" in data:
                out.append(data["response"])
        except Exception:
            continue
    return "".join(out).strip()
