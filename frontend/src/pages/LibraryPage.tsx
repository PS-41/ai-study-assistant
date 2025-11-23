// frontend/src/pages/LibraryPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { SourcesModal, AttemptsModal } from "../components/LibraryModals";

// --- Icons ---
const Icons = {
  Quiz: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>,
  Flashcard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  Summary: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
};

// Unified Type
type LibraryItem = {
  id: number; // backend ID
  type: "quiz" | "flashcard" | "summary";
  title: string;
  created_at: string;
  sources: { id: number; original_name: string }[]; // Updated to full objects
  meta_text?: string; 
};

export default function LibraryPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "quiz" | "flashcard" | "summary">("all");
  const [search, setSearch] = useState("");

  // Modal States
  const [viewSources, setViewSources] = useState<LibraryItem | null>(null);
  const [viewAttempts, setViewAttempts] = useState<LibraryItem | null>(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [qRes, fRes, sRes] = await Promise.all([
          api.get("/api/quizzes/mine"),
          api.get("/api/flashcards"),
          api.get("/api/summaries"),
        ]);

        const quizzes = (qRes.data.items || []).map((q: any) => ({
          id: q.quiz_id,
          type: "quiz",
          title: q.title,
          created_at: q.created_at,
          sources: q.sources || [],
          meta_text: `${q.attempts || 0} Attempts`,
        }));

        const flashcards = (fRes.data.items || []).map((f: any) => ({
          id: f.id,
          type: "flashcard",
          title: f.title,
          created_at: f.created_at,
          sources: f.sources || [],
          meta_text: `${f.count} Cards`,
        }));

        const summaries = (sRes.data.items || []).map((s: any) => ({
          id: s.id,
          type: "summary",
          title: s.title,
          created_at: s.created_at,
          sources: s.sources || [],
          meta_text: "Read Summary",
        }));

        const combined = [...quizzes, ...flashcards, ...summaries];
        // Sort by newest first
        combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setItems(combined as LibraryItem[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filter !== "all" && item.type !== filter) return false;
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, filter, search]);

  const handleOpen = (item: LibraryItem) => {
    if (item.type === "quiz") nav(`/quiz?quizId=${item.id}`);
    if (item.type === "flashcard") nav(`/flashcards/${item.id}`);
    if (item.type === "summary") nav(`/summary/${item.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Library</h2>
        <p className="text-sm text-gray-500 mt-1">All your generated study materials in one place.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-2 rounded-lg border shadow-sm">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-md w-full sm:w-auto">
          {(["all", "quiz", "flashcard", "summary"] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                filter === t ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icons.Search /></div>
          <input 
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Search library..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading your library...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed text-gray-400">
          No items found. Go to <button onClick={()=>nav('/docs')} className="text-blue-600 hover:underline">Documents</button> to generate some!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <div 
              key={`${item.type}-${item.id}`} 
              className="group bg-white border rounded-xl p-5 hover:shadow-md transition-all flex flex-col justify-between h-40"
            >
              {/* Top Section: Click to Open */}
              <div className="cursor-pointer" onClick={() => handleOpen(item)}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${
                    item.type === 'quiz' ? 'bg-blue-50' : 
                    item.type === 'flashcard' ? 'bg-emerald-50' : 'bg-purple-50'
                  }`}>
                    {item.type === 'quiz' && <Icons.Quiz />}
                    {item.type === 'flashcard' && <Icons.Flashcard />}
                    {item.type === 'summary' && <Icons.Summary />}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
              </div>
              
              {/* Footer: Interactive Meta Data */}
              <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-4 border-t">
                {/* Sources Trigger */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setViewSources(item); }}
                  className="hover:text-blue-600 hover:underline truncate max-w-[50%] text-left"
                >
                  {item.sources.length} Source{item.sources.length !== 1 ? 's' : ''}
                </button>

                {/* Meta Trigger (Attempts or Cards) */}
                {item.type === "quiz" ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewAttempts(item); }}
                    className="font-medium text-blue-600 hover:underline hover:text-blue-800"
                  >
                    {item.meta_text}
                  </button>
                ) : (
                  <span className={`font-medium ${
                    item.type === 'flashcard' ? 'text-emerald-600' : 'text-purple-600'
                  }`}>
                    {item.meta_text}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {viewSources && (
        <SourcesModal 
          sources={viewSources.sources} 
          onClose={() => setViewSources(null)} 
        />
      )}
      {viewAttempts && (
        <AttemptsModal 
          quizId={viewAttempts.id} 
          quizTitle={viewAttempts.title} 
          onClose={() => setViewAttempts(null)} 
        />
      )}
    </div>
  );
}