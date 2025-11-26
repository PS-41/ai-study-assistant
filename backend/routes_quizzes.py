# backend/routes_quizzes.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Document, Quiz, Question, Attempt, AttemptAnswer
from backend.services.generate import (
    generate_mcqs_from_source, 
    generate_true_false_from_source, 
    generate_short_answer_from_source,
    grade_short_answers
)
from backend.services.extract import read_document_text
from backend.utils_auth import auth_required
import os

bp = Blueprint("quizzes", __name__)

def _fetch_docs_from_payload(payload):
    db = get_db()

    if payload.get("document_id"):
        doc_id = int(payload["document_id"])
        doc = db.query(Document).filter_by(id=doc_id).first()
        if not doc: return [], ("document not found", 404)
        if doc.user_id is not None and doc.user_id != g.user_id: return [], ("forbidden", 403)
        return [doc], None

    if payload.get("document_ids"):
        ids = payload["document_ids"]
        docs = db.query(Document).filter(Document.id.in_(ids)).all()
        valid_docs = [d for d in docs if d.user_id is None or d.user_id == g.user_id]
        return valid_docs, None

    if payload.get("course_id"):
        cid = int(payload["course_id"])
        docs = db.query(Document).filter_by(course_id=cid).filter(
            (Document.user_id == g.user_id) | (Document.user_id.is_(None))
        ).all()
        return docs, None

    if payload.get("topic_id"):
        tid = int(payload["topic_id"])
        docs = db.query(Document).filter_by(topic_id=tid).filter(
            (Document.user_id == g.user_id) | (Document.user_id.is_(None))
        ).all()
        return docs, None

    return [], ("no document selection provided", 400)


@bp.post("/generate")
@auth_required
def generate():
    try:
        payload = request.get_json(force=True)
        title = payload.get("title", "Generated Quiz")
        
        # Config extraction
        n_mcq = int(payload.get("n_mcq", 5))
        include_sa = payload.get("include_short_answer", False)
        n_sa = int(payload.get("n_short_answer", 3)) if include_sa else 0
        include_tf = payload.get("include_true_false", False)
        n_tf = int(payload.get("n_true_false", 3)) if include_tf else 0

        # Fallback compatibility if only 'n' is sent (old frontend)
        if "n" in payload and "n_mcq" not in payload:
            n_mcq = int(payload["n"])

        db = get_db()
        
        # 1. Resolve documents
        docs, err = _fetch_docs_from_payload(payload)
        if err: return jsonify({"error": err[0]}), err[1]

        # 2. Extract Text
        full_text_parts = []
        for doc in docs:
            text = read_document_text(doc.filename)
            if text:
                full_text_parts.append(f"--- Source: {doc.original_name} ---\n{text}")
        combined_text = "\n\n".join(full_text_parts)
        
        if not combined_text or len(combined_text.split()) < 50:
            return jsonify({"error": "not enough text"}), 400

        # 3. Generate Questions in Parallel/Sequence
        all_questions = []

        # A. MCQs
        if n_mcq > 0:
            mcqs = generate_mcqs_from_source(combined_text, n=n_mcq)
            for m in mcqs: m["type"] = "mcq"
            all_questions.extend(mcqs)

        # B. True/False
        if n_tf > 0:
            tfs = generate_true_false_from_source(combined_text, n=n_tf)
            for t in tfs: t["type"] = "true_false"
            all_questions.extend(tfs)

        # C. Short Answer
        if n_sa > 0:
            sas = generate_short_answer_from_source(combined_text, n=n_sa)
            for s in sas: s["type"] = "short_answer"
            all_questions.extend(sas)

        if not all_questions:
            return jsonify({"error": "failed to generate any questions"}), 400

        # 4. Save to DB
        quiz = Quiz(title=title)
        db.add(quiz)
        db.flush()
        quiz.sources.extend(docs)

        for q_data in all_questions:
            # For short answer, options list is empty, join returns ""
            opts_str = "|||".join(q_data["options"]) if q_data["options"] else ""
            
            q = Question(
                quiz_id=quiz.id,
                qtype=q_data["type"],
                prompt=q_data["prompt"],
                options=opts_str,
                answer=q_data["answer"],
                explanation=q_data.get("explanation", "")
            )
            db.add(q)
        
        db.commit()
        return jsonify({"quiz_id": quiz.id, "count": len(all_questions)})

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
    if not qs: return jsonify({"error": "quiz not found"}), 404

    qmap = {q.id: q for q in qs}
    total = len(qs)

    att = Attempt(quiz_id=quiz_id)
    db.add(att); db.flush()

    # Separate logic: Auto-grade vs AI-grade
    to_grade_ai = [] # list of {id, prompt, correct, user}
    
    attempt_answers_objects = [] # To bulk add later or update

    for a in answers:
        qid = int(a.get("question_id"))
        user_ans = str(a.get("user_answer", "")).strip()
        q = qmap.get(qid)
        if not q: continue

        is_correct = False
        
        # Logic based on type
        if q.qtype == "short_answer":
            # Queue for AI grading
            # Create the record as False initially
            aa = AttemptAnswer(attempt_id=att.id, question_id=qid, user_answer=user_ans, is_correct=False)
            db.add(aa); db.flush() # Need ID if we want to update, or just reference obj
            to_grade_ai.append({
                "db_obj": aa,
                "item": {
                    "id": qid, 
                    "prompt": q.prompt, 
                    "correct_answer": q.answer, 
                    "user_answer": user_ans
                }
            })
        else:
            # MCQ or True/False: Exact match (case insensitive for T/F mostly handled by frontend, but safe here)
            if q.qtype == "true_false":
                is_correct = (user_ans.lower() == q.answer.lower())
            else:
                # MCQ: exact string match of option
                is_correct = (user_ans == q.answer)
            
            db.add(AttemptAnswer(attempt_id=att.id, question_id=qid, user_answer=user_ans, is_correct=is_correct))

    # Perform Batch AI Grading
    if to_grade_ai:
        ai_items = [x["item"] for x in to_grade_ai]
        results_map = grade_short_answers(ai_items) # {qid: bool}
        
        for entry in to_grade_ai:
            qid = entry["item"]["id"]
            is_correct = results_map.get(qid, False)
            entry["db_obj"].is_correct = is_correct

    db.commit()

    # Recalculate Score
    # Reload answers to be safe
    final_answers = db.query(AttemptAnswer).filter_by(attempt_id=att.id).all()
    correct_count = sum(1 for a in final_answers if a.is_correct)
    
    att.score_pct = round(100 * correct_count / max(1, total))
    db.commit()

    # Build response details
    details = []
    for ans in final_answers:
        details.append({
            "question_id": ans.question_id,
            "user_answer": ans.user_answer,
            "is_correct": ans.is_correct
        })

    return jsonify({
        "attempt_id": att.id,
        "correct": correct_count,
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