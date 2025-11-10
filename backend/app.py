# backend/app.py
from flask import Flask
from flask_cors import CORS
from backend.db import init_db, close_db
from backend.files import bp as files_bp  # updated import path

app = Flask(__name__)
CORS(app)

# DB init/teardown
init_db(app)
app.teardown_appcontext(close_db)

@app.get("/api/health")
def health():
    return {"ok": True}

# files API
app.register_blueprint(files_bp, url_prefix="/api/files")

if __name__ == "__main__":
    app.run(debug=True)
