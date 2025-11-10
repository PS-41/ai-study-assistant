from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.get("/api/health")
def health():
    return {"ok": True}

if __name__ == "__main__":
    app.run(debug=True)
