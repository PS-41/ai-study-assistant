import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Q = {
  id: number;
  type: string;
  prompt: string;
  options: string[];
};

type A = {
  id: number;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export default function QuizPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const quizId = Number(params.get("quizId"));

  const [loading, setLoading] = useState(true);
  const [qs, setQs] = useState<Q[]>([]);
  const [sel, setSel] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  // Answers state
  const [showAnswers, setShowAnswers] = useState(false);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, A>>({}); // keyed by question id

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    api
      .get(`/api/quizzes/${quizId}`)
      .then(({ data }) => {
        setQs(data.questions || []);
        setSel({});
        setScore(null);
        setShowAnswers(false);
        setAnswers({});
      })
      .catch(() => {
        alert("Quiz not found.");
        nav("/");
      })
      .finally(() => setLoading(false));
  }, [quizId, nav]);

  async function submit() {
    setSubmitting(true);
    try {
      const payload = {
        quiz_id: quizId,
        answers: Object.entries(sel).map(([qid, user_answer]) => ({
          question_id: Number(qid),
          user_answer,
        })),
      };
      const { data } = await api.post("/api/quizzes/attempt", payload);
      setScore(data.score_pct);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAnswers() {
    const next = !showAnswers;
    setShowAnswers(next);
    if (!next) return; // hiding -> nothing to fetch

    // fetch once
    if (Object.keys(answers).length > 0) return;

    setAnswersLoading(true);
    try {
      const { data } = await api.get(`/api/quizzes/${quizId}/answers`);
      // Shape into a dict keyed by qid
      const dict: Record<number, A> = {};
      for (const a of (data.answers || []) as A[]) dict[a.id] = a;
      setAnswers(dict);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || "Unable to load answers";
      if (status === 401) {
        alert("Please log in to view answers.");
        setShowAnswers(false);
        nav("/login");
      } else if (status === 403) {
        alert("You do not have permission to view answers for this quiz.");
        setShowAnswers(false);
      } else {
        alert(msg);
        setShowAnswers(false);
      }
    } finally {
      setAnswersLoading(false);
    }
  }

  if (!quizId) return <div>Invalid quiz.</div>;
  if (loading) return <div>Loading…</div>;
  if (!qs.length) return <div>No questions in this quiz.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Quiz #{quizId}</h2>
        <div className="flex gap-2">
          <button
            onClick={toggleAnswers}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            {showAnswers ? "Hide answers" : "View answers"}
          </button>
        </div>
      </div>

      {typeof score === "number" && (
        <div className="rounded border bg-white p-3">
          <div className="font-medium">Your score: {score}%</div>
        </div>
      )}

      <div className="space-y-3">
        {qs.map((q, i) => {
          const chosen = sel[q.id] || "";
          const a = answers[q.id];
          const reveal = showAnswers && !!a;
          return (
            <div key={q.id} className="rounded border bg-white p-4">
              <div className="font-medium mb-2">
                Q{i + 1}. {q.prompt}
              </div>
              <div className="grid gap-2">
                {q.options.map((opt, idx) => {
                  const isCorrect = reveal && a?.answer === opt;
                  const isChosen = chosen === opt;
                  return (
                    <label
                      key={idx}
                      className={[
                        "flex items-center gap-2 rounded border p-2 cursor-pointer",
                        isCorrect ? "border-emerald-500 bg-emerald-50" : "",
                        !isCorrect && reveal && isChosen ? "border-red-400 bg-red-50" : "",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name={`q_${q.id}`}
                        checked={isChosen}
                        onChange={() =>
                          setSel((prev) => ({ ...prev, [q.id]: opt }))
                        }
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              {reveal && (
                <div className="mt-3 text-sm">
                  <div>
                    <span className="font-medium">Answer: </span>
                    <span className="text-emerald-700">{a.answer}</span>
                  </div>
                  {a.explanation && (
                    <div className="text-gray-700 mt-1">
                      <span className="font-medium">Why: </span>
                      {a.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <button
          onClick={submit}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit answers"}
        </button>
        {answersLoading && (
          <span className="ml-3 text-sm text-gray-600">Loading answers…</span>
        )}
      </div>
    </div>
  );
}
