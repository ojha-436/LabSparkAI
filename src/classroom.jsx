/* ── Classroom UI: My Practical File · Join a Class · Teacher dashboard ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic, Btn } from "./ui.jsx";
import { PageShell } from "./profile.jsx";
import firebase from "./firebaseInit.js";
import { createClass, listMyClasses, joinClass, watchRoster, watchSubmissions, watchPosts, addPost } from "./classroom.js";
import { ensureFamilyCode } from "./family.js";
import { downloadPracticalFile, downloadLabRecord } from "./practicalfile.js";

const { useState: cUS, useEffect: cUE } = React;
const meNow = () => { const u = firebase.auth().currentUser; return u ? u.uid : null; };

/* ── Class stream: announcements (teacher) + posts (students), live ── */
function ClassStream({ code, name, role }) {
  const [posts, setPosts] = cUS([]);
  const [text, setText] = cUS("");
  const isTeacher = role === "teacher";
  const [type, setType] = cUS(isTeacher ? "announcement" : "post");
  cUE(() => watchPosts(code, setPosts), [code]);

  const send = async () => {
    if (!text.trim()) return;
    try { await addPost(code, { authorUid: meNow(), authorName: name, authorRole: role, type, text }); setText(""); }
    catch { /* ignore */ }
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div className="card-glass" style={{ background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        {isTeacher && (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[["announcement", "📢 Announcement"], ["post", "💬 Message"]].map(([k, l]) => (
              <button key={k} onClick={() => setType(k)} className="press" style={{ border: "none", cursor: "pointer", fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 99, background: type === k ? C.violet : C.paperWarm, color: type === k ? "#fff" : C.ink50 }}>{l}</button>
            ))}
          </div>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={isTeacher ? "Share an announcement or note with your class…" : "Ask a question or share something with your class…"}
          rows={2} style={{ width: "100%", resize: "vertical", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13.5, fontFamily: "inherit", color: C.ink, outline: "none", background: "#fff" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Btn v="primary" sm icon="send" onClick={send} disabled={!text.trim()}>Post</Btn>
        </div>
      </div>
      {posts.length === 0 ? (
        <p style={{ fontSize: 13, color: C.ink50, textAlign: "center", padding: "20px 0" }}>No posts yet — start the conversation!</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {posts.slice().reverse().map((p) => {
            const ann = p.type === "announcement";
            return (
              <div key={p.id} style={{ background: ann ? C.violetPale : C.cream, border: `1px solid ${ann ? C.violet + "33" : C.line}`, borderRadius: 12, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{p.authorName}</span>
                  <span className="mono" style={{ fontSize: 9, fontWeight: 700, color: ann ? C.violet : C.ink30, background: ann ? "#fff" : C.paperWarm, padding: "2px 7px", borderRadius: 99, textTransform: "uppercase" }}>{ann ? "Announcement" : p.authorRole === "teacher" ? "Teacher" : "Student"}</span>
                  <span style={{ fontSize: 11, color: C.ink30, marginLeft: "auto" }}>{p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
                <p style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{p.text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, color: C.ink, background: C.cream, outline: "none", fontFamily: "inherit" };

/* ─────────── My Practical File (student-owned CBSE record) ─────────── */
export function PracticalFilePage({ student, onBack }) {
  const completions = student.completions || [];
  return (
    <PageShell title="My Practical File" subtitle="Your CBSE-format science practical record" icon="note" accent={C.emDeep} onBack={onBack}>
      <div style={{ background: C.ink, color: "#fff", borderRadius: 14, padding: "22px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>Download your complete practical file</div>
          <div style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>{completions.length} experiment{completions.length !== 1 ? "s" : ""} recorded · ready to print and submit for internal assessment.</div>
        </div>
        <Btn v="primary" lg icon="note" onClick={() => downloadPracticalFile(student, completions)} disabled={!completions.length}>Download Full PDF</Btn>
      </div>

      {completions.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", background: C.cream, borderRadius: 14, border: `1px dashed ${C.line}` }}>
          <Ic n="note" s={34} c={C.ink15} sw={1.6} />
          <p style={{ fontSize: 14, color: C.ink50, marginTop: 12, fontWeight: 600 }}>No experiments recorded yet.</p>
          <p style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>Complete a lab and it will appear here, ready for your practical file.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {completions.slice().reverse().map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: C.emPale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Ic n="flask" s={18} c={C.emDeep} sw={2} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: C.ink50 }}>{c.date || ""}{typeof c.correct === "number" ? ` · scored ${c.correct}/${c.total}` : ""}</div>
              </div>
              <Btn v="light" sm icon="note" onClick={() => downloadLabRecord(student, c)}>PDF</Btn>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

/* ─────────── Join a Class (student) ─────────── */
export function JoinClassPage({ student, onBack, onJoined }) {
  const [code, setCode] = cUS("");
  const [busy, setBusy] = cUS(false);
  const [err, setErr] = cUS("");
  const [ok, setOk] = cUS("");
  const joined = student.classes || [];
  const [open, setOpen] = cUS(null);
  if (open) return <StudentClassView membership={open} student={student} onBack={() => setOpen(null)} />;

  const submit = async () => {
    setErr(""); setOk("");
    if (code.trim().length < 4) { setErr("Enter the class code your teacher gave you."); return; }
    setBusy(true);
    try {
      const membership = await joinClass(code, student);
      onJoined && onJoined(membership);
      setOk(`Joined ${membership.className}! Your completed labs will now be shared with your teacher.`);
      setCode("");
    } catch (e) { setErr(e.message || "Could not join. Check the code."); }
    setBusy(false);
  };

  return (
    <PageShell title="Join a Class" subtitle="Enter the code your teacher shared" icon="grid" accent={C.violet} onBack={onBack}>
      <div className="card-glass" style={{ background: C.cream, borderRadius: 16, padding: 28, maxWidth: 520, margin: "0 auto" }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.ink70, display: "block", marginBottom: 6 }}>Class Code</label>
        <input style={{ ...inputStyle, textTransform: "uppercase", letterSpacing: "0.25em", fontWeight: 800, fontSize: 20, textAlign: "center" }}
          value={code} maxLength={6} placeholder="ABC123"
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(""); setOk(""); }} />
        {err && <div style={{ background: C.coralPale, color: C.coral, padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{err}</div>}
        {ok && <div style={{ background: C.emPale, color: C.emDeep, padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{ok}</div>}
        <div style={{ marginTop: 18 }}><Btn v="primary" lg full icon="check" onClick={submit} disabled={busy}>{busy ? "Joining…" : "Join Class"}</Btn></div>
      </div>

      {joined.length > 0 && (
        <div style={{ maxWidth: 520, margin: "26px auto 0" }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 12 }}>Classes you've joined</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {joined.map((m) => (
              <div key={m.code} style={{ display: "flex", alignItems: "center", gap: 12, background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 16px" }}>
                <Ic n="grid" s={18} c={C.violet} sw={2} />
                <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{m.className}</div><div style={{ fontSize: 11.5, color: C.ink50 }}>{m.school || ""}</div></div>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: C.violet, background: C.violetPale, padding: "4px 10px", borderRadius: 8 }}>{m.code}</span>
                <Btn v="light" sm icon="arrow" onClick={() => setOpen(m)}>Open</Btn>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}

/* ─────────── Teacher dashboard ─────────── */
export function TeacherPage({ student, onBack }) {
  const uid = firebase.auth().currentUser && firebase.auth().currentUser.uid;
  const [classes, setClasses] = cUS([]);
  const [loading, setLoading] = cUS(true);
  const [creating, setCreating] = cUS(false);
  const [form, setForm] = cUS({ className: "", school: student.school || "", grade: "", subject: "" });
  const [err, setErr] = cUS("");
  const [active, setActive] = cUS(null); // a class object being viewed

  const refresh = async () => {
    if (!uid) { setLoading(false); return; }
    try { setClasses(await listMyClasses(uid)); } catch { /* ignore */ }
    setLoading(false);
  };
  cUE(() => { refresh(); }, []);

  const create = async () => {
    setErr("");
    if (!form.className.trim()) { setErr("Give your class a name."); return; }
    setCreating(true);
    try {
      await createClass({ teacherUid: uid, teacherName: student.name, ...form });
      setForm({ className: "", school: student.school || "", grade: "", subject: "" });
      await refresh();
    } catch (e) { setErr(e.message || "Could not create class."); }
    setCreating(false);
  };

  if (active) return <ClassDetail cls={active} onBack={() => setActive(null)} />;

  return (
    <PageShell title="My Classes" subtitle="Create a class, share the code, track your students" icon="grid" accent={C.coral} backLabel="Sign Out" onBack={onBack}>
      {/* create */}
      <div className="card-glass" style={{ background: C.cream, borderRadius: 16, padding: 22, marginBottom: 26 }}>
        <h4 style={{ fontSize: 14.5, fontWeight: 800, color: C.ink, marginBottom: 14 }}>Create a new class</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 0.8fr 0.8fr", gap: 12 }}>
          <input style={inputStyle} placeholder="Class name (e.g. 10-A Science)" value={form.className} onChange={(e) => setForm((f) => ({ ...f, className: e.target.value }))} />
          <input style={inputStyle} placeholder="School" value={form.school} onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))} />
          <input style={inputStyle} placeholder="Grade" value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} />
          <input style={inputStyle} placeholder="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
        </div>
        {err && <div style={{ background: C.coralPale, color: C.coral, padding: "10px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, marginTop: 12 }}>{err}</div>}
        <div style={{ marginTop: 14 }}><Btn v="primary" icon="check" onClick={create} disabled={creating}>{creating ? "Creating…" : "Create Class"}</Btn></div>
      </div>

      {loading ? (
        <p style={{ color: C.ink50, fontSize: 13 }}>Loading your classes…</p>
      ) : classes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "44px 20px", background: C.cream, borderRadius: 14, border: `1px dashed ${C.line}` }}>
          <Ic n="grid" s={32} c={C.ink15} sw={1.6} />
          <p style={{ fontSize: 14, color: C.ink50, marginTop: 12, fontWeight: 600 }}>No classes yet.</p>
          <p style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>Create one above, then share its code with your students.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {classes.map((c) => (
            <div key={c.code} className="lift-card" style={{ background: C.cream, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}` }}>
              <div style={{ background: C.inkDeep, color: "#fff", padding: "16px 18px" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{c.className}</div>
                <div style={{ fontSize: 11.5, color: C.ink30, marginTop: 2 }}>{[c.school, c.grade, c.subject].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div style={{ padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.ink50, marginBottom: 4 }}>Class code (share with students)</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: C.coral, letterSpacing: "0.18em", marginBottom: 12 }}>{c.code}</div>
                <Btn v="dark" sm full icon="chart" onClick={() => setActive(c)}>Open Class</Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

/* Teacher's view of one class: roster × submissions + per-student practical-file download. */
function ClassDetail({ cls, onBack }) {
  const [roster, setRoster] = cUS([]);
  const [subs, setSubs] = cUS([]);
  const [loading, setLoading] = cUS(true);
  const [tab, setTab] = cUS("students");

  // Live listeners → a student joining / submitting / posting shows up instantly.
  cUE(() => {
    const unsubR = watchRoster(cls.code, (r) => { setRoster(r); setLoading(false); });
    const unsubS = watchSubmissions(cls.code, setSubs);
    return () => { unsubR(); unsubS(); };
  }, [cls.code]);

  // group submissions by student
  const byStudent = {};
  roster.forEach((m) => { byStudent[m.studentUid] = { name: m.name, rollNo: m.rollNo, subs: [] }; });
  subs.forEach((s) => {
    if (!byStudent[s.studentUid]) byStudent[s.studentUid] = { name: s.name, rollNo: s.rollNo, subs: [] };
    byStudent[s.studentUid].subs.push(s);
  });
  const students = Object.entries(byStudent).map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || "", undefined, { numeric: true }) || a.name.localeCompare(b.name));

  const downloadFor = (st) => {
    const synthetic = { name: st.name, school: cls.school, klass: cls.grade, section: "", rollNo: st.rollNo };
    const completions = st.subs.map((s) => ({ ...s, id: s.labId, experimentId: s.labId, name: s.title }));
    downloadPracticalFile(synthetic, completions);
  };
  const downloadAll = () => students.filter((s) => s.subs.length).forEach((s, i) => setTimeout(() => downloadFor(s), i * 400));

  const totalLabs = new Set(subs.map((s) => s.labId)).size;

  return (
    <PageShell title={cls.className} subtitle={`Class code ${cls.code} · ${roster.length} student${roster.length !== 1 ? "s" : ""} joined`} icon="chart" accent={C.coral} backLabel="My Classes" onBack={onBack}>
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[{ n: roster.length, l: "Students joined", c: C.violet, ic: "shield" }, { n: subs.length, l: "Labs submitted", c: C.emBright, ic: "flask" }, { n: totalLabs, l: "Distinct experiments", c: C.gold, ic: "note" }].map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 150, background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px" }}>
            <Ic n={s.ic} s={18} c={s.c} sw={2} />
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 8 }}>{s.n}</div>
            <div style={{ fontSize: 12, color: C.ink50 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["students", "Students & Records"], ["stream", "Class Stream"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="press" style={{ border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 99, background: tab === k ? C.ink : C.paperWarm, color: tab === k ? "#fff" : C.ink50 }}>{l}</button>
        ))}
      </div>

      {tab === "stream" && <ClassStream code={cls.code} name={cls.teacherName || "Teacher"} role="teacher" />}

      {tab === "students" && (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Students & practical records</h4>
        <Btn v="dark" sm icon="note" onClick={downloadAll} disabled={!subs.length}>Download all practical files</Btn>
      </div>

      {loading ? (
        <p style={{ color: C.ink50, fontSize: 13 }}>Loading class data…</p>
      ) : students.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", background: C.cream, borderRadius: 14, border: `1px dashed ${C.line}` }}>
          <p style={{ fontSize: 14, color: C.ink50, fontWeight: 600 }}>No students have joined yet.</p>
          <p style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>Share the code <b className="mono" style={{ color: C.coral }}>{cls.code}</b> — students enter it under “Join a Class”.</p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", background: C.cream }}>
          <div style={{ display: "grid", gridTemplateColumns: "0.5fr 1.6fr 0.9fr 1fr 0.9fr", background: C.paperWarm, padding: "10px 16px", gap: 8 }}>
            {["ROLL", "STUDENT", "LABS DONE", "AVG SCORE", ""].map((h) => <span key={h} className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.ink50 }}>{h}</span>)}
          </div>
          {students.map((st, i) => {
            const done = st.subs.length;
            const scored = st.subs.filter((s) => typeof s.correct === "number" && s.total);
            const avg = scored.length ? Math.round((scored.reduce((a, s) => a + s.correct / s.total, 0) / scored.length) * 100) : null;
            return (
              <div key={st.uid} style={{ display: "grid", gridTemplateColumns: "0.5fr 1.6fr 0.9fr 1fr 0.9fr", padding: "11px 16px", gap: 8, alignItems: "center", borderTop: i ? `1px solid ${C.lineSoft}` : "none" }}>
                <span style={{ fontSize: 12.5, color: C.ink50, fontWeight: 600 }}>{st.rollNo || "—"}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{st.name}</span>
                <span style={{ fontSize: 13, color: C.ink70 }}>{done}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: avg == null ? C.ink30 : avg >= 60 ? C.emDeep : C.coral }}>{avg == null ? "—" : avg + "%"}</span>
                <Btn v="light" sm icon="note" onClick={() => downloadFor(st)} disabled={!done}>PDF</Btn>
              </div>
            );
          })}
        </div>
      )}
      </>)}
    </PageShell>
  );
}

/* Student's view of a joined class — the announcement + post stream. */
function StudentClassView({ membership, student, onBack }) {
  return (
    <PageShell title={membership.className} subtitle={`Class code ${membership.code}`} icon="grid" accent={C.violet} onBack={onBack}>
      <ClassStream code={membership.code} name={student.name} role="student" />
    </PageShell>
  );
}

/* ─────────── Invite Parent (student shares their family code) ─────────── */
export function InviteParentPage({ student, onBack }) {
  const [code, setCode] = cUS(student.familyCode || "");
  const [copied, setCopied] = cUS(false);
  cUE(() => {
    if (!code) ensureFamilyCode(student).then((c) => c && setCode(c)).catch(() => {});
  }, []);
  const copy = () => { try { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  return (
    <PageShell title="Invite Your Parent" subtitle="Let a parent follow your progress" icon="shield" accent={C.gold} onBack={onBack}>
      <div className="card-glass" style={{ background: C.cream, borderRadius: 16, padding: 28, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.6 }}>Share this <b>Family Code</b> with your parent or guardian. They create a free Parent account, enter this code, and can then see your XP, levels, completed labs and scores — but never your lab list or your password.</p>
        <div className="mono" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "0.22em", color: C.gold, background: C.paperWarm, borderRadius: 12, padding: "18px 0", margin: "20px 0" }}>{code || "······"}</div>
        <Btn v="primary" lg icon="check" onClick={copy} disabled={!code}>{copied ? "Copied!" : "Copy Code"}</Btn>
      </div>
    </PageShell>
  );
}
