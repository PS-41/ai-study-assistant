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
import FeedbackModal from "./components/FeedbackModal";
import { useEffect, useState } from "react";
import { api } from "./lib/api";

export default function App() {
  const [me, setMe] = useState<{id:number;email:string;name:string}|null>(null);
  const nav = useNavigate();
  const loc = useLocation(); 
  const [showFeedback, setShowFeedback] = useState(false);

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
      {/* Header: Full Width with side padding */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <nav className="w-full px-6 flex items-center justify-between h-16">
          <Link to="/" className="font-bold text-xl tracking-tight text-blue-600 flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-2xl">📚</span> AI Study Assistant
          </Link>
          
          <div className="flex items-center gap-6 text-sm font-medium">
            {me ? (
              <>
                <Link to="/upload" className={`transition hover:text-blue-600 ${loc.pathname === '/upload' ? 'text-blue-600' : 'text-gray-600'}`}>Upload</Link>
                <Link to="/courses" className={`transition hover:text-blue-600 ${loc.pathname === '/courses' ? 'text-blue-600' : 'text-gray-600'}`}>My Courses</Link>
                <Link to="/docs" className={`transition hover:text-blue-600 ${loc.pathname === '/docs' ? 'text-blue-600' : 'text-gray-600'}`}>My Documents</Link>
                <Link to="/library" className={`transition hover:text-blue-600 ${loc.pathname === '/library' ? 'text-blue-600' : 'text-gray-600'}`}>My Library</Link>
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

      {/* Main: Full Width, Individual pages control their own max-width */}
      <main className="flex-1 w-full flex flex-col">
        <Routes>
          <Route path="/" element={<Home me={me} />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/login" element={<AuthLogin />} />
          <Route path="/signup" element={<AuthSignup />} />
          
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:id" element={<DocDetailsPage />} />
          
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/summary/:id" element={<SummaryViewer />} />
          <Route path="/flashcards/:id" element={<FlashcardViewer />} />

          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>

      {/* Footer: Full Width */}
      <footer className="border-t bg-white py-8 mt-auto">
        <div className="w-full px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            © 2025 AI Study Assistant. Built for students.
          </div>
          
          <div className="flex gap-6 text-sm font-medium text-gray-600 items-center">
            <button 
              onClick={() => setShowFeedback(true)}
              className="hover:text-blue-600 transition flex items-center gap-2"
            >
              Feedback
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            </button>

            <div className="w-px h-4 bg-gray-300"></div>

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
      {/* Modal Render */}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </div>
  );
}

// --- Home Component ---

const HomeIcons = {
  Quiz: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>,
  Flashcard: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  Summary: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Folder: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
};

function Home({me}:{me:any}) {
  const nav = useNavigate();
  // Added container centering here specifically for the home page content
  return (
    <div className="space-y-16 pb-10 pt-8 px-4 max-w-6xl mx-auto w-full">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center pt-16 pb-8 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-6xl mb-2">🎓</div>
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Master your study material
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto">
            Upload your course documents. We'll generate intelligent quizzes, flashcards, and summaries to help you learn faster.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 pt-2">
          <button
            onClick={() => nav(me ? "/upload" : "/signup")}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {me ? "Upload New File" : "Get Started for Free"}
          </button>
          {me && (
            <button
              onClick={() => nav("/library")}
              className="px-6 py-3 bg-white text-gray-700 border rounded-xl font-semibold hover:bg-gray-50 transition shadow-sm hover:shadow-md"
            >
              Go to Library
            </button>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <FeatureCard 
          icon={<HomeIcons.Quiz />}
          title="AI Quizzes"
          desc="Test your knowledge with auto-generated multiple choice questions from your slides."
        />
        <FeatureCard 
          icon={<HomeIcons.Flashcard />}
          title="Flashcards"
          desc="Active recall made easy. Create decks instantly to memorize definitions and terms."
        />
        <FeatureCard 
          icon={<HomeIcons.Summary />}
          title="Summaries"
          desc="Digest long readings in seconds. Get concise or detailed overviews of any PDF."
        />
        <FeatureCard 
          icon={<HomeIcons.Folder />}
          title="Organize"
          desc="Keep everything structured. Group your documents and study aids by Course and Topic."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
      <div className="mb-4 bg-gray-50 w-12 h-12 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2 text-lg">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}