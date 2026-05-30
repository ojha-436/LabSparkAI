/* ── LandingPage: Modular CSS-Class-Based Enterprise Landing Page ── */
const { useState: laUS, useEffect: laUE } = React;

function LandingPage({ onEnterSandbox }) {
  const ref = useReveal();
  const [activeTab, setActiveTab] = laUS("curriculum");
  const [voiceSim, setVoiceSim] = laUS(false);
  const [voiceStep, setVoiceStep] = laUS(0);

  // Voice simulator timeline loop
  laUE(() => {
    if (!voiceSim) return;
    const steps = [
      { text: "Initializing WebRTC Voice Stream...", speaker: "system", delay: 1500 },
      { text: "Welcome back, scientist! I'm Spark. Today we're executing Chemistry Chapter 5: Acids, Bases, and Salts. Ready to dip some litmus paper?", speaker: "spark", delay: 4200 },
      { text: "Why did the blue litmus paper turn bright red when dipped in lemon juice?", speaker: "student", delay: 3500 },
      { text: "Aha! Lemon juice contains citric acid. Acidic solutions have free hydrogen ions that react with the litmus dye, changing its chemical structure to turn blue litmus paper red! Socratic chemistry at work. 🍋", speaker: "spark", delay: 5000 }
    ];

    const timer = setTimeout(() => {
      if (voiceStep < steps.length - 1) {
        setVoiceStep(v => v + 1);
      } else {
        setVoiceStep(1);
      }
    }, steps[voiceStep].delay);

    return () => clearTimeout(timer);
  }, [voiceSim, voiceStep]);

  const toggleVoiceSim = () => {
    if (voiceSim) {
      setVoiceSim(false);
      setVoiceStep(0);
    } else {
      setVoiceSim(true);
      setVoiceStep(0);
    }
  };

  return (
    <div ref={ref} style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(248, 250, 252, 0.85)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "24%", background: `linear-gradient(135deg, #6366f1, #8b5cf6)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic n="flask" s={18} c="#fff" sw={2} />
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Plus Jakarta Sans'", letterSpacing: "-0.03em", color: C.ink }}>
              LabSpark <span style={{ color: C.emBright, fontWeight: 500 }}>AI</span>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 13.5, fontWeight: 600, color: C.ink70 }}>
            <a href="#demo" className="link-underline">Voice Preview</a>
            <a href="#platform" className="link-underline">Platform Details</a>
            <a href="#curriculum" className="link-underline">Curriculum Directory</a>
          </div>

          <div>
            <Btn v="primary" icon="arrow" onClick={onEnterSandbox}>Launch Workbench</Btn>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="blueprint-grid" style={{ padding: "80px 24px 60px", position: "relative", overflow: "hidden", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ position: "absolute", top: "-10%", left: "40%", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${C.emPale} 0%, transparent 70%)`, opacity: 0.7, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-20%", left: "-10%", width: 450, height: 450, borderRadius: "50%", background: `radial-gradient(circle, ${C.violetPale} 0%, transparent 70%)`, opacity: 0.5, pointerEvents: "none" }} />

        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 10 }}>
          <div className="reveal r1" style={{ display: "inline-flex", marginBottom: 16 }}>
            <Chip bg={C.violetPale} c={C.violet} icon="spark">GEMINI XPRIZE HACKATHON MVP</Chip>
          </div>

          <h1 className="reveal r2" style={{ fontSize: "clamp(34px, 5.2vw, 56px)", fontWeight: 800, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
            The Next-Generation Multimodal <br />
            <span style={{ background: `linear-gradient(90deg, ${C.em}, ${C.violet})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Virtual Science Laboratory
            </span>
          </h1>

          <p className="reveal r3" style={{ fontSize: "clamp(15px, 2vw, 17px)", color: C.ink50, maxWidth: 640, margin: "16px auto 28px", lineHeight: 1.6 }}>
            Bridging digital simulation and real-world science learning. Built GCP-native with Vertex AI and the Gemini Multimodal Live API, providing students with a real-time conversational lab assistant.
          </p>

          <div className="reveal r4" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 50 }}>
            <Btn v="primary" lg icon="flask" onClick={onEnterSandbox}>Enter Virtual Workbench</Btn>
            <a href="#demo">
              <Btn v="light" lg icon="play">Experience Voice Demo</Btn>
            </a>
          </div>

          <div className="reveal r5" style={{ display: "flex", justifyContent: "center", gap: 24, padding: "20px 0" }}>
            <FloatingAsset icon="beaker" name="Glassware Rack" delay="0s" color={C.emBright} />
            <FloatingAsset icon="bolt" name="Circuit Nodes" delay="1.5s" color={C.goldBright} />
            <FloatingAsset icon="atom" name="Chemical Reactions" delay="3s" color={C.violet} />
          </div>
        </div>
      </section>

      {/* Voice Waveform Section */}
      <section id="demo" style={{ padding: "70px 24px", background: C.cream, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span className="mono" style={{ fontSize: 11, color: C.violet, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>GEMINI MULTIMODAL LIVE API</span>
            <h2 style={{ fontSize: 30, color: C.ink, letterSpacing: "-0.02em", marginTop: 6 }}>Low-Latency Socratic Voice Partner</h2>
            <p style={{ fontSize: 14.5, color: C.ink50, maxWidth: 500, margin: "10px auto 0", lineHeight: 1.5 }}>
              Spark "sees" the sandbox workbench, guides students through active questions, and prevents dangerous mixtures, all via natural WebRTC conversation.
            </p>
          </div>

          <div className="card-glass" style={{ padding: "30px 40px", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 32, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <SparkAvatar size={48} mood={voiceSim ? (voiceStep % 2 === 1 ? "celebrate" : "thinking") : "happy"} glow={voiceSim} />
                <div>
                  <h4 style={{ fontSize: 16, color: C.ink }}>Spark Voice Assistant</h4>
                  <div className="mono" style={{ fontSize: 11, color: voiceSim ? C.emBright : C.ink30 }}>
                    {voiceSim ? "● LIVE IN DUPLEX VOICE MODE" : "○ CHANNEL IDLE"}
                  </div>
                </div>
              </div>

              {/* Speech Box */}
              <div style={{ minHeight: 110, background: "#ffffff", border: `1px solid ${C.line}`, borderRadius: 8, padding: "18px 22px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                {!voiceSim ? (
                  <p style={{ fontSize: 14, color: C.ink30, fontStyle: "italic", textAlign: "center" }}>
                    Click "Connect Voice Stream" below to simulate low-latency learning dialogues.
                  </p>
                ) : (
                  <div>
                    <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 4, background: voiceStep % 2 === 0 ? C.violetPale : C.emPale, color: voiceStep % 2 === 0 ? C.violet : C.emDeep, textTransform: "uppercase" }}>
                      {voiceStep === 0 ? "CONNECTING" : voiceStep === 2 ? "STUDENT (WEBRTC)" : "SPARK (GEMINI)"}
                    </span>
                    <p style={{ fontSize: 13.8, color: C.ink70, marginTop: 8, lineHeight: 1.5 }}>
                      {voiceStep === 0 && "Connecting to Vertex AI Cloud Run proxy..."}
                      {voiceStep === 1 && "Welcome back, scientist! I'm Spark. Today we're executing Chemistry Chapter 5: Acids, Bases, and Salts. Ready to dip some litmus paper?"}
                      {voiceStep === 2 && '"Why did the blue litmus paper turn bright red when dipped in lemon juice?"'}
                      {voiceStep === 3 && "Aha! Lemon juice contains citric acid. Acidic solutions have free hydrogen ions that react with the litmus dye, changing its chemical structure to turn blue litmus paper red! Socratic chemistry at work. 🍋"}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 14 }}>
                <Btn v={voiceSim ? "dark" : "primary"} onClick={toggleVoiceSim} icon={voiceSim ? "lock" : "mic"}>
                  {voiceSim ? "Disconnect Stream" : "Connect Voice Stream"}
                </Btn>
                {voiceSim && <VoiceWaveform active={voiceStep === 1 || voiceStep === 3} color={voiceStep % 2 === 0 ? C.violet : C.emBright} />}
              </div>
            </div>

            {/* Voice Channel Metrics */}
            <div style={{ borderLeft: `1px solid ${C.line}`, paddingLeft: 30, display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="mono">
                <div style={{ fontSize: 11, color: C.ink30, fontWeight: 600 }}>WEBSOCKET PROTOCOL</div>
                <div style={{ fontSize: 13, color: C.ink70, fontWeight: 700, marginTop: 2 }}>wss://cloudrun.labspark.ai/v1/live</div>
              </div>
              <div className="mono">
                <div style={{ fontSize: 11, color: C.ink30, fontWeight: 600 }}>GROUNDING DATABASE</div>
                <div style={{ fontSize: 13, color: C.emDeep, fontWeight: 700, marginTop: 2 }}>NCERT Class 7 Science Cache</div>
              </div>
              <div className="mono">
                <div style={{ fontSize: 11, color: C.ink30, fontWeight: 600 }}>VOICE LOOP LATENCY</div>
                <div style={{ fontSize: 13, color: C.lime, fontWeight: 700, marginTop: 2 }}>
                  {voiceSim ? "620ms (Avg WebRTC Duplex)" : "—"}
                </div>
              </div>
              <div className="mono">
                <div style={{ fontSize: 11, color: C.ink30, fontWeight: 600 }}>VERTEX AI COMPUTE COST</div>
                <div style={{ fontSize: 13, color: C.gold, fontWeight: 700, marginTop: 2 }}>
                  {voiceSim ? "$0.015 per student lab session" : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Platform & Tabs Section */}
      <section id="platform" style={{ padding: "70px 24px", background: C.paper, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 38 }}>
            {[
              { id: "curriculum", l: "NCERT Laboratory", ic: "book" },
              { id: "gcp", l: "GCP Native Architecture", ic: "globe" },
              { id: "b2b", l: "B2B School SaaS", ic: "briefcase" }
            ].map(t => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id)} 
                className="press" 
                style={{
                  border: "none",
                  padding: "9px 18px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  transition: "all 0.2s",
                  background: activeTab === t.id ? C.emBright : "#fff",
                  color: activeTab === t.id ? "#fff" : C.ink70,
                  boxShadow: activeTab === t.id ? "0 4px 12px rgba(13,148,136,.15)" : "0 1px 3px rgba(0,0,0,0.02)",
                  border: `1px solid ${activeTab === t.id ? "transparent" : C.line}`
                }}
              >
                <Ic n={t.ic} s={15} c="currentColor" sw={2} />{t.l}
              </button>
            ))}
          </div>

          <div style={{ minHeight: 320 }} className="card-glass">
            <div style={{ padding: "34px 40px" }}>
              {activeTab === "curriculum" && <TabCurriculum />}
              {activeTab === "gcp" && <TabGcp />}
              {activeTab === "b2b" && <TabB2b />}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: C.inkDeep, color: "#94a3b8", padding: "40px 24px", textAlign: "center", marginTop: "auto", borderTop: `1px solid ${C.lineDark}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "24%", background: C.emBright, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic n="flask" s={14} c="#fff" sw={2} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "'Plus Jakarta Sans'", letterSpacing: "-0.02em" }}>
              LabSpark AI
            </span>
          </div>
          <p style={{ fontSize: 12.5, maxWidth: 540, lineHeight: 1.6 }}>
            LabSpark AI is built as a state-of-the-art virtual science laboratory for CBSE K-12 NCERT science practical training, utilizing Vertex AI prompt caching and the Gemini Multimodal Live API.
          </p>
          <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 0" }} />
          <div style={{ fontSize: 11.5, color: C.ink30 }}>
            &copy; 2026 LabSpark AI. GCP-Native Virtual Education Sandbox. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FloatingAsset({ icon, name, delay, color }) {
  return (
    <div 
      className="hover-lift"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#ffffff",
        padding: "10px 16px",
        borderRadius: 10,
        border: `1px solid ${C.line}`,
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.03)",
        animation: `drift 5s ease-in-out infinite`,
        animationDelay: delay
      }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 6, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ic n={icon} s={14} c={color} sw={2.2} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink70 }}>{name}</span>
    </div>
  );
}

function TabCurriculum() {
  const experiments = [
    { cls: "Class 7", sub: "Chemistry", name: "Acids, Bases & Indicators (Litmus)", ready: true, icon: "drop", color: C.emBright },
    { cls: "Class 6", sub: "Chemistry", name: "Separation of Substances (Filtration)", ready: false, icon: "beaker", color: C.gold },
    { cls: "Class 7", sub: "Chemistry", name: "Neutralisation Reactions (Salts)", ready: false, icon: "flask", color: C.coral },
    { cls: "Class 8", sub: "Chemistry", name: "Rusting & Oxidation (Metals)", ready: false, icon: "atom", color: C.sky },
    { cls: "Class 8", sub: "Physics", name: "Electricity & Circuit Loops", ready: false, icon: "bolt", color: C.violet },
    { cls: "Class 9", sub: "Physics", name: "Newton's Force & Balance Pulley", ready: false, icon: "target", color: C.emDeep }
  ];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 20, color: C.ink }}>NCERT Syllabus Directory (Class 6–10)</h3>
        <p style={{ fontSize: 13.5, color: C.ink50, marginTop: 4 }}>
          Each sandbox maps directly to the CBSE textbook practical board exam syllabus. Spark AI co-teaches every module.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {experiments.map((e, i) => (
          <div key={i} className="hover-lift" style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: 16, background: C.paper, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2.5px 7px", borderRadius: 4, background: e.ready ? C.emPale : C.paperWarm, color: e.ready ? C.emDeep : C.ink50 }}>
                {e.cls}
              </span>
              <span className="mono" style={{ fontSize: 9.5, color: C.ink30 }}>{e.sub}</span>
            </div>
            <h4 style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.35 }}>{e.name}</h4>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, borderTop: `1px solid rgba(0,0,0,0.04)`, paddingTop: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.ink30 }}>
                <Ic n={e.icon} s={12} c={C.ink30} /> 12 mins length
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: e.ready ? C.emBright : C.ink30 }}>
                {e.ready ? "Interactive Sandbox" : "Phase 2 Pipeline"}
              </span>
            </div>
            {!e.ready && (
              <span style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 700, background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: 4, color: C.ink50 }}>
                <Ic n="lock" s={8} c={C.ink50} /> Soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabGcp() {
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 20, color: C.ink }}>GCP Serverless Production Pipeline</h3>
        <p style={{ fontSize: 13.5, color: C.ink50, marginTop: 4 }}>
          Engineered to scale globally with minimal server overhead. Built 100% serverless for instantaneous latency.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr", alignItems: "center", gap: 12 }}>
          <div style={{ border: `1px solid ${C.line}`, padding: 14, borderRadius: 10, background: C.paper, textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 10, color: C.em }}>FRONTEND CLIENT</div>
            <h5 style={{ fontSize: 13.5, marginTop: 4 }}>HTML5 Sandbox + Audio</h5>
            <p style={{ fontSize: 11, color: C.ink50, marginTop: 3 }}>WebRTC media streams direct-piped.</p>
          </div>
          <Ic n="arrow" s={18} c={C.slate500} />
          <div style={{ border: `1px solid ${C.line}`, padding: 14, borderRadius: 10, background: C.paper, textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 10, color: C.violet }}>CLOUD RUN HOST</div>
            <h5 style={{ fontSize: 13.5, marginTop: 4 }}>WebSockets Core</h5>
            <p style={{ fontSize: 11, color: C.ink50, marginTop: 3 }}>Routes delta state maps to LLM.</p>
          </div>
          <Ic n="arrow" s={18} c={C.slate500} />
          <div style={{ border: `1px solid ${C.line}`, padding: 14, borderRadius: 10, background: C.paper, textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 10, color: C.gold }}>VERTEX AI AGENT</div>
            <h5 style={{ fontSize: 13.5, marginTop: 4 }}>Gemini 1.5 Flash</h5>
            <p style={{ fontSize: 11, color: C.ink50, marginTop: 3 }}>Context Caching system rules ($0.015/session).</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", gap: 10, background: C.paper, border: `1px solid ${C.line}`, padding: 14, borderRadius: 10 }}>
            <Ic n="shield" s={20} c={C.emBright} sw={2} />
            <div>
              <h5 style={{ fontSize: 12.5, color: C.ink }}>Grounding & RAG Core</h5>
              <p style={{ fontSize: 11, color: C.ink50, marginTop: 2, lineHeight: 1.45 }}>
                Syllabus queries are grounded with Vertex AI Search Index containing official K-12 textbooks, securing 100% accurate science explanations without hallucination.
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, background: C.paper, border: `1px solid ${C.line}`, padding: 14, borderRadius: 10 }}>
            <Ic n="check" s={20} c={C.violet} sw={2} />
            <div>
              <h5 style={{ fontSize: 12.5, color: C.ink }}>Cloud Firestore State Ledger</h5>
              <p style={{ fontSize: 11, color: C.ink50, marginTop: 2, lineHeight: 1.45 }}>
                Test tubes state, dipped indicators, and auto-generated tables are continuously synchronized in a secure Cloud Firestore ledger, enabling instant resume.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabB2b() {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 20, color: C.ink }}>B2B School Licensing Dashboard</h3>
        <p style={{ fontSize: 13.5, color: C.ink50, marginTop: 4 }}>
          SaaS telemetry tools for school teachers and coaching center administrators to manage practical science courses.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 26 }}>
        <div>
          <h5 style={{ fontSize: 13, color: C.ink, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.02em" }} className="mono">Active Student Transcripts</h5>
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden", background: C.paper }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "8px 12px", background: C.paperWarm, fontWeight: 700, fontSize: 10.5, color: C.ink70 }}>
              <span>Student Name</span>
              <span>Experiment</span>
              <span>Conceptual Grade</span>
            </div>
            {[
              { n: "Aarav Sharma", e: "Acids & Bases", g: "A (Perfect score)" },
              { n: "Diya Patel", e: "Acids & Bases", g: "B+ (1 tube incorrect)" },
              { n: "Kabir Singh", e: "Acids & Bases", g: "A- (All correct, 2 ver)" }
            ].map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "8px 12px", borderTop: `1px solid rgba(0,0,0,0.04)`, fontSize: 12, color: C.ink70 }}>
                <span style={{ fontWeight: 600 }}>{r.n}</span>
                <span>{r.e}</span>
                <span style={{ color: C.emDeep, fontWeight: 700 }}>{r.g}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, background: C.paper, border: `1px solid ${C.line}`, padding: 18, borderRadius: 10 }}>
          <h5 style={{ fontSize: 12, color: C.ink, textTransform: "uppercase" }} className="mono">Teacher Analytics Pack</h5>
          <ul style={{ fontSize: 12, color: C.ink70, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 8, lineHeight: 1.45 }}>
            <li><b>Classroom session reports</b>: Automatic export to PDF and Google Classroom.</li>
            <li><b>Safe Sandbox Telemetry</b>: Real-time alerts when students make dangerous chemical combinations.</li>
            <li><b>Syllabus scheduling</b>: Match classroom lectures with virtual practicals dynamically.</li>
            <li><b>Compute economics</b>: Licensed seat allocations billed annually.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LandingPage });
