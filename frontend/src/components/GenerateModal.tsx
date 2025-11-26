// frontend/src/components/GenerateModal.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import ProgressOverlay from "./ProgressOverlay";

type GenType = "quiz" | "flashcards" | "summary";

interface Props {
  type: GenType;
  docIds: number[];
  onClose: () => void;
  onSuccess?: () => void;
}

export default function GenerateModal({ type, docIds, onClose, onSuccess }: Props) {
  const nav = useNavigate();
  const [title, setTitle] = useState("");
  
  // General State
  const [count, setCount] = useState(
    type === "quiz" ? 5 : type === "flashcards" ? 12 : 5
  );
  const [summaryDetail, setSummaryDetail] = useState("brief");

  // Quiz Specific State
  const [includeSA, setIncludeSA] = useState(false);
  const [countSA, setCountSA] = useState(3);
  const [includeTF, setIncludeTF] = useState(false);
  const [countTF, setCountTF] = useState(3);

  const [isBusy, setIsBusy] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const defaultTitle = type === "quiz" ? "New Quiz" : type === "flashcards" ? "New Flashcard Set" : "New Summary";
  const actionLabel = type === "quiz" ? "Generate Quiz" : type === "flashcards" ? "Generate Flashcards" : "Generate Summary";

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    setShowProgress(true);

    try {
      const finalTitle = title.trim() || defaultTitle;
      const payload: any = {
        document_ids: docIds,
        title: finalTitle,
      };
      
      if (type === "quiz") {
          // New Payload Structure
          payload.n_mcq = count;
          payload.include_short_answer = includeSA;
          if (includeSA) payload.n_short_answer = countSA;
          payload.include_true_false = includeTF;
          if (includeTF) payload.n_true_false = countTF;
      } else if (type === "flashcards") {
          payload.n = count === 5 ? 12 : count; // Handle default reset quirk if switching
      } else if (type === "summary") {
          payload.detail_level = summaryDetail;
      }

      let url = "";
      if (type === "quiz") url = "/api/quizzes/generate";
      else if (type === "flashcards") url = "/api/flashcards/generate";
      else if (type === "summary") url = "/api/summaries/generate";

      const { data } = await api.post(url, payload);

      if (type === "quiz") nav(`/quiz?quizId=${data.quiz_id}`);
      else if (type === "flashcards") nav(`/flashcards/${data.set_id}`);
      else if (type === "summary") nav(`/summary/${data.id}`);

      onSuccess?.();

    } catch (err: any) {
      alert(err?.response?.data?.error || "Generation failed");
      setShowProgress(false);
      setIsBusy(false);
    }
  }

  return (
    <>
      {showProgress && (
        <ProgressOverlay
          title={`Generating ${type}...`}
          messages={
            type === 'quiz' && (includeSA || includeTF) 
            ? ["Reading documents...", "Generating Multiple Choice...", "Generating Short Answers...", "Generating True/False...", "Finalizing..."]
            : ["Analyzing documents...", "Extracting key points...", "Synthesizing content...", "Finalizing..."]
          }
        />
      )}

      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>

          <h2 className="text-xl font-semibold mb-1">{actionLabel}</h2>
          <p className="text-sm text-gray-500 mb-4">
            Based on {docIds.length} selected document{docIds.length > 1 ? "s" : ""}.
          </p>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (Optional)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={defaultTitle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            {/* QUIZ CONFIG */}
            {type === "quiz" && (
              <div className="space-y-4 border-t pt-4">
                {/* MCQ Config */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Multiple Choice Questions</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none bg-white"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>

                {/* Short Answer Toggle */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="inc_sa" 
                    className="mt-1 rounded" 
                    checked={includeSA} 
                    onChange={e => setIncludeSA(e.target.checked)} 
                  />
                  <div className="flex-1">
                    <label htmlFor="inc_sa" className="block text-sm font-medium text-gray-800 cursor-pointer">Include Short Answer</label>
                    <p className="text-xs text-gray-500">Requires typing answers. Graded by AI.</p>
                    
                    {includeSA && (
                      <div className="mt-2">
                        <label className="text-xs text-gray-600 block mb-1">Count:</label>
                        <select
                          className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50"
                          value={countSA}
                          onChange={(e) => setCountSA(Number(e.target.value))}
                        >
                          <option value={1}>1 Question</option>
                          <option value={3}>3 Questions</option>
                          <option value={5}>5 Questions</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* True/False Toggle */}
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="inc_tf" 
                    className="mt-1 rounded" 
                    checked={includeTF} 
                    onChange={e => setIncludeTF(e.target.checked)} 
                  />
                  <div className="flex-1">
                    <label htmlFor="inc_tf" className="block text-sm font-medium text-gray-800 cursor-pointer">Include True/False</label>
                    
                    {includeTF && (
                      <div className="mt-2">
                        <label className="text-xs text-gray-600 block mb-1">Count:</label>
                        <select
                          className="w-full border rounded px-2 py-1.5 text-sm bg-gray-50"
                          value={countTF}
                          onChange={(e) => setCountTF(Number(e.target.value))}
                        >
                          <option value={3}>3 Questions</option>
                          <option value={5}>5 Questions</option>
                          <option value={10}>10 Questions</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* FLASHCARD CONFIG */}
            {type === "flashcards" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Cards</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                >
                  <option value={8}>8 Cards</option>
                  <option value={12}>12 Cards</option>
                  <option value={16}>16 Cards</option>
                  <option value={20}>20 Cards</option>
                </select>
              </div>
            )}

            {/* SUMMARY CONFIG */}
            {type === "summary" && (
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detail Level</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  value={summaryDetail}
                  onChange={(e) => setSummaryDetail(e.target.value)}
                >
                  <option value="brief">Brief (Key Points)</option>
                  <option value="detailed">Detailed (Comprehensive)</option>
                </select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isBusy}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-sm font-medium"
              >
                {isBusy ? "Generating..." : "Generate"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}