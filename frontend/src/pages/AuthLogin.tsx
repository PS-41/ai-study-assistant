import { useState } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";

export default function AuthLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const nav = useNavigate();
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/auth/login", { username, password });
      nav("/");
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Login failed");
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white border rounded-xl p-8 shadow-sm mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Welcome Back</h2>
      {err && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded">{err}</div>}
      
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                 placeholder="Enter your username" 
                 value={username}
                 onChange={(e)=>setUsername(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none" 
                 placeholder="••••••••" type="password" 
                 value={password}
                 onChange={(e)=>setPassword(e.target.value)} />
        </div>
        <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Sign in</button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
        </div>
        <a href={`${apiOrigin}/api/auth/google/login`} className="mt-4 w-full flex items-center justify-center gap-2 border rounded-lg py-2.5 hover:bg-gray-50 transition text-gray-700 font-medium">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          Google
        </a>
        <p className="text-center text-xs text-gray-500 mt-3">
          Forgot password? Sign in with Google to recover your account.
        </p>
      </div>
    </div>
  );
}