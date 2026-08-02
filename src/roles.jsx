/* ── Role selection: who is using LabSpark (student / teacher / parent) ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic } from "./ui.jsx";

const { useState: rUS } = React;

export const ROLES = [
  { key: "student", icon: "flask", title: "Student", blurb: "Do experiments, build a practical file, earn certificates", c: C.emBright },
  { key: "teacher", icon: "grid", title: "Teacher", blurb: "Run classes, assign labs, track every student", c: C.violet },
  { key: "parent", icon: "shield", title: "Parent", blurb: "Follow your child's progress and scores", c: C.gold },
];

/* Inline 3-card chooser (used on the sign-up screen and the setup page). */
export function RoleChooser({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      {ROLES.map((r) => {
        const sel = value === r.key;
        return (
          <button key={r.key} type="button" onClick={() => onChange(r.key)} className="press"
            style={{ textAlign: "left", cursor: "pointer", border: `1.5px solid ${sel ? r.c : C.line}`, background: sel ? r.c + "12" : C.cream, borderRadius: 12, padding: "12px 12px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: r.c + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Ic n={r.icon} s={16} c={r.c} sw={2} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>{r.title}</div>
            <div style={{ fontSize: 10.5, color: C.ink50, marginTop: 2, lineHeight: 1.35 }}>{r.blurb}</div>
          </button>
        );
      })}
    </div>
  );
}

/* Full-screen setup shown to a signed-in user who has no role yet. */
export function RoleSetupPage({ name, onPick }) {
  const [role, setRole] = rUS("student");
  const [busy, setBusy] = rUS(false);
  const go = () => { setBusy(true); onPick(role); };
  return (
    <div className="grid-blueprint" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div className="card-glass" style={{ width: "100%", maxWidth: 560, background: C.cream, borderRadius: 18, padding: 34, boxShadow: "0 20px 50px rgba(15,23,42,0.08)" }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>Welcome{name ? `, ${name.split(" ")[0]}` : ""}! 👋</h2>
        <p style={{ fontSize: 14, color: C.ink50, marginTop: 6, marginBottom: 22 }}>How will you use LabSpark? This sets up the right dashboard for you.</p>
        <RoleChooser value={role} onChange={setRole} />
        <button onClick={go} disabled={busy} className="press btn btn-primary" style={{ width: "100%", padding: "13px 0", fontSize: 14, borderRadius: 10, fontWeight: 700, marginTop: 24 }}>
          {busy ? "Setting up…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
