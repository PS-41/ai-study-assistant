// frontend/src/pages/CoursesPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import GenerateModal from "../components/GenerateModal";
import { CreateCourseModal, CreateTopicModal } from "../components/ResourceModals";
import { RenameModal, DeleteModal } from "../components/ActionModals"; // NEW

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";
const apiHref = (path: string) => `${apiOrigin}${path}`;

// --- Types ---
type Course = { id: number; name: string; description?: string|null };
type Topic = { id: number; name: string; description?: string|null; course_id: number };
type Doc = { id: number; original_name: string; size: number; created_at: string; topic_id?: number|null };

// --- Icons ---
const Icons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
  Folder: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
  FileText: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
  ChevronDown: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>,
  CheckSquare: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>,
  Square: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>,
  X: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
  FilePlus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>,
  Zap: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
  ExternalLink: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
};

export default function CoursesPage() {
  const nav = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  
  // Data Cache
  const [topicsByCourse, setTopicsByCourse] = useState<Record<number, Topic[]>>({});
  const [docsByCourse, setDocsByCourse] = useState<Record<number, Doc[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<number, boolean>>({});

  // UI State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [promptMode, setPromptMode] = useState<string|null>(null);
  
  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [activeGenType, setActiveGenType] = useState<"quiz"|"flashcards"|"summary"|null>(null);
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [targetTopicId, setTargetTopicId] = useState<number | null>(null);

  // Rename/Delete States
  const [renamingItem, setRenamingItem] = useState<{ type: 'course'|'topic', id: number, name: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'course'|'topic', id: number, name: string } | null>(null);


  useEffect(() => {
    setLoading(true);
    api.get("/api/courses/mine")
      .then(({ data }) => {
        setCourses(data.items || []);
        if (!selectedCourseId && data.items?.length > 0) setSelectedCourseId(data.items[0].id);
      })
      .finally(() => setLoading(false));
  }, [nav]);

  useEffect(() => {
    if (!selectedCourseId) return;
    reloadCourseDetails(selectedCourseId);
  }, [selectedCourseId]);

  async function reloadCourseDetails(courseId: number) {
    if(!docsByCourse[courseId]) setLoadingDetails(prev => ({ ...prev, [courseId]: true }));
    
    try {
      const [tRes, dRes] = await Promise.all([
        api.get(`/api/topics/by_course/${courseId}`),
        api.get("/api/files/mine", { params: { course_id: courseId } })
      ]);
      setTopicsByCourse(prev => ({ ...prev, [courseId]: tRes.data.items || [] }));
      setDocsByCourse(prev => ({ ...prev, [courseId]: dRes.data.items || [] }));
      
      const tIds = (tRes.data.items || []).map((t:Topic) => String(t.id));
      setExpandedTopics(prev => {
        const next = { ...prev, "none": true };
        tIds.forEach((id:string) => next[id] = true);
        return next;
      });
    } finally {
      setLoadingDetails(prev => ({ ...prev, [courseId]: false }));
    }
  }

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const topics = selectedCourseId ? topicsByCourse[selectedCourseId] || [] : [];
  const docs = selectedCourseId ? docsByCourse[selectedCourseId] || [] : [];

  const groupedDocs = useMemo(() => {
    const groups: Record<string, Doc[]> = { "none": [] };
    topics.forEach(t => groups[String(t.id)] = []);
    docs.forEach(d => {
      const key = d.topic_id ? String(d.topic_id) : "none";
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    return groups;
  }, [docs, topics]);

  // --- Action Handlers ---

  const handleRename = async (newName: string) => {
    if (!renamingItem) return;
    const { type, id } = renamingItem;
    if (type === 'course') {
      await api.put(`/api/courses/${id}`, { name: newName });
      setCourses(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    } else {
      await api.put(`/api/topics/${id}`, { name: newName });
      if (selectedCourseId) {
        setTopicsByCourse(prev => ({
          ...prev,
          [selectedCourseId]: prev[selectedCourseId].map(t => t.id === id ? { ...t, name: newName } : t)
        }));
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    const { type, id } = deletingItem;
    if (type === 'course') {
      await api.delete(`/api/courses/${id}`);
      setCourses(prev => prev.filter(c => c.id !== id));
      if (selectedCourseId === id) setSelectedCourseId(null);
    } else {
      await api.delete(`/api/topics/${id}`);
      if (selectedCourseId) {
        setTopicsByCourse(prev => ({
          ...prev,
          [selectedCourseId]: prev[selectedCourseId].filter(t => t.id !== id)
        }));
      }
    }
  };

  const toggleDocSelection = (docId: number) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId); else next.add(docId);
      return next;
    });
  };

  const toggleBatch = (ids: number[]) => {
    if (ids.length === 0) return;
    const allSelected = ids.every(id => selectedDocIds.has(id));
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const handleCourseCheck = async (cId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    let currentDocs = docsByCourse[cId];
    if (!currentDocs) {
       try {
         const { data } = await api.get("/api/files/mine", { params: { course_id: cId } });
         currentDocs = data.items;
         setDocsByCourse(prev => ({ ...prev, [cId]: currentDocs }));
       } catch(err) { return; }
    }
    toggleBatch(currentDocs.map(d => d.id));
  };

  const isCourseFullySelected = (cId: number) => {
    const currentDocs = docsByCourse[cId];
    if (!currentDocs || currentDocs.length === 0) return false;
    return currentDocs.every(d => selectedDocIds.has(d.id));
  };

  const initiateAction = (action: "generate") => {
    if (selectedDocIds.size > 0) {
      setActiveGenType("quiz");
    } else {
      setIsSelectMode(true);
      setPromptMode("Select documents to Generate Content");
    }
  };

  const openAddDocModal = (topicId: number | null) => {
    setTargetTopicId(topicId);
    setShowAddDocModal(true);
  };

  return (
    <div className="flex h-[calc(100vh-60px)] bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col flex-shrink-0">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">My Courses</h2>
          <button onClick={() => setShowCourseModal(true)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Icons.Plus /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {courses.map(c => (
            <div 
              key={c.id} 
              className={`group relative w-full flex items-center px-3 py-2 rounded-md text-sm gap-2 transition-colors ${selectedCourseId===c.id ? "bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-200" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {isSelectMode && (
                <button 
                  onClick={(e) => handleCourseCheck(c.id, e)} 
                  className={`flex-shrink-0 text-gray-400 hover:text-blue-600 transition ${isCourseFullySelected(c.id) ? "text-blue-600" : ""}`}
                >
                  {isCourseFullySelected(c.id) ? <Icons.CheckSquare /> : <Icons.Square />}
                </button>
              )}
              
              <button onClick={() => setSelectedCourseId(c.id)} className="flex-1 flex items-center gap-3 text-left truncate">
                <Icons.Folder />
                <span className="truncate">{c.name}</span>
              </button>
              
              {/* Edit/Delete Actions (Visible on Hover) */}
              <div className="hidden group-hover:flex gap-1 absolute right-2 bg-white/90 p-0.5 rounded border shadow-sm">
                <button onClick={(e) => { e.stopPropagation(); setRenamingItem({ type:'course', id:c.id, name:c.name }); }} className="p-1 hover:text-blue-600"><Icons.Edit /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeletingItem({ type:'course', id:c.id, name:c.name }); }} className="p-1 hover:text-red-600"><Icons.Trash /></button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedCourse ? (
          <>
            <header className="bg-white border-b px-6 py-4 flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{selectedCourse.name}</h1>
                <p className="text-gray-500 text-sm mt-1">{selectedCourse.description}</p>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2 bg-white p-1 border rounded-lg shadow-sm mr-2">
                  <button onClick={() => initiateAction("generate")} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition">
                    <Icons.Zap /> Generate
                  </button>
                  <div className="w-px h-5 bg-gray-300"></div>
                  <button onClick={() => { if (isSelectMode) { setSelectedDocIds(new Set()); setPromptMode(null); } setIsSelectMode(!isSelectMode); }} className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${isSelectMode ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50"}`}>
                    {isSelectMode ? "Cancel" : "Select Multiple"}
                  </button>
                </div>
                <button onClick={() => setShowTopicModal(true)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition">+ New Topic</button>
              </div>
            </header>

            {isSelectMode && promptMode && selectedDocIds.size === 0 && (
              <div className="bg-blue-50 border-b border-blue-100 text-blue-700 px-6 py-2 text-sm flex items-center animate-in fade-in">
                <span className="mr-2">ℹ️</span> {promptMode}. Check specific documents or entire topics/courses.
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingDetails[selectedCourse.id] && !docsByCourse[selectedCourse.id] ? (
                <div className="text-gray-400">Loading...</div>
              ) : (
                <>
                  <TopicSection 
                    title="General Documents" 
                    docs={groupedDocs["none"]} 
                    isSelectMode={isSelectMode} selectedIds={selectedDocIds} onToggle={toggleDocSelection}
                    onToggleBatch={toggleBatch}
                    expanded={!!expandedTopics["none"]} onToggleExpand={() => setExpandedTopics(p => ({...p, "none": !p["none"]}))}
                    onAddDoc={() => openAddDocModal(null)}
                  />
                  {topics.map(t => (
                    <TopicSection
                      key={t.id} title={t.name} subtitle={t.description}
                      docs={groupedDocs[String(t.id)] || []}
                      isSelectMode={isSelectMode} selectedIds={selectedDocIds} onToggle={toggleDocSelection}
                      onToggleBatch={toggleBatch}
                      expanded={!!expandedTopics[String(t.id)]} onToggleExpand={() => setExpandedTopics(p => ({...p, [String(t.id)]: !p[String(t.id)]}))}
                      onAddDoc={() => openAddDocModal(t.id)}
                      // NEW: Topic actions
                      onRename={() => setRenamingItem({ type:'topic', id:t.id, name:t.name })}
                      onDelete={() => setDeletingItem({ type:'topic', id:t.id, name:t.name })}
                    />
                  ))}
                </>
              )}
            </div>
          </>
        ) : <div className="flex-1 flex items-center justify-center text-gray-400">Select a course</div>}
      </main>

      {/* Floating Action */}
      {isSelectMode && selectedDocIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 z-50">
          <span className="font-medium text-sm pr-4 border-r border-gray-700">{selectedDocIds.size} selected</span>
          <div className="flex gap-1 border-r border-gray-700 pr-4 mr-2">
            <button onClick={() => setActiveGenType("quiz")} className="px-3 py-1.5 text-sm hover:bg-gray-800 rounded-md transition text-blue-200">Quiz</button>
            <button onClick={() => setActiveGenType("flashcards")} className="px-3 py-1.5 text-sm hover:bg-gray-800 rounded-md transition text-emerald-200">Cards</button>
            <button onClick={() => setActiveGenType("summary")} className="px-3 py-1.5 text-sm hover:bg-gray-800 rounded-md transition text-purple-200">Summary</button>
          </div>
          <button onClick={() => { setSelectedDocIds(new Set()); setIsSelectMode(false); setPromptMode(null); }} className="ml-2 hover:text-gray-400"><Icons.X /></button>
        </div>
      )}

      {/* Modals */}
      {showCourseModal && <CreateCourseModal onClose={()=>setShowCourseModal(false)} onSuccess={(c)=>{setCourses(p=>[...p, c]); setSelectedCourseId(c.id);}} />}
      {showTopicModal && selectedCourseId && <CreateTopicModal courseId={selectedCourseId} onClose={()=>setShowTopicModal(false)} onSuccess={(t)=>reloadCourseDetails(selectedCourseId!)} />}
      {activeGenType && <GenerateModal type={activeGenType} docIds={Array.from(selectedDocIds)} onClose={()=>setActiveGenType(null)} onSuccess={()=>{setSelectedDocIds(new Set()); setIsSelectMode(false); setPromptMode(null);}} />}
      
      {showAddDocModal && selectedCourseId && (
        <AddDocModal courseId={selectedCourseId} topicId={targetTopicId} currentDocs={docs} onClose={() => setShowAddDocModal(false)} onSuccess={() => reloadCourseDetails(selectedCourseId)} />
      )}

      {/* Action Modals */}
      {renamingItem && (
        <RenameModal
          title={`Rename ${renamingItem.type === 'course' ? 'Course' : 'Topic'}`}
          currentName={renamingItem.name}
          onClose={() => setRenamingItem(null)}
          onRename={handleRename}
        />
      )}
      {deletingItem && (
        <DeleteModal
          title={`Delete ${deletingItem.type === 'course' ? 'Course' : 'Topic'}`}
          message={`Are you sure you want to delete "${deletingItem.name}"? This action cannot be undone.`}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// Helper: Topic Section
function TopicSection({ title, subtitle, docs, isSelectMode, selectedIds, onToggle, onToggleBatch, expanded, onToggleExpand, onAddDoc, onRename, onDelete }: any) {
  const nav = useNavigate();
  const allSelected = docs.length > 0 && docs.every((d:Doc) => selectedIds.has(d.id));

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden group/section">
      <div className="flex items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onToggleExpand} className="text-gray-500 hover:text-gray-700 p-1">
            {expanded ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
          </button>
          
          {isSelectMode && (
            <button 
              onClick={() => onToggleBatch(docs.map((d:Doc) => d.id))}
              className={`text-gray-400 hover:text-blue-600 ${allSelected ? "text-blue-600" : ""}`}
            >
              {allSelected ? <Icons.CheckSquare /> : <Icons.Square />}
            </button>
          )}

          <div onClick={onToggleExpand} className="cursor-pointer flex items-center gap-3">
            <div>
              <span className="font-medium text-gray-800">{title}</span>
              {subtitle && <span className="ml-2 text-xs text-gray-500 font-normal">- {subtitle}</span>}
              <span className="ml-2 text-xs text-gray-400">({docs.length})</span>
            </div>
            
            {/* Topic Actions */}
            {onRename && onDelete && (
               <div className="hidden group-hover/section:flex gap-1 ml-2">
                 <button onClick={(e) => {e.stopPropagation(); onRename()}} className="p-1 text-gray-400 hover:text-blue-600"><Icons.Edit /></button>
                 <button onClick={(e) => {e.stopPropagation(); onDelete()}} className="p-1 text-gray-400 hover:text-red-600"><Icons.Trash /></button>
               </div>
            )}
          </div>
        </div>
        <button onClick={onAddDoc} className="text-xs text-blue-600 hover:underline flex items-center gap-1 px-2">
          <Icons.FilePlus /> Add Docs
        </button>
      </div>
      
      {expanded && (
        <div className="divide-y">
          {docs.length === 0 && <div className="p-4 text-center text-xs text-gray-400">No documents here.</div>}
          {docs.map((doc: Doc) => {
            const isSelected = selectedIds.has(doc.id);
            return (
              <div 
                key={doc.id} 
                onClick={() => {
                  if (isSelectMode) onToggle(doc.id);
                  else window.open(apiHref(`/api/files/view/${doc.id}`), '_blank');
                }}
                className={`flex items-center p-3 gap-3 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className={`flex-shrink-0 ${isSelectMode ? 'w-6' : 'w-0 overflow-hidden'} transition-all`}>
                  <button onClick={(e) => { e.stopPropagation(); onToggle(doc.id); }} className="text-gray-500 hover:text-blue-600">
                    {isSelected ? <Icons.CheckSquare /> : <Icons.Square />}
                  </button>
                </div>
                <div className="text-gray-400"><Icons.FileText /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 truncate">{doc.original_name}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{Math.round(doc.size / 1024)} KB</span>
                    {!isSelectMode && (
                      <>
                        <span className="mx-1">•</span>
                        <span className="text-blue-600 flex items-center gap-0.5"><Icons.ExternalLink /> Open</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper: Add Doc Modal
function AddDocModal({ courseId, topicId, currentDocs, onClose, onSuccess }: any) {
  const [allDocs, setAllDocs] = useState<Doc[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/api/files/mine").then(({ data }) => {
      const currentIds = new Set(currentDocs.map((d: Doc) => d.id));
      setAllDocs(data.items.filter((d: Doc) => !currentIds.has(d.id)));
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      await Promise.all(Array.from(selected).map(id => api.post(`/api/files/${id}/assign`, { course_id: courseId, topic_id: topicId })));
      onSuccess();
      onClose();
    } catch { alert("Failed"); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 flex flex-col max-h-[80vh]">
        <h3 className="text-lg font-bold mb-4">Add Documents</h3>
        <div className="flex-1 overflow-y-auto border rounded p-2 space-y-2">
          {allDocs.map(d => (
            <label key={d.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input type="checkbox" checked={selected.has(d.id)} onChange={() => setSelected(p => { const n = new Set(p); if(n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; })} />
              <span className="text-sm truncate">{d.original_name}</span>
            </label>
          ))}
          {allDocs.length === 0 && <div className="text-gray-400 text-sm text-center">No other documents found.</div>}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={save} disabled={saving || selected.size===0} className="px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50">Add Selected</button>
        </div>
      </div>
    </div>
  );
}