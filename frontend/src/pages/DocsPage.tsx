import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import ProgressOverlay from "../components/ProgressOverlay";

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
};

export default function DocsPage() {
  const [items, setItems] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyDocId, setBusyDocId] = useState<number | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api
      .get("/api/files/mine")
      .then(({ data }) => setItems(data.items))
      .catch((e:any) => {
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

  async function genQuiz(docId: number) {
    setBusyDocId(docId);
    setShowProgress(true);
    try {
      const { data } = await api.post("/api/quizzes/generate", {
        document_id: docId,
        title: "Auto Quiz",
        n: 5,
      });
      nav(`/quiz?quizId=${data.quiz_id}`);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error || "Failed to generate quiz";
      if (status === 410) {
        alert(`${msg}\n\nTip: Re-upload this document and try again.`);
      } else {
        alert(msg);
      }
    } finally {
      setBusyDocId(null); // <-- clear busy state
      setShowProgress(false);
    }
  }

  if (loading) return <div>Loading…</div>;
  if (!items.length) return <div>No documents yet. Upload one to get started.</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Documents</h2>
      <div className="grid gap-3">
        {items.map((doc) => (
          <div
            key={doc.id}
            className="rounded border bg-white p-4 flex items-center justify-between"
          >
            <div>
              {/* clickable name */}
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
            </div>

            <div className="flex gap-2">
              {/* View button */}
              <a
                href={apiHref(`/api/files/view/${doc.id}`)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
              >
                View
              </a>

              {/* Details button → opens Document Details page */}
              <button
                onClick={() => nav(`/docs/${doc.id}`, { state: { docName: doc.original_name } })}
                className="px-3 py-1 bg-white border rounded hover:bg-gray-50"
              >
                Details
              </button>

              {/* Generate button with per-row busy state */}
              <button
                onClick={() => genQuiz(doc.id)}
                disabled={busyDocId === doc.id}
                className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50"
              >
                {busyDocId === doc.id ? "Generating..." : "Generate Quiz"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showProgress && (
        <ProgressOverlay
          title="Generating your quiz"
          messages={[
            "Extracting content…",
            "Identifying key points…",
            "Drafting multiple-choice questions…",
            "Balancing distractors…",
            "Finalizing quiz…"
          ]}
        />
      )}
    </div>
  );
}
