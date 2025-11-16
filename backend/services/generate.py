# backend/services/generate.py
from typing import List, Dict
import re
import os
import time

from backend.services.extract import read_document_text
from backend.services.llm import llm_complete

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")

# ============================
# MCQ GENERATION
# ============================

SYSTEM_HINT = (
    "You are a precise and helpful assistant that writes clear multiple-choice questions (MCQs) "
    "based STRICTLY on the provided source text and concepts present in the source text. Avoid trivia; focus on key ideas. "
    "Each question must have exactly 4 options, with ONLY ONE correct answer. "
    "Do NOT add introductions, summaries, or any text outside the required format. "
    "Return exactly N questions FOLLOWING THE EXAMPLE FORMAT BELOW — nothing else."
)

PROMPT_TEMPLATE = """
{system_hint}

Source text:
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
    text = raw.strip()

    out: List[Dict] = []
    for m in _Q_BLOCK.finditer(text):
        prompt = m.group("prompt").strip()
        opts = [
            m.group("A").strip(),
            m.group("B").strip(),
            m.group("C").strip(),
            m.group("D").strip(),
        ]
        ans_letter = m.group("ans").strip().upper()

        # Explanation may be missing; make this robust
        exp_raw = m.group("exp") or ""
        explanation = re.sub(r"\s+\Z", "", exp_raw).strip() if exp_raw else ""

        if len(opts) != 4 or ans_letter not in ("A", "B", "C", "D"):
            continue

        answer_text = opts[ord(ans_letter) - ord("A")]
        out.append(
            {
                "prompt": prompt,
                "options": opts,
                "answer": answer_text,
                "explanation": explanation,
            }
        )
    return out


def generate_mcqs_from_document(filename: str, n: int = 5, model: str = None) -> List[Dict]:
    # Keep source short enough for small models, but with enough signal
    source = read_document_text(filename)
    if not source or len(source.split()) < 40:
        return []  # not enough content — avoid hallucination

    prompt = PROMPT_TEMPLATE.format(system_hint=SYSTEM_HINT, source=source, n=n)

    max_retries = 5
    # Exponential backoff: 1s, 2s, 4s, 8s, 16s (after failures)
    for attempt in range(1, max_retries + 1):
        try:
            raw = llm_complete(
                prompt=prompt,
                temperature=0.2,
                max_tokens=1200,
            )
        except Exception:
            if attempt == max_retries:
                return []
            time.sleep(2 ** (attempt - 1))
            continue

        mcqs = parse_mcqs(raw)
        if mcqs:
            return mcqs[:n]

        if attempt == max_retries:
            return []
        time.sleep(2 ** (attempt - 1))

    return []

# ============================
# FLASHCARD GENERATION
# ============================

FLASHCARD_PROMPT_TEMPLATE = """
You are helping a student study from lecture notes.

Source text:
\"\"\" 
{source}
\"\"\"

Create {n} concise flashcards in the following EXACT format.
Each card must be 1–2 short lines on the front and 1–3 short lines on the back.

For each card:

Q: <front side text>
A: <back side text>

---

Do not include any other text before or after the cards.
Do not number the cards. Just repeat the pattern above {n} times.
"""

# same pattern as you had in routes_flashcards.py
_FLASHCARD_BLOCK = re.compile(
    r"Q:\s*(.+?)\s*A:\s*(.+?)(?=\nQ:|\Z)",
    re.IGNORECASE | re.DOTALL,
)

def parse_flashcards(raw: str) -> List[Dict[str, str]]:
    """
    Parse multiple flashcards from text in this pattern:

    Q: <front>
    A: <back>

    Q: <front2>
    A: <back2>
    ...
    """
    if not raw:
        return []

    text = raw.replace("\r\n", "\n")
    cards: List[Dict[str, str]] = []

    for m in _FLASHCARD_BLOCK.finditer(text):
        front = m.group(1).strip()
        back = m.group(2).strip()
        if front and back:
            cards.append({"front": front, "back": back})

    return cards


def generate_flashcards_from_source(source: str, n: int = 12) -> List[Dict[str, str]]:
    """
    Given cleaned source text, call the LLM and parse it into a list of flashcards.
    The caller (route) is responsible for checking 'not enough text' and HTTP codes.
    """
    prompt = FLASHCARD_PROMPT_TEMPLATE.format(source=source, n=n)
    raw = llm_complete(prompt=prompt, max_tokens=800, temperature=0.25)
    return parse_flashcards(raw)

# ============================
# SUMMARY GENERATION
# ============================

SUMMARY_PROMPT_TEMPLATE = """
You are helping a student study from lecture materials.

Source text:
\"\"\" 
{source}
\"\"\"

Write a concise summary for this document suitable for quick revision:
- 1–2 short paragraphs giving the big picture.
- Then 3–6 bullet points with key ideas or facts.
- Use simple language, no flowery writing.
- Do not mention that you are an AI.
"""

def generate_summary_from_source(source: str) -> str:
    """
    Given cleaned source text, call the LLM and return a summary string.
    The caller (route) is responsible for checking 'not enough text' and HTTP codes.
    """
    prompt = SUMMARY_PROMPT_TEMPLATE.format(source=source)
    text = llm_complete(prompt=prompt, max_tokens=600, temperature=0.25)
    return (text or "").strip()
