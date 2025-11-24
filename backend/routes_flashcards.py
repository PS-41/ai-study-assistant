# backend/routes_flashcards.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Document, FlashcardSet, Flashcard
from backend.services.extract import read_document_text
from backend.services.generate import generate_flashcards_from_source
from backend.utils_auth import auth_required

bp = Blueprint("flashcards", __name__)

def _fetch_docs_from_payload(payload):
    """
    Helper to resolve a list of documents from the request payload.
    """
    db = get_db()
    
    # 1. Direct ID (Legacy/Single)
    if payload.get("document_id"):
        doc_id = int(payload["document_id"])
        doc = db.query(Document).filter_by(id=doc_id).first()
        if not doc:
            return [], ("document not found", 404)
        if doc.user_id is not None and doc.user_id != g.user_id:
            return [], ("forbidden", 403)
        return [doc], None

    # 2. List of IDs (Multi-select)
    if payload.get("document_ids"):
        ids = payload["document_ids"]
        if not isinstance(ids, list):
            return [], ("document_ids must be a list", 400)
        
        docs = db.query(Document).filter(Document.id.in_(ids)).all()
        valid_docs = [d for d in docs if d.user_id is None or d.user_id == g.user_id]
        
        if not valid_docs:
            return [], ("no valid documents found", 404)
        return valid_docs, None

    # 3. By Course
    if payload.get("course_id"):
        cid = int(payload["course_id"])
        docs = db.query(Document).filter_by(course_id=cid).filter(
            (Document.user_id == g.user_id) | (Document.user_id.is_(None))
        ).all()
        if not docs:
            return [], ("no documents found in this course", 404)
        return docs, None

    # 4. By Topic
    if payload.get("topic_id"):
        tid = int(payload["topic_id"])
        docs = db.query(Document).filter_by(topic_id=tid).filter(
            (Document.user_id == g.user_id) | (Document.user_id.is_(None))
        ).all()
        if not docs:
            return [], ("no documents found in this topic", 404)
        return docs, None

    return [], ("no document selection provided", 400)


@bp.get("/")
@auth_required
def list_sets():
    """
    List all flashcard sets visible to the user.
    Optional filter: ?document_id=... (to see sets that include this specific doc)
    """
    db = get_db()
    
    # Base query: Sets linked to docs owned by user (or set owned by user)
    # Since we removed user_id from FlashcardSet in the previous model step (wait, did we?),
    # actually checking the model provided in Step 1: 
    # "user_id = Column(Integer, ForeignKey("users.id"), nullable=True)" <-- It IS there.
    # So we can just filter by set owner.
    
    q = db.query(FlashcardSet).filter_by(user_id=g.user_id)

    # Optional filter: show sets that *contain* this document
    document_id = request.args.get("document_id", type=int)
    if document_id is not None:
        q = q.filter(FlashcardSet.sources.any(Document.id == document_id))

    q = q.order_by(FlashcardSet.created_at.desc())

    items = []
    for s in q.all():
        count = db.query(Flashcard).filter_by(set_id=s.id).count()
        sources_data = [{"id": d.id, "original_name": d.original_name} for d in s.sources]

        items.append({
            "id": s.id,
            "title": s.title,
            "sources": sources_data,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "count": count,
        })

    return jsonify({"items": items})


@bp.get("/set/<int:set_id>")
@auth_required
def get_set_cards(set_id):
    db = get_db()
    s = db.query(FlashcardSet).filter_by(id=set_id).first()
    if not s:
        return jsonify({"error": "set not found"}), 404

    # Ownership check
    if s.user_id is not None and s.user_id != g.user_id:
        return jsonify({"error": "forbidden"}), 403

    cards = (
        db.query(Flashcard)
        .filter_by(set_id=set_id)
        .order_by(Flashcard.id.asc())
        .all()
    )
    
    source_names = [d.original_name for d in s.sources]

    return jsonify({
        "set_id": s.id,
        "title": s.title,
        "sources": source_names,
        "cards": [
            {
                "id": c.id,
                "front": c.front,
                "back": c.back,
            } for c in cards
        ],
    })


@bp.post("/generate")
@auth_required
def generate_set():
    payload = request.get_json(force=True)
    n = int(payload.get("n", 12))
    title = payload.get("title", "Generated Flashcards")

    db = get_db()
    
    # 1. Resolve docs
    docs, err = _fetch_docs_from_payload(payload)
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    # 2. Combine text
    full_text_parts = []
    for doc in docs:
        text = read_document_text(doc.filename)
        if text:
            full_text_parts.append(f"--- Source: {doc.original_name} ---\n{text}")
    combined = "\n\n".join(full_text_parts)

    if not combined or len(combined.split()) < 50:
        return jsonify({"error": "not enough text to generate flashcards"}), 400

    # 3. Generate
    try:
        cards_data = generate_flashcards_from_source(combined, n)
    except Exception as e:
        return jsonify({"error": f"flashcard generation failed: {e}"}), 500

    if not cards_data:
        return jsonify({"error": "no valid flashcards parsed from model output"}), 500

    # 4. Save
    s = FlashcardSet(
        user_id=g.user_id,
        title=title,
    )
    db.add(s)
    db.flush()

    # Link docs
    s.sources.extend(docs)

    # Add cards
    for c in cards_data:
        db.add(Flashcard(set_id=s.id, front=c["front"], back=c["back"]))
    
    db.commit()

    return jsonify({
        "set_id": s.id,
        "title": s.title,
        "count": len(cards_data),
    })

@bp.put("/set/<int:set_id>")
@auth_required
def rename_set(set_id):
    db = get_db()
    s = db.query(FlashcardSet).filter_by(id=set_id).first()
    if not s or (s.user_id and s.user_id != g.user_id):
        return jsonify({"error": "forbidden"}), 403
    
    data = request.get_json()
    if "title" in data:
        s.title = data["title"].strip()
        db.commit()
    return jsonify({"ok": True})

@bp.delete("/set/<int:set_id>")
@auth_required
def delete_set(set_id):
    db = get_db()
    s = db.query(FlashcardSet).filter_by(id=set_id).first()
    if not s or (s.user_id and s.user_id != g.user_id):
        return jsonify({"error": "forbidden"}), 403

    db.delete(s) # Cascades to cards
    db.commit()
    return jsonify({"ok": True})