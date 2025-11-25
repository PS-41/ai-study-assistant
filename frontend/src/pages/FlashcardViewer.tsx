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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading deck...</div>;
  if (!setInfo) return <div className="min-h-screen flex items-center justify-center text-gray-400">Set not found.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-6 mb-8">
        <div className="max-w-6xl mx-auto">
            <button onClick={() => nav(-1)} className="text-sm text-gray-500 hover:text-gray-800 mb-3 flex items-center gap-1 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Back to Library
            </button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{setInfo.title}</h1>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">
                            {cards.length} Cards
                        </span>
                        {setInfo.sources.map((s: string, i: number) => (
                            <span key={i} className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((c) => {
            const isFlipped = flipped[c.id];
            return (
                <div
                key={c.id}
                onClick={() => setFlipped(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                className="relative h-64 cursor-pointer group [perspective:1000px]"
                >
                <div className={`relative w-full h-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}>
                    
                    {/* Front Side */}
                    <div className="absolute inset-0 w-full h-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between [backface-visibility:hidden]">
                        <div className="w-full flex justify-between items-start">
                            <div className="text-[10px] uppercase tracking-widest text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">Question</div>
                            <div className="text-gray-300"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg></div>
                        </div>
                        
                        <div className="flex-1 flex items-center justify-center my-2">
                            <div className="text-gray-800 font-medium text-center text-lg leading-snug line-clamp-5 overflow-y-auto max-h-full scrollbar-hide">
                                {c.front}
                            </div>
                        </div>
                        
                        <div className="text-xs text-gray-400 text-center opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                            Tap to reveal answer
                        </div>
                    </div>

                    {/* Back Side */}
                    <div className="absolute inset-0 w-full h-full bg-slate-800 text-slate-100 border border-slate-700 rounded-2xl p-6 shadow-lg flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
                        <div className="w-full flex justify-between items-start">
                            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold bg-emerald-900/30 px-2 py-1 rounded">Answer</div>
                        </div>

                        <div className="flex-1 flex items-center justify-center my-2">
                            <div className="text-slate-50 font-medium text-center text-base leading-relaxed overflow-y-auto max-h-full scrollbar-hide">
                                {c.back}
                            </div>
                        </div>
                        
                        <div className="text-xs text-slate-500 text-center font-medium">
                            Tap to flip back
                        </div>
                    </div>
                </div>
                </div>
            );
            })}
        </div>
      </div>
    </div>
  );
}