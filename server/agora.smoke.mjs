/* ════════════════════════════════════════════════════════════════
   LIVE smoke test — hits Agora's REAL ConvoAI API.

   Uses buildJoinPayload() from agora.js, so it sends byte-for-byte what
   /api/agora/start sends. If this passes, the only thing left untested is
   the phone.

   Starts one real agent and stops it immediately. That is a few seconds of
   billable agent time per run — cheap, but not free. Run it when something
   is broken, not in a loop.

     node --env-file=.env agora.smoke.mjs
   ════════════════════════════════════════════════════════════════ */
import agoraToken from "agora-token";
import { buildJoinPayload, mintAgentToken, agoraConfigured } from "./agora.js";
const { RtcTokenBuilder, RtcRole } = agoraToken;

if (!agoraConfigured) {
  console.error("❌ Agora env vars incomplete — check server/.env");
  process.exit(1);
}

const APP_ID = process.env.AGORA_APP_ID;
const CERT = process.env.AGORA_APP_CERTIFICATE;
const auth = "Basic " + Buffer.from(
  `${process.env.AGORA_CUSTOMER_ID || process.env.AGORA_CUSTOMER_KEY}:${process.env.AGORA_CUSTOMER_SECRET}`
).toString("base64");
const BASE = "https://api.agora.io/api/conversational-ai-agent/v2/projects";

const channel = "spark-smoke-" + Math.floor(Math.random() * 1e9).toString(36);
const uid = 456789;
const agentUid = Number(process.env.AGORA_AGENT_UID || 1000);
/* Uses the route's own minting function, so this exercises the combined
   RTC+RTM agent token rather than a hand-rolled RTC-only one. */
const agentToken = mintAgentToken(channel, agentUid);

/* SMOKE_MODE=viva and SMOKE_LANG=hi-IN let one script exercise every persona
   and language combination against the live API. */
const payload = buildJoinPayload({
  channel, uid, agentToken,
  lab: "Solubility of Salts",
  sparkSystem: "You are Spark, a friendly CBSE science tutor.",
  agentName: `spark-smoke-${Date.now()}`,
  mode: process.env.SMOKE_MODE || "tutor",
  languageKey: process.env.SMOKE_LANG || undefined,
});

console.log(`mode: ${process.env.SMOKE_MODE || "tutor"}  lang: ${payload.properties.asr.params.language}`);
console.log(`channel: ${channel}\nasr: ${payload.properties.asr.vendor}/${payload.properties.asr.params.model}` +
            `  tts: ${payload.properties.tts.vendor}/${payload.properties.tts.params.model}` +
            `  llm: ${payload.properties.llm.params.model}\n`);

const r = await fetch(`${BASE}/${APP_ID}/join`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: auth },
  body: JSON.stringify(payload),
});
const text = await r.text();
console.log(`JOIN → HTTP ${r.status}`);
console.log(text.slice(0, 1000));

if (!r.ok) {
  console.log("\n❌ Rejected. The `detail` above names the exact offending field path.");
  process.exit(1);
}

let agentId;
try { agentId = JSON.parse(text).agent_id; } catch {}
console.log(`\n✅ Credentials, managed ASR/TTS and the Gemini LLM were all accepted.`);

if (agentId) {
  const l = await fetch(`${BASE}/${APP_ID}/agents/${encodeURIComponent(agentId)}/leave`,
    { method: "POST", headers: { Authorization: auth } });
  console.log(`LEAVE → HTTP ${l.status} ${l.ok ? "(stopped — no further billing)" : await l.text()}`);
  if (!l.ok) process.exit(1);
}
