import { Link, Route, Routes, useNavigate } from "react-router-dom";
import UploadPage from "./pages/UploadPage";
import QuizPage from "./pages/QuizPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b">
        <nav className="container flex items-center justify-between h-14">
          <Link to="/" className="font-semibold">AI Study Assistant</Link>
          <div className="flex gap-4 text-sm">
            <Link to="/upload" className="hover:text-blue-600">Upload</Link>
            <Link to="/quiz" className="hover:text-blue-600">Quiz</Link>
          </div>
        </nav>
      </header>

      <main className="container py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/quiz" element={<QuizPage />} />
        </Routes>
      </main>

      <footer className="border-t">
        <div className="container py-4 text-xs text-gray-500">
          Built for your MCS project — local LLM + Flask + React.
        </div>
      </footer>
    </div>
  );
}

function Home() {
  const nav = useNavigate();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p>Use the Upload page to add a PDF/PPT and generate a quiz with your local LLM.</p>
      <button
        onClick={() => nav("/upload")}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Get started
      </button>
    </div>
  );
}
