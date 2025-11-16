// frontend/src/pages/DocDetailsPage.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import ProgressOverlay from "../components/ProgressOverlay";

type QuizItem = {
  quiz_id: number;
  title: string;
  document_id: number;
  document_name: string;
  created_at: string;
  attempts: number;
};

type Tab = "quizzes" | "flashcards" | "summary";

export default function DocDetailsPage() {
  const { id } = useParams();
  const docId = Number(id);
  const nav = useNavigate();
  const location = useLocation();
  const state = location.state as { docName?: string } | null;
  const docName = state?.docName || `Document #${docId}`;

  const [quizGenerating, setQuizGenerating] = useState(false);
  const [showQuizProgress, setShowQuizProgress] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("quizzes");
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryUpdatedAt, setSummaryUpdatedAt] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [flashcardSets, setFlashcardSets] = useState<
    { id: number; title: string; document_id: number; created_at: string | null; count: number }[]
  >([]);
  const [flashLoading, setFlashLoading] = useState(false);

  const [activeSetId, setActiveSetId] = useState<number | null>(null);
  const [cards, setCards] = useState<{ id: number; front: string; back: string }[]>([]);
  const [flippedById, setFlippedById] = useState<Record<number, boolean>>({});

  const [summaryEverLoaded, setSummaryEverLoaded] = useState(false);
  const [flashcardsEverLoaded, setFlashcardsEverLoaded] = useState(false);

  
  // Sync activeTab with the ?tab= query param if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");

    if (tab === "summary" || tab === "flashcards" || tab === "quizzes") {
      setActiveTab(tab as Tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (!docId || Number.isNaN(docId)) return;

    if (activeTab === "summary") {
      // Auto-load summary once when you first land on the Summary tab
      if (!summaryEverLoaded && !summaryLoading) {
        loadSummaryIfNeeded();
      }
    } else if (activeTab === "flashcards") {
      // Auto-load flashcards once when you first land on the Flashcards tab
      if (!flashcardsEverLoaded && !flashLoading) {
        loadFlashcardSets();
      }
    }
    // Quizzes tab already has its own loader
  }, [
    activeTab,
    docId,
    summaryEverLoaded,
    summaryLoading,
    flashcardsEverLoaded,
    flashLoading,
  ]);


  useEffect(() => {
    if (!docId || Number.isNaN(docId)) return;
    setLoading(true);
    api
      .get("/api/quizzes/mine", { params: { document_id: docId } })
      .then(({ data }) => setQuizzes(data.items || []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [docId]);

  async function refreshQuizzes() {
    if (!docId || Number.isNaN(docId)) return;
    setLoading(true);
    try {
      const { data } = await api.get("/api/quizzes/mine", {
        params: { document_id: docId },
      });
      setQuizzes(data.items || []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshQuizzes();
  }, [docId]);

  async function generateQuizForDoc() {
    if (!docId || Number.isNaN(docId)) return;
    setQuizGenerating(true);
    setShowQuizProgress(true);
    try {
      const { data } = await api.post("/api/quizzes/generate", {
        document_id: docId,
        title: "Auto Quiz",
        n: 5,
      });
      // Refresh the list so the new quiz appears in the tab
      await refreshQuizzes();
      // Optionally navigate straight to the quiz:
      // nav(`/quiz?quizId=${data.quiz_id}`);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || "Failed to generate quiz";
      if (status === 410) {
        alert(`${msg}\n\nTip: Re-upload this document and try again.`);
      } else {
        alert(msg);
      }
    } finally {
      setQuizGenerating(false);
      setShowQuizProgress(false);
    }
  }

  async function viewAttempts(quizId: number) {
    const { data } = await api.get(`/api/quizzes/${quizId}/attempts`);
    const text =
      data.items
        ?.map((a: any) => `${new Date(a.created_at).toLocaleString()}: ${a.score_pct}%`)
        .join("\n") || "No attempts yet.";
    alert(text);
  }

  async function loadSummaryIfNeeded() {
    if (!docId || Number.isNaN(docId)) return;
    setSummaryLoading(true);
    try {
      const { data } = await api.get(`/api/summaries/${docId}`);
      setSummaryText(data.summary || null);
      setSummaryUpdatedAt(data.created_at || null);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) {
        // no summary yet → keep null
        setSummaryText(null);
        setSummaryUpdatedAt(null);
      } else {
        alert(e?.response?.data?.error || "Failed to load summary");
      }
    } finally {
      setSummaryLoading(false);
      setSummaryEverLoaded(true);   // <-- mark that we've attempted at least once
    }
  }


  async function generateSummary() {
    if (!docId || Number.isNaN(docId)) return;
    setSummaryLoading(true);
    try {
      const { data } = await api.post("/api/summaries/generate", {
        document_id: docId,
      });
      setSummaryText(data.summary || null);
      setSummaryUpdatedAt(data.created_at || null);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Summary generation failed");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function loadFlashcardSets() {
    if (!docId || Number.isNaN(docId)) return;
    setFlashLoading(true);
    try {
      const { data } = await api.get("/api/flashcards", {
        params: { document_id: docId },
      });
      setFlashcardSets(data.items || []);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to load flashcards");
      setFlashcardSets([]);
    } finally {
      setFlashLoading(false);
      setFlashcardsEverLoaded(true);  // <-- mark one-time load attempt
    }
  }


  async function loadSetCards(setId: number) {
    setFlashLoading(true);
    try {
      const { data } = await api.get(`/api/flashcards/set/${setId}`);
      setActiveSetId(setId);
      setCards(data.cards || []);
      setFlippedById({});   // reset flip state when a new set is opened
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to load flashcard set");
      setCards([]);
      setActiveSetId(null);
      setFlippedById({});
    } finally {
      setFlashLoading(false);
    }
  }


  async function generateFlashcards() {
    if (!docId || Number.isNaN(docId)) return;
    setFlashLoading(true);
    try {
      const { data } = await api.post("/api/flashcards/generate", {
        document_id: docId,
        n: 12,
      });
      // After generating, reload sets and auto-open the new one
      await loadFlashcardSets();
      if (data.set_id) {
        await loadSetCards(data.set_id);
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || "Flashcard generation failed");
    } finally {
      setFlashLoading(false);
    }
  }



  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold break-all">{docName}</h2>
          <div className="text-xs text-gray-500">Document details</div>
        </div>
        <button
          onClick={() => nav("/docs")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to My Documents
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b text-sm">
        <button
          onClick={() => setActiveTab("quizzes")}
          className={
            "px-3 py-2 -mb-px border-b-2 " +
            (activeTab === "quizzes"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-blue-600")
          }
        >
          Quizzes
        </button>
        <button
          onClick={() => {
            setActiveTab("flashcards");
            loadFlashcardSets();
          }}
          className={
            "px-3 py-2 -mb-px border-b-2 " +
            (activeTab === "flashcards"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-blue-600")
          }
        >
          Flashcards
        </button>
        <button
          onClick={() => {
            setActiveTab("summary");
            loadSummaryIfNeeded();
          }}
          className={
            "px-3 py-2 -mb-px border-b-2 " +
            (activeTab === "summary"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-blue-600")
          }
        >
          Summary
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "quizzes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {quizzes.length
                ? `You have ${quizzes.length} quiz${quizzes.length > 1 ? "zes" : ""} for this document.`
                : "No quizzes yet for this document."}
            </div>
            <button
              onClick={generateQuizForDoc}
              disabled={quizGenerating}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded disabled:opacity-50 hover:bg-emerald-700"
            >
              {quizGenerating ? "Generating…" : quizzes.length ? "Generate another quiz" : "Generate first quiz"}
            </button>
          </div>

          {loading ? (
            <div>Loading quizzes…</div>
          ) : !quizzes.length ? (
            <div className="text-sm text-gray-500">
              After you generate a quiz, it will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {quizzes.map((q, idx) => (
                <div
                  key={q.quiz_id}
                  className="rounded border bg-white p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {/* Point 4: show Quiz 1 / Quiz 2 instead of Auto Quiz */}
                      {`Quiz ${idx + 1}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(q.created_at).toLocaleString()} • Attempts: {q.attempts}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => nav(`/quiz?quizId=${q.quiz_id}`)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => viewAttempts(q.quiz_id)}
                      className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-gray-100"
                    >
                      Attempts
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "flashcards" && (
        <div className="space-y-4">
          {flashLoading && (
            <div className="text-sm text-gray-600">Working on flashcards…</div>
          )}

          {/* Summary + generate button */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {flashcardSets.length
                ? `You have ${flashcardSets.length} set${flashcardSets.length > 1 ? "s" : ""} for this document.`
                : "No flashcards yet for this document."}
            </div>
            <button
              onClick={generateFlashcards}
              disabled={flashLoading}
              className="px-4 py-2 bg-emerald-600 text-white text-sm rounded disabled:opacity-50 hover:bg-emerald-700"
            >
              {flashcardSets.length ? "Generate another set" : "Generate flashcards"}
            </button>
          </div>

          {/* List of sets; clicking a set shows its cards directly underneath */}
          {flashcardSets.length > 0 && (
            <div className="space-y-2">
              {flashcardSets.map((s) => (
                <div key={s.id} className="rounded border bg-white px-3 py-2">
                  <button
                    onClick={() => loadSetCards(s.id)}
                    className="flex w-full items-center justify-between text-left text-sm"
                  >
                    <div>
                      <div className="font-medium">{s.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(s.created_at || "").toLocaleString()} • {s.count} cards
                      </div>
                    </div>
                    <div className="text-xs text-blue-600">
                      {activeSetId === s.id ? "Hide cards" : "View cards"}
                    </div>
                  </button>

                  {/* Cards for the active set appear right under that set */}
                  {activeSetId === s.id && cards.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-gray-500">
                        Click any card to flip between front and back.
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {cards.map((c) => {
                          const isFlipped = !!flippedById[c.id];
                          return (
                            <div
                              key={c.id}
                              className="relative h-36 [perspective:1000px] cursor-pointer"
                              onClick={() =>
                                setFlippedById((prev) => ({
                                  ...prev,
                                  [c.id]: !prev[c.id],
                                }))
                              }
                            >
                              <div
                                className="relative w-full h-full rounded-xl border bg-white shadow-sm"
                                style={{
                                  transformStyle: "preserve-3d",
                                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                                  transition: "transform 0.4s ease",
                                }}
                              >
                                {/* Front */}
                                <div
                                  className="absolute inset-0 flex flex-col justify-center px-3 py-2"
                                  style={{ backfaceVisibility: "hidden" }}
                                >
                                  <div className="text-[10px] uppercase text-gray-500 mb-1">
                                    Front
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap line-clamp-5">
                                    {c.front}
                                  </div>
                                </div>

                                {/* Back */}
                                <div
                                  className="absolute inset-0 flex flex-col justify-center px-3 py-2"
                                  style={{
                                    backfaceVisibility: "hidden",
                                    transform: "rotateY(180deg)",
                                  }}
                                >
                                  <div className="text-[10px] uppercase text-gray-500 mb-1">
                                    Back
                                  </div>
                                  <div className="text-sm whitespace-pre-wrap line-clamp-5">
                                    {c.back}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "summary" && (
        <div className="space-y-3">
          {summaryLoading && (
            <div className="text-sm text-gray-600">
              {summaryText ? "Updating summary…" : "Generating summary…"}
            </div>
          )}

          {!summaryLoading && !summaryText && (
            <div className="text-sm text-gray-700">
              No summary has been generated for this document yet.
            </div>
          )}

          {summaryText && (
            <div className="rounded border bg-white p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {summaryText}
              {summaryUpdatedAt && (
                <div className="mt-2 text-xs text-gray-500">
                  Last updated: {new Date(summaryUpdatedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded disabled:opacity-50 hover:bg-blue-700"
          >
            {summaryText ? "Regenerate summary" : "Generate summary"}
          </button>
        </div>
      )}

      {showQuizProgress && (
        <ProgressOverlay
          title="Generating your quiz"
          messages={[
            "Extracting content…",
            "Identifying key concepts…",
            "Formulating questions…",
            "Balancing distractors…",
            "Finalizing quiz…",
          ]}
        />
      )}

    </div>
  );
}
