import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function UploadPage() {
  const [status, setStatus] = useState<"loading"|"ok"|"error">("loading");
  const [file, setFile] = useState<File|null>(null);
  const [uploadResp, setUploadResp] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    api.get("/api/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  async function upload() {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/api/files/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setUploadResp(data);
  }

  async function generateQuiz() {
    if (!uploadResp?.document_id) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <h2 className="text-lg font-semibold">System</h2>
        <p>Backend health: <b>{status === "loading" ? "checking..." : status}</b></p>
      </div>

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
          disabled={!file}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Upload
        </button>

        {uploadResp && (
          <div className="text-sm text-gray-700">
            Stored as: <b>{uploadResp.filename}</b> (ID: {uploadResp.document_id})
          </div>
        )}
      </div>

      {uploadResp && (
        <div className="rounded border bg-white p-4">
          <button
            onClick={generateQuiz}
            disabled={busy}
            className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-50"
          >
            {busy ? "Generating..." : "Generate Quiz from this Document"}
          </button>
        </div>
      )}
    </div>
  );
}
