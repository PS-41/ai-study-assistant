# backend/files.py
import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename

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

    # Phase-1: fake a "document_id" using the safe filename.
    # We'll replace this with a DB id soon.
    return jsonify({"document_id": safe, "filename": safe, "size": os.path.getsize(dest)})
