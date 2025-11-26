// frontend/src/pages/DocsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import GenerateModal from "../components/GenerateModal";
import AssignModal from "../components/AssignModal";
import { RenameModal, DeleteModal } from "../components/ActionModals";

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";
const apiHref = (path: string) => `${apiOrigin}${path}`;

// --- Icons ---
const Icons = {
  FileText: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  CheckSquare: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 11 12 14 22 4"></polyline>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
    </svg>
  ),
  Square: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    </svg>
  ),
  X: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  Zap: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  FolderPlus: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      <line x1="12" y1="11" x2="12" y2="17"></line>
      <line x1="9" y1="14" x2="15" y2="14"></line>
    </svg>
  ),
  ExternalLink: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  ),
  Edit: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V4"></path>
      <path d="M18.5 2.5a2.121 2 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  Trash: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
  ),
  Quiz: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polygon points="10 8 16 12 10 16 10 8"></polygon>
    </svg>
  ),
  Flashcard: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
    </svg>
  ),
  Summary: () => (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
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
  const [activeGenType, setActiveGenType] =
    useState<"quiz" | "flashcards" | "summary" | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [renamingDoc, setRenamingDoc] = useState<Doc | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<Doc | null>(null);
  const [showBatchDelete, setShowBatchDelete] = useState(false);

  // Prompt banner text
  const [promptMode, setPromptMode] = useState<string | null>(null);

  useEffect(() => {
    loadDocs();
  }, [nav]);

  function loadDocs() {
    setLoading(true);
    api
      .get("/api/files/mine")
      .then(({ data }) => setItems(data.items))
      .catch((e: any) => {
        if (e?.response?.status === 401) nav("/login");
      })
      .finally(() => setLoading(false));
  }

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectedIds(new Set());
    setIsSelectMode(false);
    setPromptMode(null);
  };

  const handleRename = async (newName: string) => {
    if (!renamingDoc) return;
    await api.put(`/api/files/${renamingDoc.id}`, { name: newName });
    setItems((prev) =>
      prev.map((d) =>
        d.id === renamingDoc.id ? { ...d, original_name: newName } : d
      )
    );
    setRenamingDoc(null);
  };

  const handleDelete = async () => {
    if (!deletingDoc) return;
    await api.delete(`/api/files/${deletingDoc.id}`);
    setItems((prev) => prev.filter((d) => d.id !== deletingDoc.id));
    if (selectedIds.has(deletingDoc.id)) toggleSelection(deletingDoc.id);
    setDeletingDoc(null);
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      setIsSelectMode(true);
      setPromptMode("Select one or more documents to delete.");
      return;
    }
    // Open the custom modal instead of browser confirm
    setShowBatchDelete(true);
  };

  const confirmBatchDelete = async () => {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => api.delete(`/api/files/${id}`))
      );
      setItems((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      cancelSelection();
    } catch (e) {
      alert("Failed to delete some files");
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading documents...</div>;
  }

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  // Helper: when an action needs docs, but none are selected
  const requireSelection = (message: string, action: () => void) => {
    if (!hasSelection) {
      setIsSelectMode(true);
      setPromptMode(message);
      return;
    }
    action();
  };

  return (
    // Wide, centered layout with two columns on large screens
    <div className="max-w-screen-2xl mx-auto w-full px-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 py-8 pb-24">
      {/* LEFT COLUMN: header, banner, list */}
      <div className="space-y-6">
        {/* Header + Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">My Documents</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage, organize, and study from your files.
            </p>
          </div>

          {/* Header Actions – Generate Content + Select Documents */}
          <div className="flex items-center gap-2 bg-white p-1.5 border rounded-lg shadow-sm">
            <button
              onClick={() => {
                setIsSelectMode(true);
                setPromptMode(
                  "Select one or more documents, then choose Quiz, Flashcards, or Summary from the panel on the right."
                );
              }}
              title="Generate quizzes, flashcards, or summaries from your selected documents."
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition"
            >
              <Icons.Zap /> Generate Content
            </button>

            <div className="w-px h-5 bg-gray-300" />

            <button
              onClick={() => {
                if (isSelectMode) {
                  cancelSelection();
                } else {
                  setIsSelectMode(true);
                  setPromptMode("Click on documents to select them.");
                }
              }}
              className={`px-3 py-2 text-sm font-medium rounded-md transition ${
                isSelectMode
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {isSelectMode ? "Cancel Selection" : "Select Documents"}
            </button>
          </div>
        </div>

        {/* Prompt Banner */}
        {isSelectMode && promptMode && selectedCount === 0 && (
          <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center animate-in fade-in">
            <span className="mr-2">ℹ️</span> {promptMode}
          </div>
        )}

        {/* Document List */}
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
                    className={`group flex items-center p-4 gap-4 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Selection Box */}
                    <div
                      className={`flex-shrink-0 ${
                        isSelectMode
                          ? "w-6 opacity-100"
                          : "w-0 opacity-0 overflow-hidden"
                      } transition-all duration-200`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(doc.id);
                        }}
                        className="text-gray-500 hover:text-blue-600"
                      >
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
                        <span>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{Math.round(doc.size / 1024)} KB</span>
                        {doc.course_name && (
                          <>
                            <span>•</span>
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                              {doc.course_name}
                            </span>
                          </>
                        )}
                      </div>
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

                    {/* Per-document actions (Quiz / Flashcards / Summary + rename/delete) */}
                    {!isSelectMode && (
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            nav(`/docs/${doc.id}?tab=quizzes`);
                          }}
                          className="px-3 py-1.5 text-xs border rounded hover:bg-white text-gray-700"
                        >
                          Quiz
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            nav(`/docs/${doc.id}?tab=flashcards`);
                          }}
                          className="px-3 py-1.5 text-xs border rounded hover:bg-white text-gray-700"
                        >
                          Flashcards
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            nav(`/docs/${doc.id}?tab=summary`);
                          }}
                          className="px-3 py-1.5 text-xs border rounded hover:bg-white text-gray-700"
                        >
                          Summary
                        </button>

                        <div className="w-px h-4 bg-gray-300 mx-1" />

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingDoc(doc);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100"
                          title="Rename"
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingDoc(doc);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100"
                          title="Delete"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: always-visible actions panel */}
      <aside className="space-y-4 lg:sticky lg:top-24 h-fit">
        <div className="bg-white border border-gray-200 shadow-md rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-gray-800 text-base">Actions</h3>
              <p className="text-xs text-gray-500">
                {hasSelection
                  ? `${selectedCount} document${selectedCount !== 1 ? "s" : ""} selected`
                  : "No documents selected yet"}
              </p>
            </div>
            {isSelectMode && (
              <button
                onClick={cancelSelection}
                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition"
                title="Clear selection"
              >
                <Icons.X />
              </button>
            )}
          </div>

          <div className="space-y-3 mb-5">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
              Generate
            </p>

            <button
              onClick={() =>
                requireSelection(
                  "Select one or more documents to generate a quiz.",
                  () => setActiveGenType("quiz")
                )
              }
              className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all group text-left ${
                hasSelection
                  ? "border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-200"
                  : "border-gray-100 bg-gray-50 cursor-pointer"
              }`}
            >
              <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                <Icons.Quiz />
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">Quiz/Short Answer</div>
                <div className="text-xs text-gray-500">
                  Test yourself on key points
                </div>
              </div>
            </button>

            <button
              onClick={() =>
                requireSelection(
                  "Select one or more documents to generate flashcards.",
                  () => setActiveGenType("flashcards")
                )
              }
              className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all group text-left ${
                hasSelection
                  ? "border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-200"
                  : "border-gray-100 bg-gray-50 cursor-pointer"
              }`}
            >
              <div className="bg-white p-2 rounded-lg shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                <Icons.Flashcard />
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">
                  Flashcards
                </div>
                <div className="text-xs text-gray-500">
                  Memorize definitions and terms
                </div>
              </div>
            </button>

            <button
              onClick={() =>
                requireSelection(
                  "Select one or more documents to generate summaries.",
                  () => setActiveGenType("summary")
                )
              }
              className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all group text-left ${
                hasSelection
                  ? "border-purple-100 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-200"
                  : "border-gray-100 bg-gray-50 cursor-pointer"
              }`}
            >
              <div className="bg-white p-2 rounded-lg shadow-sm text-purple-600 group-hover:scale-110 transition-transform">
                <Icons.Summary />
              </div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">
                  Summary/Audio
                </div>
                <div className="text-xs text-gray-500">Get a quick overview</div>
              </div>
            </button>
          </div>

          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">
              Organize
            </p>
            <button
              onClick={() =>
                requireSelection(
                  "Select one or more documents to assign them to a course.",
                  () => setShowAssignModal(true)
                )
              }
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700 text-sm font-medium transition"
            >
              <Icons.FolderPlus /> Assign to Course
            </button>

            <button
              onClick={handleBatchDelete}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-red-50 text-red-600 text-sm font-medium transition"
            >
              <Icons.Trash /> Delete Selected
            </button>
          </div>
          {/* ADD THIS SECTION: */}
          <div className="pt-4 border-t space-y-2">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-1">
              Tips
            </p>
            <p className="text-xs text-gray-500 leading-relaxed">
              Use <span className="font-semibold">Select Documents</span> to select multiple files, then use the actions above to manage them.
            </p>
          </div>
        </div>
      </aside>

      {/* Modals */}
      {activeGenType && (
        <GenerateModal
          type={activeGenType}
          docIds={Array.from(selectedIds)}
          onClose={() => setActiveGenType(null)}
          onSuccess={() => {
            cancelSelection();
          }}
        />
      )}

      {showAssignModal && (
        <AssignModal
          docIds={Array.from(selectedIds)}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            cancelSelection();
            loadDocs();
          }}
        />
      )}

      {renamingDoc && (
        <RenameModal
          title="Rename Document"
          currentName={renamingDoc.original_name}
          onClose={() => setRenamingDoc(null)}
          onRename={handleRename}
        />
      )}
      {deletingDoc && (
        <DeleteModal
          title="Delete Document"
          message={`Are you sure you want to delete "${deletingDoc.original_name}"? This cannot be undone.`}
          onClose={() => setDeletingDoc(null)}
          onConfirm={handleDelete}
        />
      )}
      {/* ADD THIS: */}
      {showBatchDelete && (
        <DeleteModal
          title="Delete Documents"
          message={`Are you sure you want to delete ${selectedCount} document(s)? This cannot be undone.`}
          onClose={() => setShowBatchDelete(false)}
          onConfirm={confirmBatchDelete}
        />
      )}
    </div>
  );
}
