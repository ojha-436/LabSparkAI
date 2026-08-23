/* Standalone harness: mounts the real /api/agora/* routes with fake creds and
   a stubbed fetch, so we can inspect the exact ConvoAI payload and prove the
   validation before any real credential exists. */
process.env.AGORA_APP_ID = "a".repeat(32);
process.env.AGORA_APP_CERTIFICATE = "b".repeat(32);
process.env.AGORA_CUSTOMER_KEY = "ckey";
process.env.AGORA_CUSTOMER_SECRET = "csecret";
process.env.GEMINI_API_KEY = "fake-gemini-key";

import express from "express";

let captured = null;
const realFetch = global.fetch;
global.fetch = async (url, opts) => {
  captured = { url, opts };
  if (String(url).endsWith("/join")) {
    return { ok: true, status: 200, text: async () => JSON.stringify({ agent_id: "agent-abc-123" }) };
  }
  return { ok: true, status: 200, text: async () => "{}" };
};

const { registerAgoraRoutes, agoraConfigured } = await import("./agora.js");

const app = express();
app.use(express.json());
app.use("/api", (req, _res, next) => { req.uid = "test-firebase-uid"; next(); });
registerAgoraRoutes(app, "You are Spark, a friendly CBSE science tutor.");
const srv = app.listen(8801);

const post = async (path, body) => {
  const r = await realFetch(`http://localhost:8801${path}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return { status: r.status, body: await r.json() };
};

let fails = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
  if (!cond) fails++;
};

console.log("agoraConfigured =", agoraConfigured);
check("config detected", agoraConfigured === true);

// ── validation ──
check("rejects bad channel", (await post("/api/agora/start", { channel: "bad channel!", uid: 123456 })).status === 400);
check("rejects channel >64 chars", (await post("/api/agora/start", { channel: "a".repeat(65), uid: 123456 })).status === 400);
check("rejects uid 0", (await post("/api/agora/start", { channel: "spark-x-1", uid: 0 })).status === 400);
check("rejects uid == agent uid", (await post("/api/agora/start", { channel: "spark-x-1", uid: 1000 })).status === 400);
check("rejects non-integer uid", (await post("/api/agora/start", { channel: "spark-x-1", uid: "abc" })).status === 400);
check("rejects bad agentId on stop", (await post("/api/agora/stop", { agentId: "../../evil" })).status === 400);

// ── happy path ──
const ok = await post("/api/agora/start", { channel: "spark-solubility-3f2a", uid: 456789, experiment: "Solubility of Salts" });
check("start returns 200", ok.status === 200, `got ${ok.status}`);
check("returns agentId", ok.body.agentId === "agent-abc-123");
check("returns student token", typeof ok.body.token === "string" && ok.body.token.startsWith("007"));
check("returns agentUid 1000", ok.body.agentUid === 1000);
check("echoes channel", ok.body.channel === "spark-solubility-3f2a");

const p = JSON.parse(captured.opts.body);
console.log("\n── captured ConvoAI request ──");
console.log("URL:", captured.url);
console.log("Auth:", captured.opts.headers.Authorization);
console.log(JSON.stringify(p, (k, v) =>
  (k === "token" || k === "api_key") ? String(v).slice(0, 12) + "…<redacted>" : v, 2));

const pr = p.properties;
check("URL targets v2 join", captured.url === `https://api.agora.io/api/conversational-ai-agent/v2/projects/${"a".repeat(32)}/join`);
check("Basic auth header", captured.opts.headers.Authorization === "Basic " + Buffer.from("ckey:csecret").toString("base64"));
check("agent token != student token", pr.token !== ok.body.token);
check("agent_rtc_uid is string '1000'", pr.agent_rtc_uid === "1000");
check("remote_rtc_uids scoped to student", JSON.stringify(pr.remote_rtc_uids) === '["456789"]');
check("asr managed mode", pr.asr.credential_mode === "managed");
// Regression guard: ConvoAI rejects the join with 400 InvalidFieldValue if any
// of these are absent. Managed mode supplies credentials, NOT the endpoint.
check("asr.params.url present", typeof pr.asr.params.url === "string" && pr.asr.params.url.startsWith("wss://"));
check("asr.params.model present", typeof pr.asr.params.model === "string" && pr.asr.params.model.length > 0);
check("asr.params.language present", typeof pr.asr.params.language === "string");
check("tts.params.url present", typeof pr.tts.params.url === "string" && pr.tts.params.url.startsWith("wss://"));
check("tts.params.model present", typeof pr.tts.params.model === "string" && pr.tts.params.model.length > 0);
check("tts.params.voice_setting present", typeof pr.tts.params.voice_setting?.voice_id === "string");
check("llm points at Gemini OpenAI-compat", pr.llm.url.includes("generativelanguage.googleapis.com") && pr.llm.url.endsWith("/openai/chat/completions"));
check("llm style openai", pr.llm.style === "openai");
check("llm carries Gemini key", pr.llm.api_key === "fake-gemini-key");
check("llm model is gemini", pr.llm.params.model.startsWith("gemini"));
check("persona injected", pr.llm.system_messages[0].content.includes("You are Spark"));
check("lab name injected", pr.llm.system_messages[0].content.includes("Solubility of Salts"));
check("spoken-style instruction present", pr.llm.system_messages[0].content.includes("speaking OUT LOUD"));
check("tts managed mode", pr.tts.credential_mode === "managed");
check("idle_timeout set", typeof pr.idle_timeout === "number" && pr.idle_timeout > 0);
check("agent name unique-ish", /^spark-456789-\d+$/.test(p.name));

// ── stop path ──
const st = await post("/api/agora/stop", { agentId: "agent-abc-123" });
check("stop returns 200", st.status === 200);
check("stop hits leave endpoint", captured.url.endsWith("/agents/agent-abc-123/leave"));

srv.close();
console.log(`\n${fails === 0 ? "ALL CHECKS PASSED" : fails + " CHECK(S) FAILED"}`);
process.exit(fails === 0 ? 0 : 1);
