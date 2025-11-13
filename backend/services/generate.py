from typing import List, Dict
import re
from backend.services.extract import read_document_text
from backend.services.llm import ollama_generate
import os

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

SYSTEM_HINT = (
    "You are a precise and helpful assistant that writes clear multiple-choice questions (MCQs) "
    "based STRICTLY on the provided source text. Avoid trivia; focus on key ideas. "
    "Each question must have exactly 4 options, with ONLY ONE correct answer. "
    "Do NOT add introductions, summaries, or any text outside the required format. "
    "Return exactly N questions FOLLOWING THE EXAMPLE FORMAT BELOW — nothing else."
)

PROMPT_TEMPLATE = """
{system_hint}

Source (trimmed):
\"\"\"
{source}
\"\"\"

You MUST return exactly {n} MCQs following the format below.
Each question must strictly match the structure and spacing shown in this EXAMPLE — no numbering, no bullets, no extra text.

Example format (follow this EXACTLY):

Q: What is the capital of France?
A) Berlin
B) Madrid
C) Paris
D) Rome
Answer: C
Explanation: Paris is the capital city of France.

---

Now write exactly {n} MCQs in the above format based only on the given source.
IMPORTANT INSTRUCTIONS:
- Start every question with "Q:" (not "Question:" or any numbering).
- Each question must have exactly 4 options labeled A), B), C), D).
- "Answer:" must be followed by exactly one letter (A/B/C/D) on its own line.
- "Explanation:" must start on a NEW line after "Answer:" It should be one or two concise sentence explaining why that answer is correct.
- Do NOT include any additional commentary, titles, or text before or after the questions.
"""

def parse_mcqs(raw: str) -> List[Dict]:
    # naive parser for the specified format
    blocks = re.split(r"\n\s*Q:\s*", raw)
    out = []
    for blk in blocks:
        blk = blk.strip()
        if not blk:
            continue
        # Put back "Q:" for consistency
        q_text = "Q: " + blk

        # Extract parts
        q_match = re.search(r"Q:\s*(.+?)\nA\)", q_text, re.S)
        if not q_match:
            # maybe it starts exactly as we split
            q_match = re.search(r"^(.*?)(?:\nA\))", q_text, re.S)
        if not q_match:
            continue
        q = q_match.group(1).strip()

        opts = []
        for letter in ["A", "B", "C", "D"]:
            m = re.search(rf"\n{letter}\)\s*(.+?)(?=\n[A-D]\)|\nAnswer:|\Z)", q_text, re.S)
            if m:
                opts.append(m.group(1).strip())
        if len(opts) != 4:
            continue

        ans_m = re.search(r"\nAnswer:\s*([ABCD])", q_text)
        exp_m = re.search(r"\nExplanation:\s*(.+)", q_text)
        if not ans_m:
            continue
        ans_letter = ans_m.group(1)
        explanation = exp_m.group(1).strip() if exp_m else ""

        answer_text = opts[ord(ans_letter) - ord("A")]

        out.append({
            "prompt": q,
            "options": opts,
            "answer": answer_text,
            "explanation": explanation
        })
    return out

def generate_mcqs_from_document(filename: str, n: int = 5, model: str = None) -> List[Dict]:
    model = model or OLLAMA_MODEL
    source = read_document_text(filename, max_chars=8000)
    if not source or len(source.split()) < 40:
        # not enough text; return empty to avoid hallucination
        return []

    prompt = PROMPT_TEMPLATE.format(system_hint=SYSTEM_HINT, source=source, n=n)
    max_retries = 5
    for attempt in range(1, max_retries + 1):
        raw = ollama_generate(model=model, prompt=prompt, temperature=0.2, max_tokens=1200)
        mcqs = parse_mcqs(raw)
        if mcqs:
            return mcqs[:n]

    return []
