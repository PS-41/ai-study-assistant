from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Document, Quiz, Question, Attempt, AttemptAnswer
from backend.services.generate import generate_mcqs_from_document
from backend.utils_auth import auth_required

# added per instruction
from backend.services.extract import UPLOAD_DIR
import os

bp = Blueprint("quizzes", __name__)

@bp.post("/generate")
@auth_required
def generate():
    payload = request.get_json(force=True)
    document_id = payload.get("document_id")
    title = payload.get("title", "Generated Quiz")
    num_questions = int(payload.get("n", 5))

    db = get_db()
    doc = db.query(Document).filter_by(id=document_id).first()
    if not doc:
        return jsonify({"error": "document not found"}), 404
    # Enforce ownership (allow legacy NULL-owner docs)
    if getattr(doc, "user_id", None) is not None and doc.user_id != g.user_id:
        return jsonify({"error": "forbidden"}), 403

    # ensure file exists on disk (handles legacy overwritten cases)
    disk_path = os.path.join(UPLOAD_DIR, doc.filename)
    if not os.path.exists(disk_path):
        return jsonify({"error": "The source file is missing on the server. Please re-upload and try again."}), 410

    mcqs = generate_mcqs_from_document(doc.filename, n=num_questions)

    if not mcqs:
        return jsonify({"error": "not enough text to generate questions"}), 400

    quiz = Quiz(document_id=document_id, title=title)
    db.add(quiz); db.flush()

    for m in mcqs:
        opts = "|||".join(m["options"])
        q = Question(
            quiz_id=quiz.id,
            qtype="mcq",
            prompt=m["prompt"],
            options=opts,
            answer=m["answer"],
            explanation=m.get("explanation", "")
        )
        db.add(q)
    db.commit()
    return jsonify({"quiz_id": quiz.id, "count": len(mcqs)})

@bp.get("/<int:quiz_id>")
def get_quiz(quiz_id):
    db = get_db()
    qs = db.query(Question).filter_by(quiz_id=quiz_id).all()
    if not qs:
        return jsonify({"error": "quiz not found"}), 404
    return jsonify({
        "quiz_id": quiz_id,
        "questions": [{
            "id": q.id,
            "type": q.qtype,
            "prompt": q.prompt,
            "options": q.options.split("|||")
        } for q in qs]
    })

@bp.post("/attempt")
def attempt():
    payload = request.get_json(force=True)
    quiz_id = int(payload["quiz_id"])
    answers = payload.get("answers", [])

    db = get_db()
    qs = list(db.query(Question).filter_by(quiz_id=quiz_id).all())
    if not qs:
        return jsonify({"error": "quiz not found"}), 404

    qmap = {q.id: q for q in qs}
    total = len(qs)

    att = Attempt(quiz_id=quiz_id)
    db.add(att); db.flush()

    correct = 0
    details = []  # <-- collect per-question results

    for a in answers:
        qid = int(a.get("question_id"))
        ans = str(a.get("user_answer", "")).strip()
        q = qmap.get(qid)
        if not q:
            continue
        is_ok = (ans == q.answer)
        if is_ok:
            correct += 1
        db.add(AttemptAnswer(
            attempt_id=att.id,
            question_id=qid,
            user_answer=ans,
            is_correct=is_ok
        ))
        details.append({"question_id": qid, "user_answer": ans, "is_correct": is_ok})

    att.score_pct = round(100 * correct / max(1, total))
    db.commit()
    return jsonify({
        "attempt_id": att.id,
        "correct": correct,
        "total": total,
        "score_pct": att.score_pct,
        "details": details  # <-- NEW
    })

@bp.get("/mine")
@auth_required
def my_quizzes():
    db = get_db()

    # Base query: quizzes for docs owned by user (or legacy docs with NULL user_id)
    q = (
        db.query(Quiz, Document)
        .join(Document, Quiz.document_id == Document.id)
        .filter((Document.user_id == g.user_id) | (Document.user_id.is_(None)))
    )

    # Optional filter by document_id (for the Document Details page)
    document_id = request.args.get("document_id", type=int)
    if document_id is not None:
        q = q.filter(Quiz.document_id == document_id)

    q = q.order_by(Quiz.created_at.desc()).limit(100)

    items = []
    for quiz, doc in q.all():
        cnt = db.query(Attempt).filter_by(quiz_id=quiz.id).count()
        items.append({
            "quiz_id": quiz.id,
            "title": quiz.title,
            "document_id": doc.id,
            "document_name": doc.original_name,
            "created_at": quiz.created_at.isoformat(),
            "attempts": cnt
        })
    return jsonify({"items": items})

@bp.get("/<int:quiz_id>/attempts")
@auth_required
def quiz_attempts(quiz_id):
    db = get_db()
    # optional: authorize that the quiz belongs to this user
    from backend.models import Question
    quiz = db.query(Quiz).filter_by(id=quiz_id).first()
    if not quiz:
        return jsonify({"error":"not found"}), 404
    doc = db.query(Document).filter_by(id=quiz.document_id).first()
    if doc and doc.user_id and doc.user_id != g.user_id:
        return jsonify({"error":"forbidden"}), 403

    atts = db.query(Attempt).filter_by(quiz_id=quiz_id).order_by(Attempt.created_at.desc()).limit(50)
    return jsonify({
        "items": [{
            "id": a.id,
            "score_pct": a.score_pct,
            "created_at": a.created_at.isoformat()
        } for a in atts.all()]
    })

@bp.get("/<int:quiz_id>/answers")
@auth_required
def quiz_answers(quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id).first()
    if not quiz:
        return jsonify({"error": "not found"}), 404

    doc = db.query(Document).filter_by(id=quiz.document_id).first()
    if doc and doc.user_id and doc.user_id != g.user_id:
        return jsonify({"error": "forbidden"}), 403

    qs = db.query(Question).filter_by(quiz_id=quiz_id).order_by(Question.id.asc()).all()
    return jsonify({
        "quiz_id": quiz_id,
        "answers": [
            {
                "id": q.id,
                "prompt": q.prompt,
                "options": q.options.split("|||"),
                "answer": q.answer,
                "explanation": q.explanation or ""
            }
            for q in qs
        ]
    })
