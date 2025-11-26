// frontend/src/pages/SummaryViewer.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import AudioPlayer from "../components/AudioPlayer";

export default function SummaryViewer() {
  const { id } = useParams();
  const nav = useNavigate();
  const [summary, setSummary] = useState<{
    id: number;
    title: string;
    content: string;
    sources: string[];
    created_at: string;
    audio_filename?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/summaries/${id}`)
      .then(({ data }) => setSummary(data))
      .catch(() => alert("Failed to load summary"))
      .finally(() => setLoading(false));
  }, [id]);

  // Add Handler
  const handleGenerateAudio = async (voice: string) => {
    if(!summary) return;
    await api.post(`/api/summaries/${summary.id}/audio`, { voice });
    // No need to reload everything, the AudioPlayer handles state locally mostly, 
    // but refreshing summary ensures consistency on re-entry
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading summary...
      </div>
    );
  if (!summary)
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Summary not found.
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Navbar / Header */}
      <div className="bg-white border-b sticky top-0 z-10 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => nav(-1)}
            className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
          <div className="text-xs font-mono text-gray-400">
            Generated {new Date(summary.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 md:p-12">
          {/* Header */}
          <div className="mb-8 pb-6 border-b border-gray-100">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">
              {summary.title || "Untitled Summary"}
            </h1>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-500 font-medium">Sources:</span>
              {summary.sources.map((s, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* INSERT AUDIO PLAYER HERE */}
          <AudioPlayer 
            summaryId={summary.id} 
            hasAudio={!!summary.audio_filename} 
            onGenerate={handleGenerateAudio}
          />

          {/* Content – match DocDetailsPage summary formatting */}
          <article className="prose prose-lg prose-slate max-w-none text-gray-700 leading-relaxed">
            {summary.content.split("\n").map((line, i) => {
              const trimmed = line.trim();

              // bullet lines
              if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                const bulletText = trimmed.replace(/^[-*]\s/, "");
                const parts = bulletText.split(/(\*\*.*?\*\*)/g);

                return (
                  <li key={i} className="ml-4 list-disc my-2 marker:text-gray-400">
                    {parts.map((part, j) =>
                      part.startsWith("**") && part.endsWith("**") ? (
                        <strong key={j} className="font-semibold text-gray-900">
                          {part.slice(2, -2)}
                        </strong>
                      ) : (
                        part
                      )
                    )}
                  </li>
                );
              }

              // blank line → spacing
              if (trimmed === "") return <br key={i} />;

              // simple **bold** support, same as DocDetailsPage
              const parts = line.split(/(\*\*.*?\*\*)/g);
              return (
                <p key={i} className="mb-4 text-base">
                  {parts.map((part, j) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={j} className="font-semibold text-gray-900">
                        {part.slice(2, -2)}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            })}
          </article>
        </div>
      </div>
    </div>
  );
}
