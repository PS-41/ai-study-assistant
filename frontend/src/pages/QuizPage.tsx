// frontend/src/pages/QuizPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

// --- Types ---
type Q = {
  id: number;
  type: string; // 'mcq' | 'true_false' | 'short_answer'
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

// --- Icons ---
const Icons = {
  Eye: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>,
  Refresh: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>,
  Exit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
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

    // If we already fetched answers, don't fetch again
    if (Object.keys(answers).length > 0) return;

    setAnswersLoading(true);
    try {
      const { data } = await api.get(`/api/quizzes/${quizId}/answers`);
      const dict: Record<number, A> = {};
      for (const a of (data.answers || []) as A[]) dict[a.id] = a;
      setAnswers(dict);
    } catch (e: any) {
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

  // Reloads the page in a clean state
  function retakeQuiz() {
    // Navigate to the quiz URL without the attemptId, forcing a refresh if needed
    if (isReplay) {
      nav(`/quiz?quizId=${quizId}`);
    } else {
      // If we are already on the clean URL but just finished submitting, we need to reset state
      window.location.reload();
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
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-600 p-1.5 rounded-md">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
            </div>
            <h2 className="text-base font-bold text-gray-800">
              Quiz Session {isReplay && <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2 border">Review Mode</span>}
            </h2>
          </div>
          
          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* Score Badge */}
            {typeof score === "number" && (
              <div className={`hidden sm:block px-3 py-1 rounded-full text-xs font-bold border ${score >= 70 ? "bg-green-50 text-green-700 border-green-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}>
                Score: {score}%
              </div>
            )}

            {/* Show Answers Toggle (Always Available) */}
            <button
                onClick={toggleAnswers}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition border ${
                    showAnswers 
                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
                title={showAnswers ? "Hide Correct Answers" : "Show Correct Answers"}
            >
                {answersLoading ? (
                    <span className="animate-spin">⌛</span>
                ) : showAnswers ? (
                    <><Icons.EyeOff /> <span className="hidden sm:inline">Hide Answers</span></>
                ) : (
                    <><Icons.Eye /> <span className="hidden sm:inline">Show Answers</span></>
                )}
            </button>

            {/* Retake Button (Visible if submitted or replay) */}
            {(submitted || isReplay) && (
                <button 
                    onClick={retakeQuiz}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                    <Icons.Refresh /> <span className="hidden sm:inline">Retake</span>
                </button>
            )}
            
            <div className="w-px h-4 bg-gray-300 mx-1"></div>

            <button onClick={() => nav(-1)} className="text-gray-400 hover:text-gray-700 p-1.5 transition" title="Exit">
              <Icons.Exit />
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

      {/* Quiz Content */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {qs.map((q, i) => {
          const chosen = sel[q.id] || "";
          const a = answers[q.id];
          const reveal = showAnswers && !!a;

          const detail = resultDetails[q.id];
          const chosenIsCorrect = submitted && detail?.is_correct === true;
          const chosenIsWrong = submitted && detail?.is_correct === false;

          // Determine Question Type
          const isMCQ = !q.type || q.type === "mcq"; // Default to MCQ if missing
          const isTF = q.type === "true_false";
          const isSA = q.type === "short_answer";

          return (
            <div key={q.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                submitted 
                  ? (chosenIsCorrect ? "border-emerald-200 ring-1 ring-emerald-100" : "border-red-200 ring-1 ring-red-100") 
                  : "border-gray-200"
            }`}>
              {/* Question Header */}
              <div className={`p-5 border-b ${submitted ? (chosenIsCorrect ? "bg-emerald-50/30" : "bg-red-50/30") : "bg-gray-50/30 border-gray-50"}`}>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Question {i + 1}</span>
                        <h3 className="text-base font-medium text-gray-900 leading-relaxed">{q.prompt}</h3>
                    </div>
                    {/* Result Icon */}
                    {submitted && (
                        <div className={`ml-3 ${chosenIsCorrect ? "text-emerald-500" : "text-red-500"}`}>
                            {chosenIsCorrect ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            )}
                        </div>
                    )}
                </div>
              </div>
              
              {/* Body based on type */}
              <div className="p-5">
                
                {/* MCQ & True/False (Radio) */}
                {(isMCQ || isTF) && (
                    <div className="space-y-2">
                        {q.options.map((opt, idx) => {
                            const isChosen = chosen === opt;
                            const isCorrectAnswer = reveal && a?.answer === opt; // For Show Answers
                            
                            const chosenCorrectAfterSubmit = chosenIsCorrect && isChosen;
                            const wrongAfterSubmit = !isReplay && chosenIsWrong && isChosen;
                            const wrongInReplay = isReplay && chosenIsWrong && isChosen;

                            // Style Logic
                            let styleClass = "relative flex items-center p-3 rounded-lg border cursor-pointer transition-all text-sm ";
                            let dotClass = "w-4 h-4 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 ";
                            let textClass = "text-gray-700";

                            if (isCorrectAnswer || chosenCorrectAfterSubmit) {
                                styleClass += "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-200 ";
                                dotClass += "border-emerald-500 bg-emerald-500 text-white ";
                                textClass = "text-emerald-900 font-medium";
                            } else if (wrongAfterSubmit || wrongInReplay) {
                                styleClass += "border-red-200 bg-red-50/50 ";
                                dotClass += "border-red-400 bg-red-400 text-white ";
                                textClass = "text-red-900";
                            } else if (isChosen) {
                                styleClass += "border-blue-500 bg-blue-50/50 ";
                                dotClass += "border-blue-500 bg-blue-500 text-white ";
                                textClass = "text-blue-900 font-medium";
                            } else {
                                styleClass += "border-gray-200 hover:bg-gray-50 ";
                                dotClass += "border-gray-300 ";
                            }

                            if (isReplay || submitted) styleClass += "cursor-default ";

                            return (
                                <label key={idx} className={styleClass}>
                                    <input 
                                        type="radio" 
                                        name={`q_${q.id}`} 
                                        className="hidden" 
                                        checked={isChosen}
                                        disabled={isReplay || submitted}
                                        onChange={() => !isReplay && !submitted && setSel(p => ({...p, [q.id]: opt}))}
                                    />
                                    <div className={dotClass}>
                                        {isChosen && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                    </div>
                                    <span className={textClass}>
                                        {opt}
                                    </span>
                                    
                                    {/* Status Icons within Option */}
                                    {(isCorrectAnswer || chosenCorrectAfterSubmit) && (
                                        <div className="absolute right-4 text-emerald-600">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                    )}
                                    {(wrongAfterSubmit || wrongInReplay) && (
                                        <div className="absolute right-4 text-red-500">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </div>
                                    )}
                                </label>
                            )
                        })}
                    </div>
                )}

                {/* Short Answer (Textarea) */}
                {isSA && (
                    <div className="space-y-3">
                        <textarea
                            className={`w-full border rounded-lg p-3 text-sm focus:outline-none transition-all ${
                                submitted 
                                ? (chosenIsCorrect ? "border-emerald-300 bg-emerald-50/20 text-emerald-900" : "border-red-300 bg-red-50/20 text-red-900")
                                : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            }`}
                            rows={3}
                            placeholder="Type your answer here..."
                            value={chosen}
                            onChange={(e) => {
                                if(!submitted && !isReplay) setSel(p => ({...p, [q.id]: e.target.value}))
                            }}
                            disabled={submitted || isReplay}
                        />
                        {submitted && (
                            <div className={`text-xs font-medium ${chosenIsCorrect ? "text-emerald-600" : "text-red-600"}`}>
                                {chosenIsCorrect ? "AI Assessment: Correct" : "AI Assessment: Incorrect / Incomplete"}
                            </div>
                        )}
                    </div>
                )}

                {/* Reveal Answer Section */}
                {reveal && a && (
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200 animate-in fade-in">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Correct Answer</p>
                            <p className="text-sm font-medium text-emerald-900 mb-2">{a.answer}</p>
                            {a.explanation && <p className="text-xs text-emerald-800/80 leading-relaxed">{a.explanation}</p>}
                        </div>
                    </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Bar - only if active */}
      {!isReplay && !submitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="text-xs text-gray-500 font-medium">
                    {Object.keys(sel).length} of {qs.length} answered
                </div>
                <button
                    onClick={submit}
                    disabled={submitting}
                    className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                    {submitting ? "Submitting..." : "Submit Quiz"}
                </button>
            </div>
        </div>
      )}

      {/* Result Modal */}
      {resultOpen && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl relative transform transition-all scale-100">
            <button
                onClick={() => setResultOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
                ✕
            </button>
            
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-50 mb-4 relative">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-blue-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-blue-600" strokeDasharray={`${result.pct}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                    </svg>
                    <span className="absolute text-lg font-bold text-blue-700">{result.pct}%</span>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-1">Quiz Complete!</h3>
                <p className="text-sm text-gray-500 mb-6">You got {result.correct} out of {result.total} questions correct.</p>
                
                <div className="flex flex-col gap-2">
                    <button
                        onClick={async () => {
                            // Ensure answers are shown when reviewing results
                            if (!showAnswers) await toggleAnswers();
                            setResultOpen(false);
                        }}
                        className="w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition"
                    >
                        Review Answers
                    </button>
                    <button
                        onClick={retakeQuiz}
                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Retake Quiz
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}