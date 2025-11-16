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

type AttemptAnswerDto = {
  question_id: number;
  prompt: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  user_answer: string;
  is_correct: boolean;
};

export default function QuizPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  const quizId = Number(params.get("quizId"));
  const attemptIdParam = params.get("attemptId");
  const attemptId = attemptIdParam ? Number(attemptIdParam) : null;
  const isReplay = !!attemptId;

  const [loading, setLoading] = useState(true);
  const [qs, setQs] = useState<Q[]>([]);
  const [sel, setSel] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resultDetails, setResultDetails] = useState<
    Record<number, { is_correct: boolean; user_answer: string }>
  >({});
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    pct: number;
  } | null>(null);

  // Answers state (for "View answers")
  const [showAnswers, setShowAnswers] = useState(false);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, A>>({}); // keyed by question id

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        if (isReplay && attemptId) {
          // -------- REPLAY MODE: load full quiz + specific attempt --------

          // 1) Always load the full quiz questions so we show ALL questions
          const quizRes = await api.get(`/api/quizzes/${quizId}`);
          const questions: Q[] = quizRes.data.questions || [];
          setQs(questions);

          // 2) Then load this specific attempt’s answers
          const { data } = await api.get(
            `/api/quizzes/${quizId}/attempts/${attemptId}`
          );

          const ansList: AttemptAnswerDto[] = data.answers || [];

          // Pre-fill selected answers and correctness map
          const selMap: Record<number, string> = {};
          const detailsMap: Record<
            number,
            { is_correct: boolean; user_answer: string }
          > = {};

          ansList.forEach((a) => {
            selMap[a.question_id] = a.user_answer;
            detailsMap[a.question_id] = {
              is_correct: !!a.is_correct,
              user_answer: String(a.user_answer || ""),
            };
          });

          setSel(selMap);
          setResultDetails(detailsMap);
          setSubmitted(true); // so we show correctness highlights
          setScore(data.score_pct ?? null);

          // We keep your existing result calculation for now
          const total = ansList.length || 0;
          const correctCount = ansList.filter((a) => a.is_correct).length;
          setResult(
            total
              ? {
                  correct: correctCount,
                  total,
                  pct: data.score_pct ?? Math.round((correctCount / total) * 100),
                }
              : null
          );

          // Do NOT auto-open result modal in replay mode
          setResultOpen(false);
          setShowAnswers(false);
          setAnswers({});
        } else {
          // -------- NORMAL MODE: load quiz questions --------
          api
            .get(`/api/quizzes/${quizId}`)
            .then(({ data }) => {
              setQs(data.questions || []);
              setSel({});
              setScore(null);
              setShowAnswers(false);
              setAnswers({});
              setSubmitted(false);
              setResultDetails({});
              setResult(null);
              setResultOpen(false);
            })
            .catch(() => {
              alert("Quiz not found.");
              nav("/");
            });
        }
      } catch (e: any) {
        alert(e?.response?.data?.error || "Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [quizId, nav, isReplay, attemptId]);

  async function submit() {
    if (isReplay) {
      // Replay is read-only; don't allow submitting again
      return;
    }

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
      setResult({
        correct: data.correct,
        total: data.total,
        pct: data.score_pct,
      });
      setResultOpen(true); // open modal

      const map: Record<number, { is_correct: boolean; user_answer: string }> =
        {};
      (data.details || []).forEach((d: any) => {
        map[d.question_id] = {
          is_correct: !!d.is_correct,
          user_answer: String(d.user_answer || ""),
        };
      });
      setResultDetails(map);
      setSubmitted(true);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAnswers() {
    const next = !showAnswers;
    setShowAnswers(next);
    if (!next) return; // hiding → nothing to fetch

    // fetch once
    if (Object.keys(answers).length > 0) return;

    setAnswersLoading(true);
    try {
      const { data } = await api.get(`/api/quizzes/${quizId}/answers`);
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
        <div>
          <h2 className="text-xl font-semibold">
            Quiz{isReplay ? " (view attempt)" : ""}
          </h2>
          {isReplay && result && (
            <div className="text-xs text-gray-500">
              Viewing a past attempt: {result.correct} / {result.total} (
              {result.pct}%)
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleAnswers}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            {showAnswers ? "Hide answers" : "View answers"}
          </button>
          <button
            onClick={() => nav(-1)}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            Back
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

          const detail = resultDetails[q.id];
          const chosenIsCorrect = submitted && detail?.is_correct === true;
          const chosenIsWrong = submitted && detail?.is_correct === false;

          return (
            <div key={q.id} className="rounded border bg-white p-4">
              <div className="font-medium mb-2">
                Q{i + 1}. {q.prompt}
              </div>
              <div className="grid gap-2">
                {q.options.map((opt, idx) => {
                  const isChosen = chosen === opt;

                  // For “View Answers” mode (show all correct answers)
                  const isCorrectReveal = reveal && a?.answer === opt;

                  // After submit, chosen correct → green
                  const chosenCorrectAfterSubmit =
                    chosenIsCorrect && isChosen;

                  // NEW: in normal mode, chosen wrong after submit → red
                  const wrongAfterSubmit =
                    !isReplay && chosenIsWrong && isChosen;

                  // In REPLAY mode, chosen wrong → red (even without View Answers)
                  const wrongInReplay =
                    isReplay && chosenIsWrong && isChosen;

                  const classes = [
                    "flex items-center gap-2 rounded border p-2 cursor-pointer",
                    // green if correct (either revealed or correct chosen after submit)
                    isCorrectReveal ? "border-emerald-500 bg-emerald-50" : "",
                    chosenCorrectAfterSubmit
                      ? "border-emerald-500 bg-emerald-50"
                      : "",
                    // red when:
                    // - in View Answers + chosen wrong, OR
                    // - in replay mode and chosen wrong, OR
                    // - in normal mode after submit and chosen wrong
                    (!isCorrectReveal && reveal && isChosen) ||
                    wrongInReplay ||
                    wrongAfterSubmit
                      ? "border-red-400 bg-red-50"
                      : "",
                  ].join(" ");

                  return (
                    <label key={idx} className={classes}>
                      <input
                        type="radio"
                        name={`q_${q.id}`}
                        checked={isChosen}
                        disabled={isReplay} // still read-only in replay mode
                        onChange={() => {
                          if (isReplay) return;

                          // Update selection
                          setSel((prev) => ({ ...prev, [q.id]: opt }));

                          // If we already submitted, changing this answer should clear
                          // correctness info for JUST this question so colors reset.
                          setResultDetails((prev) => {
                            if (!submitted) return prev;
                            const { [q.id]: _ignored, ...rest } = prev;
                            return rest;
                          });
                        }}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>

              {reveal && a && (
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

      <div className="pt-2 flex items-center gap-3">
        {!isReplay && (
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit answers"}
          </button>
        )}
        {answersLoading && (
          <span className="text-sm text-gray-600">Loading answers…</span>
        )}
      </div>

      {resultOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold">Result</h3>
              <button
                onClick={() => setResultOpen(false)}
                className="ml-4 text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold">
                {result.correct} / {result.total}
              </div>
              <div className="text-sm text-gray-600">
                Score: {result.pct}%
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setResultOpen(false)}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  // Ensure answers are loaded & visible
                  if (!showAnswers) await toggleAnswers();
                  setResultOpen(false);
                }}
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                View answers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
