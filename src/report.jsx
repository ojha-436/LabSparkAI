/* ── Completion celebration + auto-generated lab report ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic, Btn, useReveal } from "./ui.jsx";
import { SUBSTANCES, TYPE_META, CIRCUIT_MATERIALS } from "./data.js";
import { dipResult } from "./lab.jsx";
const { useState: rUS, useEffect: rUE } = React;

function Report({ data, student, onHome, onRetry }) {
  const ref = useReveal();
  const { results, correct, total, xp } = data;
  const perfect = correct === total;
  const [confetti] = rUS(() => Array.from({ length: 28 }, (_, i) => ({ id: i, x: Math.random() * 100, d: 2 + Math.random() * 2.5, delay: Math.random() * 1.2, c: [C.emBright, C.gold, C.coral, C.violet, C.lime][i % 5], s: 6 + Math.random() * 8 })));

  return (
    <div ref={ref} style={{ minHeight: "100vh", position: "relative", overflow: "hidden", padding: "60px 24px 80px" }} className="blueprint-grid">
      {/* Confetti */}
      {confetti.map((c) => (
        <span key={c.id} style={{ position: "fixed", top: -20, left: c.x + "vw", width: c.s, height: c.s, background: c.c, borderRadius: c.id % 2 ? "50%" : 2, animation: `confetti ${c.d}s ${c.delay}s ease-in forwards`, zIndex: 1 }} />
      ))}
      <style>{`@keyframes confetti{to{transform:translateY(105vh) rotate(540deg);opacity:0}}`}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", position: "relative", zIndex: 2 }}>
        
        {/* Celebration Title */}
        <div className="reveal r1" style={{ textAlign: "center", marginBottom: 38 }}>
          <div style={{ display: "inline-block", animation: "sparkle 1.8s infinite", marginBottom: 16 }}>
            <BadgeMedal perfect={perfect} />
          </div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 800, color: C.ink, letterSpacing: "-0.03em" }}>
            {perfect ? "Laboratory Practicals Perfect! 🏆" : "Laboratory Module Complete! 🎉"}
          </h2>
          <p style={{ fontSize: 14.5, color: C.ink50, maxWidth: 460, margin: "8px auto 0", lineHeight: 1.5 }}>
            Observations successfully logged for <b style={{ color: C.emBright }}>{correct} of {total}</b> test elements. Your official NCERT science lab report transcript has been compiled.
          </p>
        </div>

        {/* Score Stats Grid */}
        <div className="reveal r2" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 30 }}>
          {[
            { ic: "bolt", n: "+" + xp + " XP", l: "XP Accrued", c: C.gold },
            { ic: "target", n: Math.round((correct / total) * 100) + "%", l: "Accuracy Score", c: C.emBright },
            { ic: "medal", n: "1 Badge", l: data.experimentId === "circuit" ? "Conductivity Master" : "Indicator Investigator", c: C.coral }
          ].map((s, i) => (
            <div key={i} className="lift-card" style={{ background: C.cream, borderRadius: 10, padding: "18px 20px", textAlign: "center", boxShadow: "0 4px 10px rgba(0,0,0,0.01)" }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: s.c + "12", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><Ic n={s.ic} s={16} c={s.c} sw={2.2} /></div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>{s.n}</div>
              <div style={{ fontSize: 11.5, color: C.ink50, marginTop: 3, fontWeight: 500 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* FORMAL CBSE TRANSCRIPT */}
        <div className="reveal r3 transcript-certificate">
          
          {/* Certificate Header */}
          <div className="transcript-header-box">
            <span className="mono" style={{ fontSize: 10, color: C.emDeep, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>OFFICIAL LABORATORY TRANSCRIPT</span>
            <h3 style={{ fontSize: 21, fontWeight: 800, color: C.ink, marginTop: 4, letterSpacing: "-0.01em" }}>LabSpark Virtual Science Laboratories</h3>
            <p style={{ fontSize: 11.5, color: C.ink50, marginTop: 2 }}>AFFILIATED CBSE/NCERT PRACTICAL TRAINING PLATFORM</p>
          </div>

          {/* Transcript Metadata */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 16, borderBottom: `1px solid ${C.line}`, paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <ReportField label="STUDENT NAME" value={`${student.name} · ${data.experimentId === "circuit" ? "Class 8 Science" : "Class 7 Science"}`} />
              <ReportField label="EXPERIMENT NAME" value={data.experimentId === "circuit" ? "Investigating Electrical Conductivity of Everyday Materials" : "Testing Acids, Bases and Neutral Liquids using Litmus Indicators"} />
            </div>
            <div>
              <ReportField label="COMPLETION DATE" value="May 30, 2026" />
              <ReportField label="PLATFORM CREDITS" value="Auto-verified via Firestore Ledger" />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <ReportField 
              label="AIM" 
              value={data.experimentId === "circuit" 
                ? "To construct a simple series electric circuit and test a variety of common materials to classify them as electrical conductors or insulators based on their ability to complete the electrical loop and illuminate the incandescent bulb."
                : "To investigate and classify six common household liquids as acidic, basic, or neutral by observing color transitions in blue and red litmus paper indicators."
              } 
            />
            <ReportField 
              label="MATERIALS USED" 
              value={data.experimentId === "circuit"
                ? "Dual-terminal 1.5V carbon-zinc battery, insulated copper connecting leads, metallic alligator clips, miniature 1.5V incandescent light bulb with tungsten filament, and six test substances: Metal Safety Pin, Copper Wire, Iron Key, Rubber Eraser, Plastic Ruler, and Glass Slide."
                : "Litmus indicator paper strips (Blue & Red), test tube racks, and six liquid samples: Lemon Juice, Vinegar, Baking Soda Water, Soap Solution, Salt Water, and Distilled Water."
              } 
            />

            <div>
              <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.slate400, letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>OBSERVATION TELEMETRY DATA TABLE</span>
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                {data.experimentId === "circuit" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr 1.1fr 1.1fr", background: C.paperWarm, padding: "8px 14px", gap: 8 }}>
                      {["TEST SUBSTANCE", "LOOP STATUS", "BULB STATE", "VERDICT"].map((h) => (
                        <span key={h} className="mono" style={{ fontSize: 9, fontWeight: 700, color: C.ink50 }}>{h}</span>
                      ))}
                    </div>
                    {CIRCUIT_MATERIALS.map((s) => {
                      const r = results[s.id] || {};
                      const isConductor = s.type === "conductor";
                      return (
                        <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr 1.1fr 1.1fr", padding: "8px 14px", gap: 8, borderTop: `1px solid ${C.lineSoft}`, alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{s.emoji} {s.name} ({s.material})</span>
                          <span style={{ fontSize: 12, color: C.ink50 }}>{r.dipped || r.verdict ? "Closed conducting loop" : "Disconnected loop"}</span>
                          <span style={{ fontSize: 12, color: isConductor ? C.lime : C.ink50, fontWeight: 600 }}>{isConductor ? "GLOWING (Active)" : "DARK (Inactive)"}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isConductor ? C.emBright : C.coral }}>{isConductor ? "Conductor" : "Insulator"}</span>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr 1.1fr 1.1fr", background: C.paperWarm, padding: "8px 14px", gap: 8 }}>
                      {["SAMPLE FLUID", "BLUE LITMUS", "RED LITMUS", "NATURE"].map((h) => (
                        <span key={h} className="mono" style={{ fontSize: 9, fontWeight: 700, color: C.ink50 }}>{h}</span>
                      ))}
                    </div>
                    {SUBSTANCES.map((s) => (
                      <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.1fr 1.1fr 1.1fr", padding: "8px 14px", gap: 8, borderTop: `1px solid ${C.lineSoft}`, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{s.emoji} {s.name}</span>
                        <span style={{ fontSize: 12, color: C.ink50 }}>{litmusText("blue", s.type)}</span>
                        <span style={{ fontSize: 12, color: C.ink50 }}>{litmusText("red", s.type)}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TYPE_META[s.type].c }}>{TYPE_META[s.type].label}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            <ReportField 
              label="CONCLUSION" 
              value={data.experimentId === "circuit"
                ? "It is scientifically concluded that metallic materials (safety pin, copper wire, iron key) containing a high concentration of free valence electrons close the electrical loop to allow current flow, turning the light bulb on. These are classified as electrical conductors. Non-metallic polymers and silicates (rubber eraser, plastic ruler, glass slide) possess tightly bound covalent valence electrons that block current flow, leaving the bulb dark. These are classified as insulators."
                : "It is chemically concluded that liquids causing blue litmus paper to turn red are acidic (lemon juice, vinegar) due to hydrogen ions. Solutions causing red litmus to turn blue are basic (baking soda, soap solution) due to hydroxide ions. Distilled water and salt water are neutral, showing no reaction. Litmus indicators accurately determine nature."
              }
            />

            {data.aiFeedback && (
              <div style={{ background: C.violetPale, border: `1px solid ${C.violet}22`, borderRadius: 10, padding: "14px 16px" }}>
                <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.violet, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Ic n="spark" s={13} c={C.violet} sw={2} /> SPARK'S FEEDBACK · GEMINI
                </span>
                <p style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.55, fontWeight: 500 }}>{data.aiFeedback}</p>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
            <Btn v="dark" icon="note" onClick={() => window.print()}>Print Official Transcript</Btn>
            <Btn v="light" icon="send">Share with Teacher</Btn>
          </div>
        </div>

        {/* Next Actions */}
        <div className="reveal r4" style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 32 }}>
          <Btn v="ghost" iconL="refresh" onClick={onRetry}>Restart Sandbox</Btn>
          <Btn v="primary" lg icon="arrow" onClick={onHome}>Return to Dashboard</Btn>
        </div>

      </div>
    </div>
  );
}

function ReportField({ label, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.ink30, letterSpacing: "0.06em", display: "block", marginBottom: 3 }}>{label}</span>
      <p style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.5, fontWeight: 500 }}>{value}</p>
    </div>
  );
}

function litmusText(strip, type) {
  const r = dipResult(strip, type);
  if (!r.changed) return "No Color Change";
  return strip === "blue" ? "Turned Red" : "Turned Blue";
}

function BadgeMedal({ perfect }) {
  return (
    <div style={{ position: "relative", width: 94, height: 94 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `conic-gradient(${C.gold},${C.goldBright},${C.gold},${C.goldBright},${C.gold})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 24px ${C.gold}44` }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: C.inkDeep, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
          <Ic n="star" s={24} c={C.goldBright} sw={1.8} />
          <span className="mono" style={{ fontSize: 8, color: C.goldBright, letterSpacing: "0.08em", fontWeight: 700 }}>{perfect ? "PERFECT" : "VERIFIED"}</span>
        </div>
      </div>
    </div>
  );
}

export { Report };
