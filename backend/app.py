# backend/app.py
from dotenv import load_dotenv
load_dotenv()  # Must be first

from flask import Flask
from flask_cors import CORS
import os
from backend.db import init_db, close_db
from backend.files import bp as files_bp
from backend.routes_quizzes import bp as quizzes_bp
from backend.routes_summaries import bp as summaries_bp
from backend.routes_auth import bp as auth_bp

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev")
app.config["DATABASE_URL"] = os.getenv("DATABASE_URL", f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), "app.sqlite"))}")

# CORS: allow Vite in dev; prod is same-origin (behind Caddy)
ALLOW_ORIGIN = os.getenv("ALLOW_ORIGIN", "http://localhost:5173")
CORS(app,
     resources={r"/api/*": {"origins": [ALLOW_ORIGIN]}},
     supports_credentials=True)

init_db(app)
app.teardown_appcontext(close_db)

@app.get("/api/health")
def health():
    return {"ok": True}

app.register_blueprint(files_bp, url_prefix="/api/files")
app.register_blueprint(quizzes_bp, url_prefix="/api/quizzes")
app.register_blueprint(auth_bp, url_prefix="/api/auth") 
app.register_blueprint(summaries_bp, url_prefix="/api/summaries")

if __name__ == "__main__":
    app.run(debug=True)
