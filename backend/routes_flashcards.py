# backend/routes_flashcards.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Document, FlashcardSet, Flashcard
from backend.services.extract import read_document_text
from backend.services.llm import llm_complete
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


def _parse_flashcards(raw: str):
    """
    Expect format like:

    Q: What is X?
    A: X is ...

    ---
    Q: ...
    A: ...

    Returns list of {"front": "...", "back": "..."}.
    """
    parts = [p.strip() for p in raw.split("---") if p.strip()]
    cards = []
    for part in parts:
        lines = [ln.strip() for ln in part.splitlines() if ln.strip()]
        if not lines:
            continue
        q_line = next((ln for ln in lines if ln.lower().startswith("q:")), None)
        a_line = next((ln for ln in lines if ln.lower().startswith("a:")), None)
        if not q_line or not a_line:
            continue
        front = q_line[2:].strip(" :")  # after "Q:"
        back = a_line[2:].strip(" :")   # after "A:"
        if front and back:
            cards.append({"front": front, "back": back})
    return cards


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

    cards = db.query(Flashcard).filter_by(set_id=set_id).order_by(Flashcard.id.asc()).all()
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

    source = read_document_text(doc.filename, max_chars=8000)
    if not source or len(source.split()) < 40:
        return jsonify({"error": "not enough text to generate flashcards"}), 400

    prompt = f"""
You are helping a student study from lecture notes.

Source text:
\"\"\"
{source}
\"\"\"

Create {n} concise flashcards in the following EXACT format.
Each card must be 1-2 short lines on front and 1-3 short lines on back.

For each card:

Q: <front side text>
A: <back side text>

---

Do not include any other text before or after the cards.
Do not number the cards. Just repeat the pattern above {n} times.
"""

    try:
        raw = llm_complete(prompt=prompt, max_tokens=800, temperature=0.25)
    except Exception as e:
        return jsonify({"error": f"flashcard generation failed: {e}"}), 500

    cards = _parse_flashcards(raw)
    if not cards:
        return jsonify({"error": "no valid flashcards parsed from model output"}), 500

    # Create a new set (you can refine the title later if you want)
    s = FlashcardSet(
        document_id=doc.id,
        user_id=getattr(g, "user_id", None),
        title="Auto flashcards",
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
