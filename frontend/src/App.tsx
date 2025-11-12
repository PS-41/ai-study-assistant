import { Link, Route, Routes, useNavigate, useLocation } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import QuizPage from "./pages/QuizPage";
import AuthLogin from "./pages/AuthLogin";
import AuthSignup from "./pages/AuthSignup";
import DocsPage from "./pages/DocsPage";
import QuizzesPage from "./pages/QuizzesPage";
import { useEffect, useState } from "react";
import { api } from "./lib/api";

export default function App() {
  const [me, setMe] = useState<{id:number;email:string;name:string}|null>(null);
  const nav = useNavigate();
  const loc = useLocation(); // <-- track route changes

  // Refetch 'me' on initial load AND whenever the route changes.
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
      <header className="bg-white border-b">
        <nav className="container flex items-center justify-between h-14">
          <Link to="/" className="font-semibold">AI Study Assistant</Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/upload" className="hover:text-blue-600">Upload</Link>
            {me && (
              <>
                <Link to="/docs" className="hover:text-blue-600">My Documents</Link>
                <Link to="/quizzes" className="hover:text-blue-600">My Quizzes</Link>
              </>
            )}
            {me ? (
              <div className="flex items-center gap-3">
                <span className="text-gray-600">Hi, {me.name.split(" ")[0]}</span>
                <button onClick={logout} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Logout</button>
              </div>
            ) : (
              <>
                <Link to="/login" className="hover:text-blue-600">Login</Link>
                <Link to="/signup" className="hover:text-blue-600">Sign up</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="container py-6">
        <Routes>
          <Route path="/" element={<Home me={me} />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/login" element={<AuthLogin />} />
          <Route path="/signup" element={<AuthSignup />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/quizzes" element={<QuizzesPage />} />
        </Routes>
      </main>

      <footer className="border-t">
        <div className="container py-4 text-xs text-gray-500">
          Project: local LLM + Flask + React — Prakhar Suryavansh
        </div>
      </footer>
    </div>
  );
}

function Home({me}:{me:any}) {
  const nav = useNavigate();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome{me ? `, ${me.name}` : ""}</h1>
      <p>Upload a PDF/PPT → generate a quiz → attempt and track progress.</p>
      <div className="flex gap-3">
        {/* If logged in, go straight to Upload; else, to Sign up */}
        <button
          onClick={() => nav(me ? "/upload" : "/signup")}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {me ? "Get started" : "Create account"}
        </button>
        {!me && (
          <button
            onClick={() => nav("/login")}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
}
