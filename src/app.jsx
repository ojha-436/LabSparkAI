/* ── App shell: view routing + student state ── */
import React from "react";
import { C } from "./tokens.js";
import { SparkAvatar } from "./ui.jsx";
import { LandingPage } from "./landing.jsx";
import { LoginPage } from "./login.jsx";
import { Dashboard } from "./dashboard.jsx";
import { Lab3D } from "./lab3d.jsx";
import { CircuitLab } from "./circuitlab.jsx";
import { Report } from "./report.jsx";
import { ProfilePage, ProgressPage, AchievementsPage } from "./profile.jsx";
import { PracticalFilePage, JoinClassPage, TeacherPage } from "./classroom.jsx";
import { writeSubmission } from "./classroom.js";
import { GenLab3D } from "./genlab3d.jsx";
import { GEN_LABS } from "./genlabdata.js";
import { CATALOG } from "./data.js";
import firebase, { db } from "./firebaseInit.js";
const { useState: aUS } = React;

const DEFAULT_STUDENT = {
  name: "Scientist", level: 1, xp: 0, done: 0, badges: 0, streak: 1, email: "student@labspark.ai",
  school: "", klass: "", section: "", parentName: "", mobile: "", city: "", rollNo: "", photoData: null, completions: [], classes: [],
};

function App() {
  const [view, setView] = aUS("landing");
  const [reportData, setReportData] = aUS(null);
  const [toast, setToast] = aUS(null);
  const [uid, setUid] = aUS(null);
  const [student, setStudent] = aUS(DEFAULT_STUDENT);
  const [reportReturn, setReportReturn] = aUS("dashboard");

  // ── Browser back/forward support ──
  // Each view change pushes a history entry so the browser Back button moves
  // between in-app views (e.g. lab → dashboard) instead of leaving the site.
  const popRef = React.useRef(false);
  const firstRef = React.useRef(true);
  React.useEffect(() => {
    window.history.replaceState({ view: "landing" }, "");
    const onPop = (e) => { popRef.current = true; setView((e.state && e.state.view) || "landing"); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  React.useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return; }
    if (popRef.current) { popRef.current = false; return; }
    window.history.pushState({ view }, "");
  }, [view]);

  React.useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        setUid(user.uid);
        const base = {
          name: user.displayName || (user.email ? user.email.split("@")[0] : "Scientist"),
          email: user.email || "student@labspark.ai",
        };
        // Load persisted progress from Firestore (creates the doc on first login).
        try {
          const ref = db.collection("users").doc(user.uid);
          const snap = await ref.get();
          if (snap.exists) {
            setStudent({ ...DEFAULT_STUDENT, ...snap.data(), ...base });
          } else {
            const fresh = { ...DEFAULT_STUDENT, ...base };
            setStudent(fresh);
            ref.set(fresh).catch(() => {});
          }
        } catch {
          setStudent((s) => ({ ...s, ...base }));
        }
        setView("dashboard");
      } else {
        setUid(null);
        setView((currentView) => (currentView === "login" ? currentView : "landing"));
      }
    });
    return unsubscribe;
  }, []);

  // Persist profile + progress + completions back to Firestore.
  const persist = (next) => {
    if (!uid) return;
    db.collection("users").doc(uid)
      .set({
        name: next.name, school: next.school || "", klass: next.klass || "", section: next.section || "",
        parentName: next.parentName || "", mobile: next.mobile || "", city: next.city || "", rollNo: next.rollNo || "",
        photoData: next.photoData || null,
        xp: next.xp, level: next.level, done: next.done, badges: next.badges, streak: next.streak,
        completions: next.completions || [], classes: next.classes || [],
      }, { merge: true })
      .catch(() => {});
  };

  const saveProfile = (partial) => {
    setStudent((s) => { const next = { ...s, ...partial }; persist(next); return next; });
  };

  const addXp = (n) => {
    setStudent((s) => {
      const xp = s.xp + n;
      const next = { ...s, xp, level: Math.floor(xp / 200) + 1 };
      persist(next);
      return next;
    });
  };

  const [activeExpId, setActiveExpId] = aUS(null);

  const openExp = (id) => {
    const isGen = !!GEN_LABS[id];
    if (id !== "acid-base" && id !== "circuit" && !isGen) {
      setToast("That experiment is coming soon! 🧪");
      setTimeout(() => setToast(null), 3200);
      return;
    }
    setActiveExpId(id);
    setView(id === "acid-base" ? "lab" : id === "circuit" ? "circuit-lab" : "genlab");
  };

  const complete = (data) => {
    setReportData({ ...data, experimentId: activeExpId });
    setReportReturn("dashboard");
    const name = (CATALOG.find((e) => e.id === activeExpId) || {}).name || "Science Lab";
    const rec = {
      id: activeExpId, name, experimentId: activeExpId, title: data.title || name,
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      correct: data.correct, total: data.total, xp: data.xp,
      observations: data.observations || [], aim: data.aim || "", conclusion: data.conclusion || "",
      chapter: data.chapter || "", cls: data.cls || "", subject: data.subject || "", aiFeedback: data.aiFeedback || "",
    };
    setStudent((s) => {
      const list = [...(s.completions || []).filter((c) => c.id !== activeExpId), rec];
      const next = { ...s, done: list.length, badges: list.length, completions: list };
      persist(next);
      return next;
    });
    // Mirror the completed lab into any classes the student has joined (teacher dashboards).
    (student.classes || []).forEach((m) => { writeSubmission(m, student, rec).catch(() => {}); });
    setView("report");
  };

  // Student joined a class with a code — remember the membership so future
  // completions are shared with that teacher.
  const onJoined = (membership) => {
    setStudent((s) => {
      const classes = [...(s.classes || []).filter((c) => c.code !== membership.code), membership];
      const next = { ...s, classes };
      persist(next);
      return next;
    });
  };

  // Re-open a stored certificate from the Achievements page.
  const viewCertificate = (c) => {
    const id = c.experimentId || c.id;
    setActiveExpId(id);
    setReportData({ experimentId: id, correct: c.correct, total: c.total, xp: c.xp, results: {}, fromCertificate: true, generic: !!GEN_LABS[id], title: c.name });
    setReportReturn("achievements");
    setView("report");
  };

  return (
    <>
      {view === "landing" && (
        <LandingPage onEnterSandbox={() => setView("login")} />
      )}
      
      {view === "login" && (
        <LoginPage 
          onLogin={(studentName) => {
            setStudent((s) => ({ ...s, name: studentName }));
            setView("dashboard");
          }} 
          onBack={() => setView("landing")} 
        />
      )}
      
      {view === "dashboard" && (
        <Dashboard
          student={student}
          onOpen={openExp}
          onBackToLanding={() => setView("landing")}
          onEditProfile={() => setView("profile")}
          onOpenProgress={() => setView("progress")}
          onOpenAchievements={() => setView("achievements")}
          onOpenPractical={() => setView("practical")}
          onOpenJoin={() => setView("join")}
          onOpenTeacher={() => setView("teacher")}
        />
      )}

      {view === "profile" && (
        <ProfilePage student={student} onSave={saveProfile} onBack={() => setView("dashboard")} />
      )}

      {view === "progress" && (
        <ProgressPage student={student} catalog={CATALOG} onBack={() => setView("dashboard")} onOpen={openExp} />
      )}

      {view === "achievements" && (
        <AchievementsPage student={student} onBack={() => setView("dashboard")} onViewCertificate={viewCertificate} />
      )}

      {view === "practical" && (
        <PracticalFilePage student={student} onBack={() => setView("dashboard")} />
      )}

      {view === "join" && (
        <JoinClassPage student={student} onBack={() => setView("dashboard")} onJoined={onJoined} />
      )}

      {view === "teacher" && (
        <TeacherPage student={student} onBack={() => setView("dashboard")} />
      )}
      
      {view === "lab" && (
        <Lab3D onExit={() => setView("dashboard")} onComplete={complete} addXp={addXp} />
      )}

      {view === "circuit-lab" && (
        <CircuitLab onExit={() => setView("dashboard")} onComplete={complete} addXp={addXp} />
      )}

      {view === "genlab" && GEN_LABS[activeExpId] && (
        <GenLab3D spec={GEN_LABS[activeExpId]} onExit={() => setView("dashboard")} onComplete={complete} addXp={addXp} />
      )}

      {view === "report" && reportData && (
        <Report
          data={reportData}
          student={student}
          onHome={() => setView(reportReturn)}
          onRetry={() => {
            const id = reportData.experimentId || activeExpId;
            setActiveExpId(id);
            setView(id === "circuit" ? "circuit-lab" : GEN_LABS[id] ? "genlab" : "lab");
          }}
        />
      )}
      
      {toast && <Toast text={toast} />}
    </>
  );
}

function Toast({ text }) {
  return (
    <div 
      className="card-glass"
      style={{ 
        position: "fixed", 
        bottom: 28, 
        left: "50%", 
        transform: "translateX(-50%)", 
        zIndex: 500, 
        background: C.ink, 
        color: "#ffffff", 
        padding: "12px 18px", 
        display: "flex", 
        alignItems: "center", 
        gap: 12, 
        maxWidth: 440, 
        boxShadow: "0 15px 35px rgba(15,23,42,0.25)", 
        animation: "fadeUp .4s cubic-bezier(.16,1,.3,1) both" 
      }}
    >
      <SparkAvatar size={26} />
      <span style={{ fontSize: 13, lineHeight: 1.45, fontWeight: 500 }}>{text}</span>
    </div>
  );
}

export { App };
