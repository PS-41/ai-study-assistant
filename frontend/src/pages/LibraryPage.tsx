// frontend/src/pages/LibraryPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { SourcesModal, AttemptsModal } from "../components/LibraryModals";
import { RenameModal, DeleteModal } from "../components/ActionModals";

// --- Icons ---
const Icons = {
  Quiz: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>,
  Flashcard: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
  Summary: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>,
  File: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
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

type FilterType = "all" | "quiz" | "flashcard" | "summary";

export default function LibraryPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
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
          meta_text: `${q.attempts || 0} Attempt${q.attempts !== 1 ? 's' : ''}`,
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
          meta_text: "View",
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

  // Calculate Counts
  const counts = useMemo(() => {
    const c = { all: 0, quiz: 0, flashcard: 0, summary: 0 };
    items.forEach(item => {
      c.all++;
      if (item.type === 'quiz') c.quiz++;
      else if (item.type === 'flashcard') c.flashcard++;
      else if (item.type === 'summary') c.summary++;
    });
    return c;
  }, [items]);

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

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'quiz': return "bg-blue-50 text-blue-700 border-blue-100";
      case 'flashcard': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'summary': return "bg-purple-50 text-purple-700 border-purple-100";
      default: return "bg-gray-50 text-gray-700";
    }
  };

  // Tabs Configuration
  const tabs: { id: FilterType; label: string }[] = [
    { id: "all", label: "All Items" },
    { id: "quiz", label: "Quizzes" },
    { id: "flashcard", label: "Flashcards" },
    { id: "summary", label: "Summaries" },
  ];

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Library</h1>
          <p className="text-sm text-gray-500 mt-1">Your personal collection of study materials.</p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl overflow-x-auto max-w-full no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  filter === tab.id 
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                }`}
              >
                {tab.label}
                <span className={`text-xs py-0.5 px-2 rounded-full ${
                  filter === tab.id ? "bg-gray-100 text-gray-900" : "bg-gray-200/60 text-gray-500"
                }`}>
                  {counts[tab.id]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64 group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <Icons.Search />
            </div>
            <input 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-sm outline-none transition-all placeholder:text-gray-400"
              placeholder="Search items..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Loading library...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-400">
              <Icons.Filter />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No items found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">
              {filter === 'all' ? "Generate content from your documents to see it here." : `No ${filter} items found.`}
            </p>
            <button onClick={()=>nav('/docs')} className="mt-4 text-xs font-medium text-blue-600 hover:underline">Go to Documents</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[50vh] content-start">
            {filteredItems.map(item => (
              <div 
                key={`${item.type}-${item.id}`} 
                className="group relative bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-300/50 transition-all duration-300 flex flex-col h-full cursor-pointer"
                onClick={() => handleOpen(item)}
              >
                 {/* Top Badge Row */}
                 <div className="flex justify-between items-start mb-4">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${getTypeBadgeStyle(item.type)}`}>
                      {item.type === 'quiz' && <Icons.Quiz />}
                      {item.type === 'flashcard' && <Icons.Flashcard />}
                      {item.type === 'summary' && <Icons.Summary />}
                      <span>{item.type}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                      {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                 </div>

                 {/* Title Area */}
                 <div className="flex-1 mb-4">
                    <h3 className="font-bold text-gray-800 text-base leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors" title={item.title}>
                      {item.title}
                    </h3>
                 </div>
                
                 {/* Footer Actions */}
                 <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-xs">
                   <button 
                      onClick={(e) => { e.stopPropagation(); setViewSources(item); }}
                      className="text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors max-w-[50%] truncate group/source"
                      title="View Sources"
                    >
                      <div className="p-1 rounded-md bg-gray-50 group-hover/source:bg-gray-100 transition-colors"><Icons.File /></div>
                      <span className="truncate font-medium">{item.source_count} Source{item.source_count !== 1 ? 's' : ''}</span>
                    </button>

                    {item.type === "quiz" ? (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setViewAttempts(item); }}
                        className="font-semibold text-blue-600 bg-blue-50/50 border border-blue-100 px-2.5 py-1 rounded-full text-xs hover:bg-blue-100 hover:border-blue-200 transition-all"
                      >
                        {item.meta_text}
                      </button>
                    ) : (
                      <span className={`font-semibold px-2.5 py-1 rounded-full text-xs border ${
                        item.type === 'flashcard' 
                          ? 'text-emerald-600 bg-emerald-50/50 border-emerald-100' 
                          : 'text-purple-600 bg-purple-50/50 border-purple-100'
                      }`}>
                        {item.meta_text}
                      </span>
                    )}
                 </div>

                 {/* Hover Action Menu (Absolute) */}
                 <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white shadow-sm border border-gray-200 rounded-lg flex overflow-hidden transform scale-95 group-hover:scale-100 duration-200 z-10">
                    <button 
                      onClick={(e)=>{e.stopPropagation(); setRenamingItem(item)}} 
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-r border-gray-100"
                      title="Rename"
                    >
                      <Icons.Edit />
                    </button>
                    <button 
                      onClick={(e)=>{e.stopPropagation(); setDeletingItem(item)}} 
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Icons.Trash />
                    </button>
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
    </div>
  );
}