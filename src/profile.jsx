/* ── Profile, Class Progress, and Achievements pages ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic, Btn, useReveal } from "./ui.jsx";

const { useState: pUS, useRef: pUR } = React;

/* Circular avatar — shows the uploaded photo or coloured initials. */
export function Avatar({ src, name = "", size = 96, ring = true }) {
  const initials = name ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() : "ST";
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: src ? "#fff" : `linear-gradient(135deg, ${C.violet}, ${C.em})`,
        color: "#fff", fontWeight: 800, fontSize: size * 0.38,
        border: ring ? "3px solid #fff" : "none",
        boxShadow: ring ? "0 6px 20px rgba(15,23,42,0.18)" : "none",
      }}
    >
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

/* Resize an image file to a small square data URL (kept tiny so it fits in
   Firestore — avoids needing Cloud Storage). */
function resizeToDataURL(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const CLASSES = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: C.ink70, display: "block", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, color: C.ink, background: C.cream, outline: "none", fontFamily: "inherit" };

export function PageShell({ title, subtitle, icon, onBack, children, accent = C.em }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="grid-blueprint" style={{ minHeight: "100vh" }}>
      <nav style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} className="press btn btn-light" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Ic n="back" s={14} c={C.ink50} /> Dashboard
          </button>
          <div style={{ width: 1, height: 20, background: C.line }} />
          <div style={{ width: 34, height: 34, borderRadius: 9, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ic n={icon} s={18} c={accent} sw={2} />
          </div>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>{title}</h3>
            <p style={{ fontSize: 11.5, color: C.ink50 }}>{subtitle}</p>
          </div>
        </div>
      </nav>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 80px" }}>{children}</div>
    </div>
  );
}

/* ─────────── Profile editor ─────────── */
export function ProfilePage({ student, onSave, onBack }) {
  const [form, setForm] = pUS({
    name: student.name || "", school: student.school || "", klass: student.klass || "",
    section: student.section || "", parentName: student.parentName || "", mobile: student.mobile || "",
    city: student.city || "", rollNo: student.rollNo || "",
  });
  const [photo, setPhoto] = pUS(student.photoData || null);
  const [saved, setSaved] = pUS(false);
  const [err, setErr] = pUS("");
  const fileRef = pUR(null);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false); };

  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { setErr("Please choose an image under 6 MB."); return; }
    try { const url = await resizeToDataURL(file); setPhoto(url); setSaved(false); setErr(""); }
    catch { setErr("Could not read that image."); }
  };

  const save = () => {
    if (!form.name.trim()) { setErr("Name is required."); return; }
    if (form.mobile && !/^[0-9+\-\s]{7,15}$/.test(form.mobile)) { setErr("Enter a valid mobile number."); return; }
    setErr("");
    onSave({ ...form, photoData: photo || null });
    setSaved(true);
  };

  return (
    <PageShell title="My Profile" subtitle="Your personal details" icon="home" accent={C.violet} onBack={onBack}>
      <div className="card-glass reveal r1" style={{ background: C.cream, borderRadius: 16, padding: 28, maxWidth: 720, margin: "0 auto" }}>
        {/* photo */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 24 }}>
          <Avatar src={photo} name={form.name} size={92} />
          <div>
            <button onClick={() => fileRef.current && fileRef.current.click()} className="press btn btn-light" style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Ic n="eye" s={14} c={C.ink50} /> {photo ? "Change photo" : "Upload photo"}
            </button>
            {photo && <button onClick={() => setPhoto(null)} className="press" style={{ marginLeft: 8, background: "transparent", border: "none", color: C.coral, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Remove</button>}
            <p style={{ fontSize: 11, color: C.ink30, marginTop: 6 }}>JPG or PNG, square works best.</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: "none" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Full Name *"><input style={inputStyle} value={form.name} onChange={set("name")} placeholder="e.g. Aarav Sharma" /></Field>
          <Field label="School Name"><input style={inputStyle} value={form.school} onChange={set("school")} placeholder="e.g. Delhi Public School" /></Field>
          <Field label="Class">
            <select style={inputStyle} value={form.klass} onChange={set("klass")}>
              <option value="">Select class</option>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Section"><input style={inputStyle} value={form.section} onChange={set("section")} placeholder="e.g. A" /></Field>
          <Field label="Roll Number"><input style={inputStyle} value={form.rollNo} onChange={set("rollNo")} placeholder="e.g. 23" /></Field>
          <Field label="City"><input style={inputStyle} value={form.city} onChange={set("city")} placeholder="e.g. Jaipur" /></Field>
          <Field label="Parent / Guardian Name"><input style={inputStyle} value={form.parentName} onChange={set("parentName")} placeholder="e.g. Mr. Sharma" /></Field>
          <Field label="Parent Mobile Number"><input style={inputStyle} value={form.mobile} onChange={set("mobile")} placeholder="e.g. +91 98765 43210" /></Field>
        </div>

        {err && <div style={{ background: C.coralPale, color: C.coral, padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>{err}</div>}

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 20 }}>
          <Btn v="primary" lg icon="check" onClick={save}>Save Profile</Btn>
          {saved && <span style={{ display: "flex", alignItems: "center", gap: 6, color: C.emDeep, fontSize: 13, fontWeight: 700 }}><Ic n="check" s={15} c={C.emBright} sw={2.5} /> Saved!</span>}
        </div>
      </div>
    </PageShell>
  );
}

/* ─────────── Class Progress ─────────── */
export function ProgressPage({ student, catalog, onBack, onOpen }) {
  const completions = student.completions || [];
  const completedIds = new Set(completions.map((c) => c.id));
  const total = catalog.length;
  const done = catalog.filter((e) => completedIds.has(e.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <PageShell title="Class Progress" subtitle="Your lab journey so far" icon="chart" accent={C.em} onBack={onBack}>
      {/* summary */}
      <div className="reveal r1" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { n: done, l: "Labs Completed", c: C.emBright, ic: "flask" },
          { n: total - done, l: "Labs Remaining", c: C.gold, ic: "clock" },
          { n: student.xp, l: "Total XP", c: C.violet, ic: "bolt" },
          { n: `Lv ${student.level}`, l: "Current Level", c: C.coral, ic: "trophy" },
        ].map((s, i) => (
          <div key={i} className="lift-card" style={{ background: C.cream, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: s.c + "14", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Ic n={s.ic} s={17} c={s.c} sw={2.2} /></div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>{s.n}</div>
            <div style={{ fontSize: 12, color: C.ink50, marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div className="reveal r2" style={{ background: C.ink, color: "#fff", borderRadius: 14, padding: "20px 24px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Overall completion</span>
          <span className="mono" style={{ color: C.emBright, fontWeight: 700 }}>{done}/{total} · {pct}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", borderRadius: 99, background: `linear-gradient(90deg,${C.emBright},${C.lime})`, transition: "width .6s" }} />
        </div>
      </div>

      <h4 style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 14 }}>All labs</h4>
      <div className="reveal r3" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {catalog.map((e) => {
          const isDone = completedIds.has(e.id);
          const rec = completions.find((c) => c.id === e.id);
          const locked = e.status !== "ready";
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 14, background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ width: 40, height: 40, borderRadius: 9, background: e.c + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic n={e.icon} s={19} c={e.c} sw={2} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{e.name}</div>
                <div style={{ fontSize: 11.5, color: C.ink50 }}>{e.cls} · {e.subject}{rec ? ` · scored ${rec.correct}/${rec.total}` : ""}</div>
              </div>
              {isDone ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: C.emDeep, background: C.emPale, padding: "5px 11px", borderRadius: 100 }}><Ic n="check" s={13} c={C.emDeep} sw={2.5} /> Completed</span>
              ) : locked ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: C.ink30, background: C.paperWarm, padding: "5px 11px", borderRadius: 100 }}>Coming soon</span>
              ) : (
                <Btn v="outline" sm icon="arrow" onClick={() => onOpen && onOpen(e.id)}>Start</Btn>
              )}
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}

/* ─────────── Achievements (reports & certificates) ─────────── */
export function AchievementsPage({ student, onBack, onViewCertificate }) {
  const completions = (student.completions || []).slice().reverse();
  const badges = student.badges || 0;
  return (
    <PageShell title="Achievements" subtitle="Your reports, certificates & badges" icon="trophy" accent={C.gold} onBack={onBack}>
      <div className="reveal r1" style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, background: `linear-gradient(135deg, ${C.gold}, ${C.goldBright})`, color: "#fff", borderRadius: 14, padding: "20px 24px" }}>
          <Ic n="medal" s={24} c="#fff" sw={2} />
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>{badges}</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>Badges unlocked</div>
        </div>
        <div style={{ flex: 1, minWidth: 200, background: C.ink, color: "#fff", borderRadius: 14, padding: "20px 24px" }}>
          <Ic n="note" s={24} c={C.emBright} sw={2} />
          <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8 }}>{completions.length}</div>
          <div style={{ fontSize: 13, color: C.ink30 }}>Certificates earned</div>
        </div>
      </div>

      <h4 style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 14 }}>Lab certificates</h4>
      {completions.length === 0 ? (
        <div className="reveal r2" style={{ textAlign: "center", padding: "50px 20px", background: C.cream, borderRadius: 14, border: `1px dashed ${C.line}` }}>
          <Ic n="trophy" s={36} c={C.ink15} sw={1.6} />
          <p style={{ fontSize: 14, color: C.ink50, marginTop: 12, fontWeight: 600 }}>No certificates yet.</p>
          <p style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>Complete a lab to earn your first certificate!</p>
        </div>
      ) : (
        <div className="reveal r2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {completions.map((c, i) => {
            const perfect = c.correct === c.total;
            return (
              <div key={i} className="lift-card" style={{ background: C.cream, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}` }}>
                <div style={{ background: C.inkDeep, color: "#fff", padding: "16px 18px", position: "relative" }}>
                  <span className="mono" style={{ fontSize: 9, color: C.emBright, fontWeight: 700, letterSpacing: "0.1em" }}>OFFICIAL CERTIFICATE</span>
                  <h5 style={{ fontSize: 14.5, fontWeight: 700, marginTop: 4, lineHeight: 1.3 }}>{c.name}</h5>
                  {perfect && <span style={{ position: "absolute", top: 14, right: 14 }}><Ic n="star" s={18} c={C.goldBright} sw={1.6} /></span>}
                </div>
                <div style={{ padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.ink50, marginBottom: 12 }}>
                    <span>{c.date || ""}</span>
                    <span style={{ fontWeight: 700, color: C.emDeep }}>{c.correct}/{c.total} correct</span>
                  </div>
                  <Btn v="dark" sm full icon="note" onClick={() => onViewCertificate && onViewCertificate(c)}>View Certificate</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
