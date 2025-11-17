# backend/routes_courses.py
from flask import Blueprint, request, jsonify, g
from backend.db import get_db
from backend.models import Course
from backend.utils_auth import auth_required

bp = Blueprint("courses", __name__)

@bp.post("")
@auth_required
def create_course():
    """
    POST /api/courses
    JSON: { "name": "...", "description": "..." }
    """
    payload = request.get_json(force=True)
    name = (payload.get("name") or "").strip()
    description = (payload.get("description") or "").strip()

    if not name:
        return jsonify({"error": "name is required"}), 400

    db = get_db()
    c = Course(
        user_id=g.user_id,
        name=name,
        description=description or None,
    )
    db.add(c)
    db.commit()

    return jsonify({
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "created_at": c.created_at.isoformat() if c.created_at else None,
    }), 201


@bp.get("/mine")
@auth_required
def my_courses():
    """
    GET /api/courses/mine
    List all courses owned by the current user.
    """
    db = get_db()
    q = db.query(Course).filter(Course.user_id == g.user_id).order_by(Course.created_at.desc())
    items = []
    for c in q.all():
        items.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return jsonify({"items": items})
