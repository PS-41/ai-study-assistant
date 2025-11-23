# backend/routes_summaries.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Document, Summary
from backend.services.extract import read_document_text
from backend.services.generate import generate_summary_from_source
from backend.utils_auth import auth_required

bp = Blueprint("summaries", __name__)

def _fetch_docs_from_payload(payload):
    # Duplicate helper for self-contained file changes
    db = get_db()
    if payload.get("document_id"):
        doc_id = int(payload["document_id"])
        doc = db.query(Document).filter_by(id=doc_id).first()
        if not doc: return [], ("not found", 404)
        if doc.user_id is not None and doc.user_id != g.user_id: return [], ("forbidden", 403)
        return [doc], None
    if payload.get("document_ids"):
        ids = payload["document_ids"]
        if not isinstance(ids, list): return [], ("ids must be list", 400)
        docs = db.query(Document).filter(Document.id.in_(ids)).all()
        valid = [d for d in docs if d.user_id is None or d.user_id == g.user_id]
        if not valid: return [], ("no valid docs", 404)
        return valid, None
    if payload.get("course_id"):
        cid = int(payload["course_id"])
        docs = db.query(Document).filter_by(course_id=cid).filter((Document.user_id == g.user_id)|(Document.user_id.is_(None))).all()
        if not docs: return [], ("no docs in course", 404)
        return docs, None
    if payload.get("topic_id"):
        tid = int(payload["topic_id"])
        docs = db.query(Document).filter_by(topic_id=tid).filter((Document.user_id == g.user_id)|(Document.user_id.is_(None))).all()
        if not docs: return [], ("no docs in topic", 404)
        return docs, None
    return [], ("no selection", 400)


@bp.get("/")
@auth_required
def list_summaries():
    """List all summaries owned by user."""
    db = get_db()
    q = db.query(Summary).filter_by(user_id=g.user_id)
    
    # Optional: filter by containing doc
    doc_id = request.args.get("document_id", type=int)
    if doc_id:
        q = q.filter(Summary.sources.any(Document.id == doc_id))
        
    q = q.order_by(Summary.created_at.desc())
    
    items = []
    for s in q.all():
        sources_data = [{"id": d.id, "original_name": d.original_name} for d in s.sources]
        items.append({
            "id": s.id,
            "title": s.title or "Untitled Summary",
            "sources": sources_data,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "preview": s.content[:100] + "..." if s.content else ""
        })
    return jsonify({"items": items})


@bp.get("/<int:summary_id>")
@auth_required
def get_summary(summary_id):
    db = get_db()
    s = db.query(Summary).filter_by(id=summary_id).first()
    if not s:
        return jsonify({"error": "summary not found"}), 404
    if s.user_id != g.user_id:
        return jsonify({"error": "forbidden"}), 403

    source_names = [d.original_name for d in s.sources]
    return jsonify({
        "id": s.id,
        "title": s.title,
        "content": s.content,
        "sources": source_names,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    })


@bp.post("/generate")
@auth_required
def generate_summary():
    payload = request.get_json(force=True)
    title = payload.get("title", "Generated Summary")
    
    db = get_db()
    docs, err = _fetch_docs_from_payload(payload)
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    full_text_parts = []
    for doc in docs:
        text = read_document_text(doc.filename)
        if text:
            full_text_parts.append(f"--- Source: {doc.original_name} ---\n{text}")
    combined = "\n\n".join(full_text_parts)

    if not combined or len(combined.split()) < 50:
        return jsonify({"error": "not enough text"}), 400

    try:
        text = generate_summary_from_source(combined)
    except Exception as e:
        return jsonify({"error": f"generation failed: {e}"}), 500

    s = Summary(
        user_id=g.user_id,
        content=text,
        title=title
    )
    db.add(s)
    db.flush()
    s.sources.extend(docs)
    db.commit()

    return jsonify({
        "id": s.id,
        "title": s.title,
        "content": s.content,
    })