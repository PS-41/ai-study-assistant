// frontend/src/pages/DocDetailsPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import GenerateModal from "../components/GenerateModal";
import { AttemptsModal } from "../components/LibraryModals";

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
  Back: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
  Quiz: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>,
  Card: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
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
  const [summary, setSummary] = useState<{ content: string; created_at: string } | null>(null);

  // Action States
  const [activeGenType, setActiveGenType] = useState<"quiz" | "flashcards" | "summary" | null>(null);
  const [viewAttemptsQuiz, setViewAttemptsQuiz] = useState<{ id: number; title: string } | null>(null);

  // Flashcard Study State
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
      // Fetch all data in parallel
      const [qRes, fRes, sListRes, dRes] = await Promise.all([
        api.get("/api/quizzes/mine", { params: { document_id: docId } }),
        api.get("/api/flashcards", { params: { document_id: docId } }),
        api.get("/api/summaries", { params: { document_id: docId } }), // Get list of summaries
        !state?.docName ? api.get("/api/files/mine").then(r => r.data.items.find((d:any) => d.id===docId)) : Promise.resolve(null)
      ]);

      setQuizzes(qRes.data.items || []);
      setFlashsets(fRes.data.items || []);
      
      // Handle Summary: The list endpoint returns an array of summaries.
      // We want to display the MOST RECENT one for this document.
      const summaries = sListRes.data.items || [];
      if (summaries.length > 0) {
        const latestSummaryId = summaries[0].id;
        // Fetch full content for this summary (since list might only have preview)
        const detailRes = await api.get(`/api/summaries/${latestSummaryId}`);
        setSummary({ 
            content: detailRes.data.summary || detailRes.data.content, 
            created_at: detailRes.data.created_at 
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

  if (loading) return <div className="p-10 text-center text-gray-500">Loading document details...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => nav("/docs")} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-2 transition-colors">
          <Icons.Back /> Back to Documents
        </button>
        <h1 className="text-3xl font-bold text-gray-900">{docName}</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        <TabButton label="Quizzes" icon={<Icons.Quiz />} active={activeTab==="quizzes"} onClick={() => setActiveTab("quizzes")} />
        <TabButton label="Flashcards" icon={<Icons.Card />} active={activeTab==="flashcards"} onClick={() => setActiveTab("flashcards")} />
        <TabButton label="Summary" icon={<Icons.FileText />} active={activeTab==="summary"} onClick={() => setActiveTab("summary")} />
      </div>

      {/* --- QUIZZES TAB --- */}
      {activeTab === "quizzes" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Available Quizzes</h2>
            <button onClick={() => setActiveGenType("quiz")} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
              <Icons.Plus /> Generate Quiz
            </button>
          </div>

          {quizzes.length === 0 ? (
            <EmptyState msg="No quizzes yet. Generate one to test your knowledge." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((q) => (
                <div key={q.quiz_id} className="bg-white border rounded-xl p-5 hover:shadow-md transition flex flex-col justify-between h-40">
                  <div>
                    <div className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{q.title}</div>
                    <div className="text-xs text-gray-500">{new Date(q.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <button onClick={() => setViewAttemptsQuiz({ id: q.quiz_id, title: q.title })} className="text-xs text-blue-600 hover:underline">
                      {q.attempts} Attempt{q.attempts!==1?'s':''}
                    </button>
                    <button onClick={() => nav(`/quiz?quizId=${q.quiz_id}`)} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-md hover:bg-blue-100 transition">
                      Start Quiz
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Flashcard Sets</h2>
            <button onClick={() => setActiveGenType("flashcards")} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition shadow-sm flex items-center gap-2">
              <Icons.Plus /> New Set
            </button>
          </div>

          {flashsets.length === 0 ? (
            <EmptyState msg="No flashcards yet. Generate a set to start memorizing." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* List of Sets */}
              <div className="md:col-span-1 space-y-2">
                {flashsets.map(s => (
                  <button
                    key={s.id}
                    onClick={() => openFlashcardSet(s.id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${activeSetId === s.id ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200" : "bg-white hover:bg-gray-50"}`}
                  >
                    <div className="text-sm font-medium text-gray-900">{s.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.count} Cards • {new Date(s.created_at).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>

              {/* Active Set View */}
              <div className="md:col-span-2">
                {activeSetId && activeCards.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {activeCards.map(c => {
                      const isFlipped = !!flipped[c.id];
                      return (
                        <div key={c.id} onClick={() => setFlipped(p => ({...p, [c.id]: !p[c.id]}))} className="relative h-48 cursor-pointer [perspective:1000px] group">
                          <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}>
                            <div className="absolute inset-0 bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between [backface-visibility:hidden]">
                              <div className="text-[10px] uppercase text-gray-400 font-bold">Front</div>
                              <div className="text-sm text-center font-medium text-gray-800 line-clamp-4">{c.front}</div>
                              <div className="text-xs text-center text-gray-300 group-hover:text-gray-400">Click to flip</div>
                            </div>
                            <div className="absolute inset-0 bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
                              <div className="text-[10px] uppercase text-slate-500 font-bold">Back</div>
                              <div className="text-sm text-center text-slate-200 leading-relaxed line-clamp-5">{c.back}</div>
                              <div className="text-xs text-center text-slate-600">Click to return</div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 border-2 border-dashed rounded-xl min-h-[200px]">
                    Select a set to view cards
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SUMMARY TAB --- */}
      {activeTab === "summary" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Document Summary</h2>
            <button onClick={() => setActiveGenType("summary")} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition shadow-sm flex items-center gap-2">
              <Icons.Plus /> {summary ? "Regenerate" : "Generate"}
            </button>
          </div>

          {!summary ? (
            <EmptyState msg="No summary generated yet." />
          ) : (
            <div className="bg-white border rounded-xl p-8 shadow-sm">
              {/* Here is the fix: Rendering content nicely */}
              <SimpleMarkdown content={summary.content} />
              <div className="mt-6 pt-4 border-t text-xs text-gray-400 text-right">
                Generated on {new Date(summary.created_at).toLocaleString()}
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
            // When generation finishes, we just reload the data so the new item appears
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

function TabButton({ label, icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${
        active 
          ? "border-blue-600 text-blue-600" 
          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
      <p className="text-gray-500">{msg}</p>
    </div>
  );
}

// A lightweight Markdown renderer (Zero dependency)
function SimpleMarkdown({ content }: { content: string }) {
  if (!content) return null;

  // 1. Split by double newlines to find paragraphs
  const paragraphs = content.split(/\n\n+/);

  return (
    <div className="space-y-4 text-gray-700 leading-relaxed">
      {paragraphs.map((block, i) => {
        // Check if block is a list
        if (block.trim().startsWith("- ") || block.trim().startsWith("* ")) {
          const items = block.split(/\n/).map(line => line.replace(/^[-*]\s+/, ""));
          return (
            <ul key={i} className="list-disc list-inside space-y-1 ml-2">
              {items.map((item, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
              ))}
            </ul>
          );
        }
        // Regular paragraph
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatInline(block) }} />;
      })}
    </div>
  );
}

// Basic formatter for **bold**
function formatInline(text: string) {
  // Escape HTML first to prevent injection
  let safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Replace **text** with <strong>text</strong>
  return safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}