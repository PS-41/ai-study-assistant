// frontend/src/components/LibraryModals.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";
const apiHref = (path: string) => `${apiOrigin}${path}`;

interface SourcesModalProps {
  sources: { id: number; original_name: string }[];
  onClose: () => void;
}

export function SourcesModal({ sources, onClose }: SourcesModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Source Documents</h3>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {sources.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border">
              <span className="text-sm text-gray-700 truncate flex-1 mr-2">{doc.original_name}</span>
              <a 
                href={apiHref(`/api/files/view/${doc.id}`)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                Open PDF
              </a>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700">Close</button>
        </div>
      </div>
    </div>
  );
}

interface AttemptsModalProps {
  quizId: number;
  quizTitle: string;
  onClose: () => void;
}

export function AttemptsModal({ quizId, quizTitle, onClose }: AttemptsModalProps) {
  const nav = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/quizzes/${quizId}/attempts`)
      .then(({ data }) => setAttempts(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [quizId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
        <h3 className="text-lg font-bold text-gray-800 mb-1">Attempt History</h3>
        <p className="text-sm text-gray-500 mb-4">{quizTitle}</p>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed rounded">No attempts yet.</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <div>
                  <div className="text-sm font-medium text-gray-800">Score: {a.score_pct}%</div>
                  <div className="text-xs text-gray-500">{new Date(a.created_at).toLocaleString()}</div>
                </div>
                <button 
                  onClick={() => nav(`/quiz?quizId=${quizId}&attemptId=${a.id}`)}
                  className="px-3 py-1.5 text-xs bg-white border shadow-sm rounded hover:bg-blue-50 text-blue-600"
                >
                  View Results
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}