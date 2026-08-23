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
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = agoraToken;

/* AccessToken2 primitives, needed to mint ONE token carrying both RTC and RTM
   privileges. `agora-token`'s convenience builders each emit a single-service
   token, and the agent needs both — see mintAgentToken below. */
import accessToken2 from "agora-token/src/AccessToken2.js";
const { AccessToken2, ServiceRtc, ServiceRtm } = accessToken2;

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
/* ── Languages ───────────────────────────────────────────────────────────
   Deliberately does NOT switch the TTS voice_id per language. MiniMax's
   speech-2.6 models are multilingual and infer the language from the text,
   and inventing voice ids we have not verified is how you get a 400 on a
   student's first tap. Override per language with AGORA_TTS_VOICE_<KEY> if
   a dedicated voice is ever confirmed. */
const LANGUAGES = {
  "en-IN": {
    label: "English",
    asr: "en-IN",
    turn: "en-US",
    instruction:
      "Speak in clear, simple Indian English. Keep sentences short.",
  },
  "hi-IN": {
    label: "हिंदी",
    asr: "hi-IN",
    turn: "hi-IN",
    instruction:
      "Reply in simple conversational Hindi (Devanagari when writing). Keep " +
      "the standard scientific terms in English — students see 'litmus', " +
      "'solubility' and 'circuit' in their NCERT textbook, so translating " +
      "them would confuse rather than help.",
  },
  hinglish: {
    label: "Hinglish",
    asr: "en-IN",
    turn: "en-US",
    instruction:
      "Reply in natural Hinglish — the everyday Hindi-English mix an Indian " +
      "classroom actually uses. Keep every scientific term in English. Do " +
      "not translate technical vocabulary.",
  },
};
const DEFAULT_LANGUAGE = process.env.AGORA_DEFAULT_LANGUAGE || "en-IN";

function languageFor(key) {
  const lang = LANGUAGES[key] || LANGUAGES[DEFAULT_LANGUAGE] || LANGUAGES["en-IN"];
  const envKey = `AGORA_TTS_VOICE_${String(key).toUpperCase().replace(/-/g, "_")}`;
  return { ...lang, ttsVoice: process.env[envKey] || null };
}

export const supportedLanguages = Object.entries(LANGUAGES).map(([k, v]) => ({
  key: k,
  label: v.label,
}));

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

/* ── Turn detection / interruption ──────────────────────────────────────
   The engine needs turn_detection to know when a speaker's turn ends, and
   `advanced_features.enable_rtm` to publish transcripts + agent state over
   the Signaling channel. Without enable_rtm there are NO transcripts and no
   agent-state events, which also means the client cannot tell when the
   agent is speaking — and therefore cannot interrupt it. Matches the
   official agent-quickstart-android reference server. */
const TURN_DETECTION_LANGUAGE = process.env.AGORA_TURN_LANGUAGE || "en-US";

/* ── Barge-in tuning ────────────────────────────────────────────────────
   How long the student must speak BEFORE the agent stops. 160ms cuts in
   almost instantly but also trips on a cough or a classroom door; 300-500ms
   is the guidance for noisy rooms. A school lab is noisy, so we sit in
   between and let it be tuned per deployment. */
const INTERRUPT_DURATION_MS = Number(process.env.AGORA_INTERRUPT_MS || 260);
/* Same idea, but specifically while the agent is mid-sentence. Higher than
   the above so ordinary room noise doesn't chop Spark off, while a genuine
   "wait, why?" still lands. */
const SPEAKING_INTERRUPT_MS = Number(process.env.AGORA_SPEAKING_INTERRUPT_MS || 380);
/* Buffer so the first syllable of the student's question isn't clipped. The
   clipped-first-word problem is what makes an interruption feel like it was
   misheard. */
const PREFIX_PADDING_MS = Number(process.env.AGORA_PREFIX_PADDING_MS || 600);
/* How long a pause counts as "the student has finished". Too low and Spark
   answers a half-question; too high and every exchange feels laggy.
   Deliberately generous: a 13-year-old thinking aloud pauses mid-sentence. */
const SILENCE_DURATION_MS = Number(process.env.AGORA_SILENCE_MS || 620);
const MAX_WAIT_MS = Number(process.env.AGORA_MAX_WAIT_MS || 3000);
const SPEECH_THRESHOLD = Number(process.env.AGORA_SPEECH_THRESHOLD || 0.5);
/* "chorus" is the agent-side audio scenario the reference uses: least
   processing, lowest latency, which is what barge-in needs. */
const AGENT_AUDIO_SCENARIO = process.env.AGORA_AGENT_AUDIO_SCENARIO || "chorus";

/* LLM sampling. Defaults mirror the reference quickstart. max_tokens is
   deliberately generous — the *spoken-brevity* instruction lives in the
   system prompt, not in a hard truncation that would cut Spark off
   mid-sentence. */
const LLM_MAX_TOKENS = Number(process.env.AGORA_LLM_MAX_TOKENS || 1024);
const LLM_TEMPERATURE = Number(process.env.AGORA_LLM_TEMPERATURE || 0.7);
const LLM_TOP_P = Number(process.env.AGORA_LLM_TOP_P || 0.95);
const LLM_MAX_HISTORY = Number(process.env.AGORA_LLM_MAX_HISTORY || 15);

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

/* RTM (Signaling) token for the transcript/state channel. Bound to a STRING
   user id, unlike the RTC token which is bound to a numeric uid — they are
   separate services and need separate tokens. */
function mintRtmToken(userId) {
  const expire = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return RtmTokenBuilder.buildToken(APP_ID, APP_CERT, userId, expire);
}

/* ── The agent's token needs BOTH RTC and RTM privileges ─────────────────
   With `advanced_features.enable_rtm` on, the agent logs in to Signaling to
   publish transcripts and state. Agora's docs are explicit: "you must ensure
   the token includes both RTC and RTM privileges."

   An RTC-only token here fails silently and in the most confusing way
   possible: join returns 200, the agent joins the channel, audio works
   perfectly — and not one transcript or state event is ever published, so the
   client can never tell the agent is speaking and can never interrupt it.

   `RtcTokenBuilder` and `RtmTokenBuilder` each emit a single-service token, so
   this drops to AccessToken2 and adds both services to one token. The
   reference quickstart's `generate_convo_ai_token` does the same thing, which
   is why it returns one token for both uses. */
export function mintAgentToken(channel, uid) {
  const now = Math.floor(Date.now() / 1000);
  const expire = now + TOKEN_TTL_SECONDS;

  const token = new AccessToken2(APP_ID, APP_CERT, now, expire);

  const rtc = new ServiceRtc(channel, uid);
  rtc.add_privilege(ServiceRtc.kPrivilegeJoinChannel, expire);
  rtc.add_privilege(ServiceRtc.kPrivilegePublishAudioStream, expire);
  token.add_service(rtc);

  /* The agent's RTM identity is its uid as a string — the same convention the
     client uses for its own RTM user id. */
  const rtm = new ServiceRtm(String(uid));
  rtm.add_privilege(ServiceRtm.kPrivilegeLogin, expire);
  token.add_service(rtm);

  return token.build();
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

function validAgentId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_:-]{1,128}$/.test(id);
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
/* ── How Spark behaves when it is cut off ────────────────────────────────
   Barge-in that merely stops the audio is only half the feature. The
   complaint that matters is "it stops, then answers as if the last two
   minutes never happened." That is a prompt problem, not a transport
   problem: the engine cancels the turn, the cancelled text stays in history
   as a fragment, and without instruction the model treats the new question
   as a fresh conversation.

   `max_history` keeps the thread available; these rules tell the model to
   USE it — acknowledge the cut-in, answer the new question, then stitch back
   to the thing it was mid-way through explaining. */
const INTERRUPTION_RULES = `
════════ BEING INTERRUPTED ════════
The student can and will cut you off mid-sentence. That is welcome, not rude.

When it happens:
  • Stop immediately. Do not finish the sentence you were on.
  • Do NOT restart your previous explanation from the beginning, and do not
    apologise or narrate the interruption ("Sorry, you interrupted me").
  • Answer the NEW question first, in one or two spoken sentences.
  • Then reconnect to what you were explaining, briefly, so the thread is not
    lost — e.g. "…and that's why the bulb glowed in the step we were on."
  • If their cut-in was a short signal rather than a question ("wait", "stop",
    "slower", "I don't get it"), do not launch into new material. Ask one
    short clarifying question and wait.
  • Never repeat a sentence the student already heard before cutting in.

Treat the whole conversation as one continuous thought, not a series of
independent questions. Refer back to what the student said earlier when it
helps them connect ideas.
`.trim();

const SPOKEN_STYLE_RULES = `
════════ YOU ARE SPEAKING, NOT WRITING ════════
  • One or two short sentences per reply. No lists, no markdown, no headings.
  • Ask one question at a time, then stop and wait for the answer.
  • Read numbers and symbols the way a teacher says them aloud
    ("H two O", "twenty five degrees"), never as written notation.
  • Never say "as shown above" or "see the diagram" — the student is
    listening, not reading.
`.trim();

/* ── The examiner ────────────────────────────────────────────────────────
   A viva is not tutoring, and the failure mode is a "chatbot playing
   dress-up": an examiner that helps, praises, and hints its way through.
   These rules exist to stop that, because an examiner that helps is useless
   as practice for one that does not. */
const VIVA_RULES = `
════════ YOU ARE CONDUCTING A VIVA VOCE ════════
You are the external examiner for a CBSE practical examination. You are
courteous and calm, but you are NOT a tutor right now.

Rules you must not break:
  • Ask ONE question. Then stop and wait, however long the silence lasts.
  • Do NOT give the answer, do not hint, do not lead, do not correct.
  • Do NOT say whether an answer was right or wrong. Move on with a neutral
    acknowledgement — "Thank you", "Next question", "I see."
  • Never praise ("Great job!", "Exactly!"). Praise tells them the answer.
  • If an answer is incomplete, you may ask ONE probing follow-up
    ("And why does that happen?") — then move on regardless.
  • If the student says they do not know, accept it and move to the next
    question without teaching.
  • Ask exactly SIX questions in total, then say: "That concludes the viva.
    Thank you." and stop.
  • Progress from recall, to reasoning, to one application question — the
    order a real examiner uses.
  • Keep every question to one spoken sentence.

Feedback comes after the viva ends, from the scoring step — not from you.
`.trim();

/**
 * Composes the system prompt for one session.
 *
 * @param sparkSystem  the shared Spark persona from index.js
 * @param mode         "tutor" | "viva"
 * @param lab          the experiment under discussion
 * @param language     entry from the LANGUAGES table
 */
function personaFor({ sparkSystem, mode, lab, language }) {
  const parts = [sparkSystem];

  if (mode === "viva") {
    parts.push(VIVA_RULES);
    parts.push(`The viva is on this practical: ${lab}.`);
  } else {
    parts.push(`The student is working on: ${lab}.`);
    parts.push(INTERRUPTION_RULES);
  }

  parts.push(SPOKEN_STYLE_RULES);
  parts.push(`════════ LANGUAGE ════════\n${language.instruction}`);

  if (mode !== "viva") {
    parts.push("Greet them warmly in a single sentence when the session starts.");
  }

  return parts.join("\n\n");
}

export function buildJoinPayload({
  channel, uid, agentToken, lab, sparkSystem, agentName,
  mode = "tutor",
  languageKey = DEFAULT_LANGUAGE,
}) {
  const language = languageFor(languageKey);
  const isViva = mode === "viva";
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
      /* Turn detection is where "does interruption feel right" actually
         lives. `end_of_speech.mode: "semantic"` is the important one: it
         switches the engine from raw silence-timing to AIVAD, so it waits
         for a *complete thought* rather than the first 300ms gap. That is
         the difference between Spark answering a half-question and Spark
         letting a student finish thinking aloud. */
      turn_detection: {
        language: language.turn,
        mode: "default",
        config: {
          speech_threshold: SPEECH_THRESHOLD,
          start_of_speech: {
            mode: "vad",
            vad_config: {
              interrupt_duration_ms: INTERRUPT_DURATION_MS,
              speaking_interrupt_duration_ms: SPEAKING_INTERRUPT_MS,
              prefix_padding_ms: PREFIX_PADDING_MS,
            },
          },
          end_of_speech: {
            mode: "semantic",
            semantic_config: {
              silence_duration_ms: SILENCE_DURATION_MS,
              max_wait_ms: MAX_WAIT_MS,
            },
          },
        },
      },
      /* enable_rtm is the switch that turns on transcripts AND agent-state
         events. Everything the UI shows about who is speaking flows from it. */
      advanced_features: { enable_rtm: true },
      parameters: {
        audio_scenario: AGENT_AUDIO_SCENARIO,
        data_channel: "rtm",
        enable_error_message: true,
        enable_metrics: true,
      },
      asr: {
        credential_mode: "managed",
        vendor: ASR_VENDOR,
        params: {
          url: ASR_URL,
          model: ASR_MODEL,
          language: language.asr,
        },
      },
      llm: {
        url: LLM_URL,
        api_key: process.env.GEMINI_API_KEY,
        style: "openai",
        system_messages: [
          {
            role: "system",
            content: personaFor({ sparkSystem, mode, lab, language }),
          },
        ],
        greeting_message: isViva
          ? `Good day. This is your viva voce for ${lab}. I will ask you six questions. Let's begin — first question.`
          : `Hi! I'm Spark. Ready to explore ${lab} together?`,
        failure_message: isViva
          ? "Could you repeat your answer, please?"
          : "Sorry, I didn't catch that — could you say it again?",
        max_history: LLM_MAX_HISTORY,
        params: {
          model: LLM_MODEL,
          max_tokens: LLM_MAX_TOKENS,
          temperature: LLM_TEMPERATURE,
          top_p: LLM_TOP_P,
        },
      },
      tts: {
        credential_mode: "managed",
        vendor: TTS_VENDOR,
        params: {
          url: TTS_URL,
          model: TTS_MODEL,
          voice_setting: { voice_id: language.ttsVoice || TTS_VOICE },
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

    const { channel, uid, experiment, mode, language } = req.body || {};
    if (!validChannel(channel)) return res.status(400).json({ error: "Invalid channel." });
    if (!validUid(uid)) return res.status(400).json({ error: "Invalid uid." });

    const lab = typeof experiment === "string" && experiment.trim()
      ? experiment.trim().slice(0, 200)
      : "a science lab";

    /* Two tokens, same channel: one the student joins with, one the agent
       joins with. A token is bound to a single uid, so they cannot share. */
    /* The RTM user id must be a string and must be distinct from the agent's.
       Reusing the numeric uid keeps it traceable in the Agora console. */
    const rtmUserId = String(uid);
    let studentToken, agentToken, rtmToken;
    try {
      studentToken = mintToken(channel, uid);
      agentToken = mintAgentToken(channel, AGENT_UID);
      rtmToken = mintRtmToken(rtmUserId);
    } catch (err) {
      console.error("[agora] token mint failed:", err);
      return res.status(500).json({ error: "Could not mint RTC token." });
    }

    /* `name` must be unique per agent instance — Agora rejects a repeat.
       uid + channel is already unique per session; the timestamp guards a
       retry of the same channel after a failure. */
    const agentName = `spark-${uid}-${Date.now()}`;

    const sessionMode = mode === "viva" ? "viva" : "tutor";
    const languageKey =
      typeof language === "string" && LANGUAGES[language] ? language : DEFAULT_LANGUAGE;

    const payload = buildJoinPayload({
      channel, uid, agentToken, lab, sparkSystem, agentName,
      mode: sessionMode,
      languageKey,
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

      console.log(
        `[agora] agent ${agentId} joined ${channel} for uid ${req.uid} ` +
        `(mode=${sessionMode}, lang=${languageKey})`
      );
      res.json({
        agentId,
        channel,
        token: studentToken,
        uid,
        agentUid: AGENT_UID,
        /* Signaling credentials — the client logs in with these to receive
           live transcripts and agent-state events. */
        rtmToken,
        rtmUserId,
        mode: sessionMode,
        language: languageKey,
      });
    } catch (err) {
      console.error("[agora] join error:", err);
      res.status(502).json({ error: "Could not reach Agora." });
    }
  });

  /* ── Interrupt the agent mid-sentence ─────────────────────────────────
     THIS is what makes barge-in work. The engine does not stop talking on
     its own just because the student started speaking — the client detects
     the overlap (via RTM transcripts + agent state) and calls this, which
     cancels the agent's current turn.

     Called on a hot path — every barge-in — so it stays cheap and never
     throws at the client. */
  app.post("/api/agora/interrupt", async (req, res) => {
    if (!agoraConfigured) return res.status(503).json({ error: "Live voice is not configured." });

    const { agentId } = req.body || {};
    if (!validAgentId(agentId)) return res.status(400).json({ error: "Invalid agentId." });

    try {
      const r = await fetch(
        `${CONVOAI_BASE}/${APP_ID}/agents/${encodeURIComponent(agentId)}/interrupt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: basicAuth() },
          body: "{}",
        }
      );
      if (!r.ok) {
        const text = await r.text();
        /* A stale turn is the common case: the agent already finished
           speaking before our interrupt landed. Not worth surfacing to a
           student mid-conversation. */
        console.warn(`[agora] interrupt ${agentId} → ${r.status}: ${text.slice(0, 200)}`);
        return res.json({ ok: false, status: r.status });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[agora] interrupt error:", err);
      res.json({ ok: false });
    }
  });

  /* ── Stop a live session ──────────────────────────────────────────── */
  app.post("/api/agora/stop", async (req, res) => {
    if (!agoraConfigured) return res.status(503).json({ error: "Live voice is not configured." });

    const { agentId } = req.body || {};
    if (!validAgentId(agentId)) return res.status(400).json({ error: "Invalid agentId." });

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
