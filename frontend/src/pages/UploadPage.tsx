import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";
import ProgressOverlay from "../components/ProgressOverlay";

export default function UploadPage() {
  const [file, setFile] = useState<File|null>(null);
  const [uploadResp, setUploadResp] = useState<any>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [showGenProgress, setShowGenProgress] = useState(false);
  const [me, setMe] = useState<{id:number;email:string;name:string}|null>(null);
  const nav = useNavigate();

  useEffect(() => {
    api.get("/api/auth/me")
      .then(({data}) => setMe(data))
      .catch(() => setMe(null));
  }, []);

  async function upload() {
    if (!file) return;
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/api/files/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadResp(data);
    } catch (e: any) {
      if (e?.response?.status === 401) {
        alert("Please login to upload.");
        nav("/login");
      } else {
        alert(e?.response?.data?.error || "Upload failed");
      }
    } finally {
      setUploadBusy(false);
    }
  }

  async function generateQuiz() {
    if (!uploadResp?.document_id) return;
    setGenBusy(true);
    setShowGenProgress(true);
    try {
      const { data } = await api.post("/api/quizzes/generate", {
        document_id: uploadResp.document_id,
        title: "Auto Quiz",
        n: 5
      });
      nav(`/quiz?quizId=${data.quiz_id}`);
    } catch (e: any) {
      const msg = e?.response?.data?.error || "Quiz generation failed. Try another file.";
      alert(msg);
    } finally {
      setGenBusy(false);
      setShowGenProgress(false);
    }
  }

  if (!me) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Please sign in</h2>
        <p className="text-sm text-gray-600">You need an account to upload files and generate quizzes.</p>
        <div className="flex gap-3">
          <button onClick={()=>nav("/login")} className="px-4 py-2 bg-blue-600 text-white rounded">Login</button>
          <button onClick={()=>nav("/signup")} className="px-4 py-2 bg-gray-200 rounded">Sign up</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4 space-y-3">
        <h2 className="text-lg font-semibold">Upload a Lecture File</h2>
        <input
          type="file"
          onChange={e => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          className="block"
        />
        <button
          onClick={upload}
          disabled={!file || uploadBusy}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {uploadBusy ? "Uploading..." : "Upload"}
        </button>

        {uploadResp && (
          <div className="text-sm text-gray-700">
            File uploaded in your documents
          </div>
        )}
      </div>

      {uploadResp && (
        <div className="rounded border bg-white p-4">
          <button
            onClick={generateQuiz}
            disabled={genBusy}
            className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
          >
            {genBusy ? "Generating..." : "Generate Quiz from this Document"}
          </button>
        </div>
      )}

      {showGenProgress && (
        <ProgressOverlay
          title="Generating your quiz"
          messages={[
            "Reading your document…",
            "Extracting key points…",
            "Composing questions…",
            "Selecting plausible distractors…",
            "Ensuring answer consistency…"
          ]}
        />
      )}
    </div>
  );
}
