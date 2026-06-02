/* ── Observation table, verdict controls, intro overlay ── */
import React from "react";
import { C, SCI } from "./tokens.js";
import { Ic, Btn, SparkAvatar, Chip } from "./ui.jsx";

function ResultsTable({ activeSubstances, results, graded, onVerdict }) {
  const anyTested = activeSubstances.some((s) => results[s.id].blue || results[s.id].red);
  return (
    <div className="observation-ledger">
      
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${C.line}`, background: C.paperWarm }}>
        <Ic n="note" s={16} c={C.emBright} sw={2} />
        <h4 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Observation & Analytics Ledger</h4>
        <span className="mono" style={{ fontSize: 10, color: C.ink30, marginLeft: "auto", fontWeight: 700 }}>TELEMETRY TRACKED</span>
      </div>

      {/* Columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.1fr 1.1fr 1.5fr", padding: "10px 20px", borderBottom: `1px solid ${C.line}`, background: C.paperWarm, gap: 10 }}>
        {["CHEMICAL SAMPLE", "BLUE LITMUS STRIP", "RED LITMUS STRIP", "CHEMICAL NATURE VERDICT"].map((h, i) => (
          <span key={h} className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.ink50, letterSpacing: "0.04em", textAlign: i === 0 ? "left" : "center" }}>{h}</span>
        ))}
      </div>

      {/* Grid Rows */}
      {activeSubstances.map((s, i) => {
        const r = results[s.id];
        const tested = r.blue || r.red;
        const correct = graded && r.verdict === s.type;
        const wrong = graded && r.verdict !== s.type;
        const rowClass = correct 
          ? "observation-row-graded-correct" 
          : wrong 
          ? "observation-row-graded-incorrect" 
          : "";
          
        return (
          <div 
            key={s.id} 
            className={rowClass}
            style={{ 
              display: "grid", 
              gridTemplateColumns: "1.3fr 1.1fr 1.1fr 1.5fr", 
              alignItems: "center", 
              padding: "12px 20px", 
              borderBottom: i < activeSubstances.length - 1 ? `1px solid ${C.lineSoft}` : "none", 
              gap: 10 
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.liquid, border: "0.5px solid #cbd5e1", flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{s.name} <span style={{ fontSize: 11, color: C.ink50, fontWeight: 700 }}>({s.formula})</span></span>
            </div>
            
            <Swatch r={r.blue} base="blue" />
            <Swatch r={r.red} base="red" />
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              {tested
                ? <VerdictControl value={r.verdict} graded={graded} answer={s.type} onPick={(v) => onVerdict(s.id, v)} />
                : <span className="mono" style={{ fontSize: 11, color: C.ink15 }}>awaiting test</span>}
            </div>
          </div>
        );
      })}

      {graded && <GradeFootnote activeSubstances={activeSubstances} results={results} />}
      {!anyTested && <div style={{ padding: "16px", fontSize: 12.5, color: C.ink30, textAlign: "center" }} className="mono">Ready for execution. Use litmus indicators to populate.</div>}
    </div>
  );
}

function Swatch({ r, base }) {
  if (!r) return <div style={{ textAlign: "center", color: C.ink15, fontSize: 14 }} className="mono">—</div>;
  const baseCol = base === "blue" ? "#2563eb" : "#e11d48";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <span style={{ width: 14, height: 22, borderRadius: 2, background: `linear-gradient(180deg, ${baseCol} 0 45%, ${r.c} 45% 100%)`, boxShadow: "0 1px 2.5px rgba(0,0,0,0.15)", border: "1px solid rgba(0,0,0,0.05)" }} />
      <span style={{ fontSize: 10.5, fontWeight: 700, color: r.changed ? C.coral : C.ink50 }}>
        {r.changed ? "Changed!" : "No Change"}
      </span>
    </div>
  );
}

function VerdictControl({ value, graded, answer, onPick }) {
  const opts = [{ k: "acid", l: "Acid", c: SCI.acidStrong }, { k: "base", l: "Base", c: SCI.baseStrong }, { k: "neutral", l: "Neutral", c: SCI.neutral }];
  return (
    <div style={{ display: "inline-flex", background: C.paperWarm, borderRadius: 6, padding: 2, gap: 2 }}>
      {opts.map((o) => {
        const sel = value === o.k;
        const isAns = graded && answer === o.k;
        const wrongSel = graded && sel && answer !== o.k;
        return (
          <button key={o.k} onClick={() => !graded && onPick(o.k)} className="press" style={{
            border: "none", cursor: graded ? "default" : "pointer", fontSize: 11, fontWeight: 700,
            padding: "4.5px 9px", borderRadius: 4, transition: "all .15s",
            background: isAns ? o.c : sel ? (wrongSel ? C.coralPale : o.c) : "transparent",
            color: isAns ? "#fff" : sel ? (wrongSel ? C.coral : "#fff") : C.ink50,
          }}>
            {o.l}{isAns && !sel ? " ✓" : ""}{wrongSel ? " ✗" : ""}
          </button>
        );
      })}
    </div>
  );
}

function GradeFootnote({ activeSubstances, results }) {
  const correct = activeSubstances.filter((s) => results[s.id].verdict === s.type).length;
  return (
    <div style={{ padding: "14px 20px", background: C.paperWarm, display: "flex", alignItems: "center", gap: 12, borderTop: `1px solid ${C.line}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: correct === activeSubstances.length ? C.emPale : C.goldPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ic n="trophy" s={16} c={correct === activeSubstances.length ? C.emDeep : C.gold} sw={2} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
        Practical Scored: <b style={{ color: C.emBright }}>{correct} / {activeSubstances.length} Correct Verdicts</b>. Successful laboratory execution transcript compiled.
      </span>
    </div>
  );
}

function IntroOverlay({ onStart }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "fadeIn .25s" }}>
      <div className="card-glass hover-lift" style={{ width: "min(520px,94vw)", overflow: "hidden", background: C.cream, boxShadow: "0 30px 70px rgba(15,23,42,0.18)" }}>
        <div style={{ background: C.inkDeep, color: "#fff", padding: "24px 28px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-30%", right: "-10%", width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle, ${C.emBright}22, transparent 65%)` }} />
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
            <SparkAvatar size={44} glow />
            <div>
              <Chip c={C.emBright} bg="rgba(13,148,136,0.15)">CLASS 7 · CHEMISTRY EXP 05</Chip>
              <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 6, color: "#fff" }}>Acids, Bases & Indicators</h3>
            </div>
          </div>
        </div>
        
        <div style={{ padding: "24px 28px 28px" }}>
          <p style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.6, marginBottom: 18 }}>
            Welcome, researcher! You will select 6 chemicals from the 3D Reagent Locker and test them using litmus indicators to classify their nature under Spark's active voice guidance.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {[
              { ic: "flask", t: "Autonomous customization", d: "Select up to 6 custom fluid tubes from the 3D Reagent cabinet locker inventory." },
              { ic: "drop", t: "Answer Socratic MCQs", d: "Explain reactions vocally to Spark to unlock test stand litmus controls." },
              { ic: "trophy", t: "Assign chemical verdicts", d: "Examine litmus swatches and record acids, bases, or neutral fluids." }
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, background: C.paper, border: `1px solid ${C.line}`, borderRadius: 8, padding: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: C.emPale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ic n={s.ic} s={14} c={C.emDeep} sw={2} />
                </div>
                <div>
                  <h5 style={{ fontSize: 12.5, color: C.ink, fontWeight: 700 }}>{s.t}</h5>
                  <p style={{ fontSize: 11, color: C.ink50, marginTop: 1 }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.emPale, borderRadius: 8, marginBottom: 20 }}>
            <Ic n="shield" s={15} c={C.emDeep} sw={2} />
            <span style={{ fontSize: 12, color: C.emDeep, fontWeight: 700 }}>GCP Sandbox: Secure production, no hazard.</span>
          </div>
          <Btn v="primary" lg full icon="arrow" onClick={onStart}>Execute Laboratory Workbench</Btn>
        </div>
      </div>
    </div>
  );
}

export { ResultsTable, IntroOverlay };
