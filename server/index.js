/* ════════════════════════════════════════════════════════════════
   LabSpark AI — Backend (Cloud Run)
   Real Gemini-powered "Spark" tutor + conceptual grader.
   The Gemini API key lives ONLY here, never in the browser.
   ════════════════════════════════════════════════════════════════ */
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { GoogleGenAI, Modality } from "@google/genai";

const PORT = process.env.PORT || 8787;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.1-flash-live-preview";
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.warn(
    "[LabSpark] WARNING: GEMINI_API_KEY is not set. " +
      "Set it in server/.env (local) or as a Cloud Run env var. " +
      "Requests will return 503 until it is configured."
  );
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const app = express();
app.use(cors()); // tighten to your frontend origin in production
app.use(express.json({ limit: "256kb" }));

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

/* ════════════════ Live voice relay (WebSocket) ════════════════
   Browser  <--WS-->  this server  <--Gemini Live WS-->  Gemini
   The browser streams 16 kHz PCM mic audio; we relay it to Gemini's
   native-audio Live model and stream the 24 kHz PCM reply back, plus
   live input/output transcriptions for on-screen captions.
   The API key never leaves the server. */
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/api/live" });

wss.on("connection", async (browser, req) => {
  const sendJSON = (o) => { try { if (browser.readyState === 1) browser.send(JSON.stringify(o)); } catch (e) {} };

  if (!ai) { sendJSON({ type: "error", message: "Gemini not configured" }); browser.close(); return; }

  const url = new URL(req.url, "http://localhost");
  const experiment = url.searchParams.get("experiment") || "a science lab";

  let session = null;
  let closed = false;
  const closeAll = () => { if (closed) return; closed = true; try { session && session.close(); } catch (e) {} try { browser.close(); } catch (e) {} };

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
          // audio out (prefer explicit parts; fall back to aggregated msg.data)
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
    browser.close();
    return;
  }

  browser.on("message", (data, isBinary) => {
    if (closed) return;
    try {
      if (isBinary) {
        const b64 = Buffer.from(data).toString("base64");
        session.sendRealtimeInput({ audio: { data: b64, mimeType: "audio/pcm;rate=16000" } });
      } else {
        const obj = JSON.parse(data.toString());
        if (obj.type === "audio" && obj.data) {
          session.sendRealtimeInput({ audio: { data: obj.data, mimeType: "audio/pcm;rate=16000" } });
        } else if (obj.type === "text" && obj.text) {
          session.sendClientContent({ turns: obj.text });
        } else if (obj.type === "end") {
          session.sendRealtimeInput({ audioStreamEnd: true });
        }
      }
    } catch (e) {}
  });

  browser.on("close", closeAll);
  browser.on("error", closeAll);
});

server.listen(PORT, () => {
  console.log(`[LabSpark] backend listening on :${PORT} (text: ${MODEL}, live: ${LIVE_MODEL})`);
});
