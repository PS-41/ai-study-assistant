# backend/routes_auth.py
import os
import requests
from flask import Blueprint, request, jsonify, current_app, make_response, g, redirect
from backend.db import get_db
from backend.models import User
from backend.utils_auth import hash_password, verify_password, create_jwt, auth_required

bp = Blueprint("auth", __name__)

# --- Google Config ---
GOOGLE_CxID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CxSECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_KcURL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TkURL = "https://oauth2.googleapis.com/token"
GOOGLE_UsrURL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Frontend URL helper
FRONTEND_URL = os.getenv("ALLOW_ORIGIN", "http://localhost:5173")

@bp.post("/signup")
def signup():
    db = get_db()
    data = request.get_json(force=True)
    
    username = (data.get("username") or "").strip()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""
    
    if not username or not password or not name:
        return jsonify({"error": "username, name, and password required"}), 400
        
    if db.query(User).filter_by(username=username).first():
        return jsonify({"error": "username taken"}), 400

    user = User(username=username, name=name, password_hash=hash_password(password))
    db.add(user)
    db.commit()

    token = create_jwt(user.id, current_app.config["SECRET_KEY"])
    resp = make_response({"id": user.id, "username": user.username, "name": user.name})
    resp.set_cookie("token", token, httponly=True, samesite="Lax", secure=False)
    return resp

@bp.post("/login")
def login():
    db = get_db()
    data = request.get_json(force=True)
    
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    
    user = db.query(User).filter_by(username=username).first()
    
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        return jsonify({"error": "invalid credentials"}), 401

    token = create_jwt(user.id, current_app.config["SECRET_KEY"])
    resp = make_response({"id": user.id, "username": user.username, "name": user.name})
    resp.set_cookie("token", token, httponly=True, samesite="Lax", secure=False)
    return resp

@bp.post("/logout")
def logout():
    resp = make_response({"ok": True})
    resp.set_cookie("token", "", httponly=True, samesite="Lax", secure=False, max_age=0)
    return resp

@bp.get("/me")
@auth_required
def me():
    db = get_db()
    user = db.query(User).filter_by(id=g.user_id).first()
    if not user:
        return jsonify({"error":"not found"}), 404
    return jsonify({
        "id": user.id, 
        "username": user.username, 
        "email": user.email,
        "name": user.name,
        "has_google": bool(user.google_id)
    })

@bp.put("/profile")
@auth_required
def update_profile():
    db = get_db()
    user = db.query(User).filter_by(id=g.user_id).first()
    data = request.get_json()

    if "name" in data:
        user.name = data["name"].strip()
    
    if "username" in data:
        new_username = data["username"].strip()
        if new_username and new_username != user.username:
            if db.query(User).filter_by(username=new_username).first():
                return jsonify({"error": "username taken"}), 400
            user.username = new_username

    if "password" in data and data["password"]:
        user.password_hash = hash_password(data["password"])

    db.commit()
    return jsonify({"ok": True, "name": user.name, "username": user.username})

# --- Google Auth Flow ---

@bp.get("/google/login")
def google_login():
    if not GOOGLE_CxID:
        return jsonify({"error": "Google auth not configured"}), 500
    
    redirect_uri = request.host_url.rstrip("/") + "/api/auth/google/callback"
    scope = "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
    
    url = f"{GOOGLE_KcURL}?client_id={GOOGLE_CxID}&redirect_uri={redirect_uri}&response_type=code&scope={scope}&access_type=offline&prompt=select_account"
    return redirect(url)

@bp.get("/google/callback")
def google_callback():
    code = request.args.get("code")
    if not code:
        return "Error: No code provided", 400

    redirect_uri = request.host_url.rstrip("/") + "/api/auth/google/callback"
    
    # 1. Exchange code for token
    token_res = requests.post(GOOGLE_TkURL, data={
        "code": code,
        "client_id": GOOGLE_CxID,
        "client_secret": GOOGLE_CxSECRET,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code"
    })
    tokens = token_res.json()
    access_token = tokens.get("access_token")
    
    if not access_token:
        return f"Error exchanging token: {tokens}", 400

    # 2. Get User Info
    user_res = requests.get(GOOGLE_UsrURL, headers={"Authorization": f"Bearer {access_token}"})
    u_info = user_res.json()
    
    g_email = u_info.get("email")
    g_id = u_info.get("id")
    g_name = u_info.get("name")

    db = get_db()
    
    # 3. Check if user is currently logged in (Linking Mode)
    from backend.utils_auth import verify_jwt
    cookie_token = request.cookies.get("token")
    current_user_id = None
    if cookie_token:
        decoded = verify_jwt(cookie_token, current_app.config["SECRET_KEY"])
        if decoded: current_user_id = int(decoded["sub"])

    target_user = None

    # Scenario A: User is logged in -> Link Account
    if current_user_id:
        # Check if this Google ID is ALREADY linked to a DIFFERENT user
        existing_conflict = db.query(User).filter_by(google_id=g_id).first()
        if existing_conflict and existing_conflict.id != current_user_id:
            # Redirect to Profile with error
            return redirect(f"{FRONTEND_URL}/profile?error=This Google account is already linked to another user")

        target_user = db.query(User).filter_by(id=current_user_id).first()
        target_user.google_id = g_id
        target_user.email = g_email
        db.commit()
    
    # Scenario B: User not logged in -> Login or Register
    else:
        target_user = db.query(User).filter((User.google_id == g_id) | (User.email == g_email)).first()
        
        if not target_user:
            # Auto-register
            base_username = g_email.split("@")[0]
            final_username = base_username
            ctr = 1
            while db.query(User).filter_by(username=final_username).first():
                final_username = f"{base_username}{ctr}"
                ctr += 1
            
            target_user = User(
                email=g_email,
                username=final_username,
                name=g_name,
                google_id=g_id,
                password_hash=""
            )
            db.add(target_user)
            db.commit()
        else:
            # Ensure google_id is linked if matched by email
            if not target_user.google_id:
                target_user.google_id = g_id
                db.commit()

    # 4. Create Session & Redirect
    token = create_jwt(target_user.id, current_app.config["SECRET_KEY"])
    
    # If we were linking, go to profile, else home
    dest = f"{FRONTEND_URL}/profile" if current_user_id else FRONTEND_URL
    
    resp = make_response(redirect(dest))
    resp.set_cookie("token", token, httponly=True, samesite="Lax", secure=False)
    return resp