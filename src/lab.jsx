/* ── The Immersive interactive 3D Acids & Bases Laboratory Desk ── */
import React from "react";
import { C } from "./tokens.js";
import { SUBSTANCES } from "./data.js";
import { Ic, Btn, SparkAvatar, VoiceWaveform } from "./ui.jsx";
import { ResultsTable, IntroOverlay } from "./labpanel.jsx";
import { sparkReact, gradeLab } from "./api.js";
const { useState: lUS, useEffect: lUE, useRef: lUR, useCallback: lUC } = React;

const STRIP_BLUE = "#2563eb";
const STRIP_RED = "#e11d48";

function dipResult(strip, type) {
  if (type === "acid")    return strip === "blue" ? { c: STRIP_RED,  changed: true  } : { c: STRIP_RED,  changed: false };
  if (type === "base")    return strip === "blue" ? { c: STRIP_BLUE, changed: false } : { c: STRIP_BLUE, changed: true  };
  return strip === "blue" ? { c: STRIP_BLUE, changed: false } : { c: STRIP_RED, changed: false };
}

function Lab({ onExit, onComplete, addXp }) {
  const [phase, setPhase] = lUS("intro");
  const [results, setResults] = lUS(() => Object.fromEntries(SUBSTANCES.map((s) => [s.id, { blue: null, red: null, verdict: null }])));
  
  // 3D Cabinet Locker states
  const [selectedSubs, setSelectedSubs] = lUS(["lemon", "vinegar", "soda", "soap", "salt", "water"]);
  const [cabinetOpen, setCabinetOpen] = lUS(true); // Default open locker on startup
  
  // Immersive 3D states
  const [activeSub, setActiveSub] = lUS(null); // Selected test tube id
  const [isDipping, setIsDipping] = lUS(false); // Guard: prevents re-triggering during a dip
  const [dipAnimated, setDipAnimated] = lUS(false); // Controls .dipped CSS class separately so transition fires
  const [dippedStrip, setDippedStrip] = lUS(null); // 'blue' | 'red'
  
  // Socratic AI voice questioning states
  const [answeredQuestions, setAnsweredQuestions] = lUS({});
  const [activeQuestion, setActiveQuestion] = lUS(null);
  const [selectedOption, setSelectedOption] = lUS(null);

  // Camera Rig tilt states for interactive parallax
  const [rotate, setRotate] = lUS({ x: 16, y: -6 });
  const viewportRef = lUR(null);

  const handleMouseMove = (e) => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalize coordinates: -0.5 to 0.5
    const normX = (x / rect.width) - 0.5;
    const normY = (y / rect.height) - 0.5;
    
    // Pitch/Yaw tilts: Pitch rotateX(10deg to 22deg), Yaw rotateY(-18deg to 6deg)
    const rx = 16 - normY * 12; 
    const ry = -6 + normX * 24;
    setRotate({ x: rx, y: ry });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 16, y: -6 });
  };

  const toggleSubstanceSelection = (id) => {
    if (!cabinetOpen) return;
    setSelectedSubs((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== id);
      } else {
        if (prev.length >= 6) {
          triggerVoiceResponse("Your workbench rack is full! You can load up to 6 chemicals at a time. Remove one first.", 3500);
          return prev;
        }
        return [...prev, id];
      }
    });
  };
  
  // Multimodal Live Voice states
  const [voiceActive, setVoiceActive] = lUS(true); // Microphone active toggle
  const [voiceSpeaking, setVoiceSpeaking] = lUS(false); // Soundwave visualizer pulse
  const [voiceMsg, setVoiceMsg] = lUS("Welcome back, scientist! I'm Spark. Today we're executing NCERT Chemistry Ch 5: Acids, Bases & Indicators. Select any everyday sample from the 3D rack to begin.");
  const [mood, setMood] = lUS("happy");
  const [graded, setGraded] = lUS(false);

  const triggerVoiceResponse = lUC((text, delay = 3500) => {
    setVoiceMsg(text);
    setMood("thinking");
    
    // Play virtual beep chime audio
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}

    // Synthesize actual voice out loud using the browser's Web Speech API
    if (voiceActive) {
      try {
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        
        // Pacing adjustments for academic and CBSE-aligned slow voice guidance
        utt.rate = 0.94;
        utt.pitch = 1.02;
        
        // Filter for high-quality English accent voices
        const vcs = window.speechSynthesis.getVoices();
        const prefer = vcs.find(v => v.lang.includes("en-IN")) || 
                       vcs.find(v => v.lang.includes("en-GB")) || 
                       vcs.find(v => v.lang.includes("en-US")) || 
                       vcs.find(v => v.lang.startsWith("en")) || 
                       vcs[0];
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
        // Safe UI fallback if speech synthesis is disabled or blocked
        setVoiceSpeaking(true);
        setTimeout(() => {
          setVoiceSpeaking(false);
          setMood("happy");
        }, delay);
      }
    } else {
      // Mock visual equalizer waves if muted
      setVoiceSpeaking(true);
      setTimeout(() => {
        setVoiceSpeaking(false);
        setMood("happy");
      }, delay);
    }
  }, [voiceActive]);

  const activeSubstances = SUBSTANCES.filter((s) => selectedSubs.includes(s.id));
  const tested = activeSubstances.filter((s) => results[s.id].blue || results[s.id].red);
  const allTested = tested.length === activeSubstances.length;
  const allVerdicts = activeSubstances.every((s) => results[s.id].verdict);

  const selectTube = (subId) => {
    if (isDipping) return;
    setActiveSub(subId);
    
    const sub = SUBSTANCES.find((s) => s.id === subId);
    if (!sub) return;

    if (!answeredQuestions[subId]) {
      setActiveQuestion({
        ...sub.question,
        subId: subId
      });
      setSelectedOption(null);
      triggerVoiceResponse(sub.question.q, 5000);
    } else {
      setActiveQuestion(null);
      triggerVoiceResponse(`Selected ${sub.name} (${sub.formula}). Indicator testing unlocked.`, 2200);
    }
  };

  const handleOptionClick = (idx) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    
    const correct = idx === activeQuestion.ans;
    if (correct) {
      triggerVoiceResponse(activeQuestion.correctMsg, 5000);
      setAnsweredQuestions((prev) => ({ ...prev, [activeQuestion.subId]: true }));
      addXp(15);
      setTimeout(() => {
        setActiveQuestion(null);
      }, 3500);
    } else {
      triggerVoiceResponse(activeQuestion.incorrectMsg, 4000);
      setTimeout(() => {
        setSelectedOption(null);
      }, 3200);
    }
  };

  const startLitmusTest = (strip) => {
    if (!activeSub || isDipping) return;
    
    if (activeQuestion) {
      triggerVoiceResponse("Socratic telemetry is locked! Answer Spark's conceptual question in the Voice HUD to unlock indicator testing.", 4000);
      return;
    }

    const sub = SUBSTANCES.find((s) => s.id === activeSub);
    if (!sub) return;

    setIsDipping(true);
    setDippedStrip(strip);   // mount strip at top:-100px (no dipped class yet)
    setMood("thinking");

    // Delay adding .dipped class by one frame so the CSS transition has a "before" state to animate from
    setTimeout(() => setDipAnimated(true), 60);

    triggerVoiceResponse(`Executing telemetry test... Dipping ${strip} litmus indicator into ${sub.name}...`, 1800);

    setTimeout(() => {
      const res = dipResult(strip, sub.type);
      const firstEver = !results[activeSub].blue && !results[activeSub].red;

      setResults((r) => ({ ...r, [activeSub]: { ...r[activeSub], [strip]: res } }));

      // Canned fallback used if the Gemini backend is unreachable.
      let spokenText = "";
      if (res.changed) {
        spokenText = `Aha! The ${strip} litmus turned ${strip === "blue" ? "red" : "blue"}! ${sub.name} is highly reactive, showing the presence of ${sub.type === "acid" ? "free hydrogen H+" : "hydroxyl OH-"} ions. Socratic chemistry at work! 🧪`;
      } else {
        spokenText = `Observation recorded: No colour change detected on the ${strip} litmus. ${sub.name} holds neutral properties (pH 7) or matches indicator boundaries. What verdict will you record?`;
      }

      // Real Spark: ask Gemini for a contextual spoken reaction to this dip.
      sparkReact({
        experiment: "Class 7 Chemistry — Acids, Bases & Indicators (litmus)",
        event: { action: "dip-litmus", strip, substance: sub.name, formula: sub.formula, colourChanged: res.changed },
        labState: { substanceType: sub.type },
      })
        .then((aiText) => triggerVoiceResponse(aiText || spokenText, 4500))
        .catch(() => triggerVoiceResponse(spokenText, 4500));

      if (firstEver) addXp(10);
    }, 1100);

    // Retract paper strip — extended to 5500ms so colour change is visible for ~4 seconds
    setTimeout(() => setDipAnimated(false), 5500);
    setTimeout(() => {
      setIsDipping(false);
      setDippedStrip(null);
    }, 6300);
  };

  lUE(() => {
    if (allTested && !graded) {
      triggerVoiceResponse("Excellent work! You have completed all litmus observations. 🎉 Now, analyze your data table and designate a verdict (Acid, Base, or Neutral) for each fluid tube.", 5000);
      addXp(20);
    }
  }, [allTested]);

  const setVerdict = (subId, v) => {
    setResults((r) => ({ ...r, [subId]: { ...r[subId], verdict: v } }));
    const sub = SUBSTANCES.find((s) => s.id === subId);
    if (sub) {
      triggerVoiceResponse(`Verdict saved: You designated ${sub.name} as ${v.toUpperCase()}.`, 1800);
    }
  };

  const submit = () => {
    const correct = activeSubstances.filter((s) => results[s.id].verdict === s.type).length;
    setGraded(true);
    const xp = 30 + correct * 8;
    addXp(xp);
    setMood("celebrate");

    triggerVoiceResponse(`Practical successfully graded! You accurately identified ${correct} out of ${activeSubstances.length} chemicals. Your CBSE Science Laboratory Transcript has been generated.`, 6000);

    const observations = activeSubstances.map((s) => ({
      name: s.name,
      formula: s.formula,
      correctType: s.type,
      studentVerdict: results[s.id].verdict,
    }));

    // Ask Gemini for personalised conceptual feedback; fall back to a generic note.
    // Keep the original ~3.2s celebration beat regardless of network speed.
    const minDelay = new Promise((r) => setTimeout(r, 3200));
    const feedback = gradeLab({
      experiment: "Class 7 Chemistry — Acids, Bases & Indicators (litmus)",
      observations,
    })
      .then((g) => g.feedback)
      .catch(() => null);

    Promise.all([feedback, minDelay]).then(([aiFeedback]) => {
      onComplete({
        results: Object.fromEntries(activeSubstances.map((s) => [s.id, results[s.id]])),
        correct,
        total: activeSubstances.length,
        xp,
        aiFeedback,
      });
    });
  };

  const guide = !activeSub
    ? { step: 1, text: "Select a chemical fluid sample tube from the 3D Rack to start Socratic voice testing", icon: "flask" }
    : !allTested
    ? { step: 2, text: "Dip blue or red litmus paper into the active tube on the test stand", icon: "drop" }
    : !allVerdicts
    ? { step: 3, text: "Examine swatches - assign chemical verdicts (Acid, Base, Neutral) in observations table", icon: "eye" }
    : { step: 3, text: "Observations complete! Submit results to compile CBSE Practical Transcript", icon: "check" };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.paper, overflow: "hidden" }}>
      <LabTopBar onExit={onExit} guide={guide} tested={tested.length} total={SUBSTANCES.length} onRestart={() => window.location.reload()} />
      
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Main 3D Desk Space */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }} className="blueprint-grid">
          <GuideBar guide={guide} />
          
          <div style={{ maxWidth: 860, margin: "0 auto", padding: "26px 32px 60px" }}>
            
            {/* Interactive 3D glassware scene viewport */}
            <div 
              className="lab-viewport-3d" 
              style={{ marginBottom: 28 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              ref={viewportRef}
            >
              {/* Lab Room Background Walls */}
              <div className="lab-room-bg">
                <div className="lab-wall-tiles" />
                <div className="lab-window-glow" />
                <div className="lab-poster-periodic">
                  <div className="lab-poster-periodic-grid">
                    {Array.from({ length: 18 }).map((_, idx) => (
                      <div key={idx} className="lab-poster-periodic-cell" />
                    ))}
                  </div>
                </div>
                <div className="lab-back-shelves">
                  <div className="shelf-line" style={{ top: "35%" }} />
                  <div className="shelf-line" style={{ top: "65%" }} />
                  <div className="shelf-beaker b1" />
                  <div className="shelf-beaker b2" />
                  <div className="shelf-beaker b3" />
                  <div className="shelf-beaker b4" />
                </div>
              </div>

              {/* Volumetric 3D Chemical Locker Cabinet */}
              <div 
                className="lab-cabinet-3d" 
                style={{ 
                  transform: `translateY(-50%) rotateY(${24 + rotate.y * 0.1}deg) translateZ(0px)` 
                }}
              >
                {/* 3D double swinging glass doors */}
                <div className={`cabinet-door-3d door-left ${cabinetOpen ? 'open' : ''}`} />
                <div className={`cabinet-door-3d door-right ${cabinetOpen ? 'open' : ''}`} />

                {/* Shelves inside locker */}
                <div className="cabinet-shelf-3d shelf-1" />
                <div className="cabinet-shelf-3d shelf-2" />
                <div className="cabinet-shelf-3d shelf-3" />

                {/* 10 Reagent bottles catalog */}
                {SUBSTANCES.map((sub, idx) => {
                  let shelfIndex = Math.floor(idx / 4); // 0, 1, 2
                  let bottleCol = idx % 4; // 0, 1, 2, 3
                  let bottomOffset = shelfIndex === 0 ? 202 : shelfIndex === 1 ? 110 : 18;
                  let leftOffset = 10 + bottleCol * 31;
                  
                  const isSelected = selectedSubs.includes(sub.id);

                  return (
                    <div 
                      key={sub.id} 
                      className="cabinet-bottle-slot"
                      style={{ left: leftOffset, bottom: bottomOffset }}
                      onClick={() => {
                        if (!cabinetOpen) return;
                        toggleSubstanceSelection(sub.id);
                      }}
                      title={`${sub.name} (${sub.formula})`}
                    >
                      <div className={`cabinet-bottle-3d ${isSelected ? 'selected' : ''}`}>
                        {/* Fluid color */}
                        <div className="cabinet-bottle-fluid" style={{ background: sub.liquid }} />
                        {/* Volumetric printed sticker tape label */}
                        <div className="chemical-sticker-label" style={{ top: "18%", width: "18px", height: "24px", border: "0.5px solid #cbd5e1" }}>
                          <div className="chemical-sticker-title" style={{ fontSize: "5px" }}>{sub.formula}</div>
                          <div className={`chemical-sticker-bar ${sub.type}`} style={{ height: "1px", marginTop: "1.5px" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {cabinetOpen && (
                <button 
                  className="cabinet-lock-btn press"
                  onClick={() => {
                    setCabinetOpen(false);
                    triggerVoiceResponse(`Excellent selection! You have loaded ${selectedSubs.length} chemicals onto your workbench rack. Select any fluid sample tube from the rack to start Socratic voice testing.`, 5000);
                  }}
                >
                  Close Locker & Begin Lab
                </button>
              )}

              {!cabinetOpen && (
                <button 
                  className="cabinet-lock-btn press"
                  style={{ left: "auto", right: "20px", bottom: "16px", background: "#3f3f46" }}
                  onClick={() => {
                    setCabinetOpen(true);
                    triggerVoiceResponse("Reagent Locker opened. Select or remove chemicals from the inventory slots.", 3500);
                  }}
                >
                  Open Locker Cabinet
                </button>
              )}

              {/* 3D Workbench Countertop Surface */}
              <div className="lab-workbench-surface" style={{ transform: `rotateX(32deg) rotateY(${rotate.y * 0.12}deg)` }} />

              {/* 3D Room Camera Viewport Rig */}
              <div 
                className="lab-camera-rig" 
                style={{ 
                  transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) translateZ(0px)` 
                }}
              >
                <div className="rack-3d-desk">
                  {/* Rack shadows cast on desk */}
                  <div className="rack-shadow-3d" />

                  {/* 3D Rack pillars and shelf */}
                  <div className="rack-base-3d" />
                  <div className="rack-bar-3d-back" />
                  <div className="rack-bar-3d-front" />
                  
                  {/* Volumetric Bunsen Burner with dual-color kinetic gas flame */}
                  <div className="bunsen-burner-3d">
                    <div className="burner-base" />
                    <div className="burner-collar" />
                    <div className="burner-barrel" />
                    <div className="burner-hose" />
                    <div className="burner-flame" />
                  </div>

                  {/* Volumetric measurement Beaker */}
                  <div className="beaker-3d">
                    <div className="beaker-liquid" />
                    <div className="beaker-ticks" />
                  </div>

                  {/* Volumetric round-bottom flask on mechanical stand */}
                  <div className="volumetric-flask-3d">
                    <div className="flask-stand-base" />
                    <div className="flask-stand-rod" />
                    <div className="flask-stand-ring" />
                    <div className="flask-glass-bulb">
                      <div className="flask-liquid-glowing" />
                    </div>
                    <div className="flask-glass-neck" />
                  </div>

                  {/* Translucent protective safety goggles */}
                  <div className="goggles-3d">
                    <div className="goggles-frame" />
                    <div className="goggles-lens-left" />
                    <div className="goggles-lens-right" />
                    <div className="goggles-strap" />
                  </div>
                  
                  {/* 3D Test stand with metallic rod and mechanical clamps */}
                  <div className="test-stand-3d">
                    <div className="test-stand-rod-3d" />
                    <div className="test-stand-clamp-3d" />
                    <div className="test-stand-socket-3d" />
                  </div>

                {/* 3D tubes stack */}
                {activeSubstances.map((s, i) => {
                  const r = results[s.id];
                  const isSelected = activeSub === s.id;
                  const originalLeft = 20 + i * 90;
                  
                  // Orbital translate path mapping
                  const tubeStyle = isSelected
                    ? {
                        left: "260px",
                        top: "35px",
                        transform: "translate3d(0, 0, 110px) scale(1.05) rotateY(360deg)",
                        zIndex: 40
                      }
                    : activeSub !== null
                    ? {
                        left: `${originalLeft}px`,
                        top: "15px",
                        transform: "translate3d(0, 0, 0) scale(0.85)",
                        opacity: 0.45,
                        zIndex: 10
                      }
                    : {
                        left: `${originalLeft}px`,
                        top: "15px",
                        transform: "translate3d(0, 0, 0)",
                        zIndex: 20
                      };

                  return (
                    <div 
                      key={s.id} 
                      className="tube-slot-3d"
                      onClick={() => selectTube(s.id)}
                      style={{ ...tubeStyle, cursor: isDipping ? "default" : "pointer" }}
                    >
                      {/* Realistic cylinders */}
                      <div 
                        className="tube-glass-3d" 
                        style={{ border: isSelected ? `2px solid ${C.emBright}` : "1.8px solid rgba(255, 255, 255, 0.35)" }}
                      >
                        {/* Volumetric printed sticker tape label */}
                        <div className="chemical-sticker-label">
                          <div className="chemical-sticker-title" style={{ fontSize: s.formula.length > 5 ? "6px" : "8px" }}>{s.formula}</div>
                          <div className={`chemical-sticker-bar ${s.type}`} />
                        </div>

                        {/* Fluid columns */}
                        <div className="fluid-column-3d" style={{ height: "55%", background: `linear-gradient(180deg, ${s.liquid}e6, ${shadeLiquid(s.liquid)}f2)` }}>
                          <div className="meniscus-cap-3d" />
                          {/* Bubbles */}
                          <div className="bubble-particle-3d" style={{ left: "20%", animationDelay: "0.2s" }} />
                          <div className="bubble-particle-3d" style={{ left: "45%", animationDelay: "0.9s", animationDuration: "1.8s" }} />
                          <div className="bubble-particle-3d" style={{ left: "70%", animationDelay: "1.4s", animationDuration: "2.8s" }} />
                        </div>

                        {/* Dipping Litmus paper strip inside tube */}
                        {isSelected && dippedStrip && (
                          <div
                            className={`litmus-paper-3d ${dipAnimated ? "dipped" : ""}`}
                            style={{ 
                              background: dippedStrip === "blue" ? STRIP_BLUE : STRIP_RED,
                              borderBottom: r[dippedStrip] ? `15px solid ${r[dippedStrip].c}` : "none"
                            }}
                          />
                        )}
                      </div>

                      {/* Chemical Telemetry label card floating below */}
                      {!activeSub && (
                        <div style={{ position: "absolute", bottom: -24, width: "100%", textAlign: "center", pointerEvents: "none" }}>
                          <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink70, lineHeight: 1.1 }}>{s.name}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div> {/* closes .rack-3d-desk */}
              </div> {/* closes .lab-camera-rig */}
            </div> {/* closes .lab-viewport-3d */}

            {/* Selected Substance Controller Console */}
            {activeSub && (
              <div className="card-glass reveal r1" style={{ padding: "20px 24px", marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, border: `1.5px solid ${C.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(2, 132, 199, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic n="flask" s={22} c="#0284c7" sw={2} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15.5, color: C.ink, fontWeight: 700 }}>
                      {SUBSTANCES.find(s => s.id === activeSub).name}{" "}
                      <span style={{ color: "#0284c7", fontSize: 12.5, fontWeight: 700 }}>
                        ({SUBSTANCES.find(s => s.id === activeSub).formula})
                      </span>
                    </h4>
                    <p style={{ fontSize: 12.5, color: C.ink50, marginTop: 2 }}>{SUBSTANCES.find(s => s.id === activeSub).hint}</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <Btn 
                    v="outline" 
                    sm 
                    icon="drop" 
                    disabled={isDipping || results[activeSub].blue || activeQuestion} 
                    onClick={() => startLitmusTest("blue")}
                    style={{ color: STRIP_BLUE, borderColor: STRIP_BLUE + "33" }}
                  >
                    Dip Blue Litmus
                  </Btn>
                  <Btn 
                    v="outline" 
                    sm 
                    icon="drop" 
                    disabled={isDipping || results[activeSub].red || activeQuestion} 
                    onClick={() => startLitmusTest("red")}
                    style={{ color: STRIP_RED, borderColor: STRIP_RED + "33" }}
                  >
                    Dip Red Litmus
                  </Btn>
                  <Btn v="light" sm onClick={() => setActiveSub(null)} disabled={isDipping}>
                    Return to Rack
                  </Btn>
                </div>
              </div>
            )}

            {/* Scientific Observation Ledger Table */}
            <ResultsTable activeSubstances={activeSubstances} results={results} graded={graded} onVerdict={setVerdict} />
            
            {allVerdicts && !graded && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                <Btn v="primary" lg icon="check" onClick={submit}>Grade & Compile Lab Transcript</Btn>
              </div>
            )}
            
            {graded && (
              <div style={{ textAlign: "center", marginTop: 28, animation: "scaleIn .5s both" }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.emBright }}>Compiling CBSE Transcript & Badges...</p>
              </div>
            )}
          </div>
        </div>

        {/* Futuristic Multimodal Voice HUD panel */}
        <aside className="voice-hud-panel">
          <div className="voice-hud-header">
            <SparkAvatar size={42} mood={mood} glow />
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
                Spark 
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: voiceActive ? C.lime : C.ink30, animation: voiceActive ? "pulse 2s infinite" : "none" }} />
              </div>
              <div className="mono" style={{ fontSize: 9.5, color: C.emBright, letterSpacing: "0.04em", fontWeight: 700 }}>GEMINI MULTIMODAL VOICE</div>
            </div>
          </div>

          {/* Soundwave matrix core */}
          <div className="voice-hud-soundwave-core">
            <VoiceWaveform active={voiceSpeaking} color={voiceSpeaking ? C.emBright : "#4f46e5"} />
          </div>

          {/* Spoken Speech overlay bubble & Socratic MCQs */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="voice-overlay-msg">
              <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.emBright, textTransform: "uppercase", marginBottom: 6 }}>
                Spoken Transcript Feed
              </div>
              {voiceMsg}
            </div>

            {activeQuestion && (
              <div className="voice-socratic-card">
                <div className="mono" style={{ fontSize: 9, fontWeight: 700, color: C.emBright, letterSpacing: "0.04em" }}>CONCEPTUAL SOCRATIC QUIZ</div>
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
              >
                <Ic n={voiceActive ? "mic" : "lock"} s={24} c="#fff" sw={2} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Onboarding Dialog overlay */}
      {phase === "intro" && (
        <IntroOverlay 
          onStart={() => { 
            setPhase("work"); 
            triggerVoiceResponse("Welcome scientist! Open the 3D Reagent Cabinet on the left to custom select your chemicals, then answer my Socratic questions to begin testing!", 6000); 
          }} 
        />
      )}
    </div>
  );
}

function LabTopBar({ onExit, tested, total, onRestart }) {
  return (
    <div data-embed-hide="1" style={{ height: 60, background: C.inkDeep, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", flexShrink: 0, zIndex: 30, borderBottom: `1px solid ${C.lineDark}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onExit} className="press" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.lineInk}`, color: "#fff", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <Ic n="back" s={14} c="#fff" sw={2} />Exit Workbench
        </button>
        <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(13,148,136,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="flask" s={15} c={C.emBright} sw={2} /></div>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1 }} className="font-display">Class 7 Chemistry Lab</div>
            <div className="mono" style={{ fontSize: 9.5, color: C.ink30, marginTop: 2 }}>EXP 05 · ACIDS & BASES</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="mono" style={{ fontSize: 11, color: C.ink30 }}>{tested}/{total} TUBE(S) TESTED</span>
          <div style={{ width: 120, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: (tested / total) * 100 + "%", background: `linear-gradient(90deg,${C.emBright},${C.lime})`, transition: "width .5s cubic-bezier(.16,1,.3,1)" }} />
          </div>
        </div>
        <button onClick={onRestart} title="Reset Bench" className="press" style={{ width: 34, height: 34, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.lineInk}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <Ic n="refresh" s={15} c={C.ink15} sw={2} />
        </button>
      </div>
    </div>
  );
}

function GuideBar({ guide }) {
  return (
    <div data-embed-hide="1" style={{ position: "sticky", top: 0, zIndex: 20, background: "rgba(248,250,252,0.9)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.line}`, padding: "10px 32px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[1, 2, 3].map((n) => (
            <span key={n} style={{ width: 22, height: 22, borderRadius: "50%", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", background: n < guide.step ? C.emBright : n === guide.step ? C.ink : C.paperWarm, color: n <= guide.step ? "#fff" : C.ink30 }}>
              {n < guide.step ? "✓" : n}
            </span>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: C.line }} />
        <Ic n={guide.icon} s={16} c={C.emBright} sw={2} />
        <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink70 }}>{guide.text}</span>
      </div>
    </div>
  );
}

function shadeLiquid(hex) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) - 18, g = ((n >> 8) & 255) - 18, b = (n & 255) - 18;
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  return `#${rHex}${gHex}${bHex}`;
}

export { Lab, GuideBar, dipResult, shadeLiquid };
