# backend/app.py
from flask import Flask
from flask_cors import CORS
from backend.db import init_db, close_db
from backend.files import bp as files_bp
from backend.routes_quizzes import bp as quizzes_bp   # <-- add

app = Flask(__name__)
CORS(app)
init_db(app)
app.teardown_appcontext(close_db)

@app.get("/api/health")
def health():
    return {"ok": True}

app.register_blueprint(files_bp, url_prefix="/api/files")
app.register_blueprint(quizzes_bp, url_prefix="/api/quizzes")  # <-- add

if __name__ == "__main__":
    app.run(debug=True)
