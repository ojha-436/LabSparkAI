/* ── Student Dashboard / Home ── */
const { useState: dUS } = React;

function Dashboard({ student, onOpen, onBackToLanding }) {
  const ref = useReveal();
  const featured = CATALOG[0];
  const lvlPct = (student.xp % 200) / 2;
  const [currentTab, setCurrentTab] = dUS("all");

  const filteredCatalog = currentTab === "all" 
    ? CATALOG 
    : CATALOG.filter(e => e.subject.toLowerCase() === currentTab);

  return (
    <div ref={ref} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <DashNav student={student} onBack={onBackToLanding} />

      <div style={{ display: "flex", flex: 1, maxWidth: 1240, width: "100%", margin: "0 auto", padding: "0 24px" }}>
        
        {/* Sidebar Nav */}
        <aside style={{ width: 220, borderRight: `1px solid ${C.line}`, padding: "30px 16px 30px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { id: "bench", l: "Virtual Workbench", ic: "home", active: true },
            { id: "analytics", l: "Class Progress", ic: "chart" },
            { id: "cert", l: "Achievements", ic: "trophy" }
          ].map((m) => (
            <button 
              key={m.id} 
              className="press"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13.5,
                fontWeight: 600,
                color: m.active ? C.emDeep : C.ink50,
                padding: "10px 14px",
                borderRadius: 8,
                background: m.active ? C.emPale : "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                width: "100%"
              }}
            >
              <Ic n={m.ic} s={16} c={m.active ? C.em : C.ink30} sw={2} />
              {m.l}
            </button>
          ))}
          <div style={{ marginTop: "auto", borderTop: `1px solid ${C.line}`, paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.paperWarm, padding: 12, borderRadius: 8 }}>
              <SparkAvatar size={30} />
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink70 }}>Spark Active</div>
                <div style={{ fontSize: 9.5, color: C.ink50 }} className="mono">v1.5-flash-grounded</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: "30px 0 80px 32px" }}>
          
          {/* Greeting Row */}
          <div className="reveal r1" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 30, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <span className="mono" style={{ fontSize: 11, color: C.emBright, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>STUDENT BENCH</span>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", marginTop: 4 }}>
                Welcome back, {student.name.split(" ")[0]}
              </h2>
              <p style={{ fontSize: 14, color: C.ink50, marginTop: 4 }}>Select a syllabus laboratory experiment module to execute in sandbox.</p>
            </div>
            <LevelCard student={student} pct={lvlPct} />
          </div>

          {/* Featured Card */}
          <FeaturedCard exp={featured} onOpen={onOpen} className="reveal r2" />

          {/* Quick Metrics */}
          <div className="reveal r3" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, margin: "28px 0 40px" }}>
            {[
              { ic: "flask", n: student.done, l: "Experiments Completed", c: C.emBright },
              { ic: "bolt", n: student.xp, l: "Total XP Accrued", c: C.gold },
              { ic: "medal", n: student.badges, l: "Badges Unlocked", c: C.coral },
              { ic: "target", n: student.streak + " Days", l: "Consecutive Learning", c: C.violet },
            ].map((s, i) => (
              <div key={i} className="lift-card" style={{ background: C.cream, borderRadius: 12, padding: "20px 22px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: s.c + "12", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Ic n={s.ic} s={18} c={s.c} sw={2.2} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>{s.n}</div>
                <div style={{ fontSize: 12, color: C.ink50, marginTop: 5, fontWeight: 500 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Catalog Selection Headers */}
          <div className="reveal r4" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="mono" style={{ fontSize: 11, color: C.emBright, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>CURRICULUM DIRECTORY</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", marginTop: 4 }}>CBSE NCERT Science Labs</h3>
            </div>
            
            {/* Filter Chips */}
            <div style={{ display: "flex", gap: 6, background: C.paperWarm, padding: 3, borderRadius: 8 }}>
              {["all", "chemistry", "physics"].map((t) => (
                <button 
                  key={t} 
                  onClick={() => setCurrentTab(t)}
                  className="press"
                  style={{
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "6px 14px",
                    borderRadius: 6,
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                    background: currentTab === t ? C.cream : "transparent",
                    color: currentTab === t ? C.ink : C.ink50,
                    boxShadow: currentTab === t ? "0 2px 6px rgba(0,0,0,0.04)" : "none"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Catalog Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {filteredCatalog.map((e, i) => (
              <ExpCard key={e.id} e={e} onOpen={onOpen} className={`reveal r${(i % 3) + 4}`} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function DashNav({ student, onBack }) {
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={onBack}
            className="press"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: C.ink50
            }}
          >
            <Ic n="back" s={14} c={C.ink50} /> Landing Page
          </button>
          <div style={{ width: 1, height: 18, background: C.line }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "24%", background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic n="flask" s={15} c={C.emBright} sw={2} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", letterSpacing: "-0.02em" }}>LabSpark</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: C.gold, background: C.goldPale, padding: "5px 12px", borderRadius: 6 }}>
            <Ic n="bolt" s={14} c={C.gold} sw={2.2} />{student.xp} XP
          </span>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.violet, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5 }}>
            {student.name.split(" ").map((w) => w[0]).join("")}
          </div>
        </div>

      </div>
    </nav>
  );
}

function LevelCard({ student, pct }) {
  return (
    <div style={{ background: C.ink, color: "#fff", borderRadius: 12, padding: "14px 20px", minWidth: 240, border: `1px solid ${C.lineDark}` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 9 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Level {student.level} <span style={{ color: C.ink30, fontWeight: 500 }}>· Junior Scientist</span></span>
        <span className="mono" style={{ fontSize: 11, color: C.emBright }}>{student.xp % 200}/200</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", borderRadius: 99, background: `linear-gradient(90deg,${C.emBright},${C.lime})` }} />
      </div>
      <div style={{ fontSize: 11, color: C.ink30, marginTop: 8, display: "flex", justifyContent: "space-between" }}>
        <span>{200 - (student.xp % 200)} XP to level up</span>
        <span>NCERT Class 7</span>
      </div>
    </div>
  );
}

function FeaturedCard({ exp, onOpen, className }) {
  return (
    <div className={className} style={{ background: C.ink, color: "#fff", borderRadius: 16, padding: 0, position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "1.25fr 0.75fr", border: `1px solid ${C.lineDark}` }}>
      <div style={{ position: "absolute", top: "-50%", right: "20%", width: 380, height: 380, borderRadius: "50%", background: `radial-gradient(circle, ${C.em}25, transparent 65%)`, pointerEvents: "none" }} />
      
      <div style={{ padding: "34px 40px", position: "relative", zIndex: 2 }}>
        <Chip c={C.emBright} bg="rgba(13,148,136,0.12)" icon="play">RESUME EXPERIMENT BENCH</Chip>
        <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "14px 0 10px" }}>{exp.name}</h3>
        <p style={{ fontSize: 14, color: C.ink30, maxWidth: 440, lineHeight: 1.55, marginBottom: 20 }}>{exp.blurb}</p>
        <div style={{ display: "flex", gap: 18, marginBottom: 24, flexWrap: "wrap" }}>
          {[{ ic: "book", t: exp.chapter }, { ic: "clock", t: exp.mins + " mins duration" }, { ic: "bolt", t: "+" + exp.xp + " XP Reward" }].map((m) => (
            <span key={m.t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.ink15 }}>
              <Ic n={m.ic} s={14} c={C.emBright} sw={2} />{m.t}
            </span>
          ))}
        </div>
        <Btn v="primary" lg icon="arrow" onClick={() => onOpen(exp.id)}>Enter Laboratory</Btn>
      </div>
      
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: `1px solid ${C.lineInk}` }}>
        <BeakerArt />
      </div>
    </div>
  );
}

function BeakerArt() {
  return (
    <svg viewBox="0 0 220 240" width="200" height="220" style={{ animation: "drift 5s ease-in-out infinite" }}>
      <defs>
        <linearGradient id="dliq" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.emBright} stopOpacity="0.9" /><stop offset="100%" stopColor={C.emDeep} stopOpacity="0.75" /></linearGradient>
      </defs>
      <path d="M75 50h70v32l36 120a8 8 0 01-7.6 10.4H46.6A8 8 0 0139 202l36-120V50z" fill="rgba(255,255,255,0.03)" stroke={C.lineInk} strokeWidth="2" />
      <path d="M62 160l22-76h52l22 76a6 6 0 01-5.7 8.4H67.7A6 6 0 0162 160z" fill="url(#dliq)" opacity="0.6" />
      <path d="M62 160l22-76h52l22 76" fill="none" stroke={C.emBright} strokeWidth="1.5" opacity="0.8" />
      <rect x="70" y="44" width="80" height="8" rx="2" fill="rgba(255,255,255,0.06)" stroke={C.lineInk} strokeWidth="1.5" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={86 + i * 13} cy={156} r={2 + (i % 3)} fill={C.emBright}>
          <animate attributeName="cy" values="156;90" dur={`${2.2 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.4}s`} />
          <animate attributeName="opacity" values="0.75;0" dur={`${2.2 + i * 0.4}s`} repeatCount="indefinite" begin={`${i * 0.4}s`} />
        </circle>
      ))}
    </svg>
  );
}

function ExpCard({ e, onOpen, className }) {
  const locked = e.status !== "ready";
  const diffC = e.diff === "Easy" ? { bg: C.emPale, c: C.emDeep } : e.diff === "Medium" ? { bg: C.goldPale, c: "#8a6d1f" } : { bg: C.coralPale, c: "#a8351f" };
  return (
    <div 
      className={className + " lift-card"} 
      onClick={() => !locked && onOpen(e.id)} 
      style={{
        background: C.cream, 
        borderRadius: 12, 
        overflow: "hidden",
        cursor: locked ? "default" : "pointer", 
        opacity: locked ? 0.72 : 1, 
        position: "relative",
      }}
    >
      <div style={{ height: 114, background: `linear-gradient(135deg, ${e.c}0f, ${e.c}04)`, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, background: C.cream, border: `1px solid ${e.c}22`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${e.c}15` }}>
          <Ic n={e.icon} s={24} c={e.c} sw={2} />
        </div>
        <span style={{ position: "absolute", top: 12, left: 12, fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: diffC.bg, color: diffC.c }}>{e.diff}</span>
        {locked && <span style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 3.5, fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: C.paperWarm, color: C.ink50 }}><Ic n="lock" s={10} c={C.ink50} />Soon</span>}
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span className="mono" style={{ fontSize: 10, color: e.c, letterSpacing: "0.03em", fontWeight: 700 }}>{e.subject.toUpperCase()}</span>
          <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.ink30 }} />
          <span style={{ fontSize: 11, fontWeight: 500, color: C.ink30 }}>{e.cls}</span>
        </div>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", lineHeight: 1.25, marginBottom: 6 }}>{e.name}</h4>
        <p style={{ fontSize: 12.5, color: C.ink50, lineHeight: 1.5, marginBottom: 16, minHeight: 38 }}>{e.blurb}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${C.lineSoft}`, paddingTop: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: C.ink50 }}><Ic n="clock" s={13} c={C.ink30} sw={2} />{e.mins} mins</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: locked ? C.ink30 : C.emBright }}>
            {locked ? "Locked" : <>Start Lab <Ic n="arrow" s={12} c={C.emBright} sw={2.2} /></>}
          </span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
