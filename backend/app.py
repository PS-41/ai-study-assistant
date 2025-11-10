# backend/app.py
from flask import Flask
from flask_cors import CORS

from files import bp as files_bp  # <-- add this import

app = Flask(__name__)
CORS(app)

@app.get("/api/health")
def health():
    return {"ok": True}

# register the files blueprint under /api/files
app.register_blueprint(files_bp, url_prefix="/api/files")

if __name__ == "__main__":
    app.run(debug=True)
