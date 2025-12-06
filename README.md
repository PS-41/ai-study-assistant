# AI Study Assistant 🎓

AI Study Assistant is a full-stack web application designed to streamline the revision process for students. By leveraging Large Language Models (LLMs), it automatically transforms uploaded course materials (PDFs, PPTX) into interactive study aids like quizzes, flashcards, and audio summaries.

## 🚀 Key Features

### 📄 Smart Document Processing
- **Multi-Format Support**: Upload PDF lecture notes and PowerPoint presentations.
- **Text Extraction**: Automatically extracts and cleans text for AI processing using `pdfplumber` and `python-pptx`.
- **Multi-Document Context**: Select multiple documents simultaneously to generate comprehensive quizzes or summaries spanning different lectures.

### 🧠 AI-Powered Study Tools
- **Quizzes**: Generate MCQs, True/False, and Short Answer questions.
- **AI Grading**: Short answers graded conceptually, focusing on understanding.
- **Attempt History**: Track scores and review past attempts.
- **Flashcards**: Instantly create active recall flashcards with flip animation.
- **Summaries & Audio**: Generate concise or detailed summaries.
- **Text-to-Speech (TTS)**: Listen to summaries via generated MP3 audio (Google TTS).

### 🗂️ Organization & Management
- **Course Structure**: Organize uploaded files into Courses and Topics.
- **Library**: Browse and search generated quizzes, flashcards, and summaries.
- **Batch Actions**: Bulk delete or assign files.

### 👤 User Experience
- **Authentication**: Secure signup/login via Email or Google OAuth.
- **Feedback System**: 5-star rating with comments.
- **Responsive UI**: Modern interface built with Tailwind CSS.

## 🛠️ Technology Stack

### Frontend
- React (TypeScript) + Vite  
- Tailwind CSS  
- React Router DOM  
- Axios  

### Backend
- Python Flask  
- SQLite + SQLAlchemy ORM  
- PyJWT + BCrypt  
- pdfplumber, python-pptx, gTTS  

### AI & Infrastructure
- Custom LLM abstraction supporting:  
  - **Ollama (local)** – Llama 3.2 (configurable via `OLLAMA_MODEL`)  
  - **OpenRouter (cloud)** – currently using `qwen/qwen-2.5-72b-instruct` (configurable via `OPENROUTER_MODEL`)  
- Docker + Docker Compose  
- Caddy Server (HTTPS + reverse proxy)

---

## ⚙️ Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Docker & Docker Compose (optional)
- Git

---

## 💻 Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-study-assistant.git
cd ai-study-assistant
```

### 2. Backend Setup
```bash
python -m venv .venv
# Activate
# Windows: .venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r backend/requirements.txt
```

#### Create `.env` file (reference `.env.example`)
```
FLASK_ENV=development
SECRET_KEY=dev_secret_key
DATABASE_URL=sqlite:////absolute/path/to/repo/data/app.sqlite

LLM_PROVIDER=openrouter

OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:1b

OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=qwen/qwen-2.5-72b-instruct

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### Run backend
```bash
python -m backend.app
# Runs at http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

---

## 🐳 Docker Deployment (Production)

Ensure `.env` is present and set:
```
FLASK_ENV=production
```

Run:
```bash
docker-compose up -d --build
```

Access at:
- **Frontend**: http://localhost  
- **Backend**: via Caddy reverse proxy `/api/*`

---

## 📂 Project Structure
```
ai-study-assistant/
├── backend/
│   ├── app.py
│   ├── models.py
│   ├── routes_*.py
│   ├── services/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   ├── Dockerfile
│   └── vite.config.ts
├── proxy/
├── docker-compose.yml
└── README.md
```

---

## 🔮 Future Roadmap
- RAG using ChromaDB for large textbook querying  
- Mobile App (React Native)  
- Collaborative study tools (share quizzes & flashcards)

---

## 📝 License
This project is created for academic purposes.
