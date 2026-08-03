/* ── Immersive full-screen 3D lab controls + floating Spark assistant ──
   Used by the 3D labs (genlab3d, lab3d). In immersive mode the WebGL canvas
   fills the screen and Spark collapses to a floating button that opens a glass
   popup (message · narration toggle · ask). Touch-first, safe-area aware. */
import React from "react";
import { C } from "./tokens.js";
import { Ic, SparkAvatar, VoiceWaveform, Btn } from "./ui.jsx";

const { useState: iUS, useEffect: iUE, useRef: iUR } = React;

/* Small circular control overlaid on the inline canvas to ENTER immersive mode. */
export function FullscreenBtn({ onClick, label = "Full screen" }) {
  return (
    <button onClick={onClick} className="press" aria-label={label} title={label}
      style={{ position: "absolute", top: 12, right: 12, zIndex: 20, width: 40, height: 40, borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.25)", background: "rgba(15,23,42,0.55)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      <Ic n="expand" s={19} c="#fff" sw={2} />
    </button>
  );
}

/* Floating controls shown while in immersive mode. */
export function ImmersiveControls({ title, accent = C.emBright, onExit, mood = "happy", speaking, msg, voiceOn, onToggleVoice, onAsk }) {
  const [open, setOpen] = iUS(false);
  const [q, setQ] = iUS("");
  const [asking, setAsking] = iUS(false);
  const [unread, setUnread] = iUS(false);
  const lastMsg = iUR(msg);

  // Flag a new message when Spark speaks while the popup is closed.
  iUE(() => {
    if (msg !== lastMsg.current) {
      lastMsg.current = msg;
      if (!open) setUnread(true);
    }
  }, [msg, open]);

  const openPopup = () => { setOpen(true); setUnread(false); };

  const submit = async () => {
    const question = q.trim();
    if (!question || !onAsk || asking) return;
    setQ(""); setAsking(true); setOpen(true);
    try { await onAsk(question); } catch { /* handled by lab */ }
    setAsking(false);
  };

  return (
    <>
      {/* Exit immersive */}
      <button className="imm-exit" onClick={onExit} aria-label="Exit full screen">
        <Ic n="shrink" s={16} c="#fff" sw={2} /> Exit
      </button>

      <div className="imm-veil" />

      {/* Live caption while speaking (popup closed) */}
      {speaking && !open && msg && (
        <div className="imm-caption" onClick={openPopup}>
          <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: accent, textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <VoiceWaveform active color={accent} /> Spark
          </div>
          {msg}
        </div>
      )}

      {/* Popup */}
      {open && <div className="imm-scrim" onClick={() => setOpen(false)} />}
      {open && (
        <div className="imm-popup" role="dialog" aria-label="Spark tutor">
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "14px 16px", background: C.paperWarm, borderBottom: `1px solid ${C.line}` }}>
            <SparkAvatar size={38} mood={mood} glow />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, display: "flex", alignItems: "center", gap: 7 }}>
                Spark <span style={{ width: 7, height: 7, borderRadius: "50%", background: speaking ? C.lime : C.ink30, animation: speaking ? "pulse 1.6s infinite" : "none" }} />
              </div>
              <div className="mono" style={{ fontSize: 9.5, color: accent, fontWeight: 700 }}>{title || "YOUR LAB GUIDE"}</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="press" style={{ width: 34, height: 34, borderRadius: 9, border: "none", background: C.paper, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic n="x" s={18} c={C.ink50} sw={2} />
            </button>
          </div>

          <div style={{ padding: 16, maxHeight: "40vh", overflowY: "auto" }}>
            <div style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{asking ? "Thinking…" : (msg || "Ask me anything about this experiment.")}</div>
          </div>

          {onAsk && (
            <div style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Ask Spark a question…" enterKeyHint="send"
                style={{ flex: 1, height: 44, padding: "0 14px", borderRadius: 12, border: `1.5px solid ${C.line}`, fontSize: 16, color: C.ink, background: C.cream, outline: "none", fontFamily: "inherit" }} />
              <button onClick={submit} disabled={!q.trim() || asking} aria-label="Send" className="press"
                style={{ width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer", background: accent, opacity: (!q.trim() || asking) ? 0.5 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic n="send" s={18} c="#fff" sw={2} />
              </button>
            </div>
          )}

          <button onClick={onToggleVoice} className="press"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px 0", border: "none", borderTop: `1px solid ${C.line}`, background: voiceOn ? C.emPale : C.paperWarm, color: voiceOn ? C.emDeep : C.ink50, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            <Ic n={voiceOn ? "mic" : "lock"} s={15} c={voiceOn ? C.emDeep : C.ink50} sw={2} />
            {voiceOn ? "Narration on" : "Narration muted"}
          </button>
        </div>
      )}

      {/* FAB */}
      <button className={`imm-fab ${speaking ? "speaking" : ""}`} onClick={() => (open ? setOpen(false) : openPopup())} aria-label="Spark tutor">
        <SparkAvatar size={38} mood={mood} />
        {unread && !open && <span className="imm-dot" />}
      </button>
    </>
  );
}
