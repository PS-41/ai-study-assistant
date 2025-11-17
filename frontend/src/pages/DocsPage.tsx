import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";
const apiHref = (path: string) => `${apiOrigin}${path}`;

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

  // NEW: for assignment UI
  type Course = { id: number; name: string; description?: string | null };
  type Topic = { id: number; name: string; course_id: number };

  const [courses, setCourses] = useState<Course[]>([]);
  const [topicsByCourse, setTopicsByCourse] = useState<Record<number, Topic[]>>({});
  const [assignDocId, setAssignDocId] = useState<number | null>(null);
  const [assignCourseId, setAssignCourseId] = useState<number | null>(null);
  const [assignTopicId, setAssignTopicId] = useState<number | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);

  useEffect(() => {
    api
      .get("/api/files/mine")
      .then(({ data }) => setItems(data.items))
      .catch((e: any) => {
        if (e?.response?.status === 401) {
          // not logged in
          setItems([]);
          nav("/login");
        } else {
          setItems([]);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading…</div>;
  if (!items.length) return <div>No documents yet. Upload one to get started.</div>;

  async function ensureCoursesLoaded() {
    if (courses.length > 0) return;
    try {
      const { data } = await api.get("/api/courses/mine");
      setCourses(data.items || []);
    } catch (e: any) {
      console.error("Failed to load courses", e);
    }
  }

  async function loadTopicsForCourse(courseId: number) {
    if (topicsByCourse[courseId]) return;
    try {
      const { data } = await api.get(`/api/topics/by_course/${courseId}`);
      setTopicsByCourse(prev => ({
        ...prev,
        [courseId]: data.items || [],
      }));
    } catch (e: any) {
      console.error("Failed to load topics", e);
    }
  }

  async function openAssign(doc: Doc) {
    setAssignDocId(doc.id);
    const initialCourseId = doc.course_id ?? null;
    const initialTopicId = doc.topic_id ?? null;
    setAssignCourseId(initialCourseId);
    setAssignTopicId(initialTopicId);
    await ensureCoursesLoaded();
    if (initialCourseId) {
      await loadTopicsForCourse(initialCourseId);
    }
  }

  function closeAssign() {
    setAssignDocId(null);
    setAssignCourseId(null);
    setAssignTopicId(null);
    setAssignSaving(false);
  }

  async function saveAssign() {
    if (!assignDocId) return;
    setAssignSaving(true);
    try {
      const payload: any = {
        course_id: assignCourseId,
        topic_id: assignTopicId,
      };
      const { data } = await api.post(`/api/files/${assignDocId}/assign`, payload);
      // Update local state
      setItems(prev =>
        prev.map(doc =>
          doc.id === assignDocId
            ? {
                ...doc,
                course_id: data.course_id,
                topic_id: data.topic_id,
                course_name:
                  data.course_id &&
                  courses.find(c => c.id === data.course_id)?.name
                    ? courses.find(c => c.id === data.course_id)!.name
                    : null,
                topic_name:
                  data.topic_id &&
                  topicsByCourse[data.course_id || assignCourseId || 0]?.find(
                    t => t.id === data.topic_id
                  )?.name || null,
              }
            : doc
        )
      );
      closeAssign();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to assign document");
      setAssignSaving(false);
    }
  }



  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Documents</h2>
      <div className="grid gap-3">
        {items.map((doc) => (
          <div
            key={doc.id}
            className="rounded border bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
          >
            {/* Left: name + meta */}
            <div>
              {/* Clickable name → open PDF in new tab (same as before) */}
              <a
                href={apiHref(`/api/files/view/${doc.id}`)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-blue-600 hover:underline"
                title="Open PDF in a new tab"
              >
                {doc.original_name}
              </a>
              <div className="text-xs text-gray-500">
                {new Date(doc.created_at).toLocaleString()} •{" "}
                {Math.round(doc.size / 1024)} KB {doc.owned ? "• owned" : ""}
              </div>
              {(doc.course_name || doc.topic_name) && (
                <div className="text-[11px] text-gray-500 mt-1">
                  {doc.course_name && <span>Course: {doc.course_name}</span>}
                  {doc.course_name && doc.topic_name && <span> • </span>}
                  {doc.topic_name && <span>Topic: {doc.topic_name}</span>}
                </div>
              )}
              {/* explicit Open PDF link (optional, but matches what you asked for) */}
              <div className="text-xs mt-1">
                <a
                  href={apiHref(`/api/files/view/${doc.id}`)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-gray-500 hover:text-gray-700 underline"
                >
                  Open PDF in new tab
                </a>
              </div>
            </div>

            {/* Right: only three quick actions → open details page with correct tab */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  nav(`/docs/${doc.id}?tab=quizzes`, { state: { docName: doc.original_name } })
                }
                className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-gray-100"
              >
                Quizzes
              </button>

              <button
                onClick={() =>
                  nav(`/docs/${doc.id}?tab=flashcards`, { state: { docName: doc.original_name } })
                }
                className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-gray-100"
              >
                Flashcards
              </button>

              <button
                onClick={() =>
                  nav(`/docs/${doc.id}?tab=summary`, { state: { docName: doc.original_name } })
                }
                className="px-3 py-1 border border-gray-300 text-xs rounded hover:bg-gray-100"
              >
                Summary
              </button>

              <button
                onClick={() => openAssign(doc)}
                className="px-3 py-1 bg-gray-100 border rounded text-xs hover:bg-gray-200"
              >
                Assign
              </button>

            </div>
          </div>
        ))}
      </div>
      {assignDocId && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center">
          <div className="mb-4 w-full max-w-xl rounded-2xl border bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-sm">Assign document</div>
              <button
                onClick={closeAssign}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs text-gray-600">
                  Course
                </label>
                <select
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={assignCourseId ?? ""}
                  onChange={async e => {
                    const val = e.target.value;
                    const cid = val ? Number(val) : null;
                    setAssignCourseId(cid);
                    setAssignTopicId(null);
                    if (cid) {
                      await loadTopicsForCourse(cid);
                    }
                  }}
                >
                  <option value="">(none)</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs text-gray-600">
                  Topic (optional)
                </label>
                <select
                  className="w-full rounded border px-2 py-1 text-sm"
                  value={assignTopicId ?? ""}
                  onChange={e => {
                    const val = e.target.value;
                    setAssignTopicId(val ? Number(val) : null);
                  }}
                  disabled={!assignCourseId}
                >
                  <option value="">
                    {assignCourseId ? "(no topic)" : "Select a course first"}
                  </option>
                  {assignCourseId &&
                    (topicsByCourse[assignCourseId] || []).map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeAssign}
                className="px-3 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAssign}
                disabled={assignSaving}
                className="px-3 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
              >
                {assignSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
