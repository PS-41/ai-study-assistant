// frontend/src/App.tsx
import { Link, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import QuizPage from "./pages/QuizPage";
import AuthLogin from "./pages/AuthLogin";
import AuthSignup from "./pages/AuthSignup";
import DocsPage from "./pages/DocsPage";
import DocDetailsPage from "./pages/DocDetailsPage";
import CoursesPage from "./pages/CoursesPage";
import LibraryPage from "./pages/LibraryPage";         
import SummaryViewer from "./pages/SummaryViewer";     
import FlashcardViewer from "./pages/FlashcardViewer"; 
import ProfilePage from "./pages/ProfilePage";
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <nav className="container mx-auto max-w-6xl px-4 flex items-center justify-between h-16">
          <Link to="/" className="font-bold text-xl tracking-tight text-blue-600 flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl">📚</span> AI Study Assistant
          </Link>
          
          <div className="flex items-center gap-6 text-sm font-medium">
            {me ? (
              <>
                <Link to="/upload" className={`transition hover:text-blue-600 ${loc.pathname === '/upload' ? 'text-blue-600' : 'text-gray-600'}`}>Upload</Link>
                <Link to="/courses" className={`transition hover:text-blue-600 ${loc.pathname === '/courses' ? 'text-blue-600' : 'text-gray-600'}`}>Courses</Link>
                <Link to="/docs" className={`transition hover:text-blue-600 ${loc.pathname === '/docs' ? 'text-blue-600' : 'text-gray-600'}`}>Documents</Link>
                <Link to="/library" className={`transition hover:text-blue-600 ${loc.pathname === '/library' ? 'text-blue-600' : 'text-gray-600'}`}>Library</Link>
              </>
            ) : (
              <Link to="/login" className="text-gray-600 hover:text-blue-600 transition">Login</Link>
            )}

            {me ? (
              <div className="flex items-center gap-4 pl-4 border-l ml-2">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-400">Welcome,</span>
                  <span className="text-gray-700 leading-none font-semibold">{me.name.split(" ")[0]}</span>
                </div>
                {/* ✅ New Profile link before Logout */}
                <Link
                  to="/profile"
                  className={`text-xs transition hover:text-blue-600 ${
                    loc.pathname === "/profile" ? "text-blue-600" : "text-gray-600"
                  }`}
                >
                  Profile
                </Link>
                <button onClick={logout} className="px-3 py-1.5 border rounded text-xs hover:bg-gray-50 transition text-gray-600">Logout</button>
              </div>
            ) : (
              <Link to="/signup" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm">Sign up</Link>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1 container mx-auto max-w-6xl px-4 py-8">
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

          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>

      <footer className="border-t bg-white py-8 mt-auto">
        <div className="container mx-auto max-w-6xl px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            © 2025 AI Study Assistant. Built for students.
          </div>
          
          <div className="flex gap-6 text-sm font-medium text-gray-600">
            <a 
              href="https://www.linkedin.com/in/ps41/" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-blue-600 transition flex items-center gap-2"
            >
              Contact Support
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Home({me}:{me:any}) {
  const nav = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-7xl mb-2">🎓</div>
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Master your study material</h1>
        <p className="text-xl text-gray-600 leading-relaxed">
          Upload your PDFs or PowerPoints. We'll generate intelligent quizzes, flashcards, and summaries instantly.
        </p>
      </div>
      
      <div className="flex gap-4 pt-4">
        <button
          onClick={() => nav(me ? "/upload" : "/signup")}
          className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          {me ? "Upload New File" : "Get Started for Free"}
        </button>
        {me && (
          <button
            onClick={() => nav("/library")}
            className="px-8 py-4 bg-white text-gray-700 border rounded-xl font-semibold hover:bg-gray-50 transition shadow-sm hover:shadow-md"
          >
            Go to Library
          </button>
        )}
      </div>
    </div>
  );
}