/* ════════════════════════════════════════════════════════════════
   LabSpark AI — Backend (Cloud Run)
   Real Gemini-powered "Spark" tutor + conceptual grader.
   The Gemini API key lives ONLY here, never in the browser.
   ════════════════════════════════════════════════════════════════ */
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import admin from "firebase-admin";
import { GoogleGenAI, Modality } from "@google/genai";

const PORT = process.env.PORT || 8787;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";
const API_KEY = process.env.GEMINI_API_KEY;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "gen-lang-client-0686614374";
const RATE_PER_MIN = Number(process.env.RATE_PER_MIN || 20);
const RATE_PER_DAY = Number(process.env.RATE_PER_DAY || 300);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
  "https://gen-lang-client-0686614374.web.app,https://gen-lang-client-0686614374.firebaseapp.com,https://labspark-app.web.app,https://labspark-app.firebaseapp.com,http://localhost:5173,http://localhost:4173"
).split(",").map((s) => s.trim());

if (!API_KEY) {
  console.warn("[LabSpark] WARNING: GEMINI_API_KEY is not set. Requests return 503 until configured.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// Firebase Admin — used only to VERIFY caller ID tokens (no service-account
// key needed; verification fetches Google's public certs and checks the
// audience against this project). On Cloud Run it also picks up ADC.
try { admin.initializeApp({ projectId: PROJECT_ID }); } catch (e) {}

async function verifyToken(token) {
  if (!token) return null;
  try { return await admin.auth().verifyIdToken(token); } catch (e) { return null; }
}

/* Require a valid Firebase ID token on every AI request. */
async function requireAuth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  const decoded = await verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Please sign in to use Spark." });
  req.uid = decoded.uid;
  next();
}

/* Per-user soft rate limit (in-memory). Caps burst + daily usage so a single
   account cannot run up the Gemini bill. */
const buckets = new Map();
function rateLimit(req, res, next) {
  const key = req.uid || req.ip || "anon";
  const now = Date.now();
  let b = buckets.get(key);
  if (!b) { b = { winStart: now, count: 0, dayStart: now, dayCount: 0 }; buckets.set(key, b); }
  if (now - b.winStart > 60000) { b.winStart = now; b.count = 0; }
  if (now - b.dayStart > 86400000) { b.dayStart = now; b.dayCount = 0; }
  b.count++; b.dayCount++;
  if (buckets.size > 10000) buckets.clear(); // safety valve
  if (b.count > RATE_PER_MIN) return res.status(429).json({ error: "Too many requests — please slow down." });
  if (b.dayCount > RATE_PER_DAY) return res.status(429).json({ error: "Daily AI limit reached. Try again tomorrow." });
  next();
}

const app = express();
app.use(cors({ origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)) }));
app.use(express.json({ limit: "256kb" }));
// Gate all /api/* HTTP routes behind auth + rate limiting (health stays open).
app.use("/api", requireAuth, rateLimit);

/* ── Spark's persona. This is the system instruction sent on every call.
   In production this block is a great candidate for Vertex AI context
   caching to cut per-session token cost. ── */
const SPARK_SYSTEM = `
You are "Spark", a warm, encouraging AI lab instructor for the LabSpark AI
virtual science laboratory. Your students are Class 6–10 (CBSE/NCERT, India),
roughly ages 11–16.

Teaching style:
- Be Socratic and concise. Prefer 1–3 short sentences. This is spoken aloud, so
  no markdown, no bullet points, no formulas in LaTeX — say them in words.
- Use simple, vivid language. One emoji at most, only when it adds warmth.
- Stay strictly within the NCERT Class 6–10 Physics & Chemistry syllabus.
- Never tell a student to taste, touch, or smell real chemicals.
- If asked something off-topic, gently steer back to the experiment.
- React to what the student is actually doing in the sandbox (the labState).

Socratic inquiry mode:
- When the student makes a PREDICTION, never reveal the answer first — ask one short
  "why" that nudges their reasoning.
- When you EXPLAIN after an observation, first say plainly whether their prediction
  matched, then give the one-sentence reason.
- Celebrate a wrong prediction as a good scientific guess — a hypothesis that didn't
  hold is still real science. Never make a student feel bad for predicting wrong.
`.trim();

function ensureReady(res) {
  if (!ai) {
    res.status(503).json({ error: "Gemini not configured (missing GEMINI_API_KEY)." });
    return false;
  }
  return true;
}

async function generate({ prompt, temperature = 0.6, maxOutputTokens = 500, json = false }) {
  const config = {
    systemInstruction: SPARK_SYSTEM,
    temperature,
    maxOutputTokens,
    // Spark gives short, direct tutor replies — disable Gemini 2.5 "thinking"
    // so the token budget goes to the answer (avoids mid-sentence truncation).
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (json) config.responseMimeType = "application/json";
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config,
  });
  return response.text;
}

/* Health check (Cloud Run + uptime probes) */
app.get("/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, geminiConfigured: Boolean(ai) });
});

/* ── Free-form question from the "Ask Spark" box ── */
app.post("/api/spark/ask", async (req, res) => {
  if (!ensureReady(res)) return;
  const { question, experiment, labState } = req.body || {};
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "question (string) is required" });
  }
  try {
    const prompt =
      `Experiment: ${experiment || "general science lab"}.\n` +
      `Current sandbox state: ${JSON.stringify(labState || {})}.\n` +
      `Student asks: "${question}"\n` +
      `Answer as Spark.`;
    const answer = await generate({ prompt });
    res.json({ answer: answer?.trim() || "Let's keep experimenting and observing!" });
  } catch (err) {
    console.error("ask error:", err);
    res.status(502).json({ error: "Gemini request failed" });
  }
});

/* ── Contextual reaction to a sandbox action (litmus dip, switch close…) ── */
app.post("/api/spark/react", async (req, res) => {
  if (!ensureReady(res)) return;
  const { experiment, event, labState } = req.body || {};
  try {
    const prompt =
      `Experiment: ${experiment || "science lab"}.\n` +
      `The student just performed this action: ${JSON.stringify(event || {})}.\n` +
      `Sandbox state: ${JSON.stringify(labState || {})}.\n` +
      `Give a short spoken reaction (1–2 sentences) that explains what happened ` +
      `scientifically and nudges them toward the next step. Speak as Spark.`;
    const answer = await generate({ prompt, maxOutputTokens: 300 });
    res.json({ answer: answer?.trim() || "" });
  } catch (err) {
    console.error("react error:", err);
    res.status(502).json({ error: "Gemini request failed" });
  }
});

/* ── Socratic explain: contrast a student's prediction with the real result ──
   Called only on a MISPREDICTION (hits use a free client-side template), so the
   AI cost is bounded to the moments that actually need adaptive teaching. */
app.post("/api/spark/explain", async (req, res) => {
  if (!ensureReady(res)) return;
  const { experiment, item, prediction, actual, reason, wasCorrect } = req.body || {};
  try {
    const prompt =
      `Experiment: ${experiment || "science lab"}. The student tested "${item || "a sample"}".\n` +
      `They PREDICTED it was "${prediction}"${reason ? ` because "${reason}"` : ""}.\n` +
      `The real result is "${actual}" (their prediction was ${wasCorrect ? "correct" : "wrong"}).\n` +
      `In 1–2 short spoken sentences, tell them whether their prediction matched and ` +
      `why the real result happens, Socratically. Encourage the guess even if it was wrong.`;
    const answer = await generate({ prompt, maxOutputTokens: 220 });
    res.json({ answer: answer?.trim() || "" });
  } catch (err) {
    console.error("explain error:", err);
    res.status(502).json({ error: "Gemini request failed" });
  }
});

/* ── Conceptual grading of a completed lab ── */
app.post("/api/grade", async (req, res) => {
  if (!ensureReady(res)) return;
  const { experiment, observations } = req.body || {};
  try {
    const prompt =
      `You are grading a completed NCERT practical.\n` +
      `Experiment: ${experiment || "science lab"}.\n` +
      `The student's recorded observations and verdicts: ${JSON.stringify(observations || {})}.\n\n` +
      `Return ONLY a JSON object with this exact shape:\n` +
      `{"score": <number of correct verdicts>, "total": <total items>, ` +
      `"feedback": "<2-3 warm sentences for the student about their conceptual ` +
      `understanding, spoken aloud, no markdown>", "badge": "<a short, fun badge title>"}`;
    const raw = await generate({ prompt, temperature: 0.4, maxOutputTokens: 450, json: true });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { feedback: (raw || "").trim() };
    }
    res.json(parsed);
  } catch (err) {
    console.error("grade error:", err);
    res.status(502).json({ error: "Gemini request failed" });
  }
});

/* ── Teacher intelligence: turn class misconceptions into a reteaching plan ──
   The heavy analytics are computed free on the client; this is one on-demand
   call that converts the aggregated misconceptions into teacher-ready actions. */
app.post("/api/insights", async (req, res) => {
  if (!ensureReady(res)) return;
  const { className, misconceptions, atRiskCount, studentCount } = req.body || {};
  try {
    const lines = Array.isArray(misconceptions)
      ? misconceptions.map((m) => `- ${m.item} (${m.lab}): ${m.wrong}/${m.total} students wrong; correct answer is "${m.correct}"`).join("\n")
      : "";
    const prompt =
      `You advise a science teacher about class "${className || "the class"}" ` +
      `(${studentCount || "several"} students, ${atRiskCount || 0} below 60%).\n` +
      `The most common misconceptions this week:\n${lines}\n\n` +
      `Write a short, practical reteaching plan: 3-4 bullet points, each naming the concept ` +
      `to revisit and one concrete classroom way to reteach it. Plain text, no markdown headings.`;
    const answer = await generate({ prompt, temperature: 0.5, maxOutputTokens: 400 });
    res.json({ answer: answer?.trim() || "" });
  } catch (err) {
    console.error("insights error:", err);
    res.status(502).json({ error: "Gemini request failed" });
  }
});

/* ── Auto-generate exam-style questions for a lab (worksheet + answer key) ── */
app.post("/api/worksheet", async (req, res) => {
  if (!ensureReady(res)) return;
  const { title, cls, subject, chapter, aim, theory, items, categories } = req.body || {};
  try {
    const prompt =
      `Create exam-style practice questions for an NCERT ${cls || ""} ${subject || ""} practical titled "${title}".\n` +
      `Chapter: ${chapter || ""}. Aim: ${aim || ""}. Concept: ${theory || ""}.\n` +
      `Items studied: ${(items || []).join(", ")}. Groups: ${(categories || []).join(", ")}.\n` +
      `Return ONLY JSON of this exact shape:\n` +
      `{"mcqs":[{"q":"<question>","options":["<a>","<b>","<c>","<d>"],"ans":<0-based index>}],` +
      `"short":[{"q":"<question>","a":"<model answer>"}]}\n` +
      `Give exactly 4 MCQs and 3 short-answer questions, syllabus-accurate and age-appropriate for Class 6-10.`;
    const raw = await generate({ prompt, temperature: 0.5, maxOutputTokens: 900, json: true });
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = { mcqs: [], short: [] }; }
    res.json({ mcqs: parsed.mcqs || [], short: parsed.short || [] });
  } catch (err) {
    console.error("worksheet error:", err);
    res.status(502).json({ error: "Gemini request failed" });
  }
});

/* ════════════════ Live voice relay (WebSocket) ════════════════
   Browser  <--WS-->  this server  <--Gemini Live WS-->  Gemini
   The browser streams 16 kHz PCM mic audio; we relay it to Gemini's
   native-audio Live model and stream the 24 kHz PCM reply back, plus
   live input/output transcriptions for on-screen captions.
   The API key never leaves the server. */
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/api/live" });

const liveSessions = new Map(); // uid -> active count
const MAX_LIVE_PER_USER = Number(process.env.MAX_LIVE_PER_USER || 1);

wss.on("connection", (browser, req) => {
  const sendJSON = (o) => { try { if (browser.readyState === 1) browser.send(JSON.stringify(o)); } catch (e) {} };

  // Origin check (browsers always send Origin on WS handshakes).
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) { try { browser.close(1008, "origin"); } catch (e) {} return; }
  if (!ai) { sendJSON({ type: "error", message: "Gemini not configured" }); browser.close(); return; }

  const url = new URL(req.url, "http://localhost");
  const experiment = url.searchParams.get("experiment") || "a science lab";

  let session = null, closed = false, authed = false, uid = null;
  const closeAll = () => {
    if (closed) return; closed = true;
    if (uid) { const n = (liveSessions.get(uid) || 1) - 1; if (n <= 0) liveSessions.delete(uid); else liveSessions.set(uid, n); }
    try { session && session.close(); } catch (e) {}
    try { browser.close(); } catch (e) {}
  };

  // The client must send {type:"auth", token} as its FIRST message within 5s.
  const authTimer = setTimeout(() => {
    if (!authed) { sendJSON({ type: "error", message: "auth timeout" }); try { browser.close(1008, "auth"); } catch (e) {} }
  }, 5000);

  async function startGemini() {
    try {
      session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction:
            SPARK_SYSTEM +
            `\nThe student is working on: ${experiment}. ` +
            `Speak naturally and briefly, like a friendly teacher beside them. ` +
            `When the session starts, greet them warmly in one short sentence.`,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => sendJSON({ type: "ready" }),
          onmessage: (msg) => {
            const sc = msg.serverContent;
            let sentAudio = false;
            const parts = sc?.modelTurn?.parts || [];
            for (const p of parts) {
              if (p.inlineData?.data) { sendJSON({ type: "audio", data: p.inlineData.data }); sentAudio = true; }
            }
            if (!sentAudio && msg.data) sendJSON({ type: "audio", data: msg.data });
            if (sc?.inputTranscription?.text) sendJSON({ type: "in", text: sc.inputTranscription.text });
            if (sc?.outputTranscription?.text) sendJSON({ type: "out", text: sc.outputTranscription.text });
            if (sc?.interrupted) sendJSON({ type: "interrupted" });
            if (sc?.turnComplete) sendJSON({ type: "turn" });
          },
          onerror: (e) => { sendJSON({ type: "error", message: String(e?.message || e) }); closeAll(); },
          onclose: () => closeAll(),
        },
      });
    } catch (e) {
      console.error("live connect failed:", e);
      sendJSON({ type: "error", message: "live connect failed" });
      closeAll();
    }
  }

  browser.on("message", async (data, isBinary) => {
    if (closed) return;

    // Handshake: first message must authenticate.
    if (!authed) {
      if (isBinary) return;
      let obj; try { obj = JSON.parse(data.toString()); } catch (e) { return; }
      if (obj.type !== "auth") return;
      const decoded = await verifyToken(obj.token);
      if (!decoded) { sendJSON({ type: "error", message: "Please sign in to use live voice." }); try { browser.close(1008, "auth"); } catch (e) {} return; }
      uid = decoded.uid;
      const cur = liveSessions.get(uid) || 0;
      if (cur >= MAX_LIVE_PER_USER) { sendJSON({ type: "error", message: "A live session is already running." }); try { browser.close(1008, "limit"); } catch (e) {} return; }
      liveSessions.set(uid, cur + 1);
      authed = true; clearTimeout(authTimer);
      await startGemini();
      return;
    }

    // Post-auth: relay audio/text to Gemini.
    try {
      if (isBinary) {
        const b64 = Buffer.from(data).toString("base64");
        session && session.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } });
      } else {
        const obj = JSON.parse(data.toString());
        if (obj.type === "audio" && obj.data) session && session.sendRealtimeInput({ audio: { data: obj.data, mimeType: "audio/pcm;rate=16000" } });
        else if (obj.type === "text" && obj.text) session && session.sendClientContent({ turns: obj.text });
        else if (obj.type === "end") session && session.sendRealtimeInput({ audioStreamEnd: true });
      }
    } catch (e) {}
  });

  browser.on("close", closeAll);
  browser.on("error", closeAll);
});

server.listen(PORT, () => {
  console.log(`[LabSpark] backend listening on :${PORT} (text: ${MODEL}, live: ${LIVE_MODEL})`);
});
