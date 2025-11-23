// frontend/src/pages/SummaryViewer.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function SummaryViewer() {
  const { id } = useParams();
  const nav = useNavigate();
  const [summary, setSummary] = useState<{ title: string; content: string; sources: string[]; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/summaries/${id}`)
      .then(({ data }) => setSummary(data))
      .catch(() => alert("Failed to load summary"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-500">Loading summary...</div>;
  if (!summary) return <div className="p-8 text-gray-500">Summary not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="text-sm text-gray-500 hover:text-gray-800">
          ← Back
        </button>
        <div className="text-xs text-gray-400">
          Generated {new Date(summary.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{summary.title || "Summary"}</h1>
        
        {/* Source pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {summary.sources.map((s, i) => (
            <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">
              {s}
            </span>
          ))}
        </div>

        <div className="prose prose-blue max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
          {summary.content}
        </div>
      </div>
    </div>
  );
}