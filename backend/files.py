# backend/files.py
import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from backend.db import get_db
from backend.models import Document

bp = Blueprint("files", __name__)

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "uploads"))

@bp.post("/upload")
def upload():
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "no file"}), 400

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    safe = secure_filename(f.filename)
    dest = os.path.join(UPLOAD_DIR, safe)
    f.save(dest)
    size = os.path.getsize(dest)

    db = get_db()
    doc = Document(filename=safe, original_name=f.filename, mime_type=f.mimetype, size=size)
    db.add(doc)
    db.commit()

    return jsonify({
        "document_id": doc.id,
        "filename": doc.filename,
        "original_name": doc.original_name,
        "mime": doc.mime_type,
        "size": doc.size
    })

@bp.get("/")
def list_recent():
    db = get_db()
    # SQLAlchemy 2.0 style query
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
