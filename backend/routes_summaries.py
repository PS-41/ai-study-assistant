# backend/routes_summaries.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Document, Summary
from backend.services.extract import read_document_text
from backend.services.llm import llm_complete
from backend.utils_auth import auth_required

bp = Blueprint("summaries", __name__)

def _load_doc_for_user(doc_id: int):
    """Fetch a document and enforce ownership/legacy access."""
    db = get_db()
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        return None, ("not found", 404)
    # Allow if owned or legacy (NULL user)
    if doc.user_id is not None and doc.user_id != getattr(g, "user_id", None):
        return None, ("forbidden", 403)
    return doc, None

@bp.get("/<int:document_id>")
@auth_required
def get_summary(document_id):
    db = get_db()
    doc, err = _load_doc_for_user(document_id)
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    s = db.query(Summary).filter_by(document_id=document_id).first()
    if not s:
        return jsonify({"error": "no summary yet"}), 404

    return jsonify({
        "document_id": s.document_id,
        "summary": s.content,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    })

@bp.post("/generate")
@auth_required
def generate_summary():
    payload = request.get_json(force=True)
    document_id = payload.get("document_id")
    if not document_id:
        return jsonify({"error": "document_id is required"}), 400

    db = get_db()
    doc, err = _load_doc_for_user(int(document_id))
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    # Read document text
    source = read_document_text(doc.filename, max_chars=8000)
    if not source or len(source.split()) < 40:
        return jsonify({"error": "not enough text to summarize"}), 400

    # Prompt for the LLM (works with both Ollama/OpenRouter)
    prompt = f"""
You are helping a student study from lecture materials.

Source text:
\"\"\"
{source}
\"\"\"

Write a concise summary for this document suitable for quick revision:
- 1-2 short paragraphs giving the big picture.
- Then 3-6 bullet points with key ideas or facts.
- Use simple language, no flowery writing.
- Do not mention that you are an AI.
"""

    try:
        text = llm_complete(prompt=prompt, max_tokens=600, temperature=0.25)
    except Exception as e:
        return jsonify({"error": f"summary generation failed: {e}"}), 500

    text = text.strip()
    if not text:
        return jsonify({"error": "summary generation returned empty text"}), 500

    # Upsert: one summary per document_id
    s = db.query(Summary).filter_by(document_id=doc.id).first()
    if s:
        s.content = text
    else:
        s = Summary(
            document_id=doc.id,
            user_id=getattr(g, "user_id", None),
            content=text,
        )
        db.add(s)
    db.commit()

    return jsonify({
        "document_id": s.document_id,
        "summary": s.content,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    })
