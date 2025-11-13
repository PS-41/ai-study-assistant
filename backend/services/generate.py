from typing import List, Dict
import re
from backend.services.extract import read_document_text
from backend.services.llm import ollama_generate
import os
import time

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

SYSTEM_HINT = (
    "You are a precise and helpful assistant that writes clear multiple-choice questions (MCQs) "
    "based STRICTLY on the provided source text and concepts present in the source text. Avoid trivia; focus on key ideas. "
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

You MUST return exactly {n} MCQs with Answer and Explanation, FOLLOWING the FORMAT below.
Each question must strictly match the structure and spacing shown in this EXAMPLE — no numbering, no bullets, no extra text.

Example format (follow this format EXACTLY but use the material from the source text to generate questions):

Q: What is the capital of France?
A) Berlin
B) Madrid
C) Paris
D) Rome
Answer: C
Explanation: Paris is the capital city of France.

---

Now write exactly {n} MCQs in the above format based only on the given source.
IMPORTANT INSTRUCTIONS (must follow):
- Start every question with "Q:" (not "Question:" or any numbering).
- Each question must have exactly 4 options labeled A), B), C), D).
- "Answer:" must be followed by exactly one letter (A/B/C/D) on its own line.
- "Explanation:" must start on a NEW line after "Answer:". Explanation should be one or two concise sentence explaining why that answer is correct.
- Do NOT include any additional commentary, titles, or text before or after the questions.
- Do NOT use the question shown in the example, it is only to show you the format.
"""

_Q_BLOCK = re.compile(
    r"""
    Q:\s*(?P<prompt>.+?)\s*          # question text
    \n+\s*A\)\s*(?P<A>.+?)\s*        # option A
    \n+\s*B\)\s*(?P<B>.+?)\s*        # option B
    \n+\s*C\)\s*(?P<C>.+?)\s*        # option C
    \n+\s*D\)\s*(?P<D>.+?)\s*        # option D
    \n+\s*Answer:\s*(?P<ans>[ABCD])  # Answer letter
    (?:\n+\s*Explanation:\s*(?P<exp>.+?))?   # optional Explanation
    (?=(?:\n+---|\n+Q:|\Z))          # stop at --- or next Q: or end
    """,
    re.IGNORECASE | re.DOTALL | re.VERBOSE,
)

def parse_mcqs(raw: str) -> List[Dict]:
    """
    Robustly parse MCQs in the exact format we requested.
    - Tolerates CRLF or LF
    - Supports multiline explanations (until next '---' or end)
    - Ignores extra whitespace lines
    """
    if not raw:
        return []
    # Normalize endings/whitespace
    text = raw.strip()

    out: List[Dict] = []
    for m in _Q_BLOCK.finditer(text):
        q = m.group("prompt").strip()
        opts = [m.group("A").strip(), m.group("B").strip(), m.group("C").strip(), m.group("D").strip()]
        ans_letter = m.group("ans").strip().upper()
        explanation = re.sub(r"\s+\Z", "", m.group("exp").strip())

        if len(opts) != 4 or ans_letter not in ("A", "B", "C", "D"):
            continue
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

    # Keep source short enough for small models, but with enough signal
    source = read_document_text(filename, max_chars=8000)
    if not source or len(source.split()) < 40:
        return []  # not enough content — avoid hallucination

    prompt = PROMPT_TEMPLATE.format(system_hint=SYSTEM_HINT, source=source, n=n)

    max_retries = 5
    # Exponential backoff: 0s, 1s, 2s, 4s, 8s
    for attempt in range(1, max_retries + 1):
        try:
            # Optional: add stop sequences to reduce trailing chatter
            raw = ollama_generate(
                model=model,
                prompt=prompt,
                temperature=0.2,
                max_tokens=1200
            )
        except Exception as e:
            if attempt == max_retries:
                # log/raise in logger if we have one
                return []
            time.sleep(2 ** (attempt - 1))
            continue

        mcqs = parse_mcqs(raw)
        if mcqs:
            return mcqs[:n]

        # If parsing failed, backoff and retry. Log last raw only on final failure.
        if attempt == max_retries:
            # Can optionally persist `raw` to /tmp or DB for debugging.
            # with open("/tmp/last_bad_mcq.txt","w") as fh: fh.write(raw)
            return []
        time.sleep(2 ** (attempt - 1))

    return []
