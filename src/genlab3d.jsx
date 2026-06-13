/* ── 3D version of the data-driven classification lab ──
   Uses the SAME shared lab room, instruments, lighting and Spark HUD as the
   flagship Acids & Bases lab (lab3dscene.jsx) so every experiment looks and
   feels identical. Each spec item is a 3D sample jar on the bench: tap to
   examine, then classify it. Reuses free narration + on-demand Ask Spark. */
import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { C } from "./tokens.js";
import { Ic, Btn, SparkAvatar, VoiceWaveform } from "./ui.jsx";
import { GlassMaterial, LabRoom, BenchInstruments, SceneEnv } from "./lab3dscene.jsx";
import { Item3D, BarMagnet, ConductivityTester, LightRig, ThermoRig, Magnifier, GlowRig } from "./labitems3d.jsx";
import { AskSpark } from "./askspark.jsx";
import { gradeLab } from "./api.js";
import { speak, cancelSpeech, loadClipManifest } from "./speech.js";

const { useState: gUS, useEffect: gUE, useRef: gUR, useCallback: gUC } = React;

/* Water station for the solubility lab — the beaker shows the dissolving result. */
function WaterStation({ activeItem }) {
  const soluble = activeItem && activeItem.category === "soluble";
  const insoluble = activeItem && activeItem.category === "insoluble";
  const waterColor = soluble ? activeItem.color : "#bfe3f0";
  const H = 0.5, liqH = 0.34;
  return (
    <group position={[0, 0, 0.66]} scale={1.2}>
      <mesh castShadow position={[0, H / 2, 0]}><cylinderGeometry args={[0.22, 0.2, H, 40, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.2, 0.2, 0.024, 40]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, H, 0]}><torusGeometry args={[0.22, 0.01, 10, 40]} /><GlassMaterial /></mesh>
      <mesh position={[0, liqH / 2 + 0.02, 0]}><cylinderGeometry args={[0.198, 0.182, liqH, 40]} /><meshStandardMaterial color={waterColor} transparent opacity={insoluble ? 0.82 : 0.6} roughness={0.15} emissive={waterColor} emissiveIntensity={soluble ? 0.15 : 0.04} /></mesh>
      {insoluble && activeItem.shape !== "liquid" && (
        <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.17, 0.17, 0.05, 32]} /><meshStandardMaterial color={activeItem.color} roughness={1} /></mesh>
      )}
      {insoluble && activeItem.shape === "liquid" && (
        <mesh position={[0, liqH + 0.005, 0]}><cylinderGeometry args={[0.196, 0.196, 0.04, 40]} /><meshStandardMaterial color={activeItem.color} transparent opacity={0.85} roughness={0.2} /></mesh>
      )}
      <mesh position={[0.09, 0.36, 0]} rotation={[0, 0, 0.16]}><cylinderGeometry args={[0.008, 0.008, 0.52, 12]} /><GlassMaterial opacity={0.5} /></mesh>
      <Html position={[0, H + 0.14, 0]} center distanceFactor={3.5} occlude={false}>
        <div style={{ pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "#0369a1", background: "rgba(255,255,255,0.88)", padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>Beaker of Water</div>
      </Html>
    </group>
  );
}

function GenScene({ spec, items, active, tested, onExamine }) {
  const n = items.length;
  const positions = items.map((_, i) => [(i - (n - 1) / 2) * 0.62, 0.02, 0.12]);
  const activeIdx = items.findIndex((it) => it.id === active);
  const activeItem = items[activeIdx];
  const activeX = activeIdx >= 0 ? positions[activeIdx][0] : 0;
  return (
    <>
      <SceneEnv />
      <LabRoom />
      <BenchInstruments />
      {items.map((it, i) => (
        <Item3D
          key={it.id}
          item={it}
          position={positions[i]}
          selected={active === it.id}
          tested={!!tested[it.id]}
          accent={spec.accent}
          lift={spec.mode === "magnet" && active === it.id && it.category === "magnetic" ? 1 : 0}
          onExamine={onExamine}
        />
      ))}
      {spec.mode === "magnet" && <BarMagnet activeX={activeX} active={activeIdx >= 0} attracted={!!(activeItem && activeItem.category === "magnetic")} />}
      {spec.mode === "water" && <WaterStation activeItem={activeItem} />}
      {spec.mode === "examine" && activeIdx >= 0 && <ConductivityTester position={[activeX, 0.0, 0.6]} lit={!!(activeItem && activeItem.category === "metal")} />}
      {spec.mode === "light" && activeIdx >= 0 && <LightRig x={activeX} category={activeItem.category} />}
      {spec.mode === "thermo" && activeIdx >= 0 && <ThermoRig x={activeX} temp={activeItem.temp} />}
      {spec.mode === "inspect" && activeIdx >= 0 && <Magnifier x={activeX} />}
      {spec.mode === "glow" && activeIdx >= 0 && <GlowRig x={activeX} lit={!!(activeItem && activeItem.category === "luminous")} />}
    </>
  );
}

export function GenLab3D({ spec, onExit, onComplete, addXp }) {
  const items = spec.items;
  const [tested, setTested] = gUS({});
  const [verdicts, setVerdicts] = gUS({});
  const [active, setActive] = gUS(null);
  const [graded, setGraded] = gUS(false);
  const [voiceOn, setVoiceOn] = gUS(true);
  const [speaking, setSpeaking] = gUS(false);
  const [mood, setMood] = gUS("happy");
  const [msg, setMsg] = gUS(`Welcome to the ${spec.title} lab! ${spec.aim} Drag to look around, then tap a sample on the bench to examine it.`);
  const [showQuiz, setShowQuiz] = gUS(false);
  const [picked, setPicked] = gUS(null);
  const answeredRef = gUR(false);

  gUE(() => { loadClipManifest(); return () => cancelSpeech(); }, []);

  const say = gUC((text) => {
    setMsg(text); setMood("thinking");
    if (!voiceOn) { setSpeaking(true); setTimeout(() => { setSpeaking(false); setMood("happy"); }, 2400); return; }
    speak(text, { onStart: () => setSpeaking(true), onEnd: () => { setSpeaking(false); setMood("happy"); } });
  }, [voiceOn]);

  const testedCount = items.filter((i) => tested[i.id]).length;
  const allTested = testedCount === items.length;
  const allVerdicts = items.every((i) => verdicts[i.id]);

  const examine = (item) => { setActive(item.id); setTested((t) => ({ ...t, [item.id]: true })); say(item.fact); };
  const setVerdict = (id, cat) => { if (!graded) setVerdicts((v) => ({ ...v, [id]: cat })); };

  const answerQuiz = (idx) => {
    if (answeredRef.current) return;
    setPicked(idx);
    if (idx === spec.question.ans) { answeredRef.current = true; addXp(15); say(spec.question.correctMsg); setTimeout(() => setShowQuiz(false), 3000); }
    else { say(spec.question.incorrectMsg); setTimeout(() => setPicked(null), 2800); }
  };

  const submit = () => {
    const correct = items.filter((i) => verdicts[i.id] === i.category).length;
    setGraded(true);
    const xp = 30 + correct * 8; addXp(xp); setMood("celebrate");
    say(`Great work! You classified ${correct} of ${items.length} correctly. Compiling your lab report.`);
    const observations = items.map((i) => ({ name: i.name, correct: i.category, studentVerdict: verdicts[i.id] }));
    const minDelay = new Promise((r) => setTimeout(r, 2600));
    const feedback = gradeLab({ experiment: `${spec.cls} ${spec.subject} — ${spec.title}`, observations }).then((g) => g.feedback).catch(() => null);
    Promise.all([feedback, minDelay]).then(([aiFeedback]) => {
      onComplete({ experimentId: spec.id, correct, total: items.length, xp, aiFeedback, generic: true, title: spec.title, aim: spec.aim, conclusion: spec.conclusion });
    });
  };

  const activeItem = items.find((i) => i.id === active);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.paper }} className="grid-blueprint">
      {/* header */}
      <div style={{ height: 60, background: C.inkDeep, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", flexShrink: 0, zIndex: 30, borderBottom: `1px solid ${C.lineDark}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onExit} className="press" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.lineInk}`, color: "#fff", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Ic n="back" s={14} c="#fff" sw={2} />Exit Lab
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: spec.accent + "30", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n={spec.icon} s={15} c="#fff" sw={2} /></div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1 }} className="font-display">{spec.title} · 3D Lab</div>
              <div className="mono" style={{ fontSize: 9.5, color: C.ink30, marginTop: 2 }}>{spec.cls.toUpperCase()} · {spec.subject.toUpperCase()} · WEBGL</div>
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
        {/* left: 3D + table */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }} className="blueprint-grid">
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 28px 80px" }}>
            {/* NCERT info */}
            <div className="card-glass" style={{ background: C.cream, borderRadius: 12, padding: "14px 18px", marginBottom: 18, borderLeft: `4px solid ${spec.accent}` }}>
              <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: spec.accent, letterSpacing: "0.06em" }}>{spec.chapter}</span>
              <p style={{ fontSize: 13, color: C.ink70, lineHeight: 1.5, marginTop: 5 }}><b>Aim:</b> {spec.aim}</p>
            </div>

            {/* 3D viewport */}
            <div style={{ height: 440, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}`, marginBottom: 22, boxShadow: "0 12px 40px rgba(15,23,42,0.10)", background: "#eef2f6" }}>
              <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.0, 3.0], fov: 45 }}>
                <GenScene spec={spec} items={items} active={active} tested={tested} onExamine={examine} />
              </Canvas>
            </div>

            {/* bonus quiz */}
            {spec.question && !answeredRef.current && (
              <button onClick={() => setShowQuiz((s) => !s)} className="press" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.violetPale, color: C.violet, border: "none", borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
                <Ic n="spark" s={14} c={C.violet} sw={2} /> {showQuiz ? "Hide" : "Bonus question (+15 XP)"}
              </button>
            )}
            {showQuiz && spec.question && (
              <div className="card-glass" style={{ background: C.cream, borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: `1px solid ${C.violetPale}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{spec.question.q}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {spec.question.options.map((o, i) => {
                    const sel = picked === i, correct = i === spec.question.ans;
                    return (
                      <button key={i} onClick={() => answerQuiz(i)} disabled={picked !== null && correct} className="press" style={{ textAlign: "left", background: sel ? (correct ? C.emPale : C.coralPale) : C.paper, color: sel ? (correct ? C.emDeep : C.coral) : C.ink70, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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
                <span className="mono" style={{ fontSize: 10, color: C.ink30, marginLeft: "auto", fontWeight: 700 }}>CLASSIFY EACH SAMPLE</span>
              </div>
              {items.map((item, idx) => {
                const v = verdicts[item.id]; const done = tested[item.id];
                const isCorrect = graded && v === item.category, isWrong = graded && v && v !== item.category;
                return (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr", gap: 12, alignItems: "center", padding: "12px 18px", borderBottom: idx < items.length - 1 ? `1px solid ${C.lineSoft}` : "none", background: isCorrect ? "rgba(13,148,136,0.05)" : isWrong ? "rgba(234,88,12,0.05)" : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 14, height: 14, borderRadius: 4, background: item.color, border: `1px solid ${C.line}`, display: "inline-block", flexShrink: 0 }} /><span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{item.name}</span></div>
                    <div>
                      {!done ? <span className="mono" style={{ fontSize: 11, color: C.ink15 }}>examine in 3D first ↑</span> : (
                        <div style={{ display: "inline-flex", background: C.paperWarm, borderRadius: 8, padding: 3, gap: 3 }}>
                          {spec.categories.map((c) => {
                            const sel = v === c.key, ans = graded && item.category === c.key, wrongSel = graded && sel && item.category !== c.key;
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

            {allTested && allVerdicts && !graded && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}><Btn v="primary" lg icon="check" onClick={submit}>Grade & Compile Lab Report</Btn></div>
            )}
            {graded && <div style={{ textAlign: "center", marginTop: 26 }}><p style={{ fontSize: 15.5, fontWeight: 700, color: spec.accent }}>Compiling your report…</p></div>}
          </div>
        </div>

        {/* right: Spark HUD (same position/UI as the flagship lab) */}
        <aside className="voice-hud-panel">
          <div className="voice-hud-header">
            <SparkAvatar size={42} mood={mood} glow />
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>Spark <span style={{ width: 7, height: 7, borderRadius: "50%", background: voiceOn ? C.lime : C.ink30, animation: voiceOn ? "pulse 2s infinite" : "none" }} /></div>
              <div className="mono" style={{ fontSize: 9.5, color: spec.accent, fontWeight: 700 }}>YOUR LAB GUIDE</div>
            </div>
          </div>
          <div className="voice-hud-soundwave-core"><VoiceWaveform active={speaking} color={spec.accent} /></div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="voice-overlay-msg">
              <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: spec.accent, textTransform: "uppercase", marginBottom: 6 }}>Spark says</div>
              {msg}
            </div>
          </div>
          <div className="voice-hud-controls">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="mono"><div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>NARRATION</div><div style={{ fontSize: 12, color: voiceOn ? C.lime : "#cbd5e1", fontWeight: 700 }}>{voiceOn ? "● On" : "Muted"}</div></div>
              <div className="mono" style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>RENDER</div><div style={{ fontSize: 12, color: C.emBright, fontWeight: 700 }}>WebGL · 3D</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button onClick={() => { const nx = !voiceOn; setVoiceOn(nx); if (!nx) { cancelSpeech(); setSpeaking(false); } }} className={`voice-btn-mic ${voiceOn ? "active" : "muted"}`}>
                <Ic n={voiceOn ? "mic" : "lock"} s={24} c="#fff" sw={2} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <AskSpark experiment={`${spec.cls} ${spec.subject} — ${spec.title}. ${spec.aim}`} getLabState={() => ({ examined: `${testedCount}/${items.length}`, activeItem: active })} />
    </div>
  );
}
