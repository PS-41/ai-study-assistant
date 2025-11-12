# backend/routes_auth.py
from flask import Blueprint, request, jsonify, current_app, make_response, g
from backend.db import get_db
from backend.models import User
from backend.utils_auth import hash_password, verify_password, create_jwt, auth_required

bp = Blueprint("auth", __name__)

@bp.post("/signup")
def signup():
    db = get_db()
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""
    if not email or not password or not name:
        return jsonify({"error": "name, email, password required"}), 400
    exists = db.query(User).filter_by(email=email).first()
    if exists:
        return jsonify({"error": "email already registered"}), 400
    user = User(email=email, name=name, password_hash=hash_password(password))
    db.add(user); db.commit()

    token = create_jwt(user.id, current_app.config["SECRET_KEY"])
    resp = make_response({"id": user.id, "email": user.email, "name": user.name})
    # HttpOnly cookie (frontend cannot read), Lax same-site default
    resp.set_cookie("token", token, httponly=True, samesite="Lax", secure=False)
    return resp

@bp.post("/login")
def login():
    db = get_db()
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = db.query(User).filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_jwt(user.id, current_app.config["SECRET_KEY"])
    resp = make_response({"id": user.id, "email": user.email, "name": user.name})
    resp.set_cookie("token", token, httponly=True, samesite="Lax", secure=False)
    return resp

@bp.post("/logout")
def logout():
    resp = make_response({"ok": True})
    # Clear cookie
    resp.set_cookie("token", "", httponly=True, samesite="Lax", secure=False, max_age=0)
    return resp

@bp.get("/me")
@auth_required
def me():
    db = get_db()
    user = db.query(User).filter_by(id=g.user_id).first()
    if not user:
        return jsonify({"error":"not found"}), 404
    return jsonify({"id": user.id, "email": user.email, "name": user.name})
