// frontend/src/pages/FlashcardViewer.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function FlashcardViewer() {
  const { id } = useParams();
  const nav = useNavigate();
  const [setInfo, setSetInfo] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api.get(`/api/flashcards/set/${id}`)
      .then(({ data }) => {
        setSetInfo({ title: data.title, sources: data.sources });
        setCards(data.cards || []);
      })
      .catch(() => alert("Failed to load flashcards"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-gray-500">Loading set...</div>;
  if (!setInfo) return <div className="p-8 text-gray-500">Set not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="text-sm text-gray-500 hover:text-gray-800">
          ← Back
        </button>
        <div className="text-sm font-medium text-gray-600">{cards.length} Cards</div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{setInfo.title}</h1>
        <div className="flex flex-wrap gap-2 mb-6">
          {setInfo.sources.map((s: string, i: number) => (
            <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-md border border-emerald-100">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const isFlipped = flipped[c.id];
          return (
            <div
              key={c.id}
              onClick={() => setFlipped(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
              className="relative h-48 cursor-pointer group [perspective:1000px]"
            >
              <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}>
                
                {/* Front */}
                <div className="absolute inset-0 w-full h-full bg-white border rounded-xl p-6 shadow-sm flex flex-col justify-between [backface-visibility:hidden]">
                  <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Question</div>
                  <div className="text-gray-800 font-medium text-center line-clamp-4">{c.front}</div>
                  <div className="text-xs text-gray-400 text-center opacity-0 group-hover:opacity-100 transition-opacity">Click to flip</div>
                </div>

                {/* Back */}
                <div className="absolute inset-0 w-full h-full bg-slate-800 text-slate-100 border border-slate-700 rounded-xl p-6 shadow-sm flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Answer</div>
                  <div className="text-center line-clamp-5 leading-relaxed">{c.back}</div>
                  <div className="text-xs text-slate-500 text-center">Click to flip back</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}