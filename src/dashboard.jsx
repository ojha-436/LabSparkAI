/* ── Student Dashboard / Home ── */
import React from "react";
import { C } from "./tokens.js";
import { Ic, Btn, Chip, SparkAvatar, useReveal } from "./ui.jsx";
import { CATALOG } from "./data.js";
import { Avatar } from "./profile.jsx";
import firebase from "./firebaseInit.js";
const { useState: dUS } = React;

const CLASS_ORDER = ["Class 6", "Class 7", "Class 8", "Class 9", "Class 10"];

function Dashboard({ student, onOpen, onBackToLanding, onEditProfile, onOpenProgress, onOpenAchievements }) {
  const ref = useReveal();
  const featured = CATALOG[0];
  const lvlPct = (student.xp % 200) / 2;
  const [openClass, setOpenClass] = dUS(null);
  const completedIds = new Set((student.completions || []).map((c) => c.id));

  return (
    <div ref={ref} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <DashNav student={student} onBack={onBackToLanding} onEditProfile={onEditProfile} />

      <div style={{ display: "flex", flex: 1, maxWidth: 1240, width: "100%", margin: "0 auto", padding: "0 24px" }}>
        
        {/* Sidebar Nav */}
        <aside style={{ width: 220, borderRight: `1px solid ${C.line}`, padding: "30px 16px 30px 0", display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { id: "bench", l: "Virtual Workbench", ic: "home", active: true, go: () => {} },
            { id: "analytics", l: "Class Progress", ic: "chart", go: onOpenProgress },
            { id: "cert", l: "Achievements", ic: "trophy", go: onOpenAchievements },
            { id: "profile", l: "My Profile", ic: "shield", go: onEditProfile },
          ].map((m) => (
            <button
              key={m.id}
              onClick={m.go}
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
              { ic: "flask", n: student.done, l: "Experiments Completed", c: C.emBright, go: onOpenProgress },
              { ic: "bolt", n: student.xp, l: "Total XP Accrued", c: C.gold },
              { ic: "medal", n: student.badges, l: "Badges Unlocked", c: C.coral, go: onOpenAchievements },
              { ic: "target", n: student.streak + " Days", l: "Consecutive Learning", c: C.violet },
            ].map((s, i) => (
              <div key={i} onClick={s.go} className="lift-card" style={{ background: C.cream, borderRadius: 12, padding: "20px 22px", cursor: s.go ? "pointer" : "default" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: s.c + "12", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Ic n={s.ic} s={18} c={s.c} sw={2.2} />
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>{s.n}</div>
                <div style={{ fontSize: 12, color: C.ink50, marginTop: 5, fontWeight: 500 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* Catalog Header */}
          <div className="reveal r4" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <span className="mono" style={{ fontSize: 11, color: C.emBright, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>CURRICULUM DIRECTORY</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", marginTop: 4 }}>
                {openClass ? `${openClass} · Science Labs` : "Choose your class"}
              </h3>
            </div>
            {openClass && (
              <button onClick={() => setOpenClass(null)} className="press btn btn-light" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Ic n="back" s={14} c={C.ink50} /> All classes
              </button>
            )}
          </div>

          {!openClass ? (
            /* Step 1 — class cards (Class 6–10) */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 18 }}>
              {CLASS_ORDER.map((cls, i) => {
                const labs = CATALOG.filter((e) => e.cls === cls);
                const doneN = labs.filter((e) => completedIds.has(e.id)).length;
                const subjects = [...new Set(labs.map((e) => e.subject))];
                const accent = [C.emBright, C.violet, C.gold, C.sky, C.coral][i % 5];
                return (
                  <div key={cls} onClick={() => setOpenClass(cls)} className={`lift-card reveal r${(i % 3) + 4}`}
                    style={{ cursor: "pointer", background: C.cream, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.line}` }}>
                    <div style={{ height: 84, background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <span style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>{cls.replace("Class ", "")}</span>
                      <span style={{ position: "absolute", top: 10, left: 12, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em" }}>CLASS</span>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{labs.length} lab{labs.length !== 1 ? "s" : ""}</div>
                      <div style={{ fontSize: 11.5, color: C.ink50, marginTop: 2 }}>{subjects.join(" · ")}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 10 }}>
                        <span style={{ fontSize: 11, color: doneN ? C.emDeep : C.ink30, fontWeight: 600 }}>{doneN} completed</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: accent }}>Open <Ic n="arrow" s={12} c={accent} sw={2.2} /></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Step 2 — that class's labs grouped by subject */
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {[...new Set(CATALOG.filter((e) => e.cls === openClass).map((e) => e.subject))].map((subject) => {
                const labs = CATALOG.filter((e) => e.cls === openClass && e.subject === subject);
                const sc = subject === "Physics" ? C.violet : C.emBright;
                return (
                  <div key={subject}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: sc + "16", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Ic n={subject === "Physics" ? "bolt" : "flask"} s={16} c={sc} sw={2} />
                      </div>
                      <h4 style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>{subject}</h4>
                      <span className="mono" style={{ fontSize: 11, color: C.ink30 }}>{labs.length} lab{labs.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 18 }}>
                      {labs.map((e) => <ExpCard key={e.id} e={e} onOpen={onOpen} className="" />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function DashNav({ student, onBack, onEditProfile }) {
  const [showProfile, setShowProfile] = React.useState(false);
  const initials = student.name ? student.name.split(" ").map((w) => w[0]).join("").toUpperCase() : "ST";

  const handleLogout = () => {
    firebase.auth().signOut()
      .then(() => {
        // Redirect logic is automatically handled by the onAuthStateChanged hook in app.jsx!
      })
      .catch((err) => {
        console.error("Signout error:", err);
      });
  };

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

        <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: C.gold, background: C.goldPale, padding: "5px 12px", borderRadius: 6 }}>
            <Ic n="bolt" s={14} c={C.gold} sw={2.2} />{student.xp} XP
          </span>
          
          <div onClick={() => setShowProfile(!showProfile)} className="press" style={{ cursor: "pointer", borderRadius: "50%" }}>
            <Avatar src={student.photoData} name={student.name} size={34} ring={false} />
          </div>

          {showProfile && (
            <div 
              className="card-glass reveal r1" 
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                width: 320,
                background: C.cream,
                borderRadius: 16,
                boxShadow: "0 10px 40px rgba(15,23,42,0.12)",
                border: `1.5px solid ${C.line}`,
                overflow: "hidden",
                zIndex: 100,
                textAlign: "left"
              }}
            >
              <div style={{ background: C.inkDeep, color: "#fff", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar src={student.photoData} name={student.name} size={44} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{student.name}</div>
                    <div style={{ fontSize: 11, color: C.ink30, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{student.email}</div>
                  </div>
                </div>
                
                <div style={{ marginTop: 14, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 10, color: C.ink30, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.02em" }}>Current Tier</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.emBright }}>Science Spark Pass (Pro)</div>
                  </div>
                  <div style={{ background: C.emBright, color: "#fff", fontSize: 9.5, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>ACTIVE</div>
                </div>
              </div>

              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 10, color: C.ink50, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: 4, marginBottom: 2 }}>Profile Dashboard</div>

                <div style={{ background: C.paperWarm, borderRadius: 10, padding: 12, border: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Ic n="trophy" s={14} c={C.em} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>Academic Progress</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ background: C.cream, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.lineSoft}` }}>
                      <div style={{ fontSize: 9, color: C.ink50 }}>XP Accrued</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.gold }} className="mono">{student.xp} XP</div>
                    </div>
                    <div style={{ background: C.cream, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.lineSoft}` }}>
                      <div style={{ fontSize: 9, color: C.ink50 }}>Badges</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.coral }} className="mono">{student.badges} Unlocked</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: C.paperWarm, borderRadius: 10, padding: 12, border: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Ic n="chart" s={14} c={C.violet} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>Billing & Subscriptions</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                      <span style={{ color: C.ink50 }}>Spark Pass B2C Tier:</span>
                      <span style={{ fontWeight: 700, color: C.ink70 }}>$4.99 / Month</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
                      <span style={{ color: C.ink50 }}>Method:</span>
                      <span style={{ fontWeight: 600, color: C.ink50 }} className="mono">Stripe Sandbox (**** 4242)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, borderTop: `1px dashed ${C.line}`, paddingTop: 6, marginTop: 2 }}>
                      <span style={{ color: C.ink50 }}>Transaction Ledger:</span>
                      <span style={{ fontWeight: 700, color: C.emDeep }}>1 Live Purchase</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setShowProfile(false); onEditProfile && onEditProfile(); }}
                  className="press"
                  style={{ width: "100%", padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: `1.5px solid ${C.line}`, background: C.cream, color: C.ink, cursor: "pointer" }}
                >
                  <Ic n="shield" s={13} c={C.em} /> Edit My Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="press"
                  style={{
                    marginTop: 4,
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    border: `1.5px solid ${C.coral}`,
                    background: "transparent",
                    color: C.coral,
                    cursor: "pointer"
                  }}
                >
                  <Ic n="lock" s={13} c={C.coral} />
                  Sign Out of Account
                </button>
              </div>

            </div>
          )}
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

export { Dashboard };
