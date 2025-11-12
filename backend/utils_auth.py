# backend/utils_auth.py
import os, time
import bcrypt, jwt
from functools import wraps
from flask import request, jsonify, g

JWT_ALG = "HS256"
JWT_TTL_SECS = int(os.getenv("JWT_TTL_SECS", "86400"))  # 1 day default

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_jwt(user_id: int, secret: str) -> str:
    payload = {"sub": str(user_id), "exp": int(time.time()) + JWT_TTL_SECS}
    return jwt.encode(payload, secret, algorithm=JWT_ALG)

def verify_jwt(token: str, secret: str):
    try:
        return jwt.decode(token, secret, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.cookies.get("token") or request.headers.get("Authorization", "").replace("Bearer ","")
        if not token:
            return jsonify({"error": "auth required"}), 401
        data = verify_jwt(token, secret=os.getenv("SECRET_KEY","dev"))
        if not data:
            return jsonify({"error": "invalid or expired token"}), 401
        g.user_id = int(data.get("sub"))
        return fn(*args, **kwargs)
    return wrapper
