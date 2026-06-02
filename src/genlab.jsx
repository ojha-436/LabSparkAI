/* ── Generic data-driven classification lab engine ──
   Renders any spec from genlabdata.js as an interactive experiment:
   examine each item → classify it → grade. Reuses the cost-optimized
   scripted narration (free), the on-demand Ask Spark button, and the
   cheap Gemini grader. */
import React from "react";
import { C } from "./tokens.js";
import { Ic, Btn, SparkAvatar } from "./ui.jsx";
import { AskSpark } from "./askspark.jsx";
import { gradeLab } from "./api.js";
import { speak, cancelSpeech, loadClipManifest } from "./speech.js";

const { useState: gUS, useEffect: gUE, useRef: gUR, useCallback: gUC } = React;

export function GenLab({ spec, onExit, onComplete, addXp }) {
  const [tested, setTested] = gUS({});      // itemId -> true (examined)
  const [verdicts, setVerdicts] = gUS({});   // itemId -> category key
  const [active, setActive] = gUS(null);     // currently examined item
  const [graded, setGraded] = gUS(false);
  const [voiceOn, setVoiceOn] = gUS(true);
  const [speaking, setSpeaking] = gUS(false);
  const [mood, setMood] = gUS("happy");
  const [msg, setMsg] = gUS(`Welcome to the ${spec.title} lab! ${spec.aim} Tap an item on the tray to examine it.`);
  const [showQuiz, setShowQuiz] = gUS(false);
  const [picked, setPicked] = gUS(null);
  const answeredRef = gUR(false);

  gUE(() => { loadClipManifest(); return () => cancelSpeech(); }, []);

  const say = gUC((text) => {
    setMsg(text); setMood("thinking");
    if (!voiceOn) { setSpeaking(true); setTimeout(() => { setSpeaking(false); setMood("happy"); }, 2500); return; }
    speak(text, { onStart: () => setSpeaking(true), onEnd: () => { setSpeaking(false); setMood("happy"); } });
  }, [voiceOn]);

  const items = spec.items;
  const testedCount = items.filter((i) => tested[i.id]).length;
  const allTested = testedCount === items.length;
  const allVerdicts = items.every((i) => verdicts[i.id]);

  const examine = (item) => {
    setActive(item.id);
    setTested((t) => ({ ...t, [item.id]: true }));
    say(item.fact);
  };

  const setVerdict = (itemId, cat) => {
    if (graded) return;
    setVerdicts((v) => ({ ...v, [itemId]: cat }));
  };

  const answerQuiz = (idx) => {
    if (answeredRef.current) return;
    setPicked(idx);
    if (idx === spec.question.ans) {
      answeredRef.current = true;
      addXp(15);
      say(spec.question.correctMsg);
      setTimeout(() => setShowQuiz(false), 3000);
    } else {
      say(spec.question.incorrectMsg);
      setTimeout(() => setPicked(null), 2800);
    }
  };

  const submit = () => {
    const correct = items.filter((i) => verdicts[i.id] === i.category).length;
    setGraded(true);
    const xp = 30 + correct * 8;
    addXp(xp);
    setMood("celebrate");
    say(`Great work! You classified ${correct} of ${items.length} correctly. Compiling your lab report.`);
    const observations = items.map((i) => ({ name: i.name, correct: i.category, studentVerdict: verdicts[i.id] }));
    const minDelay = new Promise((r) => setTimeout(r, 2600));
    const feedback = gradeLab({ experiment: `${spec.cls} ${spec.subject} — ${spec.title}`, observations }).then((g) => g.feedback).catch(() => null);
    Promise.all([feedback, minDelay]).then(([aiFeedback]) => {
      onComplete({
        experimentId: spec.id, correct, total: items.length, xp, aiFeedback,
        generic: true, title: spec.title, aim: spec.aim, conclusion: spec.conclusion,
      });
    });
  };

  const cat = (key) => spec.categories.find((c) => c.key === key);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: C.paper }} className="grid-blueprint">
      {/* header bar */}
      <div style={{ height: 60, background: C.inkDeep, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onExit} className="press" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.lineInk}`, color: "#fff", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Ic n="back" s={14} c="#fff" sw={2} />Exit Lab
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: spec.accent + "30", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n={spec.icon} s={15} c="#fff" sw={2} /></div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1 }} className="font-display">{spec.title}</div>
              <div className="mono" style={{ fontSize: 9.5, color: C.ink30, marginTop: 2 }}>{spec.cls.toUpperCase()} · {spec.subject.toUpperCase()}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="mono" style={{ fontSize: 11, color: C.ink30 }}>{testedCount}/{items.length} EXAMINED</span>
          <div style={{ width: 110, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: (testedCount / items.length) * 100 + "%", background: `linear-gradient(90deg,${spec.accent},${C.lime})`, transition: "width .4s" }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* main */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 28px 90px" }}>
            {/* NCERT info card */}
            <div className="card-glass" style={{ background: C.cream, borderRadius: 14, padding: "18px 22px", marginBottom: 22, borderLeft: `4px solid ${spec.accent}` }}>
              <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: spec.accent, letterSpacing: "0.06em" }}>{spec.chapter}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink, margin: "6px 0 4px" }}>Aim</h3>
              <p style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.55 }}>{spec.aim}</p>
              <p style={{ fontSize: 12.5, color: C.ink50, lineHeight: 1.55, marginTop: 8 }}>{spec.theory}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {spec.materials.map((m) => (
                  <span key={m} style={{ fontSize: 11, fontWeight: 600, color: C.ink50, background: C.paperWarm, padding: "4px 10px", borderRadius: 100 }}>{m}</span>
                ))}
              </div>
            </div>

            {/* item tray */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Ic n="flask" s={15} c={spec.accent} sw={2} />
              <h4 style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>Materials tray — tap to {spec.testVerb.toLowerCase()}</h4>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: 12, marginBottom: 26 }}>
              {items.map((item) => {
                const isActive = active === item.id;
                const done = tested[item.id];
                return (
                  <button key={item.id} onClick={() => examine(item)} className="press lift-card"
                    style={{ background: C.cream, border: `2px solid ${isActive ? spec.accent : done ? C.line : C.line}`, borderRadius: 12, padding: "16px 10px", cursor: "pointer", textAlign: "center", position: "relative", opacity: done && !isActive ? 0.85 : 1 }}>
                    <div style={{ fontSize: 34, lineHeight: 1 }}>{item.emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginTop: 8 }}>{item.name}</div>
                    {done && <span style={{ position: "absolute", top: 6, right: 6, color: spec.accent }}><Ic n="check" s={13} c={spec.accent} sw={3} /></span>}
                  </button>
                );
              })}
            </div>

            {/* bonus quiz launcher */}
            {spec.question && !answeredRef.current && (
              <button onClick={() => setShowQuiz((s) => !s)} className="press" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.violetPale, color: C.violet, border: "none", borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginBottom: 18 }}>
                <Ic n="spark" s={14} c={C.violet} sw={2} /> {showQuiz ? "Hide" : "Bonus question (+15 XP)"}
              </button>
            )}
            {showQuiz && spec.question && (
              <div className="card-glass reveal r1" style={{ background: C.cream, borderRadius: 12, padding: "16px 20px", marginBottom: 22, border: `1px solid ${C.violetPale}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{spec.question.q}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {spec.question.options.map((o, i) => {
                    const sel = picked === i;
                    const correct = i === spec.question.ans;
                    const bg = sel ? (correct ? C.emPale : C.coralPale) : C.paper;
                    const col = sel ? (correct ? C.emDeep : C.coral) : C.ink70;
                    return (
                      <button key={i} onClick={() => answerQuiz(i)} disabled={picked !== null && correct} className="press" style={{ textAlign: "left", background: bg, color: col, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {String.fromCharCode(65 + i)}. {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* observation table */}
            <div className="observation-ledger" style={{ background: C.cream, borderRadius: 12, border: `1px solid ${C.line}`, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${C.line}`, background: C.paperWarm }}>
                <Ic n="note" s={15} c={spec.accent} sw={2} />
                <h4 style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>Observation Table</h4>
                <span className="mono" style={{ fontSize: 10, color: C.ink30, marginLeft: "auto", fontWeight: 700 }}>CLASSIFY EACH ITEM</span>
              </div>
              {items.map((item, idx) => {
                const v = verdicts[item.id];
                const done = tested[item.id];
                const isCorrect = graded && v === item.category;
                const isWrong = graded && v && v !== item.category;
                return (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr", gap: 12, alignItems: "center", padding: "12px 18px", borderBottom: idx < items.length - 1 ? `1px solid ${C.lineSoft}` : "none", background: isCorrect ? "rgba(13,148,136,0.05)" : isWrong ? "rgba(234,88,12,0.05)" : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{item.emoji}</span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{item.name}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {!done ? (
                        <span className="mono" style={{ fontSize: 11, color: C.ink15 }}>examine first ↑</span>
                      ) : (
                        <div style={{ display: "inline-flex", background: C.paperWarm, borderRadius: 8, padding: 3, gap: 3 }}>
                          {spec.categories.map((c) => {
                            const sel = v === c.key;
                            const ans = graded && item.category === c.key;
                            const wrongSel = graded && sel && item.category !== c.key;
                            return (
                              <button key={c.key} onClick={() => setVerdict(item.id, c.key)} className="press" style={{ border: "none", cursor: graded ? "default" : "pointer", fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 6, background: ans ? c.color : sel ? (wrongSel ? C.coralPale : c.color) : "transparent", color: ans ? "#fff" : sel ? (wrongSel ? C.coral : "#fff") : C.ink50 }}>
                                {c.label}{ans && !sel ? " ✓" : ""}{wrongSel ? " ✗" : ""}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* legend */}
            <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
              {spec.categories.map((c) => (
                <span key={c.key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.ink50 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: c.color }} /> <b style={{ color: C.ink70 }}>{c.label}</b> — {c.desc}
                </span>
              ))}
            </div>

            {allTested && allVerdicts && !graded && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                <Btn v="primary" lg icon="check" onClick={submit}>Grade & Compile Lab Report</Btn>
              </div>
            )}
            {graded && <div style={{ textAlign: "center", marginTop: 26 }}><p style={{ fontSize: 15.5, fontWeight: 700, color: spec.accent }}>Compiling your report…</p></div>}
          </div>
        </div>

        {/* Spark narration sidebar */}
        <aside className="voice-hud-panel">
          <div className="voice-hud-header">
            <SparkAvatar size={42} mood={mood} glow />
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>Spark <span style={{ width: 7, height: 7, borderRadius: "50%", background: voiceOn ? C.lime : C.ink30 }} /></div>
              <div className="mono" style={{ fontSize: 9.5, color: spec.accent, fontWeight: 700 }}>YOUR LAB GUIDE</div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="voice-overlay-msg">
              <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: spec.accent, textTransform: "uppercase", marginBottom: 6 }}>Spark says</div>
              {msg}
            </div>
          </div>
          <div className="voice-hud-controls">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="mono"><div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>NARRATION</div><div style={{ fontSize: 12, color: voiceOn ? C.lime : "#cbd5e1", fontWeight: 700 }}>{voiceOn ? "● On" : "Muted"}</div></div>
              <div className="mono" style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>HELP</div><div style={{ fontSize: 12, color: spec.accent, fontWeight: 700 }}>Ask Spark ↙</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button onClick={() => { const n = !voiceOn; setVoiceOn(n); if (!n) { cancelSpeech(); setSpeaking(false); } }} className={`voice-btn-mic ${voiceOn ? "active" : "muted"}`}>
                <Ic n={voiceOn ? "mic" : "lock"} s={24} c="#fff" sw={2} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <AskSpark
        experiment={`${spec.cls} ${spec.subject} — ${spec.title}. ${spec.aim}`}
        getLabState={() => ({ examined: `${testedCount}/${items.length}`, activeItem: active })}
      />
    </div>
  );
}
