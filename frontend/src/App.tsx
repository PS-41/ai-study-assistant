// frontend/src/App.tsx
import { Link, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import QuizPage from "./pages/QuizPage";
import AuthLogin from "./pages/AuthLogin";
import AuthSignup from "./pages/AuthSignup";
import DocsPage from "./pages/DocsPage";
import DocDetailsPage from "./pages/DocDetailsPage";
import CoursesPage from "./pages/CoursesPage";
import LibraryPage from "./pages/LibraryPage";         // NEW
import SummaryViewer from "./pages/SummaryViewer";     // NEW
import FlashcardViewer from "./pages/FlashcardViewer"; // NEW
import { useEffect, useState } from "react";
import { api } from "./lib/api";

export default function App() {
  const [me, setMe] = useState<{id:number;email:string;name:string}|null>(null);
  const nav = useNavigate();
  const loc = useLocation(); 

  useEffect(() => {
    api.get("/api/auth/me")
      .then(({data}) => setMe(data))
      .catch(() => setMe(null));
  }, [loc.pathname]);

  async function logout() {
    await api.post("/api/auth/logout");
    setMe(null);
    nav("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b sticky top-0 z-30">
        <nav className="container mx-auto max-w-6xl px-4 flex items-center justify-between h-16">
          <Link to="/" className="font-bold text-xl tracking-tight text-blue-600 flex items-center gap-2">
            <span className="text-2xl">📚</span> AI Study Assistant
          </Link>
          
          <div className="flex items-center gap-6 text-sm font-medium">
            {me ? (
              <>
                <Link to="/upload" className="text-gray-600 hover:text-blue-600 transition">Upload</Link>
                <Link to="/courses" className="text-gray-600 hover:text-blue-600 transition">Courses</Link>
                <Link to="/docs" className="text-gray-600 hover:text-blue-600 transition">Documents</Link>
                {/* Unified Library Link */}
                <Link to="/library" className="text-gray-600 hover:text-blue-600 transition">Library</Link>
              </>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">Login</Link>
            )}

            {me ? (
              <div className="flex items-center gap-4 pl-4 border-l ml-2">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-400">Welcome,</span>
                  <span className="text-gray-700 leading-none">{me.name.split(" ")[0]}</span>
                </div>
                <button onClick={logout} className="px-3 py-1.5 border rounded text-xs hover:bg-gray-50 transition">Logout</button>
              </div>
            ) : (
              <Link to="/signup" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Sign up</Link>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home me={me} />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/login" element={<AuthLogin />} />
          <Route path="/signup" element={<AuthSignup />} />
          
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:id" element={<DocDetailsPage />} />
          
          {/* Library Routes */}
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/summary/:id" element={<SummaryViewer />} />
          <Route path="/flashcards/:id" element={<FlashcardViewer />} />
        </Routes>
      </main>

      <footer className="border-t bg-white mt-auto">
        <div className="container mx-auto max-w-6xl px-4 py-6 text-center text-xs text-gray-400">
          © 2025 AI Study Assistant. Built for students.
        </div>
      </footer>
    </div>
  );
}

function Home({me}:{me:any}) {
  const nav = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
      <div className="text-6xl mb-4">🎓</div>
      <h1 className="text-4xl font-extrabold text-gray-900">Master your study material</h1>
      <p className="text-lg text-gray-600 max-w-xl">
        Upload your PDFs or PowerPoints. We'll generate quizzes, flashcards, and summaries instantly.
      </p>
      <div className="flex gap-4 pt-4">
        <button
          onClick={() => nav(me ? "/upload" : "/signup")}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
        >
          {me ? "Upload New File" : "Get Started for Free"}
        </button>
        {me && (
          <button
            onClick={() => nav("/library")}
            className="px-8 py-3 bg-white text-gray-700 border rounded-xl font-semibold hover:bg-gray-50 transition shadow-sm"
          >
            Go to Library
          </button>
        )}
      </div>
    </div>
  );
}