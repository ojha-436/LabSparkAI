/* ── Spark: the AI lab instructor side panel ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic, SparkAvatar } from "./ui.jsx";
import { askSpark } from "./api.js";
const { useState: spUS, useEffect: spUE, useRef: spUR } = React;

/* Canned fallback knowledge base — used only when the Gemini backend is
   unreachable, so the UI keeps working offline / without a key. */
const SPARK_QA = [
  { k: ["litmus", "paper", "strip"], a: "Litmus is a natural dye made from lichens. It's an indicator — it changes colour to tell us if something is an acid or a base. Blue litmus turns red in acid; red litmus turns blue in a base." },
  { k: ["acid", "sour"], a: "Acids taste sour (like lemon!) and turn blue litmus red. Their pH is below 7. Never taste lab chemicals though — that's what indicators are for! 🍋" },
  { k: ["base", "alkali", "bitter", "soap"], a: "Bases feel slippery and taste bitter. They turn red litmus blue and have a pH above 7. Soap and baking soda are common bases." },
  { k: ["neutral", "seven", "7", "water"], a: "Neutral substances are neither acid nor base — their pH is exactly 7, like pure water and salt water. Litmus paper doesn't change colour in them." },
  { k: ["ph", "scale"], a: "The pH scale runs 0–14. Below 7 = acid, exactly 7 = neutral, above 7 = base. The further from 7, the stronger it is!" },
  { k: ["why", "colour", "color", "change"], a: "The dye molecules in litmus have a different shape in acids vs bases, and each shape reflects different light — so we see a different colour. Clever chemistry! ✨" },
  { k: ["hint", "help", "stuck", "what do"], a: "Pick up a litmus strip from the tray and drag it into a test tube. Watch what colour it becomes, then I'll help you figure out if it's an acid, base, or neutral." },
];

function sparkAnswer(q) {
  const low = q.toLowerCase();
  const hit = SPARK_QA.find((e) => e.k.some((w) => low.includes(w)));
  return hit ? hit.a : "Great question! Keep testing the liquids with litmus paper — every colour change is a clue. Acids turn blue litmus red, bases turn red litmus blue, and neutral liquids don't change it at all.";
}

/* Strict match: returns a confident cached answer, or null if none.
   Used to answer common questions for FREE (no Gemini call); only genuinely
   novel questions fall through to the paid text API. */
function sparkAnswerStrict(q) {
  const low = q.toLowerCase();
  const idx = SPARK_QA.findIndex((e) => e.k.some((w) => low.includes(w)));
  return idx >= 0 ? { answer: SPARK_QA[idx].a, clipKey: `faq-${idx}` } : null;
}

function SparkPanel({ messages, onAsk, mood, experiment, labState }) {
  const scrollRef = spUR(null);
  const [draft, setDraft] = spUS("");
  spUE(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const suggestions = ["What is litmus?", "Why did it change colour?", "Give me a hint"];

  const submit = async (text) => {
    const t = (text ?? draft).trim();
    if (!t) return;
    setDraft("");
    // Try the real Gemini-powered Spark; fall back to the canned answer offline.
    let answer;
    try {
      answer = await askSpark({ question: t, experiment, labState });
    } catch {
      answer = sparkAnswer(t);
    }
    onAsk(t, answer || sparkAnswer(t));
  };

  return (
    <aside style={{ width: 348, flexShrink: 0, background: C.cream, borderLeft: `1px solid ${C.line}`, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 12, background: C.ink, color: C.cream }}>
        <SparkAvatar size={42} mood={mood} glow />
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>Spark <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.lime, animation: "pulse 2s infinite" }} /></div>
          <div className="mono" style={{ fontSize: 10.5, color: C.emBright, letterSpacing: "0.04em" }}>AI LAB INSTRUCTOR · GEMINI</div>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
        {messages.map((m, i) => <SparkMsg key={i} m={m} />)}
      </div>

      {/* suggestions + input */}
      <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
          {suggestions.map((s) => (
            <button key={s} onClick={() => submit(s)} className="press" style={{ fontSize: 11.5, fontWeight: 600, color: C.emDeep, background: C.emPale, border: "none", borderRadius: 100, padding: "6px 11px", cursor: "pointer" }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 100, padding: "5px 5px 5px 16px" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Ask Spark anything…" style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13.5, fontFamily: "'Plus Jakarta Sans'", color: C.ink }} />
          <button onClick={() => submit()} className="press" style={{ width: 34, height: 34, borderRadius: "50%", background: C.em, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Ic n="send" s={16} c="#fff" sw={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SparkMsg({ m }) {
  if (m.from === "you") {
    return (
      <div style={{ alignSelf: "flex-end", maxWidth: "82%", background: C.ink, color: C.cream, padding: "10px 14px", borderRadius: "16px 16px 4px 16px", fontSize: 13.5, lineHeight: 1.5 }}>{m.text}</div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "fadeUp .4s ease both" }}>
      <SparkAvatar size={28} mood={m.celebrate ? "celebrate" : "happy"} />
      <div style={{ maxWidth: "85%" }}>
        <div style={{ background: m.celebrate ? C.emPale : C.paper, border: `1px solid ${m.celebrate ? "transparent" : C.line}`, color: C.ink, padding: "11px 14px", borderRadius: "4px 16px 16px 16px", fontSize: 13.5, lineHeight: 1.55 }}>
          {m.text}
        </div>
        {m.xp && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 7, fontSize: 11.5, fontWeight: 700, color: C.gold, background: C.goldPale, padding: "4px 10px", borderRadius: 100 }}><Ic n="bolt" s={12} c={C.gold} sw={2.2} />+{m.xp} XP</span>}
      </div>
    </div>
  );
}

export { SparkPanel, sparkAnswer, sparkAnswerStrict, SPARK_QA };
