from typing import List, Dict
import re
from backend.services.extract import read_document_text
from backend.services.llm import ollama_generate

SYSTEM_HINT = (
    "You are a helpful assistant that writes clear multiple-choice questions (MCQs) "
    "based strictly on the provided source text. Avoid trivia; focus on key ideas. "
    "Each question must have exactly 4 options, with only one correct answer. "
    "Return exactly N questions in the specified output format."
)

PROMPT_TEMPLATE = """
{system_hint}

Source (trimmed):
\"\"\"
{source}
\"\"\"

Write exactly {n} MCQs. Use this format for each question:

Q: <question text>
A) <option 1>
B) <option 2>
C) <option 3>
D) <option 4>
Answer: <A|B|C|D>
Explanation: <one sentence why the answer is correct>
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

def generate_mcqs_from_document(filename: str, n: int = 5, model: str = "llama3.2:3b") -> List[Dict]:
    source = read_document_text(filename, max_chars=8000)
    if not source or len(source.split()) < 40:
        # not enough text; return empty to avoid hallucination
        return []

    prompt = PROMPT_TEMPLATE.format(system_hint=SYSTEM_HINT, source=source, n=n)
    raw = ollama_generate(model=model, prompt=prompt, temperature=0.2, max_tokens=1200)
    mcqs = parse_mcqs(raw)
    # Keep exactly n if more were parsed
    return mcqs[:n]
