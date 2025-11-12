# backend/files.py
import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from backend.db import get_db
from backend.models import Document
from backend.services.extract import read_document_text
from backend.utils_auth import auth_required

bp = Blueprint("files", __name__)

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "uploads"))

@bp.post("/upload")
@auth_required
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
    # attach current user
    try:
        from sqlalchemy import inspect
        # set only if the column exists (it should, after ensure_optional_user_id_column)
        setattr(doc, "user_id", getattr(g, "user_id", None))
    except Exception:
        pass
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

@bp.get("/extract_preview/<int:doc_id>")
def extract_preview(doc_id):
    db = get_db()
    doc = db.query(Document).filter_by(id=doc_id).first()
    if not doc:
        return jsonify({"error": "document not found"}), 404
    txt = read_document_text(doc.filename, max_chars=2000)
    return jsonify({"chars": len(txt), "preview": txt[:500]})
