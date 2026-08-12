/* ── AR Acids & Bases lab ──
   The lab presented as a simulated AR camera view (per the "LabSpark Mobile"
   design): a camera-feed viewport with the rack overlaid on a desk surface,
   a scan line, and a light bottom control panel.

   The viewport itself stays dark because it stands in for a camera feed; all
   chrome (panel, buttons, sheets) uses the LabSpark light tokens in tokens.js.

   Reuses the existing lab model: the same 6 rack samples, the same litmus
   logic (dipResult), the same Socratic questions, narration, grading and
   onComplete contract as the other labs. */
import React from "react";
import { C, SCI } from "./tokens.js";
import { SUBSTANCES, TYPE_META } from "./data.js";
import { Ic, Btn, SparkAvatar } from "./ui.jsx";
import { ResultsTable, IntroOverlay } from "./labpanel.jsx";
import { dipResult } from "./lab.jsx";
import { gradeLab } from "./api.js";
import { AskSpark } from "./askspark.jsx";
import { speak, cancelSpeech, loadClipManifest } from "./speech.js";

const { useState: rUS, useEffect: rUE, useCallback: rUC } = React;

const STRIP_BLUE = "#2563eb";
const STRIP_RED = "#e11d48";

/* The 6 everyday samples loaded onto the rack — same set as the 3D lab. */
const RACK_IDS = ["lemon", "vinegar", "soda", "soap", "salt", "water"];

/* On-dark accents: brand teal for fills/borders, pale teal for text, so the
   overlay reads against the camera feed without leaving the token palette. */
const AR_LINE = C.emBright;
const AR_TEXT = C.emPale;

/* ════════════════ Camera-feed viewport ════════════════ */

/* A single overlaid tube: glass outline + coloured liquid + dipped strip. */
function ARTube({ sub, active, result, strip, onSelect }) {
  const tested = result && (result.blue || result.red);
  const stripTip = strip && result && result[strip] ? result[strip].c : null;
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        cursor: "pointer", background: "none", border: "none", padding: 4,
      }}
    >
      <div
        style={{
          width: 28, height: 72, borderRadius: "4px 4px 14px 14px",
          border: `1.5px solid ${active ? AR_LINE : "rgba(255,255,255,.2)"}`,
          background: "rgba(255,255,255,.04)", position: "relative", overflow: "hidden",
          boxShadow: active ? `0 0 12px ${AR_LINE}55` : "none",
          transition: "border-color .2s, box-shadow .2s",
        }}
      >
        {/* liquid */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: sub.liquid, borderRadius: "0 0 12px 12px", opacity: 0.85 }} />
        {/* litmus strip left in the tube after a dip */}
        {active && strip && (
          <div style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", width: 7, height: 52, borderRadius: 2, background: strip === "blue" ? STRIP_BLUE : STRIP_RED, overflow: "hidden" }}>
            {stripTip && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: stripTip }} />}
          </div>
        )}
      </div>
      <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 8, fontWeight: 700, whiteSpace: "nowrap", color: active ? AR_TEXT : "rgba(255,255,255,.45)" }}>
        {sub.formula}
      </span>
      {tested && <span style={{ width: 5, height: 5, borderRadius: "50%", background: AR_LINE }} />}
    </button>
  );
}

/* ════════════════ The AR lab ════════════════ */

function ARLab({ onExit, onComplete, addXp }) {
  const tubes = SUBSTANCES.filter((s) => RACK_IDS.includes(s.id));

  const [phase, setPhase] = rUS("intro");
  const [results, setResults] = rUS(() => Object.fromEntries(tubes.map((s) => [s.id, { blue: null, red: null, verdict: null }])));
  const [activeSub, setActiveSub] = rUS(RACK_IDS[0]);
  const [isDipping, setIsDipping] = rUS(false);
  const [dippedStrip, setDippedStrip] = rUS(null);
  const [answeredQuestions, setAnsweredQuestions] = rUS({});
  const [activeQuestion, setActiveQuestion] = rUS(null);
  const [selectedOption, setSelectedOption] = rUS(null);
  const [sheetOpen, setSheetOpen] = rUS(false);
  const [graded, setGraded] = rUS(false);

  const [voiceActive, setVoiceActive] = rUS(true);
  const [voiceMsg, setVoiceMsg] = rUS("AR mode ready. Tap a tube on the desk, then dip the litmus paper.");

  const activeSubObj = tubes.find((s) => s.id === activeSub) || tubes[0];
  const tested = tubes.filter((s) => results[s.id].blue || results[s.id].red);
  const allTested = tested.length === tubes.length;
  const allVerdicts = tubes.every((s) => results[s.id].verdict);

  /* Scripted narration — free (cached clip or browser TTS), no AI cost. */
  const narrate = rUC((text, clipKey) => {
    setVoiceMsg(text);
    if (voiceActive) speak(text, { clipKey });
  }, [voiceActive]);

  rUE(() => { loadClipManifest(); return () => cancelSpeech(); }, []);

  const toggleNarration = () => {
    const next = !voiceActive;
    setVoiceActive(next);
    if (!next) { cancelSpeech(); setVoiceMsg("Narration muted. Ask Spark anytime for help."); }
    else narrate("Narration on. I'll guide you step by step.");
  };

  const selectTube = (subId) => {
    if (isDipping) return;
    setActiveSub(subId);
    setDippedStrip(null); // clear the previous strip when switching tubes
    const sub = tubes.find((s) => s.id === subId);
    if (!sub) return;
    if (!answeredQuestions[subId]) {
      setActiveQuestion({ ...sub.question, subId });
      setSelectedOption(null);
      narrate(`${sub.name} locked on. Quick question for bonus XP — ${sub.question.q} You can also just dip the litmus to test it.`);
    } else {
      setActiveQuestion(null);
      narrate(`${sub.name}, ${sub.formula}. Dip the blue or red litmus paper to test it.`);
    }
  };

  const handleOptionClick = (idx) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    if (idx === activeQuestion.ans) {
      narrate(activeQuestion.correctMsg);
      setAnsweredQuestions((prev) => ({ ...prev, [activeQuestion.subId]: true }));
      addXp(15);
      setTimeout(() => setActiveQuestion(null), 3500);
    } else {
      narrate(activeQuestion.incorrectMsg);
      setTimeout(() => setSelectedOption(null), 3200);
    }
  };

  const startLitmusTest = (strip) => {
    if (!activeSub || isDipping) return;
    const sub = tubes.find((s) => s.id === activeSub);
    if (!sub) return;
    setIsDipping(true);
    setDippedStrip(strip);
    narrate(`Dipping ${strip} litmus into ${sub.name}...`);

    setTimeout(() => {
      const res = dipResult(strip, sub.type);
      const firstEver = !results[activeSub].blue && !results[activeSub].red;
      setResults((r) => ({ ...r, [activeSub]: { ...r[activeSub], [strip]: res } }));
      // The outcome is fully known locally, so narration stays scripted (₹0).
      narrate(res.changed
        ? `Aha! The ${strip} litmus turned ${strip === "blue" ? "red" : "blue"}. ${sub.name} shows ${sub.type === "acid" ? "free hydrogen H plus" : "hydroxyl O H minus"} ions.`
        : `No colour change on the ${strip} litmus. ${sub.name} looks neutral. What verdict will you record?`);
      if (firstEver) addXp(10);
    }, 1100);

    setTimeout(() => setIsDipping(false), 2800);
  };

  rUE(() => {
    if (allTested && !graded) {
      narrate("All six samples scanned. Open the observation sheet and record a verdict for each.");
      addXp(20);
    }
  }, [allTested]); // eslint-disable-line

  const setVerdict = (subId, v) => {
    setResults((r) => ({ ...r, [subId]: { ...r[subId], verdict: v } }));
    const sub = tubes.find((s) => s.id === subId);
    if (sub) narrate(`Verdict saved: ${sub.name} as ${v.toUpperCase()}.`);
  };

  const submit = () => {
    const correct = tubes.filter((s) => results[s.id].verdict === s.type).length;
    setGraded(true);
    const xp = 30 + correct * 8;
    addXp(xp);
    narrate(`Graded. You correctly identified ${correct} of ${tubes.length} samples. Your CBSE transcript is ready.`);
    const observations = tubes.map((s) => ({ name: s.name, formula: s.formula, correctType: s.type, studentVerdict: results[s.id].verdict }));
    const minDelay = new Promise((r) => setTimeout(r, 3200));
    const feedback = gradeLab({ experiment: "Class 7 Chemistry — Acids, Bases & Indicators (litmus)", observations }).then((g) => g.feedback).catch(() => null);
    Promise.all([feedback, minDelay]).then(([aiFeedback]) => {
      onComplete({ results: Object.fromEntries(tubes.map((s) => [s.id, results[s.id]])), correct, total: tubes.length, xp, aiFeedback });
    });
  };

  const meta = TYPE_META[activeSubObj.type];

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#000", overflow: "hidden" }}>
      {phase === "intro" && <IntroOverlay onStart={() => { setPhase("lab"); narrate("AR mode active. Tap a tube on the desk to lock on."); }} />}

      {/* ═══ AR camera viewport ═══ */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
        {/* simulated camera feed */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#1a1f2e 0%,#0d1117 40%,#151a24 100%)" }}>
          {/* desk surface */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(180deg,#2a2520 0%,#1e1a16 100%)", borderTop: "1px solid rgba(255,255,255,.05)" }} />
          {/* tracking grid */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `repeating-linear-gradient(0deg,transparent,transparent 39px,${AR_LINE}0d 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,${AR_LINE}0d 40px)` }} />
          {/* scan line */}
          <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${AR_LINE},transparent)`, opacity: 0.4, animation: "arScan 3s linear infinite", pointerEvents: "none" }} />
        </div>

        {/* overlaid rack */}
        <div style={{ position: "absolute", bottom: "42%", left: "50%", transform: "translateX(-50%)", display: "flex", gap: 14 }}>
          {tubes.map((s) => (
            <ARTube
              key={s.id}
              sub={s}
              active={activeSub === s.id}
              result={results[s.id]}
              strip={activeSub === s.id ? dippedStrip : null}
              onSelect={() => selectTube(s.id)}
            />
          ))}
        </div>

        {/* AR mode badge */}
        <div style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(0,0,0,.6)", backdropFilter: "blur(12px)", border: `1px solid ${AR_LINE}55`, borderRadius: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: AR_LINE, animation: "arPulse 2s infinite" }} />
          <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: AR_TEXT }}>AR MODE ACTIVE</span>
        </div>

        {/* progress pill */}
        <div style={{ position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", padding: "6px 14px", background: "rgba(0,0,0,.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20 }}>
          <span style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.8)" }}>{tested.length}/{tubes.length} TESTED</span>
        </div>

        {/* narration mute + exit */}
        <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
          <button onClick={toggleNarration} title={voiceActive ? "Mute narration" : "Unmute narration"} style={arIconBtn}>
            <Ic n={voiceActive ? "spark" : "mic"} s={18} c="rgba(255,255,255,.75)" sw={2} />
          </button>
          <button onClick={onExit} title="Exit lab" style={arIconBtn}>
            <Ic n="x" s={18} c="rgba(255,255,255,.75)" sw={2} />
          </button>
        </div>

        {/* Spark narration caption */}
        {voiceMsg && (
          <div style={{ position: "absolute", bottom: 14, left: 16, right: 16, display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "rgba(0,0,0,.62)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }}>
            <SparkAvatar size={24} />
            <span style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,.9)" }}>{voiceMsg}</span>
          </div>
        )}

        {/* Socratic question card, overlaid in-view */}
        {activeQuestion && (
          <div style={{ position: "absolute", top: 62, left: 16, right: 16, padding: 14, background: "rgba(0,0,0,.72)", backdropFilter: "blur(16px)", border: `1px solid ${AR_LINE}55`, borderRadius: 14, animation: "fadeIn .25s" }}>
            <div style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 9, fontWeight: 700, letterSpacing: ".1em", color: AR_TEXT }}>BONUS · +15 XP</div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#fff", marginTop: 6 }}>{activeQuestion.q}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 10 }}>
              {activeQuestion.options.map((o, i) => {
                const picked = selectedOption === i;
                const right = picked && i === activeQuestion.ans;
                const wrong = picked && i !== activeQuestion.ans;
                return (
                  <button
                    key={i}
                    onClick={() => handleOptionClick(i)}
                    style={{
                      textAlign: "left", padding: "9px 11px", borderRadius: 9, cursor: "pointer",
                      fontFamily: "inherit", fontSize: 12, lineHeight: 1.4,
                      border: `1.5px solid ${right ? SCI.neutral : wrong ? SCI.acidStrong : "rgba(255,255,255,.14)"}`,
                      background: right ? `${SCI.neutral}22` : wrong ? `${SCI.acidStrong}22` : "rgba(255,255,255,.05)",
                      color: "rgba(255,255,255,.92)",
                    }}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setActiveQuestion(null)} style={{ marginTop: 9, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)", padding: 0 }}>
              Skip — just let me test it
            </button>
          </div>
        )}
      </div>

      {/* ═══ Bottom control panel (LabSpark light chrome) ═══ */}
      <div style={{ background: C.cream, borderTop: `1px solid ${C.line}`, padding: "14px 18px 18px", flexShrink: 0, boxShadow: "0 -8px 24px rgba(15,23,42,.18)" }}>
        {/* locked-on sample */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 13 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
            {activeSubObj.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>
              {activeSubObj.name}{" "}
              <span style={{ fontSize: 11, fontWeight: 600, color: meta.c }}>{activeSubObj.formula}</span>
            </div>
            <div style={{ fontSize: 11, color: C.ink50, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeSubObj.hint}</div>
          </div>
        </div>

        {/* litmus actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { strip: "blue", label: "Blue Litmus", c: STRIP_BLUE },
            { strip: "red", label: "Red Litmus", c: STRIP_RED },
          ].map(({ strip, label, c }) => (
            <button
              key={strip}
              onClick={() => startLitmusTest(strip)}
              disabled={isDipping || !!results[activeSub][strip]}
              style={{
                flex: 1, padding: 12, borderRadius: 10, cursor: isDipping || results[activeSub][strip] ? "default" : "pointer",
                border: `1.5px solid ${c}44`, background: `${c}14`, color: c,
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                opacity: isDipping || results[activeSub][strip] ? 0.45 : 1,
              }}
            >
              <Ic n="drop" s={14} c={c} sw={2} />
              {results[activeSub][strip] ? `${label} ✓` : `Dip ${label}`}
            </button>
          ))}
        </div>

        {/* observation sheet / grade */}
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            width: "100%", marginTop: 9, padding: 11, borderRadius: 10, cursor: "pointer",
            border: `1px solid ${allTested ? C.emBright : C.line}`,
            background: allTested ? C.emBright : C.paperWarm,
            color: allTested ? "#fff" : C.ink50,
            fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}
        >
          <Ic n="note" s={15} c={allTested ? "#fff" : C.ink50} sw={2} />
          {allTested ? "Record verdicts & grade lab" : `Observation sheet · ${tested.length}/${tubes.length} scanned`}
        </button>
      </div>

      {/* ═══ Observation sheet (bottom sheet) ═══ */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", animation: "fadeIn .2s" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxHeight: "86vh", overflowY: "auto", background: C.paper, borderRadius: "18px 18px 0 0", padding: "14px 16px 22px", animation: "fadeUp .3s cubic-bezier(.16,1,.3,1) both" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ width: 38, height: 4, borderRadius: 99, background: C.ink15, margin: "0 auto" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Observation sheet</div>
                <div style={{ fontSize: 11.5, color: C.ink50, marginTop: 1 }}>Record a verdict for each sample you scanned.</div>
              </div>
              <button onClick={() => setSheetOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Ic n="x" s={18} c={C.ink50} sw={2} />
              </button>
            </div>

            <ResultsTable activeSubstances={tubes} results={results} graded={graded} onVerdict={setVerdict} />

            <div style={{ marginTop: 14 }}>
              <Btn v="primary" lg full icon="check" disabled={!allVerdicts || graded} onClick={submit}>
                {graded ? "Compiling transcript…" : allVerdicts ? "Grade & compile lab transcript" : "Assign every verdict to grade"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* On-demand Gemini tutor (floating launcher) */}
      <AskSpark
        experiment="Class 7 Chemistry — Acids, Bases & Indicators (litmus). The student is in AR mode, pointing their device at a desk with six test tubes of everyday liquids and testing them with blue and red litmus paper."
        getLabState={() => ({
          activeSubstance: `${activeSubObj.name} (${activeSubObj.formula})`,
          tubesTested: `${tested.length}/${tubes.length}`,
          mode: "AR camera view",
        })}
      />
    </div>
  );
}

const arIconBtn = {
  width: 36, height: 36, borderRadius: 10, background: "rgba(0,0,0,.5)",
  backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.12)",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
};

export { ARLab };
