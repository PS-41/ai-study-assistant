# backend/files.py
import os
import uuid
from flask import Blueprint, request, jsonify, g, send_file
from werkzeug.utils import secure_filename

from backend.db import get_db
from backend.models import Document, Course, Topic
from backend.utils_auth import auth_required

# Reuse the same upload directory as extraction uses
from backend.services.extract import UPLOAD_DIR

bp = Blueprint("files", __name__)

@bp.post("/upload")
@auth_required
def upload():
    if "file" not in request.files:
        return jsonify({"error": "no file provided"}), 400

    f = request.files["file"]
    if not f or not f.filename:
        return jsonify({"error": "empty file"}), 400

    # Keep original name for UI
    original_name = secure_filename(f.filename)

    # Generate a unique server filename to avoid overwrites
    _, ext = os.path.splitext(original_name)
    unique_name = f"{uuid.uuid4().hex}{ext.lower() or ''}"

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    disk_path = os.path.join(UPLOAD_DIR, unique_name)

    try:
        f.save(disk_path)
        size = os.path.getsize(disk_path)
    except Exception as e:
        return jsonify({"error": f"failed to save file: {e}"}), 500

    db = get_db()
    doc = Document(
        filename=unique_name,          # server filename (unique)
        original_name=original_name,   # human-friendly label
        mime_type=f.mimetype or "application/octet-stream",
        size=size,
    )
    # attach current user if column exists
    try:
        setattr(doc, "user_id", getattr(g, "user_id", None))
    except Exception:
        pass

    db.add(doc)
    db.commit()

    return jsonify({
        "document_id": doc.id,
        "filename": doc.filename,           # unique server name
        "original_name": doc.original_name,
        "mime": doc.mime_type,
        "size": doc.size
    })


@bp.get("/")
def list_recent():
    db = get_db()
    docs = db.query(Document).order_by(Document.created_at.desc()).limit(20).all()
    return jsonify({
        "documents": [
            {
                "id": d.id,
                "filename": d.filename,
                "original_name": d.original_name,
                "mime": d.mime_type,
                "size": d.size
            } for d in docs
        ]
    })


@bp.get("/extract_preview/<int:doc_id>")
def extract_preview(doc_id):
    from backend.services.extract import read_document_text
    db = get_db()
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        return jsonify({"error": "document not found"}), 404
    txt = read_document_text(doc.filename, max_chars=2000)
    return jsonify({"chars": len(txt), "preview": txt[:500]})


@bp.get("/mine")
@auth_required
def my_docs():
    db = get_db()
    q = db.query(Document).filter(
        (Document.user_id == g.user_id) | (Document.user_id.is_(None))
    )
    # NEW: optional filters
    course_id = request.args.get("course_id", type=int)
    topic_id = request.args.get("topic_id", type=int)

    if course_id is not None:
        q = q.filter(Document.course_id == course_id)
    if topic_id is not None:
        q = q.filter(Document.topic_id == topic_id)
    
    q = q.order_by(Document.created_at.desc()).limit(200)

    items = [{
        "id": d.id,
        "original_name": d.original_name,
        "filename": d.filename,
        "mime": d.mime_type,
        "size": d.size,
        "created_at": d.created_at.isoformat(),
        "owned": (d.user_id == g.user_id),
        "course_id": d.course_id,
        "course_name": d.course.name if d.course else None,
        "topic_id": d.topic_id,
        "topic_name": d.topic.name if d.topic else None
    } for d in q.all()]
    return jsonify({"items": items})


# ---------- New helper + serve routes ----------

def _load_doc_for_user(doc_id: int):
    """Fetch a document and enforce ownership/legacy access."""
    db = get_db()
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        return None, ("not found", 404)
    # Allow access if owned or legacy (NULL user)
    user_id = getattr(doc, "user_id", None)
    if user_id is not None and user_id != getattr(g, "user_id", None):
        return None, ("forbidden", 403)
    return doc, None


@bp.get("/view/<int:doc_id>")
@auth_required
def view_inline(doc_id):
    doc, err = _load_doc_for_user(doc_id)
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    path = os.path.join(UPLOAD_DIR, doc.filename)
    if not os.path.exists(path):
        return jsonify({"error": "file missing on server. please re-upload."}), 410

    # Serve inline with original filename
    return send_file(
        path,
        mimetype=doc.mime_type or "application/pdf",
        as_attachment=False,
        download_name=doc.original_name or "file.pdf"
    )


@bp.get("/download/<int:doc_id>")
@auth_required
def download_file(doc_id):
    doc, err = _load_doc_for_user(doc_id)
    if err:
        msg, code = err
        return jsonify({"error": msg}), code

    path = os.path.join(UPLOAD_DIR, doc.filename)
    if not os.path.exists(path):
        return jsonify({"error": "file missing on server. please re-upload."}), 410

    # Force download with original filename
    return send_file(
        path,
        mimetype=doc.mime_type or "application/octet-stream",
        as_attachment=True,
        download_name=doc.original_name or "file"
    )

@bp.post("/<int:doc_id>/assign")
@auth_required
def assign_document(doc_id: int):
    """
    Assign a document to a course and/or topic.

    JSON body:
      {
        "course_id": <int or null>,
        "topic_id": <int or null>
      }

    Rules:
    - document must belong to current user (or legacy NULL-user if you still allow that).
    - if course_id is not null, it must belong to the current user.
    - if topic_id is not null, it must belong to that course.
    """
    db = get_db()

    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        return jsonify({"error": "document not found"}), 404

    # Ownership check (similar to other places)
    if doc.user_id is not None and doc.user_id != g.user_id:
        return jsonify({"error": "forbidden"}), 403

    payload = request.get_json(force=True)
    course_id = payload.get("course_id")
    topic_id = payload.get("topic_id")

    course = None
    topic = None

    # Validate course if provided
    if course_id is not None:
        course = (
            db.query(Course)
            .filter_by(id=int(course_id), user_id=g.user_id)
            .first()
        )
        if not course:
            return jsonify({"error": "course not found or not yours"}), 400

    # Validate topic if provided
    if topic_id is not None:
        topic = db.query(Topic).filter_by(id=int(topic_id)).first()
        if not topic:
            return jsonify({"error": "topic not found"}), 400
        if course and topic.course_id != course.id:
            return jsonify({"error": "topic does not belong to course"}), 400
        # If course not explicitly passed but topic is, infer course
        if course is None:
            course = db.query(Course).filter_by(id=topic.course_id, user_id=g.user_id).first()
            if not course:
                return jsonify({"error": "topic's course does not belong to you"}), 400

    # Apply assignment (nullable is allowed)
    doc.course_id = course.id if course else None if course_id is None else doc.course_id
    doc.topic_id = topic.id if topic else None if topic_id is None else doc.topic_id

    db.commit()

    return jsonify({
        "id": doc.id,
        "course_id": doc.course_id,
        "topic_id": doc.topic_id,
    })
