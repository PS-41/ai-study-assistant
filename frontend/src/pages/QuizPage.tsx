// frontend/src/pages/QuizPage.tsx
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

  const [showAnswers, setShowAnswers] = useState(false);
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, A>>({}); 

  useEffect(() => {
    if (!quizId) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        if (isReplay && attemptId) {
          const quizRes = await api.get(`/api/quizzes/${quizId}`);
          const questions: Q[] = quizRes.data.questions || [];
          setQs(questions);

          const { data } = await api.get(
            `/api/quizzes/${quizId}/attempts/${attemptId}`
          );

          const ansList: AttemptAnswerDto[] = data.answers || [];
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
          setSubmitted(true);
          setScore(data.score_pct ?? null);

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

          setResultOpen(false);
          setShowAnswers(false);
          setAnswers({});
        } else {
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
    if (isReplay) return;

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
      setResultOpen(true); 

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
    if (!next) return;

    if (Object.keys(answers).length > 0) return;

    setAnswersLoading(true);
    try {
      const { data } = await api.get(`/api/quizzes/${quizId}/answers`);
      const dict: Record<number, A> = {};
      for (const a of (data.answers || []) as A[]) dict[a.id] = a;
      setAnswers(dict);
    } catch (e: any) {
        // Error handling preserved
      const status = e?.response?.status;
      if (status === 401) {
        nav("/login");
      } else if (status === 403) {
        alert("Permission denied.");
      } else {
        alert("Unable to load answers.");
      }
      setShowAnswers(false);
    } finally {
      setAnswersLoading(false);
    }
  }

  if (!quizId) return <div className="p-8 text-center text-gray-500">Invalid quiz.</div>;
  if (loading) return <div className="p-8 text-center text-gray-500">Loading quiz...</div>;
  if (!qs.length) return <div className="p-8 text-center text-gray-500">No questions in this quiz.</div>;

  const progress = Math.round((Object.keys(sel).length / qs.length) * 100);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Top Bar */}
      <div className="bg-white border-b shadow-sm sticky top-16 z-20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg></span>
              Quiz Session {isReplay && <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">Review Mode</span>}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
             {/* Score Badge */}
            {typeof score === "number" && (
              <div className={`px-3 py-1 rounded-full text-sm font-bold ${score >= 70 ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                Score: {score}%
              </div>
            )}
            
            <button onClick={() => nav(-1)} className="text-sm text-gray-500 hover:text-gray-800 font-medium px-3 py-1.5 hover:bg-gray-100 rounded-lg transition">
              Exit
            </button>
          </div>
        </div>
        
        {/* Progress Bar (Only in active mode) */}
        {!isReplay && !submitted && (
            <div className="w-full h-1 bg-gray-100">
                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Controls for review */}
        {(submitted || isReplay) && (
            <div className="flex justify-end mb-4">
                <button
                    onClick={toggleAnswers}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                    {answersLoading ? "Loading..." : showAnswers ? "Hide Correct Answers" : "Show Correct Answers"}
                </button>
            </div>
        )}

        {qs.map((q, i) => {
          const chosen = sel[q.id] || "";
          const a = answers[q.id];
          const reveal = showAnswers && !!a;

          const detail = resultDetails[q.id];
          const chosenIsCorrect = submitted && detail?.is_correct === true;
          const chosenIsWrong = submitted && detail?.is_correct === false;

          return (
            <div key={q.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Question {i + 1}</span>
                <h3 className="text-lg font-medium text-gray-900 leading-relaxed">{q.prompt}</h3>
              </div>
              
              <div className="p-6 space-y-3">
                {q.options.map((opt, idx) => {
                  const isChosen = chosen === opt;
                  const isCorrectReveal = reveal && a?.answer === opt;
                  const chosenCorrectAfterSubmit = chosenIsCorrect && isChosen;
                  const wrongAfterSubmit = !isReplay && chosenIsWrong && isChosen;
                  const wrongInReplay = isReplay && chosenIsWrong && isChosen;

                  // Determine styles
                  let containerClass = "relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ";
                  let circleClass = "w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4 flex-shrink-0 transition-colors ";
                  let textClass = "text-gray-700";

                  if (isCorrectReveal || chosenCorrectAfterSubmit) {
                      containerClass += "border-emerald-500 bg-emerald-50 ";
                      circleClass += "border-emerald-500 bg-emerald-500 text-white ";
                      textClass = "text-emerald-900 font-medium";
                  } else if (wrongAfterSubmit || wrongInReplay) {
                      containerClass += "border-red-200 bg-red-50 ";
                      circleClass += "border-red-400 bg-red-400 text-white ";
                      textClass = "text-red-900";
                  } else if (isChosen) {
                      containerClass += "border-blue-500 bg-blue-50 ";
                      circleClass += "border-blue-500 bg-blue-500 text-white ";
                      textClass = "text-blue-900 font-medium";
                  } else {
                      containerClass += "border-gray-200 hover:border-blue-200 hover:bg-gray-50 ";
                      circleClass += "border-gray-300 ";
                  }

                  // Disabled state
                  if (isReplay || submitted) {
                      containerClass += "cursor-default ";
                  }

                  return (
                    <label key={idx} className={containerClass}>
                      <input
                        type="radio"
                        name={`q_${q.id}`}
                        className="hidden"
                        checked={isChosen}
                        disabled={isReplay || submitted} // Disable after submit
                        onChange={() => {
                          if (isReplay || submitted) return;
                          setSel((prev) => ({ ...prev, [q.id]: opt }));
                        }}
                      />
                      <div className={circleClass}>
                        {isChosen && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className={textClass}>{opt}</span>
                      
                      {/* Status Icons */}
                      {(isCorrectReveal || chosenCorrectAfterSubmit) && (
                          <div className="absolute right-4 text-emerald-600">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                      )}
                      {(wrongAfterSubmit || wrongInReplay) && (
                          <div className="absolute right-4 text-red-500">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </div>
                      )}
                    </label>
                  );
                })}
              </div>

              {reveal && a && (
                <div className="px-6 pb-6 pt-0 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-emerald-800">Correct Answer:</span>
                        <span className="font-mono font-semibold text-emerald-700">{a.answer}</span>
                    </div>
                    {a.explanation && (
                      <div className="text-emerald-900/80 mt-1 leading-relaxed">
                        <span className="font-semibold">Explanation: </span>
                        {a.explanation}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Action Bar */}
      {!isReplay && !submitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="text-sm text-gray-500">
                    {Object.keys(sel).length} of {qs.length} answered
                </div>
                <button
                    onClick={submit}
                    disabled={submitting}
                    className="px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                    {submitting ? "Submitting..." : "Submit Quiz"}
                </button>
            </div>
        </div>
      )}

      {/* Result Modal */}
      {resultOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl relative transform transition-all scale-100">
            <button
                onClick={() => setResultOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
                ✕
            </button>
            
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 mb-4 relative">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-blue-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-blue-600" strokeDasharray={`${result.pct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    <span className="absolute text-2xl font-bold text-blue-700">{result.pct}%</span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-1">Quiz Complete!</h3>
                <p className="text-gray-500 mb-6">You got {result.correct} out of {result.total} questions correct.</p>
                
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setResultOpen(false)}
                        className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                    >
                        Close
                    </button>
                    <button
                        onClick={async () => {
                        if (!showAnswers) await toggleAnswers();
                        setResultOpen(false);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-sm transition"
                    >
                        View Answers
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}