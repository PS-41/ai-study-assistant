import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useLocation, useNavigate } from "react-router-dom";

const apiOrigin = import.meta.env.DEV ? "http://localhost:5000" : "";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  
  const location = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    // 1. Check URL for errors passed from Backend Redirect
    const params = new URLSearchParams(location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      setErr(errorParam);
      // Clean URL without reloading
      nav("/profile", { replace: true });
    }

    // 2. Load User Data
    api.get("/api/auth/me").then(({ data }) => {
      setUser(data);
      setName(data.name);
      setUsername(data.username || "");
    });
  }, [location.search, nav]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setErr("");
    try {
      await api.put("/api/auth/profile", { name, username, password });
      setMsg("Profile updated successfully.");
      setPassword(""); 
    } catch (e: any) {
      setErr(e?.response?.data?.error || "Update failed");
    }
  }

  if (!user) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Profile Settings</h1>
      
      <div className="bg-white rounded-xl border p-6 shadow-sm space-y-8">
        <form onSubmit={handleUpdate} className="space-y-4">
          {msg && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">{msg}</div>}
          {err && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{err}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input className="w-full border rounded p-2.5 text-sm" value={name} onChange={e=>setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input className="w-full border rounded p-2.5 text-sm" value={username} onChange={e=>setUsername(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password (Optional)</label>
            <input className="w-full border rounded p-2.5 text-sm" type="password" placeholder="Set new password..." value={password} onChange={e=>setPassword(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password.</p>
          </div>

          <div className="pt-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">Save Changes</button>
          </div>
        </form>

        <hr />

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Connected Accounts</h3>
          <p className="text-sm text-gray-500 mb-4">Link your Google account to log in easily and recover your account if you forget your password.</p>
          
          {user.has_google ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg">
              <span className="text-xl">✓</span>
              <span className="text-sm font-medium">Google account linked ({user.email})</span>
            </div>
          ) : (
            <a href={`${apiOrigin}/api/auth/google/login`} className="inline-flex items-center gap-2 border rounded-lg px-4 py-2.5 hover:bg-gray-50 transition text-sm font-medium text-gray-700">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Link Google Account
            </a>
          )}
        </div>
      </div>
    </div>
  );
}