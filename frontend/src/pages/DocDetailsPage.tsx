// frontend/src/pages/DocDetailsPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import GenerateModal from "../components/GenerateModal";
import { AttemptsModal } from "../components/LibraryModals";
import AudioPlayer from "../components/AudioPlayer";

// --- Types ---
type QuizItem = {
  quiz_id: number;
  title: string;
  created_at: string;
  attempts: number;
};

type FlashcardSetItem = {
  id: number;
  title: string;
  created_at: string;
  count: number;
};

// --- Icons ---
const Icons = {
  Back: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ),
  Quiz: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="10 8 16 12 10 16 10 8"></polygon>
    </svg>
  ),
  Card: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
  ),
  FileText: () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  Plus: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  ),
  Play: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  ),
};

export default function DocDetailsPage() {
  const { id } = useParams();
  const docId = Number(id);
  const nav = useNavigate();
  const location = useLocation();
  const state = location.state as { docName?: string } | null;

  // State
  const [docName, setDocName] = useState(state?.docName || "Document");
  const [activeTab, setActiveTab] = useState<"quizzes" | "flashcards" | "summary">("quizzes");
  const [loading, setLoading] = useState(true);

  // Data
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [flashsets, setFlashsets] = useState<FlashcardSetItem[]>([]);
  const [summary, setSummary] = useState<{
    id: number;
    content: string;
    created_at: string;
    audio_filename?: string;
  } | null>(null);

  // Action States
  const [activeGenType, setActiveGenType] = useState<"quiz" | "flashcards" | "summary" | null>(null);
  const [viewAttemptsQuiz, setViewAttemptsQuiz] = useState<{ id: number; title: string } | null>(null);

  // Flashcard Study State (Mini Preview)
  const [activeSetId, setActiveSetId] = useState<number | null>(null);
  const [activeCards, setActiveCards] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  // --- Loaders ---
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "summary" || tab === "flashcards" || tab === "quizzes") setActiveTab(tab as any);
  }, [location.search]);

  const loadAll = useCallback(async () => {
    if (!docId) return;
    try {
      const [qRes, fRes, sListRes, dRes] = await Promise.all([
        api.get("/api/quizzes/mine", { params: { document_id: docId } }),
        api.get("/api/flashcards", { params: { document_id: docId } }),
        api.get("/api/summaries", { params: { document_id: docId } }),
        !state?.docName
          ? api.get("/api/files/mine").then((r) => r.data.items.find((d: any) => d.id === docId))
          : Promise.resolve(null),
      ]);

      setQuizzes(qRes.data.items || []);
      setFlashsets(fRes.data.items || []);

      const summaries = sListRes.data.items || [];
      if (summaries.length > 0) {
        const latestSummaryId = summaries[0].id;
        const detailRes = await api.get(`/api/summaries/${latestSummaryId}`);
        setSummary({
          id: detailRes.data.id, // <--- Added
          content: detailRes.data.summary || detailRes.data.content,
          created_at: detailRes.data.created_at,
          audio_filename: detailRes.data.audio_filename, // <--- Added
        });
      } else {
        setSummary(null);
      }

      if (dRes) setDocName(dRes.original_name);
    } catch (e) {
      console.error("Error loading document details:", e);
    } finally {
      setLoading(false);
    }
  }, [docId, state?.docName]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // --- Flashcard Logic ---
  async function openFlashcardSet(setId: number) {
    setActiveSetId(setId);
    try {
      const { data } = await api.get(`/api/flashcards/set/${setId}`);
      setActiveCards(data.cards || []);
      setFlipped({});
    } catch (e) {
      alert("Failed to load cards.");
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400">
        Loading...
      </div>
    );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 min-h-screen">
      {/* Header */}
      <div className="flex flex-col space-y-2 mb-8">
        <button
          onClick={() => nav("/docs")}
          className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors font-medium w-fit"
        >
          <Icons.Back /> Back to Documents
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight break-all">{docName}</h1>
            <p className="text-sm text-gray-500 mt-1">Document Analysis &amp; Study Aids</p>
          </div>

          {/* Unified Action Button based on Tab */}
          <div className="flex gap-2">
            {activeTab === "quizzes" && (
              <button
                onClick={() => setActiveGenType("quiz")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2"
              >
                <Icons.Plus /> Generate Quiz
              </button>
            )}
            {activeTab === "flashcards" && (
              <button
                onClick={() => setActiveGenType("flashcards")}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition shadow-sm flex items-center gap-2"
              >
                <Icons.Plus /> New Set
              </button>
            )}
            {activeTab === "summary" && (
              <button
                onClick={() => setActiveGenType("summary")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition shadow-sm flex items-center gap-2"
              >
                <Icons.Plus /> {summary ? "Regenerate" : "Generate"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Stabilized */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-1" aria-label="Tabs">
          <TabButton
            label="Quizzes"
            icon={<Icons.Quiz />}
            active={activeTab === "quizzes"}
            onClick={() => setActiveTab("quizzes")}
            count={quizzes.length}
          />
          <TabButton
            label="Flashcards"
            icon={<Icons.Card />}
            active={activeTab === "flashcards"}
            onClick={() => setActiveTab("flashcards")}
            count={flashsets.length}
          />
          <TabButton
            label="Summary"
            icon={<Icons.FileText />}
            active={activeTab === "summary"}
            onClick={() => setActiveTab("summary")}
          />
        </nav>
      </div>

      {/* --- QUIZZES TAB --- */}
      {activeTab === "quizzes" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {quizzes.length === 0 ? (
            <EmptyState
              title="No Quizzes Yet"
              msg="Create a quiz to test your knowledge on this document."
              action={
                <button
                  onClick={() => setActiveGenType("quiz")}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Create First Quiz
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {quizzes.map((q) => (
                <div
                  key={q.quiz_id}
                  className="group bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between h-48 cursor-pointer"
                  onClick={() => nav(`/quiz?quizId=${q.quiz_id}`)}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                        <Icons.Quiz />
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                        {new Date(q.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-800 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {q.title}
                    </h3>
                  </div>

                  <div className="pt-4 mt-1 border-t border-gray-50 flex items-center justify-between gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewAttemptsQuiz({ id: q.quiz_id, title: q.title });
                      }}
                      className="text-[11px] font-medium text-gray-500 hover:text-blue-600 hover:underline text-left"
                    >
                      View attempts{" "}
                      <span className="font-semibold">
                        ({q.attempts} attempt{q.attempts !== 1 ? "s" : ""})
                      </span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nav(`/quiz?quizId=${q.quiz_id}`);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 px-3 py-1.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      <Icons.Play />
                      Start quiz
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- FLASHCARDS TAB --- */}
      {activeTab === "flashcards" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {flashsets.length === 0 ? (
            <EmptyState
              title="No Flashcards Yet"
              msg="Generate flashcards to memorize key concepts and definitions."
              action={
                <button
                  onClick={() => setActiveGenType("flashcards")}
                  className="text-emerald-600 font-medium hover:underline"
                >
                  Generate Flashcards
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* List of Sets */}
              <div className="space-y-3 lg:col-span-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Your Sets
                </h3>
                {flashsets.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => openFlashcardSet(s.id)}
                    className={`cursor-pointer w-full text-left p-4 rounded-xl border transition-all group ${
                      activeSetId === s.id
                        ? "bg-emerald-50/50 border-emerald-500 ring-1 ring-emerald-500 shadow-sm"
                        : "bg-white border-gray-200 hover:border-emerald-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div
                        className={`font-medium ${
                          activeSetId === s.id
                            ? "text-emerald-900"
                            : "text-gray-700 group-hover:text-gray-900"
                        }`}
                      >
                        {s.title}
                      </div>
                      {activeSetId === s.id && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="font-medium text-gray-500">{s.count} Cards</span>
                      <span>•</span>
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active Set Preview */}
              <div className="lg:col-span-2">
                {activeSetId && activeCards.length > 0 ? (
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 min-h-[500px]">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Icons.Card /> Preview Deck
                      </h3>
                      <button
                        onClick={() => nav(`/flashcards/${activeSetId}`)}
                        className="text-xs font-bold text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition shadow-sm"
                      >
                        Open Full Viewer
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeCards.slice(0, 6).map((c) => {
                        const isFlipped = !!flipped[c.id];
                        return (
                          <div
                            key={c.id}
                            onClick={() =>
                              setFlipped((p) => ({
                                ...p,
                                [c.id]: !p[c.id],
                              }))
                            }
                            className="relative h-40 cursor-pointer [perspective:1000px] group"
                          >
                            <div
                              className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${
                                isFlipped ? "[transform:rotateY(180deg)]" : ""
                              }`}
                            >
                              <div className="absolute inset-0 bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between [backface-visibility:hidden]">
                                <div className="text-[10px] uppercase text-emerald-600 font-bold tracking-wider">
                                  Question
                                </div>
                                <div className="text-sm text-center font-medium text-gray-800 line-clamp-3 leading-snug">
                                  {c.front}
                                </div>
                                <div className="text-[10px] text-center text-gray-300 font-medium uppercase tracking-widest group-hover:text-emerald-400 transition-colors">
                                  Click to flip
                                </div>
                              </div>
                              <div className="absolute inset-0 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
                                <div className="text-[10px] uppercase text-emerald-400 font-bold tracking-wider">
                                  Answer
                                </div>
                                <div className="text-sm text-center text-slate-100 leading-relaxed line-clamp-4">
                                  {c.back}
                                </div>
                                <div className="text-[10px] text-center text-slate-500 font-medium uppercase tracking-widest">
                                  Back
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {activeCards.length > 6 && (
                      <div className="mt-4 text-center">
                        <span className="text-xs text-gray-400 italic">
                          And {activeCards.length - 6} more cards...
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <div className="p-4 bg-white rounded-full shadow-sm mb-3">
                      <Icons.Card />
                    </div>
                    <p className="text-sm">Select a flashcard set from the list to preview.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SUMMARY TAB --- */}
      {activeTab === "summary" && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {!summary ? (
            <EmptyState
              title="No Summary"
              msg="Generate a summary to get a quick overview of this document."
              action={
                <button
                  onClick={() => setActiveGenType("summary")}
                  className="text-purple-600 font-medium hover:underline"
                >
                  Generate Now
                </button>
              }
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 md:p-12 shadow-sm max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <Icons.FileText />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Document Summary</h2>
                  <p className="text-xs text-gray-500">
                    Generated on {new Date(summary.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {/* Audio Player Injection */}
              <div className="mb-8">
                <AudioPlayer 
                  summaryId={summary.id} 
                  hasAudio={!!summary.audio_filename}
                  onGenerate={async (voice) => {
                    await api.post(`/api/summaries/${summary.id}/audio`, { voice });
                    loadAll(); // Reloads page data to update the UI state
                  }}
                />
              </div>
              <div className="prose prose-slate prose-lg max-w-none text-gray-700 leading-relaxed">
                {summary.content.split("\n").map((line, i) => {
                  const trimmed = line.trim();

                  // bullet lines
                  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                    const bulletText = trimmed.replace(/^[-*]\s/, "");
                    const parts = bulletText.split(/(\*\*.*?\*\*)/g);

                    return (
                      <li key={i} className="ml-4 list-disc my-2 marker:text-gray-400">
                        {parts.map((part, j) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={j} className="font-semibold text-gray-900">
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            part
                          )
                        )}
                      </li>
                    );
                  }

                  // blank line → spacing
                  if (trimmed === "") return <br key={i} />;

                  // normal paragraph with **bold** support
                  const parts = line.split(/(\*\*.*?\*\*)/g);
                  return (
                    <p key={i} className="mb-4 text-base">
                      {parts.map((part, j) =>
                        part.startsWith("**") && part.endsWith("**") ? (
                          <strong key={j} className="font-semibold text-gray-900">
                            {part.slice(2, -2)}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  );
                })}
              </div>
              <div className="mt-10 pt-6 border-t border-gray-50 text-xs text-gray-400 flex justify-between items-center">
                <span>AI Generated Content</span>
                <button
                  onClick={() => setActiveGenType("summary")}
                  className="text-purple-600 hover:underline"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unified Generation Modal */}
      {activeGenType && (
        <GenerateModal
          type={activeGenType}
          docIds={[docId]}
          onClose={() => setActiveGenType(null)}
          onSuccess={() => {
            setActiveGenType(null);
            loadAll();
          }}
        />
      )}

      {/* Attempts Modal */}
      {viewAttemptsQuiz && (
        <AttemptsModal
          quizId={viewAttemptsQuiz.id}
          quizTitle={viewAttemptsQuiz.title}
          onClose={() => setViewAttemptsQuiz(null)}
        />
      )}
    </div>
  );
}

// --- Subcomponents ---

function TabButton({ label, icon, active, onClick, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`group inline-flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
      }`}
    >
      <span
        className={`mr-2 ${
          active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500"
        }`}
      >
        {icon}
      </span>
      {label}
      {count !== undefined && (
        <span
          className={`ml-2 py-0.5 px-2 rounded-full text-xs transition-colors ${
            active ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({
  title,
  msg,
  action,
}: {
  title: string;
  msg: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-20 text-center bg-white rounded-xl border border-dashed border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 mb-4 max-w-xs mx-auto text-sm">{msg}</p>
      {action}
    </div>
  );
}
