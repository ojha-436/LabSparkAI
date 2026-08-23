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

const { registerAgoraRoutes, agoraConfigured, mintAgentToken } = await import("./agora.js");

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
check("returns rtmToken", typeof ok.body.rtmToken === "string" && ok.body.rtmToken.startsWith("007"));
check("returns rtmUserId as string", ok.body.rtmUserId === "456789");
check("rtmToken != rtcToken", ok.body.rtmToken !== ok.body.token);
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
const persona = pr.llm.system_messages[0].content;
check("spoken-style rules present", persona.includes("YOU ARE SPEAKING, NOT WRITING"));
// The interruption rules are the whole fix for "it forgets what we were on".
check("interruption rules present", persona.includes("BEING INTERRUPTED"));
check("interruption: answer new question first", persona.includes("Answer the NEW question first"));
check("interruption: reconnect to prior thread", persona.includes("reconnect to what you were explaining"));
check("interruption: no restart from scratch", persona.includes("do not restart") || persona.includes("Do NOT restart"));
check("tutor mode has no viva rules", !persona.includes("CONDUCTING A VIVA VOCE"));
check("language section present", persona.includes("LANGUAGE"));
check("tts managed mode", pr.tts.credential_mode === "managed");
check("idle_timeout set", typeof pr.idle_timeout === "number" && pr.idle_timeout > 0);
// Interruption depends on all of these. enable_rtm is the switch that turns on
// transcripts AND agent-state events; without it the client can never know the
// agent is speaking, so it can never barge in.
check("advanced_features.enable_rtm true", pr.advanced_features?.enable_rtm === true);
check("turn_detection.language set", typeof pr.turn_detection?.language === "string");
check("parameters.data_channel is rtm", pr.parameters?.data_channel === "rtm");
check("parameters.audio_scenario set", typeof pr.parameters?.audio_scenario === "string");
check("parameters.enable_error_message true", pr.parameters?.enable_error_message === true);
check("llm max_tokens set", typeof pr.llm.params.max_tokens === "number" && pr.llm.params.max_tokens > 0);
check("llm temperature set", typeof pr.llm.params.temperature === "number");
check("llm top_p set", typeof pr.llm.params.top_p === "number");
check("llm max_history >= 12", pr.llm.max_history >= 12);
check("agent name unique-ish", /^spark-456789-\d+$/.test(p.name));

// ── the agent token MUST carry both RTC and RTM privileges ──
// An RTC-only token here fails silently: join returns 200, audio works, and
// not one transcript or state event is ever published — so the client can
// never know the agent is speaking and can never interrupt it. This is the
// single most expensive bug in this integration to diagnose from symptoms.
{
  const at2 = await import("agora-token/src/AccessToken2.js");
  const { AccessToken2, kRtcServiceType, kRtmServiceType } = at2.default;
  const built = mintAgentToken("spark-tok-test", 1000);
  const parsed = new AccessToken2();
  parsed.from_string(built);
  const services = Object.keys(parsed.services);
  check("agent token is an AccessToken2", built.startsWith("007"));
  check("agent token carries RTC privileges", services.includes(String(kRtcServiceType)));
  check("agent token carries RTM privileges", services.includes(String(kRtmServiceType)));
  check("agent token has exactly the two services", services.length === 2,
        `got [${services.join(",")}]`);
}

// ── viva mode ──
{
  const v = await post("/api/agora/start", {
    channel: "spark-viva-1", uid: 456789, experiment: "Acids, Bases & Salts",
    mode: "viva",
  });
  check("viva start returns 200", v.status === 200, `got ${v.status}`);
  check("viva mode echoed back", v.body.mode === "viva");
  const vp = JSON.parse(captured.opts.body).properties;
  const vpersona = vp.llm.system_messages[0].content;
  check("viva persona present", vpersona.includes("CONDUCTING A VIVA VOCE"));
  check("viva forbids hints", vpersona.includes("do not hint"));
  check("viva forbids praise", vpersona.includes("Never praise"));
  check("viva asks a fixed six questions", vpersona.includes("SIX questions"));
  // A viva must not carry the tutor's interruption etiquette — an examiner
  // reconnecting to "what we were explaining" would be leaking answers.
  check("viva excludes tutor interruption rules", !vpersona.includes("BEING INTERRUPTED"));
  check("viva greeting announces the exam", vp.llm.greeting_message.includes("viva voce"));
}

// ── language selection ──
{
  const h = await post("/api/agora/start", {
    channel: "spark-lang-1", uid: 456789, experiment: "Solubility", language: "hi-IN",
  });
  check("hindi start returns 200", h.status === 200);
  check("language echoed back", h.body.language === "hi-IN");
  const hp = JSON.parse(captured.opts.body).properties;
  check("asr language switched", hp.asr.params.language === "hi-IN");
  check("turn_detection language switched", hp.turn_detection.language === "hi-IN");
  check("hindi instruction in persona",
        hp.llm.system_messages[0].content.includes("Hindi"));
  check("keeps scientific terms in English",
        hp.llm.system_messages[0].content.includes("litmus"));
}
{
  const bad = await post("/api/agora/start", {
    channel: "spark-lang-2", uid: 456789, experiment: "X", language: "klingon",
  });
  check("unknown language falls back, does not error", bad.status === 200);
  check("fallback is the default language", bad.body.language === "en-IN");
}

// ── turn detection tuning ──
{
  await post("/api/agora/start", { channel: "spark-td-1", uid: 456789, experiment: "X" });
  const td = JSON.parse(captured.opts.body).properties.turn_detection;
  check("turn_detection.mode set", td.mode === "default");
  // "semantic" is what makes the agent wait for a complete thought instead of
  // the first 300ms gap — the difference between letting a student finish and
  // answering half a question.
  check("end_of_speech uses semantic AIVAD", td.config.end_of_speech.mode === "semantic");
  check("start_of_speech uses vad", td.config.start_of_speech.mode === "vad");
  check("interrupt_duration_ms set", td.config.start_of_speech.vad_config.interrupt_duration_ms > 0);
  check("speaking_interrupt > interrupt duration",
        td.config.start_of_speech.vad_config.speaking_interrupt_duration_ms >
        td.config.start_of_speech.vad_config.interrupt_duration_ms);
  check("prefix_padding_ms set", td.config.start_of_speech.vad_config.prefix_padding_ms > 0);
  check("silence_duration_ms set", td.config.end_of_speech.semantic_config.silence_duration_ms > 0);
}

// ── interrupt path ──
check("rejects bad agentId on interrupt", (await post("/api/agora/interrupt", { agentId: "../../x" })).status === 400);
const itr = await post("/api/agora/interrupt", { agentId: "agent-abc-123" });
check("interrupt returns 200", itr.status === 200);
check("interrupt hits the interrupt endpoint", captured.url.endsWith("/agents/agent-abc-123/interrupt"));
check("interrupt sends an empty JSON body", captured.opts.body === "{}");

// ── stop path ──
const st = await post("/api/agora/stop", { agentId: "agent-abc-123" });
check("stop returns 200", st.status === 200);
check("stop hits leave endpoint", captured.url.endsWith("/agents/agent-abc-123/leave"));

srv.close();
console.log(`\n${fails === 0 ? "ALL CHECKS PASSED" : fails + " CHECK(S) FAILED"}`);
process.exit(fails === 0 ? 0 : 1);
