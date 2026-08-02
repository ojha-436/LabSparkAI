/* ── Classroom UI: My Practical File · Join a Class · Teacher dashboard ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic, Btn } from "./ui.jsx";
import { PageShell } from "./profile.jsx";
import firebase from "./firebaseInit.js";
import { createClass, listMyClasses, joinClass, watchRoster, watchSubmissions, watchPosts, addPost,
  watchAssignments, assignLab, removeAssignment, startLive, stopLive, watchLive, watchPresence,
  setTeacherMark, computeAiMark, MARK_MAX, addRosterEntries, watchExpected } from "./classroom.js";
import { ensureFamilyCode } from "./family.js";
import { downloadPracticalFile, downloadLabRecord } from "./practicalfile.js";
import { downloadGradebookCSV } from "./gradebook.js";
import { downloadWorksheet } from "./worksheet.js";
import { generateInsights, generateWorksheet } from "./api.js";
import { GEN_LABS } from "./genlabdata.js";

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
export function JoinClassPage({ student, onBack, onJoined, initialCode }) {
  const [code, setCode] = cUS((initialCode || "").toUpperCase());
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

/* Teacher's view of one class: roster × submissions, assignments, live run, marks. */
function ClassDetail({ cls, onBack }) {
  const [roster, setRoster] = cUS([]);
  const [subs, setSubs] = cUS([]);
  const [assignments, setAssignments] = cUS([]);
  const [presence, setPresence] = cUS([]);
  const [live, setLive] = cUS(null);
  const [expected, setExpected] = cUS([]);
  const [loading, setLoading] = cUS(true);
  const [tab, setTab] = cUS("students");
  const [openStu, setOpenStu] = cUS(null);

  // Live listeners → a student joining / submitting / posting shows up instantly.
  cUE(() => {
    const unsubR = watchRoster(cls.code, (r) => { setRoster(r); setLoading(false); });
    const unsubS = watchSubmissions(cls.code, setSubs);
    const unsubA = watchAssignments(cls.code, setAssignments);
    const unsubP = watchPresence(cls.code, setPresence);
    const unsubL = watchLive(cls.code, setLive);
    const unsubE = watchExpected(cls.code, setExpected);
    return () => { unsubR(); unsubS(); unsubA(); unsubP(); unsubL(); unsubE(); };
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

  const approveAll = () => subs.forEach((s, i) => setTimeout(() => {
    const mark = typeof s.teacherMark === "number" ? s.teacherMark : (typeof s.aiMark === "number" ? s.aiMark : computeAiMark(s));
    setTeacherMark(cls.code, s.studentUid, s.labId, { teacherMark: mark, marksApproved: true }).catch(() => {});
  }, i * 120));

  const totalLabs = new Set(subs.map((s) => s.labId)).size;
  const assignedIds = new Set(assignments.map((a) => a.labId));

  return (
    <PageShell title={cls.className} subtitle={`Class code ${cls.code} · ${roster.length} student${roster.length !== 1 ? "s" : ""} joined`} icon="chart" accent={C.coral} backLabel="My Classes" onBack={onBack}>
      {live && live.active && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: C.emDeep, color: "#fff", borderRadius: 12, padding: "12px 18px", marginBottom: 16 }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.lime, animation: "pulse 1.6s infinite" }} />
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>LIVE now · {live.title}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{live.mode === "projector" ? "Projector mode" : "Individual devices"}</span>
          <button onClick={() => stopLive(cls.code)} className="press" style={{ marginLeft: "auto", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 12.5, fontWeight: 700, padding: "6px 14px", borderRadius: 8 }}>Stop Live</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        {[{ n: roster.length, l: "Students joined", c: C.violet, ic: "shield" }, { n: subs.length, l: "Labs submitted", c: C.emBright, ic: "flask" }, { n: assignments.length, l: "Labs assigned", c: C.sky, ic: "grid" }, { n: totalLabs, l: "Distinct experiments", c: C.gold, ic: "note" }].map((s, i) => (
          <div key={i} style={{ flex: 1, minWidth: 140, background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px" }}>
            <Ic n={s.ic} s={18} c={s.c} sw={2} />
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink, marginTop: 8 }}>{s.n}</div>
            <div style={{ fontSize: 12, color: C.ink50 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[["students", "Students & Marks"], ["insights", "Insights"], ["assign", "Assign & Worksheets"], ["live", "Live Class"], ["stream", "Class Stream"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="press" style={{ border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 99, background: tab === k ? C.ink : C.paperWarm, color: tab === k ? "#fff" : C.ink50 }}>{l}</button>
        ))}
      </div>

      {tab === "stream" && <ClassStream code={cls.code} name={cls.teacherName || "Teacher"} role="teacher" />}

      {tab === "assign" && <AssignTab cls={cls} assignedIds={assignedIds} subs={subs} />}

      {tab === "insights" && <InsightsTab cls={cls} subs={subs} roster={roster} />}

      {tab === "live" && <LiveTab cls={cls} live={live} assignments={assignments} roster={roster} presence={presence} subs={subs} />}

      {tab === "students" && (<>
      <Onboard cls={cls} expected={expected} roster={roster} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <h4 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Students, marks & records</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn v="light" sm icon="check" onClick={approveAll} disabled={!subs.length}>Approve all AI marks</Btn>
          <Btn v="light" sm icon="chart" onClick={() => downloadGradebookCSV(cls, students)} disabled={!subs.length}>Gradebook CSV</Btn>
          <Btn v="dark" sm icon="note" onClick={downloadAll} disabled={!subs.length}>All practical files</Btn>
        </div>
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
          <div style={{ display: "grid", gridTemplateColumns: "0.5fr 1.5fr 0.8fr 0.9fr 0.9fr 0.7fr", background: C.paperWarm, padding: "10px 16px", gap: 8 }}>
            {["ROLL", "STUDENT", "LABS", "AVG SCORE", "AVG MARK", ""].map((h) => <span key={h} className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.ink50 }}>{h}</span>)}
          </div>
          {students.map((st, i) => {
            const done = st.subs.length;
            const scored = st.subs.filter((s) => typeof s.correct === "number" && s.total);
            const avg = scored.length ? Math.round((scored.reduce((a, s) => a + s.correct / s.total, 0) / scored.length) * 100) : null;
            const marks = st.subs.map((s) => typeof s.teacherMark === "number" ? s.teacherMark : (typeof s.aiMark === "number" ? s.aiMark : computeAiMark(s)));
            const avgMark = marks.length ? (marks.reduce((a, m) => a + m, 0) / marks.length).toFixed(1) : null;
            const isOpen = openStu === st.uid;
            return (
              <div key={st.uid} style={{ borderTop: i ? `1px solid ${C.lineSoft}` : "none" }}>
                <div onClick={() => done && setOpenStu(isOpen ? null : st.uid)} style={{ display: "grid", gridTemplateColumns: "0.5fr 1.5fr 0.8fr 0.9fr 0.9fr 0.7fr", padding: "11px 16px", gap: 8, alignItems: "center", cursor: done ? "pointer" : "default", background: isOpen ? C.paperWarm : "transparent" }}>
                  <span style={{ fontSize: 12.5, color: C.ink50, fontWeight: 600 }}>{st.rollNo || "—"}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{st.name}</span>
                  <span style={{ fontSize: 13, color: C.ink70 }}>{done}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: avg == null ? C.ink30 : avg >= 60 ? C.emDeep : C.coral }}>{avg == null ? "—" : avg + "%"}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: avgMark == null ? C.ink30 : C.ink }}>{avgMark == null ? "—" : `${avgMark}/${MARK_MAX}`}</span>
                  <Btn v="light" sm icon="note" onClick={(e) => { e.stopPropagation(); downloadFor(st); }} disabled={!done}>PDF</Btn>
                </div>
                {isOpen && (
                  <div style={{ padding: "4px 16px 14px", background: C.paperWarm }}>
                    {st.subs.map((s) => <MarkRow key={s.labId} cls={cls} sub={s} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </>)}
    </PageShell>
  );
}

/* One submission's mark controls — teacher overrides the AI draft, then approves. */
function MarkRow({ cls, sub }) {
  const aiMark = typeof sub.aiMark === "number" ? sub.aiMark : computeAiMark(sub);
  const max = sub.aiMarkMax || MARK_MAX;
  const [val, setVal] = cUS(typeof sub.teacherMark === "number" ? sub.teacherMark : aiMark);
  const [saved, setSaved] = cUS(sub.marksApproved || false);
  const save = async (approve) => {
    const m = Math.max(0, Math.min(max, Number(val)));
    try { await setTeacherMark(cls.code, sub.studentUid, sub.labId, { teacherMark: m, marksApproved: approve }); setSaved(approve); } catch { /* ignore */ }
  };
  const acc = typeof sub.correct === "number" && sub.total ? Math.round((sub.correct / sub.total) * 100) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.cream, border: `1px solid ${C.line}`, borderRadius: 10, padding: "9px 12px", marginTop: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, flex: 1, minWidth: 140 }}>{sub.title || sub.labId}</span>
      {acc != null && <span style={{ fontSize: 11.5, color: C.ink50 }}>Score {sub.correct}/{sub.total}</span>}
      {typeof sub.predictionAccuracy === "number" && <span style={{ fontSize: 11.5, color: C.violet, fontWeight: 600 }}>Inquiry {Math.round(sub.predictionAccuracy * 100)}%</span>}
      <span className="mono" style={{ fontSize: 11, color: C.ink50, background: C.violetPale, padding: "2px 8px", borderRadius: 6 }}>AI draft {aiMark}/{max}</span>
      <input type="number" min={0} max={max} value={val} onChange={(e) => { setVal(e.target.value); setSaved(false); }}
        style={{ width: 56, padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${C.line}`, fontSize: 13, fontWeight: 700, textAlign: "center", color: C.ink, background: "#fff", outline: "none" }} />
      <span style={{ fontSize: 12, color: C.ink50 }}>/ {max}</span>
      <button onClick={() => save(true)} className="press" style={{ border: "none", cursor: "pointer", background: saved ? C.emPale : C.emDeep, color: saved ? C.emDeep : "#fff", fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: 8 }}>{saved ? "Approved ✓" : "Approve"}</button>
    </div>
  );
}

/* Assign tab — pick NCERT labs to assign to this class. */
function AssignTab({ cls, assignedIds, subs }) {
  const labs = Object.values(GEN_LABS);
  const completedCount = (labId) => subs.filter((s) => s.labId === labId).length;
  const toggle = (lab) => {
    if (assignedIds.has(lab.id)) removeAssignment(cls.code, lab.id).catch(() => {});
    else assignLab(cls.code, { labId: lab.id, title: lab.title, cls: lab.cls, subject: lab.subject }).catch(() => {});
  };
  return (
    <div>
      <p style={{ fontSize: 13, color: C.ink50, marginBottom: 16 }}>Assign labs to <b>{cls.className}</b> (they appear on students' dashboards and can be run live), or generate a ready-to-print worksheet + answer key for any lab.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
        {labs.map((lab) => (
          <LabAssignCard key={lab.id} lab={lab} cls={cls} on={assignedIds.has(lab.id)} submitted={completedCount(lab.id)} onToggle={() => toggle(lab)} />
        ))}
      </div>
    </div>
  );
}

/* One lab card in the Assign tab — assign toggle + AI worksheet generator. */
function LabAssignCard({ lab, cls, on, submitted, onToggle }) {
  const [busy, setBusy] = cUS(false);
  const makeWorksheet = async () => {
    setBusy(true);
    let extra = null;
    try {
      extra = await generateWorksheet({
        title: lab.title, cls: lab.cls, subject: lab.subject, chapter: lab.chapter,
        aim: lab.aim, theory: lab.theory,
        items: (lab.items || []).map((i) => i.name), categories: (lab.categories || []).map((c) => c.label),
      });
    } catch { /* fall back to a spec-only worksheet */ }
    try { downloadWorksheet(lab, extra); } catch { /* ignore */ }
    setBusy(false);
  };
  return (
    <div style={{ background: C.cream, border: `1.5px solid ${on ? C.emBright : C.line}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: (lab.accent || C.em) + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n={lab.icon || "flask"} s={15} c={lab.accent || C.em} sw={2} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>{lab.title}</div>
          <div className="mono" style={{ fontSize: 9.5, color: C.ink30 }}>{lab.cls} · {lab.subject}</div>
        </div>
      </div>
      <span style={{ fontSize: 11, color: C.ink50 }}>{submitted} submitted</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
        <button onClick={onToggle} className="press" style={{ flex: 1, border: "none", cursor: "pointer", background: on ? C.emPale : C.ink, color: on ? C.emDeep : "#fff", fontSize: 12, fontWeight: 700, padding: "7px 0", borderRadius: 8 }}>{on ? "Assigned ✓" : "Assign"}</button>
        <button onClick={makeWorksheet} disabled={busy} className="press" style={{ border: `1px solid ${C.line}`, cursor: busy ? "default" : "pointer", background: C.paperWarm, color: C.ink70, fontSize: 12, fontWeight: 700, padding: "7px 12px", borderRadius: 8, opacity: busy ? 0.6 : 1 }}>{busy ? "Making…" : "Worksheet"}</button>
      </div>
    </div>
  );
}

/* Insights tab — turn class submissions into an at-risk list + top misconceptions
   (computed free, client-side) plus an optional AI reteaching plan. */
function InsightsTab({ cls, subs, roster }) {
  const [plan, setPlan] = cUS("");
  const [busy, setBusy] = cUS(false);

  // At-risk students: joined but low average, or joined with nothing done.
  const byStu = {};
  roster.forEach((m) => { byStu[m.studentUid] = { name: m.name, rollNo: m.rollNo, scored: [] }; });
  subs.forEach((s) => {
    if (!byStu[s.studentUid]) byStu[s.studentUid] = { name: s.name, rollNo: s.rollNo, scored: [] };
    if (typeof s.correct === "number" && s.total) byStu[s.studentUid].scored.push(s.correct / s.total);
  });
  const atRisk = Object.values(byStu).map((v) => ({
    name: v.name, rollNo: v.rollNo, done: v.scored.length,
    avg: v.scored.length ? Math.round((v.scored.reduce((a, x) => a + x, 0) / v.scored.length) * 100) : null,
  })).filter((v) => v.done === 0 || (v.avg != null && v.avg < 60))
    .sort((a, b) => (a.avg ?? -1) - (b.avg ?? -1));

  // Misconceptions: per (lab, item), how many students classified it wrong.
  const miss = {};
  subs.forEach((s) => (s.observations || []).forEach((o) => {
    if (!o.name || !o.studentVerdict) return;
    const k = `${s.labId}||${o.name}`;
    const m = miss[k] || (miss[k] = { labId: s.labId, lab: s.title || s.labId, item: o.name, wrong: 0, total: 0, correct: o.correct });
    m.total++; if (o.studentVerdict !== o.correct) m.wrong++;
  }));
  const labelOf = (labId, key) => { const sp = GEN_LABS[labId]; const c = sp && (sp.categories || []).find((c) => c.key === key); return c ? c.label : key; };
  const topMiss = Object.values(miss).filter((m) => m.total >= 2 && m.wrong > 0)
    .sort((a, b) => (b.wrong / b.total) - (a.wrong / a.total)).slice(0, 8);

  const askPlan = async () => {
    setBusy(true);
    try {
      const answer = await generateInsights({
        className: cls.className, studentCount: roster.length, atRiskCount: atRisk.length,
        misconceptions: topMiss.map((m) => ({ item: m.item, lab: m.lab, wrong: m.wrong, total: m.total, correct: labelOf(m.labId, m.correct) })),
      });
      setPlan(answer || "");
    } catch { setPlan("Could not reach Spark right now. Use the misconception table below to plan your reteaching."); }
    setBusy(false);
  };

  if (!subs.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", background: C.cream, borderRadius: 14, border: `1px dashed ${C.line}` }}>
        <Ic n="chart" s={30} c={C.ink15} sw={1.6} />
        <p style={{ fontSize: 14, color: C.ink50, marginTop: 10, fontWeight: 600 }}>No lab data yet.</p>
        <p style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>Once students submit labs, this tab shows who's struggling and which concepts to reteach.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* AI reteaching plan */}
      <div className="card-glass" style={{ background: C.violetPale, border: `1px solid ${C.violet}22`, borderRadius: 14, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <Ic n="spark" s={16} c={C.violet} sw={2} />
          <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Spark's reteaching plan</span>
          <Btn v="primary" sm icon="spark" onClick={askPlan} disabled={busy || !topMiss.length} style={{ marginLeft: "auto" }}>{busy ? "Thinking…" : plan ? "Regenerate" : "Generate plan"}</Btn>
        </div>
        {plan
          ? <p style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{plan}</p>
          : <p style={{ fontSize: 12.5, color: C.ink50 }}>Generate a short, class-specific plan built from the misconceptions below.</p>}
      </div>

      {/* At-risk students */}
      <div>
        <h4 style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Students who may need help <span style={{ color: C.coral }}>({atRisk.length})</span></h4>
        {atRisk.length === 0 ? (
          <p style={{ fontSize: 13, color: C.emDeep, background: C.emPale, padding: "10px 14px", borderRadius: 8 }}>Everyone's above 60% — nice work.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
            {atRisk.map((s, i) => (
              <div key={i} style={{ background: C.cream, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.coral}`, borderRadius: 10, padding: "11px 14px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: C.ink50 }}>Roll {s.rollNo || "—"} · {s.done === 0 ? "no labs yet" : `${s.avg}% avg over ${s.done} lab${s.done !== 1 ? "s" : ""}`}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top misconceptions */}
      <div>
        <h4 style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Most common misconceptions</h4>
        {topMiss.length === 0 ? (
          <p style={{ fontSize: 13, color: C.ink50 }}>Not enough wrong answers to flag a pattern yet.</p>
        ) : (
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", background: C.cream }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.3fr 1fr 0.8fr", background: C.paperWarm, padding: "10px 16px", gap: 8 }}>
              {["ITEM", "LAB", "CORRECT ANSWER", "GOT WRONG"].map((h) => <span key={h} className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.ink50 }}>{h}</span>)}
            </div>
            {topMiss.map((m, i) => {
              const pct = Math.round((m.wrong / m.total) * 100);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1.3fr 1fr 0.8fr", padding: "11px 16px", gap: 8, alignItems: "center", borderTop: i ? `1px solid ${C.lineSoft}` : "none" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{m.item}</span>
                  <span style={{ fontSize: 12, color: C.ink50 }}>{m.lab}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: C.emDeep }}>{labelOf(m.labId, m.correct)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: pct >= 50 ? C.coral : "#8a6d1f" }}>{m.wrong}/{m.total} · {pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* Onboarding panel — a one-tap join link + bulk pre-roster (paste roll,name). */
function Onboard({ cls, expected, roster }) {
  const [open, setOpen] = cUS(false);
  const [text, setText] = cUS("");
  const [copied, setCopied] = cUS(false);
  const [busy, setBusy] = cUS(false);
  const joinUrl = `${(typeof window !== "undefined" && window.location.origin) || ""}/?join=${cls.code}`;
  const joinedNames = new Set(roster.map((m) => (m.name || "").trim().toLowerCase()));
  const pending = expected.filter((e) => !joinedNames.has((e.name || "").trim().toLowerCase()));

  const copyLink = () => { try { navigator.clipboard.writeText(joinUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ } };
  const addRoster = async () => {
    const entries = text.split("\n").map((line) => {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (!parts.filter(Boolean).length) return null;
      // Accept "roll, name" or just "name".
      return parts.length >= 2 ? { rollNo: parts[0], name: parts.slice(1).join(" ") } : { rollNo: "", name: parts[0] };
    }).filter(Boolean);
    if (!entries.length) return;
    setBusy(true);
    try { await addRosterEntries(cls.code, entries); setText(""); } catch { /* ignore */ }
    setBusy(false);
  };

  return (
    <div style={{ background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Ic n="shield" s={16} c={C.violet} sw={2} />
        <span style={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>Add students fast</span>
        <span style={{ fontSize: 11.5, color: C.ink50 }}>{roster.length} joined{expected.length ? ` · ${pending.length} pending` : ""}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Btn v="light" sm icon={copied ? "check" : "send"} onClick={copyLink}>{copied ? "Link copied" : "Copy join link"}</Btn>
          <Btn v="light" sm icon="grid" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "Bulk add"}</Btn>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12.5, color: C.ink50, marginBottom: 8 }}>Paste one student per line as <b>roll, name</b> (or just a name). Students still join with the code/link — this pre-fills their roll number and tracks who's pending.</p>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={"1, Aarav Sharma\n2, Diya Patel\n3, Kabir Singh"}
            style={{ width: "100%", resize: "vertical", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: C.ink, outline: "none", background: "#fff" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: C.violet, background: C.violetPale, padding: "4px 10px", borderRadius: 8 }}>Join code: {cls.code}</span>
            <Btn v="primary" sm icon="check" onClick={addRoster} disabled={busy || !text.trim()}>{busy ? "Adding…" : "Add to roster"}</Btn>
          </div>
          {pending.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink70, marginBottom: 6 }}>Pending (added but not joined yet)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pending.map((e, i) => <span key={i} style={{ fontSize: 11.5, color: C.ink50, background: C.paperWarm, border: `1px solid ${C.line}`, borderRadius: 99, padding: "3px 10px" }}>{e.rollNo ? `${e.rollNo} · ` : ""}{e.name}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Live tab — start a lab for the whole class + a real-time student board. */
function LiveTab({ cls, live, assignments, roster, presence, subs }) {
  const [mode, setMode] = cUS("individual");
  const running = live && live.active;
  const presById = {}; presence.forEach((p) => { presById[p.studentUid] = p; });
  const submittedFor = (uid) => running && subs.some((s) => s.studentUid === uid && s.labId === live.labId);

  if (!running) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: C.ink50 }}>Run mode:</span>
          {[["individual", "Individual devices"], ["projector", "Projector / one screen"]].map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)} className="press" style={{ border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: 99, background: mode === k ? C.violet : C.paperWarm, color: mode === k ? "#fff" : C.ink50 }}>{l}</button>
          ))}
        </div>
        {assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", background: C.cream, borderRadius: 14, border: `1px dashed ${C.line}` }}>
            <p style={{ fontSize: 14, color: C.ink50, fontWeight: 600 }}>Assign a lab first.</p>
            <p style={{ fontSize: 12.5, color: C.ink30, marginTop: 4 }}>Go to the “Assign Labs” tab, then start it live here.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
            {assignments.map((a) => (
              <div key={a.labId} style={{ background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{a.title}</div>
                <div className="mono" style={{ fontSize: 9.5, color: C.ink30, marginBottom: 12 }}>{a.cls} · {a.subject}</div>
                <Btn v="primary" sm full icon="play" onClick={() => startLive(cls.code, { labId: a.labId, title: a.title, mode })}>Start Live</Btn>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: C.ink50, marginBottom: 14 }}>
        {live.mode === "projector"
          ? "Projector mode — run the lab once on the shared screen and advance student-by-student. Tap a student to mark whose turn it is."
          : "Students see a “Join now” banner on their dashboard. Their status updates here in real time."}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
        {roster.length === 0 && <p style={{ fontSize: 13, color: C.ink50 }}>No students joined yet.</p>}
        {roster.map((m) => {
          const done = submittedFor(m.studentUid);
          const p = presById[m.studentUid];
          const status = done ? "submitted" : p ? p.status : "not joined";
          const col = done ? C.emDeep : status === "in-lab" ? C.violet : status === "joined" ? C.sky : C.ink30;
          const bg = done ? C.emPale : status === "in-lab" ? C.violetPale : C.paperWarm;
          return (
            <div key={m.studentUid} style={{ background: C.cream, border: `1px solid ${C.line}`, borderRadius: 12, padding: "13px 15px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{m.name}</div>
              <div style={{ fontSize: 11, color: C.ink30, marginBottom: 8 }}>Roll {m.rollNo || "—"}</div>
              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: col, background: bg, padding: "3px 10px", borderRadius: 99, textTransform: "capitalize" }}>
                {status}{status === "in-lab" && p && typeof p.stepPct === "number" ? ` · ${Math.round(p.stepPct)}%` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
