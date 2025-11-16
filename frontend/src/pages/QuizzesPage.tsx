import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

type AttemptItem = {
  id: number;
  score_pct: number;
  created_at: string;
};

type QuizItem = {
  quiz_id: number;
  title: string;
  document_id: number;
  document_name: string;
  created_at: string;
  attempts: number;
};

export default function QuizzesPage() {
  const [items, setItems] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Which quizzes have their attempts panel open
  const [openQuizIds, setOpenQuizIds] = useState<Record<number, boolean>>({});
  const [attempts, setAttempts] = useState<Record<number, AttemptItem[]>>({});
  const [attemptsLoading, setAttemptsLoading] = useState<
    Record<number, boolean>
  >({});

  const nav = useNavigate();

  useEffect(() => {
    api
      .get("/api/quizzes/mine")
      .then(({ data }) => setItems(data.items))
      .catch((e: any) => {
        if (e?.response?.status === 401) nav("/login");
        else setItems([]);
      })
      .finally(() => setLoading(false));
  }, [nav]);

  async function toggleAttempts(quizId: number) {
    const isOpen = !!openQuizIds[quizId];

    if (isOpen) {
      // Close just this quiz's panel
      setOpenQuizIds((prev) => ({ ...prev, [quizId]: false }));
      return;
    }

    // Open this quiz's panel (without closing others)
    setOpenQuizIds((prev) => ({ ...prev, [quizId]: true }));

    // If we already loaded attempts once, don't refetch
    if (attempts[quizId]) return;

    setAttemptsLoading((prev) => ({ ...prev, [quizId]: true }));
    try {
      const { data } = await api.get(`/api/quizzes/${quizId}/attempts`);
      setAttempts((prev) => ({ ...prev, [quizId]: data.items || [] }));
    } finally {
      setAttemptsLoading((prev) => ({ ...prev, [quizId]: false }));
    }
  }

  if (loading) return <div>Loading…</div>;
  if (!items.length)
    return <div>No quizzes yet. Generate one from your documents.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Quizzes</h2>
      <div className="grid gap-3">
        {items.map((q) => {
          const displayTitle =
            q.title && q.title !== "Auto Quiz"
              ? q.title
              : `${q.document_name} Quiz`;
          const isOpen = !!openQuizIds[q.quiz_id];

          return (
            <div key={q.quiz_id} className="rounded border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{displayTitle}</div>
                  <div className="text-xs text-gray-500">
                    Doc: {q.document_name} •{" "}
                    {new Date(q.created_at).toLocaleString()} • Attempts:{" "}
                    {q.attempts}
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
                    onClick={() => toggleAttempts(q.quiz_id)}
                    className="px-3 py-1 bg-gray-200 rounded"
                  >
                    {isOpen ? "Hide attempts" : "Attempts"}
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 rounded border bg-gray-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-700">
                      Attempts
                    </div>
                    <button
                      onClick={() => toggleAttempts(q.quiz_id)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Close
                    </button>
                  </div>

                  {attemptsLoading[q.quiz_id] && (
                    <div className="text-sm text-gray-500">
                      Loading attempts…
                    </div>
                  )}

                  {!attemptsLoading[q.quiz_id] &&
                    (attempts[q.quiz_id]?.length ? (
                      <div className="space-y-2">
                        {attempts[q.quiz_id].map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between text-sm bg-white rounded border px-2 py-1"
                          >
                            <div>
                              <div>
                                {new Date(a.created_at).toLocaleString()}
                              </div>
                              <div className="text-gray-500">
                                Score: {a.score_pct}%
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                nav(
                                  `/quiz?quizId=${q.quiz_id}&attemptId=${a.id}`
                                )
                              }
                              className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs"
                            >
                              View
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        No attempts yet.
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
