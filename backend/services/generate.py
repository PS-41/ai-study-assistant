# backend/services/generate.py
from typing import List, Dict
import re
import os
import time

from backend.services.llm import llm_complete

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
MAX_CHARS_HARD_LIMIT = 75_000  # ~25k tokens; safe for most 32k-context models

# ============================
# MCQ GENERATION
# ============================

SYSTEM_HINT = (
    "You are a precise and helpful assistant that writes clear multiple-choice questions (MCQs) "
    "based STRICTLY on the provided source text and concepts present in the source text. Avoid trivia; focus on key ideas. "
    "READ the entire source text, it can contain different source, CONSIDER and INCLUDE everything till the end. "
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
- USE each source text content without missing anything
"""

_Q_BLOCK = re.compile(
    r"""
    Q:\s*(?P<prompt>.+?)\s* # question text
    \n+\s*A\)\s*(?P<A>.+?)\s* # option A
    \n+\s*B\)\s*(?P<B>.+?)\s* # option B
    \n+\s*C\)\s*(?P<C>.+?)\s* # option C
    \n+\s*D\)\s*(?P<D>.+?)\s* # option D
    \n+\s*Answer:\s*(?P<ans>[ABCD])  # Answer letter
    (?:\n+\s*Explanation:\s*(?P<exp>.+?))?   # optional Explanation
    (?=(?:\n+---|\n+Q:|\Z))          # stop at --- or next Q: or end
    """,
    re.IGNORECASE | re.DOTALL | re.VERBOSE,
)

def parse_mcqs(raw: str) -> List[Dict]:
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


def generate_mcqs_from_source(source: str, n: int = 5) -> List[Dict]:
    if not source or len(source.split()) < 40:
        return []

    # Enforce per-call OR hard limit
    if len(source) > MAX_CHARS_HARD_LIMIT:
        # Keep both beginning and end for context
        half = MAX_CHARS_HARD_LIMIT // 2
        source = source[:half] + "\n\n[... trimmed for length ...]\n\n" + source[-half:]

    prompt = PROMPT_TEMPLATE.format(system_hint=SYSTEM_HINT, source=source, n=n)

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            raw = llm_complete(
                prompt=prompt,
                temperature=0.2,
                max_tokens=3000,
            )
        except Exception as e:
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

# ... (Keep Flashcard/Summary functions as they were, or add similar debugs if you like) ...
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

_FLASHCARD_BLOCK = re.compile(
    r"Q:\s*(.+?)\s*A:\s*(.+?)(?=\nQ:|\Z)",
    re.IGNORECASE | re.DOTALL,
)

def parse_flashcards(raw: str) -> List[Dict[str, str]]:
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
    # Enforce per-call OR hard limit
    if len(source) > MAX_CHARS_HARD_LIMIT:
        # Keep both beginning and end for context
        half = MAX_CHARS_HARD_LIMIT // 2
        source = source[:half] + "\n\n[... trimmed for length ...]\n\n" + source[-half:]
    prompt = FLASHCARD_PROMPT_TEMPLATE.format(source=source, n=n)
    raw = llm_complete(prompt=prompt, max_tokens=2000, temperature=0.25)
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

Write a summary for this content.
{style_instruction}

- Use simple language, no flowery writing.
- Do not mention that you are an AI.
"""

def generate_summary_from_source(source: str, detail_level: str = "brief") -> str:
    # Enforce per-call OR hard limit
    if len(source) > MAX_CHARS_HARD_LIMIT:
        # Keep both beginning and end for context
        half = MAX_CHARS_HARD_LIMIT // 2
        source = source[:half] + "\n\n[... trimmed for length ...]\n\n" + source[-half:]
    style_instruction = ""
    max_tokens = 800
    
    if detail_level == "detailed":
        style_instruction = "Write a detailed comprehensive summary with multiple sections and bullet points."
        max_tokens = 5000
    else:
        style_instruction = "Write a concise summary with 1-2 paragraphs and a few key bullet points."
        max_tokens = 2000

    prompt = SUMMARY_PROMPT_TEMPLATE.format(source=source, style_instruction=style_instruction)
    text = llm_complete(prompt=prompt, max_tokens=max_tokens, temperature=0.25)
    return (text or "").strip()