/* ── Frontend → backend bridge for the real Gemini-powered Spark ──
   All calls degrade gracefully: if the backend is unreachable (offline,
   key not set, demo on plain Firebase Hosting), callers fall back to the
   local canned responses so the UI never breaks. */

import { auth } from "./firebaseInit.js";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8787").replace(/\/$/, "");

/* Attach the signed-in user's Firebase ID token so the backend can verify
   the caller. Without it the backend returns 401 (callers fall back locally). */
async function authHeader() {
  try {
    const u = auth.currentUser;
    if (u) return { Authorization: "Bearer " + (await u.getIdToken()) };
  } catch (e) {}
  return {};
}

async function postJSON(path, body, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/* Ask Spark a free-form question, grounded in the current lab context.
   Returns { answer } or throws (caller should fall back). */
export async function askSpark({ question, experiment, labState }) {
  const data = await postJSON("/api/spark/ask", { question, experiment, labState });
  return data.answer;
}

/* Get a short, contextual spoken reaction to a sandbox action
   (e.g. a litmus dip or closing a circuit). Returns a string. */
export async function sparkReact({ experiment, event, labState }) {
  const data = await postJSON("/api/spark/react", { experiment, event, labState });
  return data.answer;
}

/* Ask Gemini to grade a completed lab and return conceptual feedback.
   Returns { score, total, feedback, badge } or throws. */
export async function gradeLab({ experiment, observations }) {
  return await postJSON("/api/grade", { experiment, observations });
}

export function apiBase() {
  return API_BASE;
}
