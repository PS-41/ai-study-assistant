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
          onClick={() => setActiveTab("flashcards")}
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
        <div className="text-sm text-gray-700">
          Flashcards for this document will appear here.
          <br />
          In the next steps, we&apos;ll add an option to generate a flashcard deck from this file
          and review it in a card-flip view.
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
