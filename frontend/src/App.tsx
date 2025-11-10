import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>("");

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  async function upload() {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await axios.post("http://localhost:5000/api/files/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setResult("Upload failed");
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1>AI Study Assistant</h1>
      <p>Backend health: {status === "loading" ? "checking..." : status}</p>

      <hr style={{ margin: "16px 0" }} />

      <h2>Upload a Lecture File (PDF/PPT)</h2>
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
      />
      <button onClick={upload} disabled={!file} style={{ marginLeft: 12 }}>
        Upload
      </button>

      {result && (
        <>
          <h3>Server Response</h3>
          <pre>{result}</pre>
        </>
      )}
    </div>
  );
}

export default App;
