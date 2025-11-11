from flask import Blueprint, request, jsonify
from backend.db import get_db
from backend.models import Document, Quiz, Question, Attempt, AttemptAnswer
from backend.services.generate import generate_mcqs_from_document

bp = Blueprint("quizzes", __name__)

@bp.post("/generate")
def generate():
    payload = request.get_json(force=True)
    document_id = payload.get("document_id")
    title = payload.get("title", "Generated Quiz")
    num_questions = int(payload.get("n", 5))

    db = get_db()
    doc = db.query(Document).filter_by(id=document_id).first()
    if not doc:
        return jsonify({"error": "document not found"}), 404

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
    quiz_id = payload["quiz_id"]
    answers = payload["answers"]  # list of {question_id, user_answer}

    db = get_db()
    qs = {q.id: q for q in db.query(Question).filter_by(quiz_id=quiz_id).all()}
    if not qs:
        return jsonify({"error": "quiz not found"}), 404

    att = Attempt(quiz_id=quiz_id)
    db.add(att); db.flush()

    correct = 0
    for a in answers:
        qid = int(a["question_id"])
        ans = str(a["user_answer"]).strip()
        q = qs.get(qid)
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
    att.score_pct = round(100 * correct / max(1, len(answers)))
    db.commit()
    return jsonify({"attempt_id": att.id, "score_pct": att.score_pct})
