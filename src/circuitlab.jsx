/* ── The Immersive interactive 3D Simple Electric Circuit Laboratory ── */
import React from "react";
import { C } from "./tokens.js";
import { CIRCUIT_MATERIALS } from "./data.js";
import { Ic, SparkAvatar, VoiceWaveform } from "./ui.jsx";
import { GuideBar } from "./lab.jsx";
import { sparkReact, gradeLab } from "./api.js";
const { useState: cUS, useEffect: cUE, useRef: cUR, useCallback: cUC } = React;

function CircuitLab({ onExit, onComplete, addXp }) {
  const [phase, setPhase] = cUS("intro");
  
  // Results ledger states: stores connection logs, Socratic state, and verdict
  const [results, setResults] = cUS(() => 
    Object.fromEntries(CIRCUIT_MATERIALS.map((m) => [
      m.id, 
      { dipped: false, questionSolved: false, verdict: null }
    ]))
  );

  // Active slots and workbench state
  const [activeMaterialId, setActiveMaterialId] = cUS(null); // clamped material ID
  const [switchClosed, setSwitchClosed] = cUS(false); // switch open/closed

  // Parallax camera tilt states
  const [rotate, setRotate] = cUS({ x: 16, y: -6 });
  const viewportRef = cUR(null);

  // Socratic question states
  const [activeQuestion, setActiveQuestion] = cUS(null);
  const [selectedOption, setSelectedOption] = cUS(null);

  // Multimodal Voice states
  const [voiceActive, setVoiceActive] = cUS(true);
  const [voiceSpeaking, setVoiceSpeaking] = cUS(false);
  const [voiceMsg, setVoiceMsg] = cUS("Welcome, future physicist! I'm Spark. Today we are exploring Class 7 Chapter 3: Electricity — Circuits and their Components. Pick any everyday material from the pine inventory tray to clamp it into the gap.");
  const [mood, setMood] = cUS("happy");
  const [graded, setGraded] = cUS(false);

  // Spark speak synthesizer dispatcher
  const triggerVoiceResponse = cUC((text, delay = 4500) => {
    setVoiceMsg(text);
    setMood("thinking");

    // Play a dual-tone Web Audio API synth chime
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}

    if (voiceActive) {
      try {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 0.94; // slightly paced for clear, academic tone
        utt.pitch = 1.02;

        const voices = window.speechSynthesis.getVoices();
        const prefer = voices.find(v => v.lang.includes("en-IN")) ||
                       voices.find(v => v.lang.includes("en-GB")) ||
                       voices.find(v => v.lang.includes("en-US")) ||
                       voices.find(v => v.lang.startsWith("en")) ||
                       voices[0];
        if (prefer) utt.voice = prefer;

        utt.onstart = () => {
          setVoiceSpeaking(true);
        };
        utt.onend = () => {
          setVoiceSpeaking(false);
          setMood("happy");
        };
        utt.onerror = () => {
          setVoiceSpeaking(false);
          setMood("happy");
        };
        window.speechSynthesis.speak(utt);
      } catch (e) {
        // Safe UI fallback
        setVoiceSpeaking(true);
        setTimeout(() => {
          setVoiceSpeaking(false);
          setMood("happy");
        }, delay);
      }
    } else {
      setVoiceSpeaking(true);
      setTimeout(() => {
        setVoiceSpeaking(false);
        setMood("happy");
      }, delay);
    }
  }, [voiceActive]);

  // Initial greeting
  cUE(() => {
    setTimeout(() => {
      triggerVoiceResponse("Welcome back, physicist! Today we are exploring Chapter 3: Electricity — Circuits and their Components. Look at the workbench! We have a battery, wire clips, and a light bulb. Before we test our materials in the circuit gap, select any everyday material from the pine tray to clamp it into the gap!", 8000);
    }, 800);
  }, []);

  const handleMouseMove = (e) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Parallax normalization
    const normX = (x / rect.width) - 0.5;
    const normY = (y / rect.height) - 0.5;
    
    setRotate({
      x: 16 - normY * 10,
      y: -6 + normX * 20
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 16, y: -6 });
  };

  // Clamping a material into the gap
  const selectMaterial = (id) => {
    if (switchClosed) {
      setSwitchClosed(false); // Open the switch before swapping materials
    }
    setActiveMaterialId(id);
    setSelectedOption(null);

    const m = CIRCUIT_MATERIALS.find((item) => item.id === id);
    if (!m) return;

    const logged = results[id];
    if (!logged.questionSolved) {
      setActiveQuestion(m.question);
      triggerVoiceResponse(`Excellent! You selected the ${m.name}. Before we can close the knife switch and complete the circuit, let's solve the Socratic physics question on the whiteboard sidebar to unlock the battery connections!`, 6500);
    } else {
      setActiveQuestion(null);
      triggerVoiceResponse(`The ${m.name} is clamped securely between the alligator clips. The switch is unlocked! Close the knife switch to test its electrical conductivity.`, 5000);
    }

    setResults((prev) => ({
      ...prev,
      [id]: { ...prev[id], dipped: true }
    }));
  };

  // Handling Socratic option selections
  const handleOptionClick = (optIdx) => {
    if (!activeMaterialId || selectedOption !== null) return;

    const m = CIRCUIT_MATERIALS.find((item) => item.id === activeMaterialId);
    if (!m) return;

    setSelectedOption(optIdx);
    const isCorrect = optIdx === m.question.ans;

    if (isCorrect) {
      // Mark as solved
      setResults((prev) => ({
        ...prev,
        [activeMaterialId]: { ...prev[activeMaterialId], questionSolved: true }
      }));
      addXp(15);
      triggerVoiceResponse(m.question.correctMsg + " The switch is now unlocked! Go ahead and flip the knife switch down to test the circuit.", 6500);
      setTimeout(() => {
        setActiveQuestion(null);
      }, 4200);
    } else {
      triggerVoiceResponse(m.question.incorrectMsg, 4000);
      setTimeout(() => {
        setSelectedOption(null); // allow retrying
      }, 3000);
    }
  };

  // Toggling switch closed / open
  const toggleSwitch = () => {
    if (!activeMaterialId) {
      triggerVoiceResponse("Wait, physicist! You need to select and clamp an everyday material in the alligator clips gap first before closing the circuit switch.", 4500);
      return;
    }

    const currentMaterial = CIRCUIT_MATERIALS.find((item) => item.id === activeMaterialId);
    const state = results[activeMaterialId];
    
    if (!state.questionSolved) {
      triggerVoiceResponse("Concept lock active! You must answer the conceptual Socratic question in the whiteboard sidebar to unlock the switch terminals.", 5000);
      return;
    }

    const nextState = !switchClosed;
    setSwitchClosed(nextState);

    if (nextState) {
      const isConductor = currentMaterial.type === "conductor";
      const fallback = isConductor
        ? `Wow! Look at that glowing incandescent bulb! The ${currentMaterial.name} is made of ${currentMaterial.material}, which contains a highly mobile sea of free valence electrons. You've formed a complete closed conducting path!`
        : `The light bulb remains completely dark. The ${currentMaterial.name} is made of ${currentMaterial.material}. Its valence electrons are tightly bound in chemical bonds, representing an electrical insulator!`;
      if (isConductor) addXp(10);
      // Real Spark: ask Gemini to react to closing the circuit on this material.
      sparkReact({
        experiment: "Class 7 Physics — Simple Electric Circuit (conductors & insulators)",
        event: { action: "close-switch", material: currentMaterial.name, madeOf: currentMaterial.material, bulbGlows: isConductor },
        labState: { type: currentMaterial.type },
      })
        .then((aiText) => triggerVoiceResponse(aiText || fallback, 7500))
        .catch(() => triggerVoiceResponse(fallback, 7500));
    } else {
      triggerVoiceResponse("Knife switch opened. The circuit loop is broken, stopping all current flow.", 3500);
    }
  };

  // Verdict logs
  const handleVerdict = (id, verdict) => {
    setResults((prev) => ({
      ...prev,
      [id]: { ...prev[id], verdict }
    }));
  };

  // Check completion
  const testedCount = CIRCUIT_MATERIALS.filter((m) => results[m.id].dipped).length;
  const allTested = testedCount === CIRCUIT_MATERIALS.length;
  const allVerdicts = CIRCUIT_MATERIALS.every((m) => results[m.id].verdict);

  const handleSubmit = () => {
    setGraded(true);
    let correct = 0;
    CIRCUIT_MATERIALS.forEach((m) => {
      if (results[m.id].verdict === m.type) correct++;
    });

    triggerVoiceResponse(`Sandbox operations finalized! You scored ${correct} of ${CIRCUIT_MATERIALS.length} correct verdicts on CBSE Electrical Conductivity. Compiling transcript certification.`, 6000);

    const observations = CIRCUIT_MATERIALS.map((m) => ({
      name: m.name,
      madeOf: m.material,
      correctType: m.type,
      studentVerdict: results[m.id].verdict,
    }));

    const minDelay = new Promise((r) => setTimeout(r, 4500));
    const feedback = gradeLab({
      experiment: "Class 8 Physics — Simple Electric Circuit (conductors & insulators)",
      observations,
    })
      .then((g) => g.feedback)
      .catch(() => null);

    Promise.all([feedback, minDelay]).then(([aiFeedback]) => {
      onComplete({
        results: Object.fromEntries(CIRCUIT_MATERIALS.map((m) => [
          m.id,
          {
            dipped: results[m.id].dipped,
            verdict: results[m.id].verdict === m.type,
            switchClosed: switchClosed,
          },
        ])),
        correct: correct,
        total: CIRCUIT_MATERIALS.length,
        xp: correct * 15 + 90,
        aiFeedback,
      });
    });
  };

  // Guide message configurations
  const activeMaterial = CIRCUIT_MATERIALS.find(m => m.id === activeMaterialId);
  const guide = !activeMaterialId
    ? { step: 1, text: "Select an everyday material from the pine tray to clamp it into the circuit board gap.", icon: "bolt" }
    : !results[activeMaterialId].questionSolved
    ? { step: 2, text: "Solve Spark's conceptual Socratic physics question inside the whiteboard HUD to unlock the knife switch.", icon: "lock" }
    : !switchClosed
    ? { step: 3, text: `Switch unlocked! Click the red knob of the knife switch to close the circuit and test ${activeMaterial.name}.`, icon: "refresh" }
    : !allVerdicts
    ? { step: 3, text: "Observe the light bulb - record the material's verdict (Conductor or Insulator) in the Observations Ledger.", icon: "eye" }
    : { step: 3, text: "Observations recorded! Click 'Submit Lab Observations' to compile your official CBSE transcript.", icon: "check" };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.paper, overflow: "hidden" }}>
      {/* Dynamic Academic header */}
      <div data-embed-hide="1" style={{ height: 60, background: C.inkDeep, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", flexShrink: 0, zIndex: 30, borderBottom: `1px solid ${C.lineDark}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onExit} className="press" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.lineInk}`, color: "#fff", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Ic n="back" s={14} c="#fff" sw={2} />Exit Workbench
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(124,58,237,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="bolt" s={15} c={C.violet} sw={2} /></div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1 }} className="font-display">Class 7 Physics Lab</div>
              <div className="mono" style={{ fontSize: 9.5, color: C.ink30, marginTop: 2 }}>CH 3 · SIMPLE ELECTRIC CIRCUIT</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span className="mono" style={{ fontSize: 11, color: C.ink30 }}>{testedCount}/{CIRCUIT_MATERIALS.length} MATERIAL(S) TESTED</span>
            <div style={{ width: 120, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: (testedCount / CIRCUIT_MATERIALS.length) * 100 + "%", background: `linear-gradient(90deg,${C.violet},${C.lime})`, transition: "width .5s cubic-bezier(.16,1,.3,1)" }} />
            </div>
          </div>
          <button onClick={() => window.location.reload()} title="Reset Bench" className="press" style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.lineInk}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Ic n="refresh" s={15} c={C.ink15} sw={2} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Desk Space Area */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }} className="blueprint-grid">
          <GuideBar guide={guide} />

          <div style={{ maxWidth: 860, margin: "0 auto", padding: "26px 32px 60px" }}>
            {/* Interactive 3D physical circuit space */}
            <div 
              className="lab-viewport-3d" 
              style={{ marginBottom: 28 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              ref={viewportRef}
            >
              {/* Daylit Tiled Lab wall backdrop */}
              <div className="lab-room-bg">
                <div className="lab-wall-tiles" />
                <div className="lab-window-glow" />
                {/* CBSE physics circuit whiteboard poster */}
                <div className="lab-poster-periodic" style={{ width: 140, height: 95 }}>
                  <div style={{ textAlign: "center", fontSize: "5.5px", fontWeight: "bold", color: "#64748b", marginBottom: 3, letterSpacing: "0.2px" }}>CBSE SCHEMATIC SYMBOLS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", padding: 2 }}>
                    {[
                      { l: "Battery", sym: "🔋 ┤▮┤▮─" },
                      { l: "Bulb", sym: "💡 ─( 𝛀 )─" },
                      { l: "Switch", sym: "🔌 ─/ ─" },
                      { l: "Wire", sym: "⚡ ───" }
                    ].map((s, idx) => (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <span className="mono" style={{ fontSize: 5, color: C.ink50 }}>{s.l}</span>
                        <span className="mono" style={{ fontSize: 6.5, fontWeight: "bold", color: C.ink }}>{s.sym}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Wooden shelves inside classroom */}
                <div className="lab-back-shelves">
                  <div className="shelf-line" style={{ top: "35%" }} />
                  <div className="shelf-line" style={{ top: "65%" }} />
                  <div style={{ position: "absolute", left: 18, bottom: 8, fontSize: 18 }}>🧲</div>
                  <div style={{ position: "absolute", left: 44, bottom: 8, fontSize: 14 }}>🔩</div>
                  <div style={{ position: "absolute", left: 88, bottom: 68, fontSize: 16 }}>🔋</div>
                  <div style={{ position: "absolute", left: 116, bottom: 68, fontSize: 14 }}>📏</div>
                </div>
              </div>

              {/* Granite workbench benchtop surface */}
              <div className="lab-workbench-surface" style={{ transform: `rotateX(32deg) rotateY(${rotate.y * 0.12}deg)` }} />

              {/* 3D preserved camera space */}
              <div 
                className="lab-camera-rig" 
                style={{ 
                  transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(0px)` 
                }}
              >
                {/* 3D training board base */}
                <div className="circuit-board-3d">
                  
                  {/* WIRING PATH CONDUIT PATHS via custom CSS pipelines */}
                  <svg className="circuit-wire-svg">
                    {/* Wires connecting components */}
                    {/* Battery (+) to Switch */}
                    <path d="M 120 160 Q 60 160 50 85" fill="none" stroke={switchClosed && activeMaterial?.type === "conductor" ? "#f59e0b" : "#dc2626"} strokeWidth="3" strokeDasharray={switchClosed && activeMaterial?.type === "conductor" ? "4 2" : "none"} style={{ opacity: 0.95 }} />
                    {/* Switch to Gap (Left Clip) */}
                    <path d="M 110 55 Q 120 100 135 105" fill="none" stroke={switchClosed && activeMaterial?.type === "conductor" ? "#f59e0b" : "#dc2626"} strokeWidth="3" strokeDasharray={switchClosed && activeMaterial?.type === "conductor" ? "4 2" : "none"} style={{ opacity: 0.95 }} />
                    {/* Gap (Right Clip) to Bulb */}
                    <path d="M 185 105 Q 200 100 210 55" fill="none" stroke={switchClosed && activeMaterial?.type === "conductor" ? "#f59e0b" : "#1e293b"} strokeWidth="3" strokeDasharray={switchClosed && activeMaterial?.type === "conductor" ? "4 2" : "none"} style={{ opacity: 0.95 }} />
                    {/* Bulb to Battery (-) */}
                    <path d="M 230 85 Q 240 160 120 168" fill="none" stroke={switchClosed && activeMaterial?.type === "conductor" ? "#f59e0b" : "#1e293b"} strokeWidth="3" strokeDasharray={switchClosed && activeMaterial?.type === "conductor" ? "4 2" : "none"} style={{ opacity: 0.95 }} />
                  </svg>

                  {/* Battery Prop Cylinder */}
                  <div className="battery-3d">
                    <div className="battery-label" />
                    <div className="battery-cap-plus" />
                    <div className="battery-cap-minus" />
                  </div>

                  {/* Knife Switch Prop Assembly */}
                  <div className="switch-assembly-3d">
                    <div className="switch-base-3d" />
                    <div className="switch-terminals switch-term-a" />
                    <div className="switch-terminals switch-term-b" />
                    {activeMaterialId && !results[activeMaterialId].questionSolved && (
                      <div className="switch-lock-overlay" title="Concept lock active">
                        <span className="switch-lock-icon" style={{ fontSize: 16 }}>🔒</span>
                      </div>
                    )}
                    <div 
                      className={`switch-blade-3d ${switchClosed ? "closed" : "open"}`}
                      onClick={toggleSwitch}
                    />
                  </div>

                  {/* Slotted test everyday material blocks in slot gap */}
                  <div className="circuit-gap-3d">
                    <div className="alligator-clip-3d clip-left" />
                    <div className="alligator-clip-3d clip-right" />
                  </div>

                  {activeMaterialId && (
                    <div 
                      className={`slotted-material-block-3d block-${activeMaterialId}`}
                      title={activeMaterial.name}
                    />
                  )}

                  {/* Incandescent Light Bulb socket and casing */}
                  <div className="bulb-assembly-3d">
                    <div className="bulb-base-socket-3d" />
                    <div className="bulb-screw-threads" />
                    <div className={`bulb-glass-3d ${switchClosed && activeMaterial?.type === "conductor" ? "bulb-glow" : ""}`}>
                      <div className="bulb-filament-3d" />
                      {/* Emit sparkles when conducting */}
                      {switchClosed && activeMaterial?.type === "conductor" && (
                        Array.from({ length: 6 }).map((_, idx) => {
                          const angle = (idx / 6) * Math.PI * 2;
                          const dx = Math.cos(angle) * 32 + "px";
                          const dy = Math.sin(angle) * 32 + "px";
                          return (
                            <span 
                              key={idx} 
                              className="sparkle-particle"
                              style={{ 
                                left: "20px", 
                                top: "20px", 
                                "--dx": dx, 
                                "--dy": dy, 
                                animationDelay: idx * 0.15 + "s" 
                              }} 
                            />
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* wooden pine inventory shelf / locker tray */}
            <div className="circuit-inventory-tray" style={{ marginBottom: 28 }}>
              <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: "#854d0e", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
                Everyday Reagent Materials Drawer Shelf
              </div>
              <div className="circuit-tray-grid">
                {CIRCUIT_MATERIALS.map((m) => {
                  const state = results[m.id];
                  const isActive = activeMaterialId === m.id;
                  return (
                    <div 
                      key={m.id}
                      onClick={() => selectMaterial(m.id)}
                      className={`circuit-tray-slot press ${isActive ? "active" : ""}`}
                    >
                      <span className="circuit-tray-slot-emoji">{m.emoji}</span>
                      <span className="circuit-tray-slot-name">{m.name}</span>
                      {state.dipped && (
                        <span style={{ position: "absolute", top: 4, right: 6, fontSize: 9, color: state.questionSolved ? C.emDeep : C.gold }}>
                          {state.questionSolved ? "✓" : "⚡"}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* observations table - CBSE School Notebook theme */}
            <div className="observation-ledger">
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: `1px solid ${C.line}`, background: C.paperWarm }}>
                <Ic n="note" s={16} c={C.emBright} sw={2} />
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>School Science Journal Notebook Observations</h4>
                <span className="mono" style={{ fontSize: 10, color: C.ink30, marginLeft: "auto", fontWeight: 700 }}>TELEMETRY TRACKED</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.1fr 1.1fr 1.5fr", padding: "10px 20px", borderBottom: `1px solid ${C.line}`, background: C.paperWarm, gap: 10 }}>
                {["TEST SUBSTANCE", "LOOP STATUS", "BULB GLOW", "ELECTRICAL VERDICT"].map((h, idx) => (
                  <span key={h} className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.ink50, letterSpacing: "0.04em", textAlign: idx === 0 ? "left" : "center" }}>{h}</span>
                ))}
              </div>

              {CIRCUIT_MATERIALS.map((m, idx) => {
                const state = results[m.id];
                const activeDipped = activeMaterialId === m.id;
                const isConductor = m.type === "conductor";

                const correct = graded && state.verdict === m.type;
                const wrong = graded && state.verdict !== m.type;
                const rowClass = correct 
                  ? "observation-row-graded-correct" 
                  : wrong 
                  ? "observation-row-graded-incorrect" 
                  : "";

                return (
                  <div 
                    key={m.id}
                    className={rowClass}
                    style={{ 
                      display: "grid", 
                      gridTemplateColumns: "1.3fr 1.1fr 1.1fr 1.5fr", 
                      alignItems: "center", 
                      padding: "12px 20px", 
                      borderBottom: idx < CIRCUIT_MATERIALS.length - 1 ? `1px solid ${C.lineSoft}` : "none", 
                      gap: 10 
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.liquid, border: "0.5px solid #cbd5e1", flexShrink: 0 }} />
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{m.name} <span style={{ fontSize: 10, color: C.ink50, fontWeight: 700 }}>({m.material})</span></span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", fontSize: 11, color: state.dipped ? C.ink70 : C.ink15 }}>
                      {state.dipped ? "Closed Path" : "Awaiting Clamp"}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", fontSize: 11, fontWeight: 600, color: state.dipped ? (isConductor ? C.lime : C.ink50) : C.ink15 }}>
                      {state.dipped ? (isConductor ? "Glowing (Active)" : "Dark (Inactive)") : "—"}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {state.dipped ? (
                        <div style={{ display: "inline-flex", background: C.paperWarm, borderRadius: 6, padding: 2, gap: 2 }}>
                          {[
                            { k: "conductor", l: "Conductor", c: C.violet },
                            { k: "insulator", l: "Insulator", c: C.coral }
                          ].map((opt) => {
                            const sel = state.verdict === opt.k;
                            const isAns = graded && m.type === opt.k;
                            const wrongSel = graded && sel && m.type !== opt.k;
                            return (
                              <button
                                key={opt.k}
                                onClick={() => !graded && handleVerdict(m.id, opt.k)}
                                className="press"
                                style={{
                                  border: "none", cursor: graded ? "default" : "pointer", fontSize: 11, fontWeight: 700,
                                  padding: "4.5px 9px", borderRadius: 4, transition: "all .15s",
                                  background: isAns ? opt.c : sel ? (wrongSel ? C.coralPale : opt.c) : "transparent",
                                  color: isAns ? "#fff" : sel ? (wrongSel ? C.coral : "#fff") : C.ink50,
                                }}
                              >
                                {opt.l}{isAns && !sel ? " ✓" : ""}{wrongSel ? " ✗" : ""}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="mono" style={{ fontSize: 11, color: C.ink15 }}>awaiting test</span>
                      )}
                    </div>

                  </div>
                );
              })}

              {graded && (
                <div style={{ padding: "14px 20px", background: C.paperWarm, display: "flex", alignItems: "center", gap: 12, borderTop: `1px solid ${C.line}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: C.emPale, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ic n="trophy" s={16} c={C.emDeep} sw={2} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>
                    Practical Finished. Successful laboratory execution certificate transcript compiled.
                  </span>
                </div>
              )}
            </div>

            {/* Submit Ledger Button */}
            {allTested && allVerdicts && !graded && (
              <button 
                onClick={handleSubmit}
                className="btn-primary press"
                style={{ 
                  margin: "24px auto 0", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  padding: "12px 28px", 
                  borderRadius: 12, 
                  fontWeight: 700, 
                  fontSize: 14.5,
                  boxShadow: "0 8px 20px rgba(79,70,229,0.25)" 
                }}
              >
                <Ic n="check" s={16} c="#fff" sw={2.2} /> Submit Lab Observations & Compile Transcript
              </button>
            )}

          </div>
        </div>

        {/* Whiteboard Spoken HUD sidebar */}
        <aside className="voice-hud-panel">
          <div className="voice-hud-header">
            <SparkAvatar size={42} mood={mood} glow />
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
                Spark 
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: voiceActive ? C.lime : C.ink30, animation: voiceActive ? "pulse 2s infinite" : "none" }} />
              </div>
              <div className="mono" style={{ fontSize: 9.5, color: C.violet, letterSpacing: "0.04em", fontWeight: 700 }}>GEMINI MULTIMODAL VOICE</div>
            </div>
          </div>

          {/* sound wave waveform core */}
          <div className="voice-hud-soundwave-core">
            <VoiceWaveform active={voiceSpeaking} color={voiceSpeaking ? C.violet : "#7c3aed"} />
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="voice-overlay-msg">
              <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.violet, textTransform: "uppercase", marginBottom: 6 }}>
                Spoken Transcript Feed
              </div>
              {voiceMsg}
            </div>

            {/* Socratic Conceptual Quiz card */}
            {activeQuestion && (
              <div className="voice-socratic-card" style={{ borderLeft: `3px solid ${C.violet}`, background: "#f5f3ff" }}>
                <div className="mono" style={{ fontSize: 9, fontWeight: 700, color: C.violet, letterSpacing: "0.04em" }}>CONCEPTUAL SOCRATIC QUIZ</div>
                <div className="socratic-question-text">{activeQuestion.q}</div>
                <div className="socratic-options-list">
                  {activeQuestion.options.map((opt, oIdx) => {
                    const isCorrect = oIdx === activeQuestion.ans;
                    const isSelected = selectedOption === oIdx;
                    
                    let btnClass = "socratic-option-btn press";
                    if (selectedOption !== null) {
                      if (isSelected) {
                        btnClass += isCorrect ? " correct" : " incorrect";
                      }
                    }

                    return (
                      <button 
                        key={oIdx} 
                        className={btnClass}
                        onClick={() => handleOptionClick(oIdx)}
                        disabled={selectedOption !== null}
                        style={{ borderColor: isSelected && isCorrect ? C.lime : isSelected ? C.coral : C.line }}
                      >
                        {oIdx === 0 ? "A) " : "B) "}{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="voice-hud-controls">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="mono">
                <div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>WEBSOCKET FEED</div>
                <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700, marginTop: 2 }}>wss://cloudrun.live</div>
              </div>
              <div className="mono" style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>VOICE LOOP LATENCY</div>
                <div style={{ fontSize: 12, color: C.lime, fontWeight: 700, marginTop: 2 }}>540ms (Duplex)</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <button 
                onClick={() => {
                  const nextActive = !voiceActive;
                  setVoiceActive(nextActive);
                  if (!nextActive) {
                    try { window.speechSynthesis.cancel(); } catch (e) {}
                    setVoiceMsg("Microphone and voice synthesizer muted. Spark is listening quietly.");
                    setVoiceSpeaking(false);
                    setMood("happy");
                  } else {
                    setTimeout(() => {
                      triggerVoiceResponse("Voice tutor activated! Spark is ready to guide you vocally.", 3000);
                    }, 50);
                  }
                }}
                className={`voice-btn-mic ${voiceActive ? "active" : "muted"}`}
                style={{ background: voiceActive ? C.violet : "#cbd5e1" }}
              >
                <Ic n={voiceActive ? "mic" : "lock"} s={24} c="#fff" sw={2} />
              </button>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}

export { CircuitLab };
