import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    // Call the Flask endpoint
    axios
      .get("http://localhost:5000/api/health")
      .then(() => setStatus("ok"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <div style={{ padding: "24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <h1>AI Study Assistant</h1>
      <p>Backend health: {status === "loading" ? "checking..." : status}</p>
    </div>
  );
}

export default App;
