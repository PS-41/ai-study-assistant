# backend/routes_quizzes.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Document, Quiz, Question, Attempt, AttemptAnswer
from backend.services.generate import generate_mcqs_from_source
from backend.services.extract import read_document_text
from backend.utils_auth import auth_required
import os

bp = Blueprint("quizzes", __name__)

def _fetch_docs_from_payload(payload):
    db = get_db()
    print(f"[DEBUG] Fetching docs for payload keys: {list(payload.keys())}")

    if payload.get("document_id"):
        print(f"[DEBUG] Single doc ID: {payload['document_id']}")
        doc_id = int(payload["document_id"])
        doc = db.query(Document).filter_by(id=doc_id).first()
        if not doc: return [], ("document not found", 404)
        if doc.user_id is not None and doc.user_id != g.user_id: return [], ("forbidden", 403)
        return [doc], None

    if payload.get("document_ids"):
        print(f"[DEBUG] Multiple doc IDs: {payload['document_ids']}")
        ids = payload["document_ids"]
        docs = db.query(Document).filter(Document.id.in_(ids)).all()
        valid_docs = [d for d in docs if d.user_id is None or d.user_id == g.user_id]
        return valid_docs, None

    if payload.get("course_id"):
        print(f"[DEBUG] Course ID: {payload['course_id']}")
        cid = int(payload["course_id"])
        docs = db.query(Document).filter_by(course_id=cid).filter(
            (Document.user_id == g.user_id) | (Document.user_id.is_(None))
        ).all()
        return docs, None

    if payload.get("topic_id"):
        print(f"[DEBUG] Topic ID: {payload['topic_id']}")
        tid = int(payload["topic_id"])
        docs = db.query(Document).filter_by(topic_id=tid).filter(
            (Document.user_id == g.user_id) | (Document.user_id.is_(None))
        ).all()
        return docs, None

    print("[DEBUG] No valid selection found in payload")
    return [], ("no document selection provided", 400)


@bp.post("/generate")
@auth_required
def generate():
    try:
        payload = request.get_json(force=True)
        print(f"\n--- [DEBUG] START QUIZ GENERATION ---")
        print(f"[DEBUG] Payload: {payload}")

        title = payload.get("title", "Generated Quiz")
        num_questions = int(payload.get("n", 5))

        db = get_db()
        
        # 1. Resolve documents
        docs, err = _fetch_docs_from_payload(payload)
        if err:
            print(f"[DEBUG] Error resolving docs: {err}")
            msg, code = err
            return jsonify({"error": msg}), code
        
        print(f"[DEBUG] Found {len(docs)} documents: {[d.original_name for d in docs]}")

        # 2. Extract and Combine Text
        full_text_parts = []
        for doc in docs:
            print(f"[DEBUG] Reading text for: {doc.filename}")
            text = read_document_text(doc.filename)
            if text:
                full_text_parts.append(f"--- Source: {doc.original_name} ---\n{text}")
            else:
                print(f"[DEBUG] WARNING: No text extracted for {doc.filename}")
        
        combined_text = "\n\n".join(full_text_parts)
        word_count = len(combined_text.split())
        print(f"[DEBUG] Combined text length: {len(combined_text)} chars, ~{word_count} words")

        if not combined_text or word_count < 50:
            print("[DEBUG] Error: Not enough text")
            return jsonify({"error": "not enough text in selected documents"}), 400

        # 3. Generate
        print(f"[DEBUG] Calling LLM generation for {num_questions} questions...")
        mcqs = generate_mcqs_from_source(combined_text, n=num_questions)
        print(f"[DEBUG] LLM returned {len(mcqs)} MCQs")

        if not mcqs:
            print("[DEBUG] Error: No MCQs parsed")
            return jsonify({"error": "failed to generate questions from text"}), 400

        # 4. Save to DB
        quiz = Quiz(title=title)
        db.add(quiz)
        db.flush()

        quiz.sources.extend(docs)

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
        print(f"[DEBUG] Quiz saved with ID: {quiz.id}")
        return jsonify({"quiz_id": quiz.id, "count": len(mcqs)})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@bp.get("/<int:quiz_id>")
@auth_required
def get_quiz(quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id).first()
    if not quiz:
        return jsonify({"error": "quiz not found"}), 404
    
    if quiz.sources:
        first_doc = quiz.sources[0]
        if first_doc.user_id is not None and first_doc.user_id != g.user_id:
             return jsonify({"error": "forbidden"}), 403

    qs = db.query(Question).filter_by(quiz_id=quiz_id).all()
    source_names = [d.original_name for d in quiz.sources]

    return jsonify({
        "quiz_id": quiz_id,
        "title": quiz.title,
        "sources": source_names,
        "questions": [{
            "id": q.id,
            "type": q.qtype,
            "prompt": q.prompt,
            "options": q.options.split("|||"),
            "answer": q.answer,
            "explanation": q.explanation or ""
        } for q in qs]
    })

@bp.post("/attempt")
@auth_required
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
    details = []

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
        "details": details
    })

@bp.get("/mine")
@auth_required
def my_quizzes():
    db = get_db()
    q = (
        db.query(Quiz)
        .join(Quiz.sources)
        .filter((Document.user_id == g.user_id) | (Document.user_id.is_(None)))
        .distinct()
    )

    document_id = request.args.get("document_id", type=int)
    if document_id is not None:
        q = q.filter(Document.id == document_id)

    q = q.order_by(Quiz.created_at.desc()).limit(100)

    items = []
    for quiz in q.all():
        cnt = db.query(Attempt).filter_by(quiz_id=quiz.id).count()
        sources_data = [{"id": d.id, "original_name": d.original_name} for d in quiz.sources]
        items.append({
            "quiz_id": quiz.id,
            "title": quiz.title,
            "sources": sources_data,  # <--- CHANGED
            "created_at": quiz.created_at.isoformat(),
            "attempts": cnt
        })
    return jsonify({"items": items})

@bp.get("/<int:quiz_id>/attempts")
@auth_required
def quiz_attempts(quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id).first()
    if not quiz:
        return jsonify({"error":"not found"}), 404
    
    if quiz.sources:
        first_doc = quiz.sources[0]
        if first_doc.user_id is not None and first_doc.user_id != g.user_id:
            return jsonify({"error":"forbidden"}), 403

    atts = db.query(Attempt).filter_by(quiz_id=quiz_id).order_by(Attempt.created_at.desc()).limit(50)
    return jsonify({
        "items": [{
            "id": a.id,
            "score_pct": a.score_pct,
            "created_at": a.created_at.isoformat()
        } for a in atts.all()]
    })

@bp.get("/<int:quiz_id>/attempts/<int:attempt_id>")
@auth_required
def attempt_detail(quiz_id, attempt_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id).first()
    if not quiz:
        return jsonify({"error": "quiz not found"}), 404
        
    if quiz.sources:
        first_doc = quiz.sources[0]
        if first_doc.user_id is not None and first_doc.user_id != g.user_id:
            return jsonify({"error":"forbidden"}), 403

    att = db.query(Attempt).filter_by(id=attempt_id, quiz_id=quiz_id).first()
    if not att:
        return jsonify({"error": "attempt not found"}), 404

    questions = db.query(Question).filter_by(quiz_id=quiz_id).all()
    q_by_id = {q.id: q for q in questions}

    ans_rows = db.query(AttemptAnswer).filter_by(attempt_id=attempt_id).all()

    items = []
    for ar in ans_rows:
        q = q_by_id.get(ar.question_id)
        if not q:
            continue
        opts = q.options.split("|||")
        items.append({
            "question_id": q.id,
            "prompt": q.prompt,
            "options": opts,
            "correct_answer": q.answer,
            "explanation": q.explanation or "",
            "user_answer": ar.user_answer,
            "is_correct": ar.is_correct,
        })

    return jsonify({
        "quiz_id": quiz_id,
        "attempt_id": att.id,
        "score_pct": att.score_pct,
        "created_at": att.created_at.isoformat() if att.created_at else None,
        "answers": items,
    })


@bp.get("/<int:quiz_id>/answers")
@auth_required
def quiz_answers(quiz_id):
    db = get_db()
    quiz = db.query(Quiz).filter_by(id=quiz_id).first()
    if not quiz:
        return jsonify({"error": "not found"}), 404

    if quiz.sources:
        first_doc = quiz.sources[0]
        if first_doc.user_id is not None and first_doc.user_id != g.user_id:
            return jsonify({"error":"forbidden"}), 403

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

@bp.put("/<int:quiz_id>")
@auth_required
def rename_quiz(quiz_id):
    db = get_db()
    # Ownership check via sources logic is tricky for updates, 
    # usually we'd store user_id on quiz. 
    # But assuming standard logic:
    q = db.query(Quiz).filter_by(id=quiz_id).first()
    if not q: return jsonify({"error": "not found"}), 404
    
    # Simple ownership check: if user owns ANY source doc, they can rename
    # OR we rely on the fact that they found it in "mine" list.
    # Ideally, add user_id to Quiz model for strict ownership, 
    # but sticking to current logic:
    if q.sources:
        if q.sources[0].user_id != g.user_id and q.sources[0].user_id is not None:
             return jsonify({"error": "forbidden"}), 403

    data = request.get_json()
    if "title" in data:
        q.title = data["title"].strip()
        db.commit()
    return jsonify({"ok": True})

@bp.delete("/<int:quiz_id>")
@auth_required
def delete_quiz(quiz_id):
    db = get_db()
    q = db.query(Quiz).filter_by(id=quiz_id).first()
    if not q: return jsonify({"error": "not found"}), 404
    
    # Strict ownership check would go here
    
    db.delete(q) # Cascades to Questions/Attempts
    db.commit()
    return jsonify({"ok": True})