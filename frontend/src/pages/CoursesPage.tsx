// frontend/src/pages/CoursesPage.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Course = {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string | null;
};

type Topic = {
  id: number;
  name: string;
  description?: string | null;
  course_id: number;
  created_at?: string | null;
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

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";
const apiHref = (path: string) => `${apiOrigin}${path}`;

export default function CoursesPage() {
  const nav = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

  const [topicsByCourse, setTopicsByCourse] = useState<Record<number, Topic[]>>(
    {}
  );
  const [topicsLoading, setTopicsLoading] = useState<Record<number, boolean>>(
    {}
  );

  const [docsByCourse, setDocsByCourse] = useState<Record<number, Doc[]>>({});
  const [docsLoading, setDocsLoading] = useState<Record<number, boolean>>({});

  // Creation form state
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseDescription, setCourseDescription] = useState("");

  const [creatingTopic, setCreatingTopic] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [topicDescription, setTopicDescription] = useState("");
  const [topicCourseId, setTopicCourseId] = useState<number | "">("");

  // -------------------------------------------------------
  // Load user's courses
  // -------------------------------------------------------
  useEffect(() => {
    setCoursesLoading(true);
    api
      .get("/api/courses/mine")
      .then(({ data }) => {
        const items: Course[] = data.items || [];
        setCourses(items);
        if (!selectedCourseId && items.length > 0) {
          setSelectedCourseId(items[0].id);
        }
      })
      .catch((e: any) => {
        if (e?.response?.status === 401) nav("/login");
        else setCourses([]);
      })
      .finally(() => setCoursesLoading(false));
  }, [nav]);

  // -------------------------------------------------------
  // Helpers to load topics/docs for a course
  // -------------------------------------------------------
  async function loadTopics(courseId: number) {
    if (topicsByCourse[courseId] || topicsLoading[courseId]) return;
    setTopicsLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const { data } = await api.get(`/api/topics/by_course/${courseId}`);
      setTopicsByCourse((prev) => ({
        ...prev,
        [courseId]: data.items || [],
      }));
    } catch (e) {
      console.error("Failed to load topics", e);
    } finally {
      setTopicsLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  }

  async function loadDocs(courseId: number) {
    if (docsByCourse[courseId] || docsLoading[courseId]) return;
    setDocsLoading((prev) => ({ ...prev, [courseId]: true }));
    try {
      const { data } = await api.get("/api/files/mine", {
        params: { course_id: courseId },
      });
      setDocsByCourse((prev) => ({
        ...prev,
        [courseId]: (data.items || []) as Doc[],
      }));
    } catch (e) {
      console.error("Failed to load docs for course", e);
      setDocsByCourse((prev) => ({ ...prev, [courseId]: [] }));
    } finally {
      setDocsLoading((prev) => ({ ...prev, [courseId]: false }));
    }
  }

  async function reloadCourses() {
    try {
      const { data } = await api.get("/api/courses/mine");
      setCourses(data.items || []);
    } catch (e: any) {
      setCourses([]);
    }
  }

  async function handleCreateCourse(e: any) {
    e.preventDefault();
    if (!courseName.trim()) {
      alert("Please enter a course name");
      return;
    }
    setCreatingCourse(true);
    try {
      await api.post("/api/courses", {
        name: courseName.trim(),
        description: courseDescription.trim() || null,
      });
      setCourseName("");
      setCourseDescription("");
      await reloadCourses();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to create course");
    } finally {
      setCreatingCourse(false);
    }
  }

  async function handleCreateTopic(e: any) {
    e.preventDefault();
    if (!topicCourseId) {
      alert("Please pick a course for this topic");
      return;
    }
    if (!topicName.trim()) {
      alert("Please enter a topic name");
      return;
    }

    setCreatingTopic(true);
    try {
      await api.post("/api/topics", {
        course_id: topicCourseId,
        name: topicName.trim(),
        description: topicDescription.trim() || null,
      });

      setTopicName("");
      setTopicDescription("");
      setTopicCourseId("");
      await reloadCourses();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to create topic");
    } finally {
      setCreatingTopic(false);
    }
  }



  // Load topics/docs when course changes
  useEffect(() => {
    if (!selectedCourseId) return;
    loadTopics(selectedCourseId);
    loadDocs(selectedCourseId);
  }, [selectedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  const topicsForSelected = selectedCourseId
    ? topicsByCourse[selectedCourseId] || []
    : [];

  const docsForSelected = selectedCourseId
    ? docsByCourse[selectedCourseId] || []
    : [];

  // Group docs by topic_id (with a "No topic" bucket)
  const groupedDocs = useMemo(() => {
    const byTopic: Record<string, Doc[]> = {};
    for (const d of docsForSelected) {
      const key = d.topic_id ? String(d.topic_id) : "none";
      if (!byTopic[key]) byTopic[key] = [];
      byTopic[key].push(d);
    }
    return byTopic;
  }, [docsForSelected]);

  if (coursesLoading) return <div>Loading courses…</div>;

  return (
    <div className="grid gap-4 md:grid-cols-[260px,1fr]">
      {/* Left: course list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">My Courses</h2>
        </div>
        
        {/* Quick creation panel */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Create Course */}
          <form
            onSubmit={handleCreateCourse}
            className="rounded border bg-white p-4 space-y-2"
          >
            <div className="text-sm font-medium">Create new course</div>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Course name (e.g. CSCE 676 - Data Mining)"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
            />
            <textarea
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Optional description"
              rows={2}
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
            />
            <button
              type="submit"
              disabled={creatingCourse}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
            >
              {creatingCourse ? "Creating…" : "Create course"}
            </button>
          </form>

          {/* Create Topic */}
          <form
            onSubmit={handleCreateTopic}
            className="rounded border bg-white p-4 space-y-2"
          >
            <div className="text-sm font-medium">Create new topic</div>

            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={topicCourseId === "" ? "" : String(topicCourseId)}
              onChange={(e) => {
                const val = e.target.value;
                setTopicCourseId(val ? Number(val) : "");
              }}
            >
              <option value="">Select course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <input
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Topic name (e.g. Week 3 - Decision Trees)"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
            />
            <textarea
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Optional topic description"
              rows={2}
              value={topicDescription}
              onChange={(e) => setTopicDescription(e.target.value)}
            />

            <button
              type="submit"
              disabled={creatingTopic || !courses.length}
              className="px-3 py-1 text-sm rounded bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-700"
            >
              {creatingTopic ? "Creating…" : "Create topic"}
            </button>

            {!courses.length && (
              <div className="text-xs text-gray-500 mt-1">
                Create a course first, then you can add topics to it.
              </div>
            )}
          </form>
        </div>

        <div className="rounded border bg-white divide-y">
          {courses.map((c) => {
            const isActive = c.id === selectedCourseId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={[
                  "w-full text-left px-3 py-2 text-sm",
                  isActive
                    ? "bg-blue-50 border-l-2 border-l-blue-600"
                    : "hover:bg-gray-50",
                ].join(" ")}
              >
                <div className="font-medium truncate">{c.name}</div>
                {c.description && (
                  <div className="text-[11px] text-gray-500 line-clamp-2">
                    {c.description}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: selected course detail */}
      <div className="space-y-4">
        {selectedCourse ? (
          <>
            <div>
              <h3 className="text-xl font-semibold">{selectedCourse.name}</h3>
              {selectedCourse.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {selectedCourse.description}
                </p>
              )}
            </div>

            {/* Topics summary */}
            <div className="rounded border bg-white p-3">
              <div className="text-sm font-medium mb-2">Topics</div>
              {topicsLoading[selectedCourse.id] && (
                <div className="text-xs text-gray-500">Loading topics…</div>
              )}
              {!topicsLoading[selectedCourse.id] && !topicsForSelected.length && (
                <div className="text-xs text-gray-500">
                  No topics yet in this course.
                </div>
              )}
              {!!topicsForSelected.length && (
                <div className="flex flex-wrap gap-2">
                  {topicsForSelected.map((t) => {
                    const count =
                      docsForSelected.filter((d) => d.topic_id === t.id)
                        .length || 0;
                    return (
                      <div
                        key={t.id}
                        className="rounded-full border px-3 py-1 text-xs bg-gray-50"
                      >
                        {t.name}
                        {count ? <span className="ml-1 text-gray-500">({count})</span> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Documents grouped by topic */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Documents in this course
                </div>
                {docsLoading[selectedCourse.id] && (
                  <div className="text-xs text-gray-500">Loading docs…</div>
                )}
              </div>

              {!docsLoading[selectedCourse.id] && !docsForSelected.length && (
                <div className="text-sm text-gray-500">
                  No documents assigned to this course yet.  
                  Use <span className="font-medium">Assign</span> from My
                  Documents to add some.
                </div>
              )}

              {!docsLoading[selectedCourse.id] &&
                !!docsForSelected.length && (
                  <div className="space-y-4">
                    {/* "No topic" group */}
                    {groupedDocs["none"] && (
                      <div>
                        <div className="text-xs font-semibold text-gray-600 mb-1">
                          No topic
                        </div>
                        <DocList
                          docs={groupedDocs["none"]}
                          selectedCourseId={selectedCourse.id}
                        />
                      </div>
                    )}

                    {/* Each topic group */}
                    {topicsForSelected.map((t) => {
                      const key = String(t.id);
                      const docs = groupedDocs[key] || [];
                      if (!docs.length) return null;
                      return (
                        <div key={t.id}>
                          <div className="text-xs font-semibold text-gray-600 mb-1">
                            {t.name}
                          </div>
                          <DocList
                            docs={docs}
                            selectedCourseId={selectedCourse.id}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-600">
            Select a course on the left to see its contents.
          </div>
        )}
      </div>
    </div>
  );
}

// Small helper component just to keep the course page tidy
function DocList({
  docs,
}: {
  docs: Doc[];
  selectedCourseId: number;
}) {
  const nav = useNavigate();

  return (
    <div className="space-y-2">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="rounded border bg-white p-3 flex items-center justify-between"
        >
          <div>
            <a
              href={apiHref(`/api/files/view/${doc.id}`)}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              {doc.original_name}
            </a>
            <div className="text-[11px] text-gray-500">
              {new Date(doc.created_at).toLocaleString()} •{" "}
              {Math.round(doc.size / 1024)} KB
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={() =>
                nav(`/docs/${doc.id}?tab=summary`, {
                  state: { docName: doc.original_name },
                })
              }
              className="px-2 py-1 bg-white border rounded text-xs hover:bg-gray-50"
            >
              Summary
            </button>
            <button
              onClick={() =>
                nav(`/docs/${doc.id}?tab=flashcards`, {
                  state: { docName: doc.original_name },
                })
              }
              className="px-2 py-1 bg-white border rounded text-xs hover:bg-gray-50"
            >
              Flashcards
            </button>
            <button
              onClick={() =>
                nav(`/docs/${doc.id}?tab=quizzes`, {
                  state: { docName: doc.original_name },
                })
              }
              className="px-2 py-1 bg-white border rounded text-xs hover:bg-gray-50"
            >
              Quizzes
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
