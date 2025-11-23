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
  const [isBusy, setIsBusy] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  // Defaults based on type
  const defaultTitle =
    type === "quiz"
      ? "New Quiz"
      : type === "flashcards"
      ? "New Flashcard Set"
      : "New Summary";

  const actionLabel =
    type === "quiz"
      ? "Generate Quiz"
      : type === "flashcards"
      ? "Generate Flashcards"
      : "Generate Summary";

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setIsBusy(true);
    
    // Show the fun progress overlay for quizzes/flashcards as they take longer
    if (type !== "summary") setShowProgress(true);

    try {
      const finalTitle = title.trim() || defaultTitle;
      const payload = {
        document_ids: docIds,
        title: finalTitle,
        // specific params
        n: type === "quiz" ? 5 : 12, 
      };

      let url = "";
      if (type === "quiz") url = "/api/quizzes/generate";
      else if (type === "flashcards") url = "/api/flashcards/generate";
      else if (type === "summary") url = "/api/summaries/generate";

      const { data } = await api.post(url, payload);

      // Handle Success
      if (type === "quiz") {
        // Go straight to the quiz
        nav(`/quiz?quizId=${data.quiz_id}`);
      } else {
        // For flashcards/summary, just close and alert for now
        // (Since we don't have a dedicated "Multi-Doc Result Page" yet)
        alert(`${finalTitle} created successfully!`);
        onClose();
        if (onSuccess) onSuccess();
      }

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
          messages={[
            "Analyzing selected documents...",
            "Extracting key concepts...",
            "Synthesizing content...",
            "Finalizing...",
          ]}
        />
      )}

      <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>

          <h2 className="text-xl font-semibold mb-1">{actionLabel}</h2>
          <p className="text-sm text-gray-500 mb-4">
            Based on {docIds.length} selected document{docIds.length > 1 ? "s" : ""}.
          </p>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title (Optional)
              </label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={defaultTitle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                {isBusy ? "Processing..." : "Generate"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}