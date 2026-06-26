/* ── Parent dashboard: follow a linked child's progress (no lab catalogue) ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic, Btn } from "./ui.jsx";
import { PageShell } from "./profile.jsx";
import { linkChild, getChildProgress } from "./family.js";

const { useState: pUS, useEffect: pUE } = React;
const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, color: C.ink, background: C.cream, outline: "none", fontFamily: "inherit" };

export function ParentDashboard({ student, onBack, onAddChild }) {
  const children = student.children || [];
  const [progress, setProgress] = pUS({}); // studentUid -> mirror
  const [code, setCode] = pUS("");
  const [busy, setBusy] = pUS(false);
  const [err, setErr] = pUS("");

  const loadAll = async () => {
    const out = {};
    for (const ch of children) { try { out[ch.studentUid] = await getChildProgress(ch.studentUid); } catch { /* ignore */ } }
    setProgress(out);
  };
  pUE(() => { loadAll(); }, [children.length]);

  const link = async () => {
    setErr("");
    if (code.trim().length < 4) { setErr("Enter the 6-character family code from your child's dashboard."); return; }
    setBusy(true);
    try {
      const child = await linkChild(code, student);
      onAddChild && onAddChild(child);
      setCode("");
      const data = await getChildProgress(child.studentUid);
      setProgress((p) => ({ ...p, [child.studentUid]: data }));
    } catch (e) { setErr(e.message || "Could not link. Check the code."); }
    setBusy(false);
  };

  return (
    <PageShell title="Parent Dashboard" subtitle={`Following ${children.length} child${children.length !== 1 ? "ren" : ""}`} icon="shield" accent={C.gold} backLabel="Sign Out" onBack={onBack}>
      {/* link a child */}
      <div className="card-glass" style={{ background: C.cream, borderRadius: 16, padding: 22, marginBottom: 26 }}>
        <h4 style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Link your child</h4>
        <p style={{ fontSize: 12.5, color: C.ink50, marginBottom: 12 }}>Ask your child to open <b>Invite Parent</b> on their dashboard and read you their 6-character Family Code.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...inputStyle, maxWidth: 220, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 800, textAlign: "center" }}
            value={code} maxLength={6} placeholder="ABC123" onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(""); }} />
          <Btn v="primary" icon="check" onClick={link} disabled={busy}>{busy ? "Linking…" : "Link Child"}</Btn>
        </div>
        {err && <div style={{ background: C.coralPale, color: C.coral, padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{err}</div>}
      </div>

      {children.length === 0 ? (
        <div style={{ textAlign: "center", padding: "46px 20px", background: C.cream, borderRadius: 14, border: `1px dashed ${C.line}` }}>
          <Ic n="shield" s={32} c={C.ink15} sw={1.6} />
          <p style={{ fontSize: 14, color: C.ink50, marginTop: 12, fontWeight: 600 }}>No child linked yet.</p>
          <p style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>Enter your child's family code above to start following their progress.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {children.map((ch) => {
            const p = progress[ch.studentUid];
            const comps = (p && p.completions) || [];
            return (
              <div key={ch.studentUid} className="card-glass" style={{ background: C.cream, borderRadius: 16, border: `1px solid ${C.line}`, overflow: "hidden" }}>
                <div style={{ background: C.inkDeep, color: "#fff", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{(p && p.name) || ch.name}</div>
                    <div style={{ fontSize: 11.5, color: C.ink30, marginTop: 2 }}>{[p && p.klass, p && p.school].filter(Boolean).join(" · ") || "Student"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 11, color: C.emBright, fontWeight: 700 }}>LEVEL {(p && p.level) || 1}</div>
                    <div style={{ fontSize: 11, color: C.ink30 }}>{(p && p.xp) || 0} XP</div>
                  </div>
                </div>
                {!p ? (
                  <div style={{ padding: "18px 20px", fontSize: 13, color: C.ink50 }}>Waiting for {ch.name} to complete their first lab…</div>
                ) : (
                  <div style={{ padding: "18px 20px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                      {[{ n: p.done || 0, l: "Labs completed", c: C.emBright }, { n: comps.length ? Math.round(comps.reduce((a, c) => a + (c.total ? c.correct / c.total : 0), 0) / comps.length * 100) + "%" : "—", l: "Avg accuracy", c: C.violet }, { n: p.streak || 1, l: "Day streak", c: C.coral }].map((s, i) => (
                        <div key={i} style={{ background: C.paperWarm, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>{s.n}</div>
                          <div style={{ fontSize: 11, color: C.ink50, marginTop: 2 }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.ink70, marginBottom: 8 }}>Recent experiments</div>
                    {comps.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: C.ink50 }}>No experiments completed yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {comps.slice().reverse().slice(0, 6).map((c, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                            <Ic n="check" s={14} c={C.emDeep} sw={2.5} />
                            <span style={{ flex: 1, color: C.ink, fontWeight: 600 }}>{c.name}</span>
                            <span style={{ color: C.ink30, fontSize: 11.5 }}>{c.date}</span>
                            {typeof c.correct === "number" && <span style={{ fontWeight: 700, color: C.emDeep }}>{c.correct}/{c.total}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div><Btn v="ghost" sm icon="refresh" onClick={loadAll}>Refresh progress</Btn></div>
        </div>
      )}
    </PageShell>
  );
}
