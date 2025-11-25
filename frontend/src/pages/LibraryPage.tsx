// frontend/src/pages/LibraryPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { SourcesModal, AttemptsModal } from "../components/LibraryModals";
import { RenameModal, DeleteModal } from "../components/ActionModals";

// --- Icons ---
const Icons = {
  Quiz: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>,
  Flashcard: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  Summary: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
};

// Unified Type
type LibraryItem = {
  id: number; 
  type: "quiz" | "flashcard" | "summary";
  title: string;
  created_at: string;
  sources: { id: number; original_name: string }[]; 
  meta_text?: string; 
  source_count: number;
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
  const [renamingItem, setRenamingItem] = useState<LibraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<LibraryItem | null>(null);

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
          source_count: (q.sources || []).length,
          meta_text: `${q.attempts || 0} Attempts`,
        }));

        const flashcards = (fRes.data.items || []).map((f: any) => ({
          id: f.id,
          type: "flashcard",
          title: f.title,
          created_at: f.created_at,
          sources: f.sources || [],
          source_count: (f.sources || []).length,
          meta_text: `${f.count} Cards`,
        }));

        const summaries = (sRes.data.items || []).map((s: any) => ({
          id: s.id,
          type: "summary",
          title: s.title,
          created_at: s.created_at,
          sources: s.sources || [],
          source_count: (s.sources || []).length,
          meta_text: "Read Summary",
        }));

        const combined = [...quizzes, ...flashcards, ...summaries];
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

  const handleRename = async (newName: string) => {
    if (!renamingItem) return;
    try {
      let url = "";
      if (renamingItem.type === 'quiz') url = `/api/quizzes/${renamingItem.id}`;
      else if (renamingItem.type === 'flashcard') url = `/api/flashcards/set/${renamingItem.id}`;
      else url = `/api/summaries/${renamingItem.id}`;
      
      await api.put(url, { title: newName });
      setItems(prev => prev.map(i => (i.id === renamingItem.id && i.type === renamingItem.type) ? { ...i, title: newName } : i));
    } catch(e) { throw e; }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      let url = "";
      if (deletingItem.type === 'quiz') url = `/api/quizzes/${deletingItem.id}`;
      else if (deletingItem.type === 'flashcard') url = `/api/flashcards/set/${deletingItem.id}`;
      else url = `/api/summaries/${deletingItem.id}`;

      await api.delete(url);
      setItems(prev => prev.filter(i => !(i.id === deletingItem.id && i.type === deletingItem.type)));
    } catch(e) { throw e; }
  };

  // --- Render Helpers ---
  const getItemColorClass = (type: string) => {
    switch (type) {
      case 'quiz': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'flashcard': return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case 'summary': return "bg-purple-50 text-purple-600 border-purple-100";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24">
      {/* Header Section */}
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Library</h1>
          <p className="text-gray-500 mt-2 text-lg">Your personal collection of study materials.</p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-3 rounded-xl border shadow-sm">
          {/* Tabs */}
          <div className="flex p-1 bg-gray-100/80 rounded-lg w-full md:w-auto overflow-x-auto">
            {(["all", "quiz", "flashcard", "summary"] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all whitespace-nowrap flex-1 md:flex-none ${
                  filter === t 
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                }`}
              >
                {t === 'all' ? 'All Items' : t + 's'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72 group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"><Icons.Search /></div>
            <input 
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-transparent focus:bg-white border focus:border-blue-500 rounded-lg text-sm transition-all outline-none"
              placeholder="Search by title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium">Loading your library...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
            <Icons.Filter />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No items found</h3>
          <p className="text-gray-500 mt-1 max-w-xs mx-auto">
            Try adjusting your filters or go to <button onClick={()=>nav('/docs')} className="text-blue-600 hover:underline font-medium">Documents</button> to generate new content.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <div 
              key={`${item.type}-${item.id}`} 
              className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-200/50 transition-all duration-300 flex flex-col h-full cursor-pointer"
              onClick={() => handleOpen(item)}
            >
               {/* Card Header */}
               <div className="flex justify-between items-start mb-4">
                  <div className={`p-2.5 rounded-xl border ${getItemColorClass(item.type)}`}>
                    {item.type === 'quiz' && <Icons.Quiz />}
                    {item.type === 'flashcard' && <Icons.Flashcard />}
                    {item.type === 'summary' && <Icons.Summary />}
                  </div>
                  
                  {/* Actions Overlay - Visible on hover/focus */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border rounded-lg p-1 transform translate-x-2 group-hover:translate-x-0 duration-200">
                      <button 
                        onClick={(e)=>{e.stopPropagation(); setRenamingItem(item)}} 
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Rename"
                      >
                        <Icons.Edit />
                      </button>
                      <button 
                        onClick={(e)=>{e.stopPropagation(); setDeletingItem(item)}} 
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Icons.Trash />
                      </button>
                   </div>
               </div>

               {/* Card Content */}
               <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg leading-tight line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    {new Date(item.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
               </div>
              
              {/* Card Footer */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                <button 
                  onClick={(e) => { e.stopPropagation(); setViewSources(item); }}
                  className="text-gray-500 hover:text-blue-600 hover:underline truncate max-w-[50%] text-left flex items-center gap-1.5 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                  {item.source_count} Source{item.source_count !== 1 ? 's' : ''}
                </button>

                {item.type === "quiz" ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setViewAttempts(item); }}
                    className="font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-xs hover:bg-blue-100 transition-colors"
                  >
                    {item.meta_text}
                  </button>
                ) : (
                  <span className={`font-semibold px-2.5 py-1 rounded-full text-xs ${
                    item.type === 'flashcard' ? 'text-emerald-600 bg-emerald-50' : 'text-purple-600 bg-purple-50'
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
      {viewSources && <SourcesModal sources={viewSources.sources} onClose={() => setViewSources(null)} />}
      {viewAttempts && <AttemptsModal quizId={viewAttempts.id} quizTitle={viewAttempts.title} onClose={() => setViewAttempts(null)} />}
      
      {renamingItem && <RenameModal title={`Rename ${renamingItem.type}`} currentName={renamingItem.title} onClose={() => setRenamingItem(null)} onRename={handleRename} />}
      {deletingItem && <DeleteModal title={`Delete ${deletingItem.type}`} message={`Are you sure you want to delete "${deletingItem.title}"? This action cannot be undone.`} onClose={() => setDeletingItem(null)} onConfirm={handleDelete} />}
    </div>
  );
}