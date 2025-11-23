// frontend/src/pages/DocsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import GenerateModal from "../components/GenerateModal";
import AssignModal from "../components/AssignModal";

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";
const apiHref = (path: string) => `${apiOrigin}${path}`;

// --- Icons ---
const Icons = {
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  CheckSquare: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>,
  Square: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
  FolderPlus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>,
  ExternalLink: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
};

type Doc = {
  id: number;
  original_name: string;
  filename: string;
  mime: string;
  size: number;
  created_at: string;
  owned: boolean;
  course_id?: number | null;
  course_name?: string | null;
  topic_id?: number | null;
  topic_name?: string | null;
};

export default function DocsPage() {
  const [items, setItems] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  // Selection State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Action Modals
  const [activeGenType, setActiveGenType] = useState<"quiz"|"flashcards"|"summary"|null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Prompts
  const [promptMode, setPromptMode] = useState<string|null>(null); 

  useEffect(() => {
    api.get("/api/files/mine")
      .then(({ data }) => setItems(data.items))
      .catch((e: any) => {
        if (e?.response?.status === 401) nav("/login");
      })
      .finally(() => setLoading(false));
  }, [nav]);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Triggered by top toolbar buttons
  const initiateAction = (action: "assign" | "generate") => {
    if (selectedIds.size > 0) {
      if (action === "assign") setShowAssignModal(true);
      else setActiveGenType("quiz"); 
    } else {
      setIsSelectMode(true);
      setPromptMode(action === "assign" ? "Select documents to Assign" : "Select documents to Generate Content");
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading documents...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Documents</h2>
          <p className="text-sm text-gray-500 mt-1">Manage, organize, and study from your files.</p>
        </div>
        
        {/* Discoverable Actions Toolbar */}
        <div className="flex items-center gap-2 bg-white p-1.5 border rounded-lg shadow-sm">
          <button 
            onClick={() => initiateAction("generate")}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition"
          >
            <Icons.Zap /> Generate
          </button>
          <div className="w-px h-5 bg-gray-300"></div>
          <button 
            onClick={() => initiateAction("assign")}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition"
          >
            <Icons.FolderPlus /> Assign
          </button>
          <div className="w-px h-5 bg-gray-300"></div>
          <button
            onClick={() => {
              setIsSelectMode(!isSelectMode);
              if(isSelectMode) { setSelectedIds(new Set()); setPromptMode(null); }
            }}
            className={`px-3 py-2 text-sm font-medium rounded-md transition ${isSelectMode ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"}`}
          >
            {isSelectMode ? "Cancel" : "Select"}
          </button>
        </div>
      </div>

      {/* Prompt Banner */}
      {isSelectMode && promptMode && selectedIds.size === 0 && (
        <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center animate-in fade-in">
          <span className="mr-2">ℹ️</span> {promptMode}. Click on documents to select them.
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed text-gray-400">
          No documents found. Upload one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="divide-y">
            {items.map((doc) => {
              const isSelected = selectedIds.has(doc.id);
              return (
                <div 
                  key={doc.id} 
                  onClick={() => isSelectMode && toggleSelection(doc.id)}
                  className={`flex items-center p-4 gap-4 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  {/* Selection Box */}
                  <div className={`flex-shrink-0 ${isSelectMode ? 'w-6 opacity-100' : 'w-0 opacity-0 overflow-hidden'} transition-all duration-200`}>
                    <button onClick={(e) => { e.stopPropagation(); toggleSelection(doc.id); }} className="text-gray-500 hover:text-blue-600">
                      {isSelected ? <Icons.CheckSquare /> : <Icons.Square />}
                    </button>
                  </div>

                  {/* Icon */}
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Icons.FileText />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {doc.original_name}
                    </div>
                    <div className="text-xs text-gray-500 flex gap-2 mt-0.5">
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{Math.round(doc.size / 1024)} KB</span>
                      {doc.course_name && (
                        <>
                          <span>•</span>
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{doc.course_name}</span>
                        </>
                      )}
                    </div>
                    {/* NEW: Explicit "Open PDF" link */}
                    <a 
                      href={apiHref(`/api/files/view/${doc.id}`)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1 w-fit"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icons.ExternalLink /> Open PDF
                    </a>
                  </div>

                  {/* Actions (Single Mode) */}
                  {!isSelectMode && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); nav(`/docs/${doc.id}?tab=quizzes`); }} className="px-3 py-1.5 text-xs border rounded hover:bg-white text-gray-700">
                        Quiz
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); nav(`/docs/${doc.id}?tab=flashcards`); }} className="px-3 py-1.5 text-xs border rounded hover:bg-white text-gray-700">
                        Flashcards
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); nav(`/docs/${doc.id}?tab=summary`); }} className="px-3 py-1.5 text-xs border rounded hover:bg-white text-gray-700">
                        Summary
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white pl-6 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-4 fade-in">
          <span className="font-semibold text-sm pr-4 border-r border-gray-700">
            {selectedIds.size} selected
          </span>
          
          <div className="flex gap-1 border-r border-gray-700 pr-4 mr-2">
            <button onClick={() => setActiveGenType("quiz")} className="px-3 py-1.5 text-sm hover:bg-gray-800 rounded-md transition text-blue-200">Quiz</button>
            <button onClick={() => setActiveGenType("flashcards")} className="px-3 py-1.5 text-sm hover:bg-gray-800 rounded-md transition text-emerald-200">Cards</button>
            <button onClick={() => setActiveGenType("summary")} className="px-3 py-1.5 text-sm hover:bg-gray-800 rounded-md transition text-purple-200">Summary</button>
          </div>
          
          <button onClick={() => setShowAssignModal(true)} className="px-3 py-1.5 text-sm hover:bg-gray-800 rounded-md transition font-medium">
            Assign
          </button>
          
          <button onClick={() => { setSelectedIds(new Set()); setIsSelectMode(false); setPromptMode(null); }} className="ml-2 p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition">
            <Icons.X />
          </button>
        </div>
      )}

      {/* Modals */}
      {activeGenType && (
        <GenerateModal
          type={activeGenType}
          docIds={Array.from(selectedIds)}
          onClose={() => setActiveGenType(null)}
          onSuccess={() => { setSelectedIds(new Set()); setIsSelectMode(false); setPromptMode(null); }}
        />
      )}

      {showAssignModal && (
        <AssignModal
          docIds={Array.from(selectedIds)}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            setSelectedIds(new Set());
            setIsSelectMode(false);
            setPromptMode(null);
            setLoading(true);
            api.get("/api/files/mine").then(({ data }) => setItems(data.items)).finally(() => setLoading(false));
          }}
        />
      )}
    </div>
  );
}