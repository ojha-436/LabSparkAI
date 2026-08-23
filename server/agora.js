/* ════════════════════════════════════════════════════════════════
   LabSpark AI — Agora Conversational AI Engine integration.

   This is the ONLY place that holds Agora's privileged credentials:
     • AGORA_APP_CERTIFICATE      → mints RTC tokens
     • AGORA_CUSTOMER_KEY/SECRET  → Basic auth for the ConvoAI REST API
   None of them may ever reach the APK. The phone only knows the App ID.

   Shape of one live Spark conversation:

     phone  ──POST /api/agora/start──►  this server
                                          ├─ mint RTC token for the student
                                          ├─ mint RTC token for the agent
                                          └─ POST …/join  (ConvoAI REST)
     phone  ──joinChannel(token)────►  Agora RTC  ◄──── agent joins
                                          agent: ASR → Gemini → TTS
     phone  ──POST /api/agora/stop───►  this server ──POST …/leave

   Plan B: Agora owns the whole voice pipeline (transport, ASR, TTS, VAD,
   interruption) while Gemini stays the brain, reached through its
   OpenAI-compatible endpoint. Every existing /api/spark/* and /api/grade
   text route is untouched.
   ════════════════════════════════════════════════════════════════ */
// `agora-token` is CommonJS while this server is ESM ("type": "module"),
// so a named import of RtcRole fails at load time. Default-import and
// destructure — the interop path that actually works under Node 20.
import agoraToken from "agora-token";
const { RtcTokenBuilder, RtcRole } = agoraToken;

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERT = process.env.AGORA_APP_CERTIFICATE;
/* The Agora Console labels these "Customer ID" and "Customer Secret" under
   Developer Toolkit → RESTful API. AGORA_CUSTOMER_KEY is accepted as an alias
   because the REST docs call the same value a customer key — one less thing to
   get wrong at 2am. */
const CUSTOMER_KEY = process.env.AGORA_CUSTOMER_ID || process.env.AGORA_CUSTOMER_KEY;
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET;

/* The agent's own uid inside the channel. Must match kAgoraAgentUid in the
   Flutter app (lib/core/api/agora_config.dart) — the client waits for THIS
   uid to appear before it tells the student they can start talking. */
const AGENT_UID = Number(process.env.AGORA_AGENT_UID || 1000);

/* Token lifetime. Sessions are minutes long; an hour is generous and still
   short enough that a leaked token is near-worthless. */
const TOKEN_TTL_SECONDS = Number(process.env.AGORA_TOKEN_TTL || 3600);

/* If the student walks away, the agent hangs up itself rather than billing
   forever. This is the safety net behind our explicit /stop call. */
const IDLE_TIMEOUT = Number(process.env.AGORA_IDLE_TIMEOUT || 60);

const CONVOAI_BASE = "https://api.agora.io/api/conversational-ai-agent/v2/projects";

/* ── Gemini as the ConvoAI LLM ──────────────────────────────────────────
   Conversational AI Engine speaks OpenAI's /chat/completions dialect.
   Gemini exposes an OpenAI-compatible endpoint, so Spark's brain stays
   exactly the model the rest of the app already uses — same persona, same
   syllabus grounding, one vendor fewer to reason about. */
const LLM_URL = process.env.AGORA_LLM_URL ||
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const LLM_MODEL = process.env.AGORA_LLM_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";

/* ── ASR / TTS in managed mode ──────────────────────────────────────────
   `credential_mode: "managed"` means Agora supplies the provider
   credentials, so we ship no Deepgram/MiniMax keys of our own. Vendor and
   voice stay env-overridable: if the console exposes a different managed
   vendor, it's a Cloud Run env change, not a redeploy of new code. */
const ASR_VENDOR = process.env.AGORA_ASR_VENDOR || "deepgram";
const ASR_LANGUAGE = process.env.AGORA_ASR_LANGUAGE || "en-IN";
/* Managed mode supplies the provider CREDENTIALS only — the endpoint url and
   model are still required fields. Verified the hard way: omitting either one
   returns 400 InvalidFieldValue naming the exact missing path. */
const ASR_URL = process.env.AGORA_ASR_URL || "wss://api.deepgram.com/v1/listen";
const ASR_MODEL = process.env.AGORA_ASR_MODEL || "nova-3";
const TTS_VENDOR = process.env.AGORA_TTS_VENDOR || "minimax";
const TTS_URL = process.env.AGORA_TTS_URL || "wss://api.minimax.io/ws/v1/t2a_v2";
const TTS_MODEL = process.env.AGORA_TTS_MODEL || "speech-2.6-turbo";
/* Indian-English female — matches the flutter_tts voice students already
   hear from Spark on the offline path, so the character doesn't change
   identity when live voice switches on. */
const TTS_VOICE = process.env.AGORA_TTS_VOICE || "English_captivating_female1";

export const agoraConfigured = Boolean(
  APP_ID && APP_CERT && CUSTOMER_KEY && CUSTOMER_SECRET
);

function missingConfig() {
  return [
    !APP_ID && "AGORA_APP_ID",
    !APP_CERT && "AGORA_APP_CERTIFICATE",
    !CUSTOMER_KEY && "AGORA_CUSTOMER_ID",
    !CUSTOMER_SECRET && "AGORA_CUSTOMER_SECRET",
  ].filter(Boolean);
}

function basicAuth() {
  return "Basic " + Buffer.from(`${CUSTOMER_KEY}:${CUSTOMER_SECRET}`).toString("base64");
}

function mintToken(channel, uid) {
  const now = Math.floor(Date.now() / 1000);
  const expire = now + TOKEN_TTL_SECONDS;
  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID, APP_CERT, channel, uid, RtcRole.PUBLISHER, expire, expire
  );
}

/* Channel names are attacker-controlled input that we paste into a URL and
   sign a token for. Whitelist rather than sanitise. */
function validChannel(name) {
  return typeof name === "string" && name.length > 0 && name.length <= 64 &&
    /^[A-Za-z0-9_-]+$/.test(name);
}

function validUid(uid) {
  return Number.isInteger(uid) && uid > 0 && uid < 4294967295 && uid !== AGENT_UID;
}

/**
 * Builds the ConvoAI join payload.
 *
 * Exported so the live smoke test (`agora.smoke.mjs`) sends the EXACT payload
 * the route sends. Keeping two copies is how `asr.params.url` went missing and
 * cost a round of 400s — one definition, one place to fix.
 */
export function buildJoinPayload({ channel, uid, agentToken, lab, sparkSystem, agentName }) {
  return {
    /* Must be unique per agent instance — Agora rejects a repeat. */
    name: agentName,
    properties: {
      channel,
      token: agentToken,
      agent_rtc_uid: String(AGENT_UID),
      /* Whose speech the agent listens to. Scoping it to this student stops
         the agent reacting to anyone who guesses the channel name. */
      remote_rtc_uids: [String(uid)],
      enable_string_uid: false,
      idle_timeout: IDLE_TIMEOUT,
      asr: {
        credential_mode: "managed",
        vendor: ASR_VENDOR,
        params: {
          url: ASR_URL,
          model: ASR_MODEL,
          language: ASR_LANGUAGE,
        },
      },
      llm: {
        url: LLM_URL,
        api_key: process.env.GEMINI_API_KEY,
        style: "openai",
        system_messages: [
          {
            role: "system",
            content:
              sparkSystem +
              `\nThe student is working on: ${lab}. ` +
              `You are speaking OUT LOUD, not writing. Keep every reply to one or ` +
              `two short spoken sentences — no lists, no markdown, no headings. ` +
              `Ask one question at a time and wait. Greet them warmly in a single ` +
              `sentence when the session starts.`,
          },
        ],
        greeting_message: `Hi! I'm Spark. Ready to explore ${lab} together?`,
        failure_message: "Sorry, I didn't catch that — could you say it again?",
        max_history: 12,
        params: { model: LLM_MODEL },
      },
      tts: {
        credential_mode: "managed",
        vendor: TTS_VENDOR,
        params: {
          url: TTS_URL,
          model: TTS_MODEL,
          voice_setting: { voice_id: TTS_VOICE },
        },
      },
    },
  };
}

/**
 * Mounts /api/agora/* on the given Express app.
 *
 * @param app          the Express app (already gated by requireAuth + rateLimit)
 * @param sparkSystem  Spark's persona — reused verbatim so the live voice
 *                     tutor behaves identically to the text one.
 */
export function registerAgoraRoutes(app, sparkSystem) {
  /* ── Start a live session ─────────────────────────────────────────── */
  app.post("/api/agora/start", async (req, res) => {
    if (!agoraConfigured) {
      return res.status(503).json({
        error: "Live voice is not configured on the server.",
        missing: missingConfig(),
      });
    }

    const { channel, uid, experiment } = req.body || {};
    if (!validChannel(channel)) return res.status(400).json({ error: "Invalid channel." });
    if (!validUid(uid)) return res.status(400).json({ error: "Invalid uid." });

    const lab = typeof experiment === "string" && experiment.trim()
      ? experiment.trim().slice(0, 200)
      : "a science lab";

    /* Two tokens, same channel: one the student joins with, one the agent
       joins with. A token is bound to a single uid, so they cannot share. */
    let studentToken, agentToken;
    try {
      studentToken = mintToken(channel, uid);
      agentToken = mintToken(channel, AGENT_UID);
    } catch (err) {
      console.error("[agora] token mint failed:", err);
      return res.status(500).json({ error: "Could not mint RTC token." });
    }

    /* `name` must be unique per agent instance — Agora rejects a repeat.
       uid + channel is already unique per session; the timestamp guards a
       retry of the same channel after a failure. */
    const agentName = `spark-${uid}-${Date.now()}`;

    const payload = buildJoinPayload({
      channel, uid, agentToken, lab, sparkSystem, agentName,
    });

    try {
      const r = await fetch(`${CONVOAI_BASE}/${APP_ID}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: basicAuth() },
        body: JSON.stringify(payload),
      });

      const text = await r.text();
      if (!r.ok) {
        /* Surface Agora's own message in the log — its 4xx bodies name the
           exact field that's wrong, which is the difference between a
           two-minute fix and an hour of guessing. */
        console.error(`[agora] join failed ${r.status}: ${text}`);
        return res.status(502).json({
          error: "Could not start the live tutor.",
          detail: text.slice(0, 500),
        });
      }

      let body = {};
      try { body = JSON.parse(text); } catch { /* tolerate an empty 200 */ }
      const agentId = body.agent_id || body.agentId;
      if (!agentId) {
        console.error("[agora] join returned no agent_id:", text);
        return res.status(502).json({ error: "Agora did not return an agent id." });
      }

      console.log(`[agora] agent ${agentId} joined ${channel} for uid ${req.uid}`);
      res.json({
        agentId,
        channel,
        token: studentToken,
        uid,
        agentUid: AGENT_UID,
      });
    } catch (err) {
      console.error("[agora] join error:", err);
      res.status(502).json({ error: "Could not reach Agora." });
    }
  });

  /* ── Stop a live session ──────────────────────────────────────────── */
  app.post("/api/agora/stop", async (req, res) => {
    if (!agoraConfigured) return res.status(503).json({ error: "Live voice is not configured." });

    const { agentId } = req.body || {};
    if (typeof agentId !== "string" || !/^[A-Za-z0-9_:-]{1,128}$/.test(agentId)) {
      return res.status(400).json({ error: "Invalid agentId." });
    }

    try {
      const r = await fetch(
        `${CONVOAI_BASE}/${APP_ID}/agents/${encodeURIComponent(agentId)}/leave`,
        { method: "POST", headers: { Authorization: basicAuth() } }
      );
      if (!r.ok) {
        const text = await r.text();
        console.warn(`[agora] leave ${agentId} → ${r.status}: ${text}`);
        /* Still 200 to the client: the agent will time out on its own via
           idle_timeout, and a failed hang-up must not block the student
           from closing the sheet. */
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[agora] leave error:", err);
      res.json({ ok: true });
    }
  });
}
