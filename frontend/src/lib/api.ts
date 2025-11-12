import axios from "axios";

// In dev, set VITE_API_BASE=http://localhost:5000
// In prod, leave it unset -> relative paths (Caddy proxies /api/*)
const base = import.meta.env.VITE_API_BASE || "";
export const api = axios.create({
  baseURL: base,
  withCredentials: true,
});
