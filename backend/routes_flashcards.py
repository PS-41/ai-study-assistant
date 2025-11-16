# backend/routes_flashcards.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Document, FlashcardSet, Flashcard
from backend.services.extract import read_document_text
from backend.services.generate import generate_flashcards_from_source
from backend.utils_auth import auth_required

bp = Blueprint("flashcards", __name__)


def _load_doc_for_user(doc_id: int):
    """Fetch a document and enforce ownership/legacy access."""
    db = get_db()
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        return None, ("not found", 404)
    if doc.user_id is not None and doc.user_id != getattr(g, "user_id", None):
        return None, ("forbidden", 403)
    return doc, None


@bp.get("/")
@auth_required
def list_sets():
    """
    GET /api/flashcards?document_id=...
    List flashcard sets for the current user and optional document.
    """
    db = get_db()
    q = db.query(FlashcardSet).filter(
        (FlashcardSet.user_id == g.user_id) | (FlashcardSet.user_id.is_(None))
    )

    document_id = request.args.get("document_id", type=int)
    if document_id is not None:
        q = q.filter(FlashcardSet.document_id == document_id)

    q = q.order_by(FlashcardSet.created_at.desc())

    items = []
    for s in q.all():
        count = db.query(Flashcard).filter_by(set_id=s.id).count()
        items.append({
            "id": s.id,
            "document_id": s.document_id,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "count": count,
        })

    return jsonify({"items": items})


@bp.get("/set/<int:set_id>")
@auth_required
def get_set_cards(set_id):
    """
    GET /api/flashcards/set/<id>
    Get all cards for a set (for review).
    """
    db = get_db()
    s = db.query(FlashcardSet).filter_by(id=set_id).first()
    if not s:
        return jsonify({"error": "set not found"}), 404

    # Ownership check
    if s.user_id is not None and s.user_id != getattr(g, "user_id", None):
        return jsonify({"error": "forbidden"}), 403

    cards = (
        db.query(Flashcard)
        .filter_by(set_id=set_id)
        .order_by(Flashcard.id.asc())
        .all()
    )
    return jsonify({
        "set_id": s.id,
        "title": s.title,
        "document_id": s.document_id,
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
    """
    POST /api/flashcards/generate
    JSON: { "document_id": ..., "n": 12 (optional) }
    """
    payload = request.get_json(force=True)
    document_id = payload.get("document_id")
    if not document_id:
        return jsonify({"error": "document_id is required"}), 400

    n = int(payload.get("n", 12))

    db = get_db()
    doc, err = _load_doc_for_user(int(document_id))
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    source = read_document_text(doc.filename)
    if not source or len(source.split()) < 40:
        return jsonify({"error": "not enough text to generate flashcards"}), 400

    try:
        cards = generate_flashcards_from_source(source, n)
    except Exception as e:
        return jsonify({"error": f"flashcard generation failed: {e}"}), 500

    if not cards:
        return jsonify({"error": "no valid flashcards parsed from model output"}), 500

    # Create a new set with a friendly incremental title (Set 1, Set 2, ...)
    user_id = getattr(g, "user_id", None)
    existing_count = (
        db.query(FlashcardSet)
        .filter(FlashcardSet.document_id == doc.id)
        .filter(FlashcardSet.user_id == user_id)
        .count()
    )
    title = f"Set {existing_count + 1}"

    s = FlashcardSet(
        document_id=doc.id,
        user_id=user_id,
        title=title,
    )
    db.add(s)
    db.flush()  # get s.id

    for c in cards:
        db.add(Flashcard(set_id=s.id, front=c["front"], back=c["back"]))
    db.commit()

    count = len(cards)
    return jsonify({
        "set_id": s.id,
        "title": s.title,
        "document_id": s.document_id,
        "count": count,
    })
