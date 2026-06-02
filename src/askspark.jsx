/* ── "Ask Spark" — on-demand AI help button (cost-optimised) ──
   Flow per question:
     1. Try the local FAQ cache (sparkAnswerStrict) → answer instantly, ₹0.
     2. Only if it's a novel question, call the cheap Gemini *text* endpoint.
   Voice input uses free on-device speech recognition; answers are spoken with
   the shared speak() (pre-generated clip if available, else free browser TTS).
   This keeps AI help always available while costing almost nothing. */
import React from "react";
import { C } from "./tokens.js";
import { Ic, SparkAvatar } from "./ui.jsx";
import { askSpark } from "./api.js";
import { sparkAnswerStrict, sparkAnswer } from "./spark.jsx";
import { speak, recognizeOnce, recognitionSupported, cancelSpeech } from "./speech.js";

const { useState: aUS, useRef: aUR, useEffect: aUE } = React;

const SUGGESTIONS = ["What is litmus?", "Why did it change colour?", "What is pH?", "Give me a hint"];

export function AskSpark({ experiment, getLabState }) {
  const [open, setOpen] = aUS(false);
  const [msgs, setMsgs] = aUS([{ from: "spark", text: "Hi! I'm Spark. Tap the mic and ask me anything about this experiment — or type your question. 🧪" }]);
  const [draft, setDraft] = aUS("");
  const [busy, setBusy] = aUS(false);
  const [listening, setListening] = aUS(false);
  const scrollRef = aUR(null);
  const recRef = aUR(null);

  aUE(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, open]);

  const ask = async (text) => {
    const q = (text ?? draft).trim();
    if (!q || busy) return;
    setDraft("");
    setMsgs((m) => [...m, { from: "you", text: q }]);
    setBusy(true);

    const cached = sparkAnswerStrict(q);
    let answer, clipKey, source;
    if (cached) {
      answer = cached.answer; clipKey = cached.clipKey; source = "cached";
    } else {
      try {
        answer = await askSpark({ question: q, experiment, labState: getLabState ? getLabState() : undefined });
        source = "ai";
      } catch {
        answer = sparkAnswer(q); source = "fallback";
      }
    }
    setMsgs((m) => [...m, { from: "spark", text: answer, source }]);
    setBusy(false);
    speak(answer, { clipKey });
  };

  const startMic = () => {
    if (listening) { try { recRef.current && recRef.current.stop(); } catch (e) {} setListening(false); return; }
    if (!recognitionSupported()) return; // UI hides the mic when unsupported
    cancelSpeech();
    setListening(true);
    recRef.current = recognizeOnce({
      onResult: (t) => { setListening(false); ask(t); },
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    });
  };

  return (
    <>
      {/* Floating launcher button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="press"
        title="Ask Spark for help"
        style={{
          position: "fixed", left: 22, bottom: 22, zIndex: 90,
          display: "flex", alignItems: "center", gap: 9, padding: "12px 18px",
          borderRadius: 100, border: "none", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 700,
          background: `linear-gradient(135deg, #6366f1, #8b5cf6)`,
          boxShadow: "0 10px 26px rgba(99,102,241,.4)",
        }}
      >
        <SparkAvatar size={24} /> Ask Spark
      </button>

      {open && (
        <div
          className="card-glass"
          style={{
            position: "fixed", left: 22, bottom: 80, zIndex: 91, width: 360, maxWidth: "90vw",
            height: 460, display: "flex", flexDirection: "column", background: C.cream,
            borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 60px rgba(15,23,42,0.28)", border: `1px solid ${C.line}`,
          }}
        >
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: C.ink, color: "#fff" }}>
            <SparkAvatar size={34} glow />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700 }}>Ask Spark</div>
              <div className="mono" style={{ fontSize: 9.5, color: C.emBright, fontWeight: 700 }}>AI HELP · ON DEMAND</div>
            </div>
            <button onClick={() => setOpen(false)} className="press" style={{ background: "rgba(255,255,255,.1)", border: "none", color: "#fff", width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 16 }}>×</button>
          </div>

          {/* messages */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.map((m, i) =>
              m.from === "you" ? (
                <div key={i} style={{ alignSelf: "flex-end", maxWidth: "82%", background: C.ink, color: C.cream, padding: "9px 13px", borderRadius: "14px 14px 4px 14px", fontSize: 13, lineHeight: 1.5 }}>{m.text}</div>
              ) : (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <SparkAvatar size={24} />
                  <div style={{ maxWidth: "85%", background: C.paper, border: `1px solid ${C.line}`, color: C.ink, padding: "9px 13px", borderRadius: "4px 14px 14px 14px", fontSize: 13, lineHeight: 1.5 }}>{m.text}</div>
                </div>
              )
            )}
            {busy && <div className="mono" style={{ fontSize: 11, color: C.ink30, paddingLeft: 32 }}>Spark is thinking…</div>}
          </div>

          {/* suggestions */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 14px 8px" }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => ask(s)} className="press" style={{ fontSize: 11, fontWeight: 600, color: C.emDeep, background: C.emPale, border: "none", borderRadius: 100, padding: "5px 10px", cursor: "pointer" }}>{s}</button>
            ))}
          </div>

          {/* input + mic */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 14px", borderTop: `1px solid ${C.line}` }}>
            {recognitionSupported() && (
              <button onClick={startMic} className="press" title="Speak your question"
                style={{ width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0, color: "#fff",
                  background: listening ? C.coral : C.em, boxShadow: listening ? `0 0 0 4px ${C.coralPale}` : "none" }}>
                <Ic n={listening ? "lock" : "mic"} s={18} c="#fff" sw={2} />
              </button>
            )}
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 100, padding: "4px 4px 4px 14px" }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder={listening ? "Listening…" : "Type your question…"}
                style={{ flex: 1, border: "none", background: "transparent", outline: "none", fontSize: 13, color: C.ink, fontFamily: "inherit" }}
              />
              <button onClick={() => ask()} className="press" style={{ width: 32, height: 32, borderRadius: "50%", background: C.em, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <Ic n="send" s={15} c="#fff" sw={2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
