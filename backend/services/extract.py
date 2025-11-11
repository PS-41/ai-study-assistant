import os
import pdfplumber
from pptx import Presentation

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "uploads"))

def read_document_text(filename: str, max_chars: int = 8000) -> str:
    """
    Read text from a stored file (PDF or PPTX) and return a trimmed string.
    """
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        return ""

    lower = filename.lower()
    text = ""

    if lower.endswith(".pdf"):
        with pdfplumber.open(path) as pdf:
            parts = []
            for page in pdf.pages[:40]:   # cap pages for speed
                try:
                    parts.append(page.extract_text() or "")
                except Exception:
                    continue
            text = "\n".join(parts)
    elif lower.endswith(".pptx") or lower.endswith(".ppt"):
        prs = Presentation(path)
        parts = []
        for slide in prs.slides[:80]:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    parts.append(shape.text)
        text = "\n".join(parts)
    else:
        # fallback: try to read as text
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception:
            text = ""

    text = " ".join(text.split())  # normalize whitespace
    if len(text) > max_chars:
        text = text[:max_chars]
    return text
