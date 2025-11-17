# backend/routes_topics.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Course, Topic
from backend.utils_auth import auth_required

bp = Blueprint("topics", __name__)

def _load_course_for_user(course_id: int):
    db = get_db()
    c = db.query(Course).filter_by(id=course_id).first()
    if not c:
        return None, ("course not found", 404)
    if c.user_id != g.user_id:
        return None, ("forbidden", 403)
    return c, None

@bp.post("")
@auth_required
def create_topic():
    """
    POST /api/topics
    JSON: { "course_id": ..., "name": "...", "description": "..." }
    """
    payload = request.get_json(force=True)
    course_id = payload.get("course_id")
    name = (payload.get("name") or "").strip()
    description = (payload.get("description") or "").strip()

    if not course_id:
        return jsonify({"error": "course_id is required"}), 400
    if not name:
        return jsonify({"error": "name is required"}), 400

    course_id = int(course_id)
    _, err = _load_course_for_user(course_id)
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    db = get_db()
    t = Topic(
        user_id=g.user_id,
        course_id=course_id,
        name=name,
        description=description or None,
    )
    db.add(t)
    db.commit()

    return jsonify({
        "id": t.id,
        "course_id": t.course_id,
        "name": t.name,
        "description": t.description,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }), 201


@bp.get("/by_course/<int:course_id>")
@auth_required
def topics_by_course(course_id):
    """
    GET /api/topics/by_course/<course_id>
    List topics for a given course (owned by current user).
    """
    db = get_db()
    course, err = _load_course_for_user(course_id)
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    q = (
        db.query(Topic)
        .filter(Topic.user_id == g.user_id, Topic.course_id == course.id)
        .order_by(Topic.created_at.asc())
    )

    items = []
    for t in q.all():
        items.append({
            "id": t.id,
            "course_id": t.course_id,
            "name": t.name,
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return jsonify({"items": items})
