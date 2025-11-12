import { useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function AuthSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/auth/signup", { name, email, password });
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Signup failed");
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border rounded p-6 space-y-4">
      <h2 className="text-xl font-semibold">Create account</h2>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full border rounded p-2" placeholder="Full name" value={name}
               onChange={(e)=>setName(e.target.value)} />
        <input className="w-full border rounded p-2" placeholder="Email" value={email}
               onChange={(e)=>setEmail(e.target.value)} />
        <input className="w-full border rounded p-2" placeholder="Password" type="password" value={password}
               onChange={(e)=>setPassword(e.target.value)} />
        <button className="px-4 py-2 bg-emerald-600 text-white rounded">Sign up</button>
      </form>
    </div>
  );
}
