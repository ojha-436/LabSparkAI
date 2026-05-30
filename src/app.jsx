/* ── App shell: view routing + student state ── */
const { useState: aUS } = React;

function App() {
  const [view, setView] = aUS("landing");
  const [reportData, setReportData] = aUS(null);
  const [toast, setToast] = aUS(null);
  const [student, setStudent] = aUS({
    name: "Aarav Sharma", level: 4, xp: 730, done: 3, badges: 5, streak: 6,
  });

  const addXp = (n) => {
    setStudent((s) => {
      const xp = s.xp + n;
      return { ...s, xp, level: Math.floor(xp / 200) + 1 };
    });
  };

  const [activeExpId, setActiveExpId] = aUS(null);

  const openExp = (id) => {
    if (id !== "acid-base" && id !== "circuit") {
      setToast("That experiment is coming soon! 🧪");
      setTimeout(() => setToast(null), 3200);
      return;
    }
    setActiveExpId(id);
    setView(id === "acid-base" ? "lab" : "circuit-lab");
  };

  const complete = (data) => {
    setReportData({ ...data, experimentId: activeExpId });
    setStudent((s) => ({ ...s, done: s.done + 1, badges: s.badges + 1 }));
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
        <Dashboard student={student} onOpen={openExp} onBackToLanding={() => setView("landing")} />
      )}
      
      {view === "lab" && (
        <Lab onExit={() => setView("dashboard")} onComplete={complete} addXp={addXp} />
      )}

      {view === "circuit-lab" && (
        <CircuitLab onExit={() => setView("dashboard")} onComplete={complete} addXp={addXp} />
      )}
      
      {view === "report" && reportData && (
        <Report 
          data={reportData} 
          student={student} 
          onHome={() => setView("dashboard")} 
          onRetry={() => setView(activeExpId === "circuit" ? "circuit-lab" : "lab")} 
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
