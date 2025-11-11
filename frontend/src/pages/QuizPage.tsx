import { useEffect, useMemo, useState } from "react";
import axios from "axios";

type QuizQuestion = { id: number; type: string; prompt: string; options: string[] };

export default function QuizPage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const quizId = Number(params.get("quizId"));
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [score, setScore] = useState<number|null>(null);

  useEffect(() => {
    if (!quizId) return;
    axios.get(`http://localhost:5000/api/quizzes/${quizId}`)
      .then(({data}) => setQuestions(data.questions))
      .catch(() => alert("Failed to load quiz"));
  }, [quizId]);

  async function submitAttempt() {
    const payload = {
      quiz_id: quizId,
      answers: Object.entries(answers).map(([qid, ans]) => ({
        question_id: Number(qid), user_answer: ans
      }))
    };
    const { data } = await axios.post("http://localhost:5000/api/quizzes/attempt", payload);
    setScore(data.score_pct);
  }

  if (!quizId) {
    return <div className="text-sm text-red-600">No quizId provided. Go to Upload page first.</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Quiz #{quizId}</h2>

      {questions.length === 0 && (
        <div className="text-gray-600">Loading questions…</div>
      )}

      {questions.map((q, idx) => (
        <div key={q.id} className="rounded border bg-white p-4 space-y-2">
          <div className="font-medium">Q{idx+1}. {q.prompt}</div>
          <div className="space-y-1">
            {q.options.map((opt, i) => (
              <label key={i} className="block">
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={(e) => setAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                />{" "}
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      {questions.length > 0 && (
        <button
          onClick={submitAttempt}
          disabled={Object.keys(answers).length !== questions.length}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Submit Attempt
        </button>
      )}

      {score !== null && (
        <div className="rounded border bg-white p-4">
          <div className="text-lg">Your score: <b>{score}%</b></div>
        </div>
      )}
    </div>
  );
}
