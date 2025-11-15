// frontend/src/pages/DocDetailsPage.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";

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
  const location = useLocation() as { state?: { docName?: string } };
  const docName = location.state?.docName || `Document #${docId}`;

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
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);


  useEffect(() => {
    if (!docId || Number.isNaN(docId)) return;
    setLoading(true);
    api
      .get("/api/quizzes/mine", { params: { document_id: docId } })
      .then(({ data }) => setQuizzes(data.items || []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, [docId]);

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
    }
  }

  async function loadSetCards(setId: number) {
    setFlashLoading(true);
    try {
      const { data } = await api.get(`/api/flashcards/set/${setId}`);
      setActiveSetId(setId);
      setCards(data.cards || []);
      setReviewIndex(0);
      setShowBack(false);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to load flashcard set");
      setCards([]);
      setActiveSetId(null);
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
        <div>
          {loading ? (
            <div>Loading quizzes…</div>
          ) : !quizzes.length ? (
            <div>No quizzes for this document yet. Generate one from My Documents.</div>
          ) : (
            <div className="grid gap-3">
              {quizzes.map((q) => (
                <div
                  key={q.quiz_id}
                  className="rounded border bg-white p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">{q.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(q.created_at).toLocaleString()} • Attempts: {q.attempts}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => nav(`/quiz?quizId=${q.quiz_id}`)}
                      className="px-3 py-1 bg-blue-600 text-white rounded"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => viewAttempts(q.quiz_id)}
                      className="px-3 py-1 bg-gray-200 rounded"
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

          {/* Controls */}
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

          {/* List of sets */}
          {flashcardSets.length > 0 && (
            <div className="grid gap-2">
              {flashcardSets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSetCards(s.id)}
                  className={
                    "flex items-center justify-between rounded border bg-white px-3 py-2 text-left text-sm " +
                    (activeSetId === s.id ? "border-blue-500" : "border-gray-200 hover:border-gray-400")
                  }
                >
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(s.created_at || "").toLocaleString()} • {s.count} cards
                    </div>
                  </div>
                  <div className="text-xs text-blue-600">Review</div>
                </button>
              ))}
            </div>
          )}

          {/* Review UI */}
          {activeSetId && cards.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="text-xs text-gray-500">
                Card {reviewIndex + 1} of {cards.length}
              </div>
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-xs uppercase text-gray-500 mb-1">
                  {showBack ? "Back" : "Front"}
                </div>
                <div className="text-sm whitespace-pre-wrap">
                  {showBack ? cards[reviewIndex].back : cards[reviewIndex].front}
                </div>
              </div>
              <div className="flex gap-2">
                {!showBack ? (
                  <button
                    onClick={() => setShowBack(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Show answer
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        // Again: stay on same card but flip front
                        setShowBack(false);
                      }}
                      className="px-4 py-2 bg-gray-200 text-sm rounded hover:bg-gray-300"
                    >
                      Again
                    </button>
                    <button
                      onClick={() => {
                        // Got it: go to next card
                        const next = reviewIndex + 1;
                        if (next < cards.length) {
                          setReviewIndex(next);
                          setShowBack(false);
                        } else {
                          // Loop back for now
                          setReviewIndex(0);
                          setShowBack(false);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                    >
                      Got it
                    </button>
                  </>
                )}
              </div>
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

    </div>
  );
}
