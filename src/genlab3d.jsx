/* ── 3D version of the data-driven classification lab ──
   Uses the SAME shared lab room, instruments, lighting and Spark HUD as the
   flagship Acids & Bases lab (lab3dscene.jsx) so every experiment looks and
   feels identical. Each spec item is a 3D sample jar on the bench: tap to
   examine, then classify it. Reuses free narration + on-demand Ask Spark. */
import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { C } from "./tokens.js";
import { Ic, Btn, SparkAvatar, VoiceWaveform, useIsMobile } from "./ui.jsx";
import { GlassMaterial, LabRoom, BenchInstruments, SceneEnv } from "./lab3dscene.jsx";
import { Item3D, BarMagnet, ConductivityTester, LightRig, ThermoRig, Magnifier, GlowRig, BurnRig, ReflectRig, SlideRig, StatesRig, OpticsRig } from "./labitems3d.jsx";
import { AskSpark } from "./askspark.jsx";
import { gradeLab, sparkExplain } from "./api.js";
import { speak, cancelSpeech, loadClipManifest } from "./speech.js";

const { useState: gUS, useEffect: gUE, useRef: gUR, useCallback: gUC } = React;

/* Blend two hex colours → a CSS rgb() string (used to animate the indicator). */
function hexLerp(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = p(a), [br, bg, bb] = p(b);
  const m = (x, y) => Math.round(x + (y - x) * t);
  return `rgb(${m(ar, br)},${m(ag, bg)},${m(ab, bb)})`;
}

/* Neutralisation station (mode "mix"): a beaker of universal-indicator solution
   that starts at the sample's nature colour (acidic = red, basic = purple) and
   turns neutral green as the matching dropper — a base for an acid, an acid for
   a base — is added. */
function NeutraliseStation({ activeItem }) {
  const matRef = gUR(), dropRef = gUR(), prog = gUR(0), lastId = gUR(null);
  const acidic = activeItem && activeItem.category === "addbase";
  const startCol = acidic ? "#e8443a" : "#7c3aed";
  const agentCol = acidic ? "#5a4fc4" : "#e8443a"; // base added to an acid / acid added to a base
  const H = 0.5, liqH = 0.34;
  useFrame((s, dt) => {
    if (!activeItem) { prog.current = 0; return; }
    if (lastId.current !== activeItem.id) { lastId.current = activeItem.id; prog.current = 0; }
    prog.current = Math.min(1, prog.current + dt * 0.45);
    if (matRef.current) {
      const c = hexLerp(startCol, "#3f9b54", prog.current);
      matRef.current.color.set(c); matRef.current.emissive.set(c);
    }
    if (dropRef.current) {
      const fall = (s.clock.elapsedTime % 0.7) / 0.7;
      dropRef.current.position.y = 0.55 - fall * 0.17;
      dropRef.current.visible = prog.current < 1;
    }
  });
  return (
    <group position={[0, 0, 0.66]} scale={1.2}>
      <mesh castShadow position={[0, H / 2, 0]}><cylinderGeometry args={[0.22, 0.2, H, 40, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.2, 0.2, 0.024, 40]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, H, 0]}><torusGeometry args={[0.22, 0.01, 10, 40]} /><GlassMaterial /></mesh>
      <mesh position={[0, liqH / 2 + 0.02, 0]}><cylinderGeometry args={[0.198, 0.182, liqH, 40]} /><meshStandardMaterial ref={matRef} color={startCol} emissive={startCol} emissiveIntensity={0.18} transparent opacity={0.78} roughness={0.15} /></mesh>
      {activeItem && (
        <>
          <mesh position={[0, 0.8, 0]}><sphereGeometry args={[0.05, 18, 18]} /><meshStandardMaterial color={agentCol} roughness={0.4} /></mesh>
          <mesh position={[0, 0.66, 0]}><cylinderGeometry args={[0.016, 0.009, 0.22, 16]} /><GlassMaterial opacity={0.5} /></mesh>
          <mesh ref={dropRef} position={[0, 0.54, 0]}><sphereGeometry args={[0.016, 12, 12]} /><meshStandardMaterial color={agentCol} transparent opacity={0.9} /></mesh>
        </>
      )}
      <Html position={[0, H + 0.16, 0]} center distanceFactor={3.5} occlude={false}>
        <div style={{ pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "#fff", background: activeItem ? (acidic ? "#5a4fc4" : "#e8443a") : "rgba(15,23,42,0.8)", padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>
          {activeItem ? (acidic ? "Adding a base →" : "Adding an acid →") : "Universal indicator"}
        </div>
      </Html>
    </group>
  );
}

/* Rusting station (mode "rust"): an iron nail stands in a test tube. When the
   set-up allows rusting (air + moisture) the nail slowly turns rust-brown and
   dull; when air or moisture is shut out it stays bright and shiny. */
function RustStation({ activeItem }) {
  const nailRef = gUR(), prog = gUR(0), lastId = gUR(null);
  const rusts = activeItem && activeItem.category === "rusts";
  useFrame((_, dt) => {
    if (!activeItem) { prog.current = 0; return; }
    if (lastId.current !== activeItem.id) { lastId.current = activeItem.id; prog.current = 0; }
    prog.current = Math.min(1, prog.current + dt * 0.4);
    const m = nailRef.current && nailRef.current.material;
    if (m) {
      m.color.set(rusts ? hexLerp("#c3c7cd", "#9a5b32", prog.current) : "#c3c7cd");
      m.metalness = rusts ? 0.9 * (1 - prog.current * 0.85) : 0.92;
      m.roughness = rusts ? 0.3 + prog.current * 0.55 : 0.28;
    }
  });
  const H = 0.46;
  return (
    <group position={[0, 0, 0.66]} scale={1.2}>
      {/* test tube */}
      <mesh position={[0, 0.26, 0]}><cylinderGeometry args={[0.085, 0.085, H, 32, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.04, 0]}><sphereGeometry args={[0.085, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.49, 0]}><torusGeometry args={[0.085, 0.008, 10, 32]} /><GlassMaterial /></mesh>
      {/* a little water at the bottom when moisture is present */}
      {rusts && <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.08, 0.08, 0.12, 28]} /><meshStandardMaterial color="#bfe3f0" transparent opacity={0.55} roughness={0.2} /></mesh>}
      {/* the iron nail standing upright */}
      <group rotation={[0, 0, 0.06]}>
        <mesh ref={nailRef} position={[0, 0.22, 0]}><cylinderGeometry args={[0.013, 0.013, 0.34, 16]} /><meshStandardMaterial color="#c3c7cd" metalness={0.92} roughness={0.28} /></mesh>
        <mesh position={[0, 0.39, 0]}><cylinderGeometry args={[0.03, 0.03, 0.016, 18]} /><meshStandardMaterial color="#c3c7cd" metalness={0.9} roughness={0.3} /></mesh>
      </group>
      <Html position={[0, H + 0.18, 0]} center distanceFactor={3.5} occlude={false}>
        <div style={{ pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "#fff", background: activeItem ? (rusts ? "#9a5b32" : "#0d9488") : "rgba(15,23,42,0.8)", padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>
          {activeItem ? (rusts ? "Rusting…" : "Stays shiny") : "Iron nail set-up"}
        </div>
      </Html>
    </group>
  );
}

/* Tyndall station (mode "tyndall"): a beam of light is shone through the liquid.
   A true solution stays clear (beam invisible inside), a colloid scatters the
   light so its path glows (the Tyndall effect), and a suspension is cloudy with
   particles that settle at the bottom. */
function TyndallStation({ activeItem }) {
  const cat = activeItem && activeItem.category;
  const colloid = cat === "colloid", suspension = cat === "suspension";
  const liqColor = activeItem ? activeItem.color : "#bfe3f0";
  const H = 0.5, liqH = 0.34, midY = liqH / 2 + 0.02;
  return (
    <group position={[0, 0, 0.66]} scale={1.2}>
      <mesh castShadow position={[0, H / 2, 0]}><cylinderGeometry args={[0.22, 0.2, H, 40, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.2, 0.2, 0.024, 40]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, H, 0]}><torusGeometry args={[0.22, 0.01, 10, 40]} /><GlassMaterial /></mesh>
      <mesh position={[0, midY, 0]}><cylinderGeometry args={[0.198, 0.182, liqH, 40]} /><meshStandardMaterial color={liqColor} transparent opacity={suspension ? 0.92 : colloid ? 0.6 : 0.3} roughness={0.15} /></mesh>
      {suspension && <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.176, 0.176, 0.05, 32]} /><meshStandardMaterial color={liqColor} roughness={1} /></mesh>}
      {activeItem && (
        <group position={[-0.42, midY, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.06, 0.16, 18]} /><meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.05, 0.05, 0.01, 18]} /><meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1.6} /></mesh>
        </group>
      )}
      {activeItem && <mesh position={[-0.3, midY, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.012, 0.012, 0.16, 12]} /><meshBasicMaterial color="#fde047" transparent opacity={0.5} depthWrite={false} /></mesh>}
      {colloid && <mesh position={[0, midY, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.022, 0.022, 0.4, 14]} /><meshBasicMaterial color="#fef08a" transparent opacity={0.85} depthWrite={false} /></mesh>}
      <Html position={[0, H + 0.16, 0]} center distanceFactor={3.5} occlude={false}>
        <div style={{ pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "#fff", background: activeItem ? (colloid ? "#d97706" : suspension ? "#b45309" : "#0284c7") : "rgba(15,23,42,0.8)", padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>
          {activeItem ? (colloid ? "Tyndall beam visible" : suspension ? "Cloudy — settles" : "Clear solution") : "Shine a light"}
        </div>
      </Html>
    </group>
  );
}

/* Food-test station (mode "reagent"): a drop of the test reagent is added to the
   food sample in a spotting tile and the well turns the test's positive colour —
   blue-black for starch (iodine), violet for protein (Biuret), oily yellow for fat. */
function FoodTestStation({ activeItem }) {
  const matRef = gUR(), prog = gUR(0), lastId = gUR(null), dropRef = gUR();
  const cat = activeItem && activeItem.category;
  const resultCol = cat === "starch" ? "#312e81" : cat === "protein" ? "#7c3aed" : "#eab308";
  const reagent = cat === "starch" ? "Add iodine →" : cat === "protein" ? "Add Biuret reagent →" : "Rub on paper →";
  useFrame((s, dt) => {
    if (!activeItem) { prog.current = 0; return; }
    if (lastId.current !== activeItem.id) { lastId.current = activeItem.id; prog.current = 0; }
    prog.current = Math.min(1, prog.current + dt * 0.5);
    if (matRef.current) matRef.current.color.set(hexLerp("#f5f5f4", resultCol, prog.current));
    if (dropRef.current) { const f = (s.clock.elapsedTime % 0.7) / 0.7; dropRef.current.position.y = 0.34 - f * 0.2; dropRef.current.visible = prog.current < 1; }
  });
  return (
    <group position={[0, 0, 0.6]} scale={1.2}>
      <mesh position={[0, 0.04, 0]}><boxGeometry args={[0.5, 0.07, 0.34]} /><meshStandardMaterial color="#e7e5e4" roughness={0.7} /></mesh>
      {[-0.15, 0.15].map((px) => (
        <mesh key={px} position={[px, 0.078, 0]}><cylinderGeometry args={[0.055, 0.055, 0.03, 24]} /><meshStandardMaterial color="#d6d3d1" roughness={0.6} /></mesh>
      ))}
      <mesh position={[0, 0.082, 0]}><cylinderGeometry args={[0.06, 0.06, 0.032, 28]} /><meshStandardMaterial ref={matRef} color="#f5f5f4" roughness={0.45} /></mesh>
      {activeItem && (<>
        <mesh position={[0, 0.46, 0]}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial color={cat === "fat" ? "#cbd5e1" : resultCol} roughness={0.4} /></mesh>
        <mesh position={[0, 0.34, 0]}><cylinderGeometry args={[0.016, 0.009, 0.2, 12]} /><GlassMaterial opacity={0.5} /></mesh>
        <mesh ref={dropRef} position={[0, 0.22, 0]}><sphereGeometry args={[0.015, 12, 12]} /><meshStandardMaterial color={cat === "fat" ? "#fde68a" : resultCol} transparent opacity={0.9} /></mesh>
      </>)}
      <Html position={[0, 0.56, 0]} center distanceFactor={3.5} occlude={false}>
        <div style={{ pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "#fff", background: activeItem ? (cat === "starch" ? "#312e81" : cat === "protein" ? "#7c3aed" : "#a16207") : "rgba(15,23,42,0.8)", padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>
          {activeItem ? reagent : "Food test tile"}
        </div>
      </Html>
    </group>
  );
}

/* Float tank (mode "float"): the sample is dropped into a water tank — it bobs on
   the surface if it floats, or sinks to the bottom if it is denser than water. */
function FloatTank({ activeItem }) {
  const obj = gUR(), lastId = gUR(null);
  const floats = activeItem && activeItem.category === "float";
  const H = 0.5, liqH = 0.36;
  useFrame((s) => {
    if (!obj.current || !activeItem) return;
    if (lastId.current !== activeItem.id) { lastId.current = activeItem.id; obj.current.position.y = 0.52; }
    const target = floats ? liqH + Math.sin(s.clock.elapsedTime * 2) * 0.012 : 0.08;
    obj.current.position.y += (target - obj.current.position.y) * 0.08;
  });
  return (
    <group position={[0, 0, 0.66]} scale={1.2}>
      <mesh castShadow position={[0, H / 2, 0]}><cylinderGeometry args={[0.22, 0.2, H, 40, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.2, 0.2, 0.024, 40]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, H, 0]}><torusGeometry args={[0.22, 0.01, 10, 40]} /><GlassMaterial /></mesh>
      <mesh position={[0, liqH / 2 + 0.02, 0]}><cylinderGeometry args={[0.198, 0.182, liqH, 40]} /><meshStandardMaterial color="#bfe3f0" transparent opacity={0.55} roughness={0.15} /></mesh>
      {activeItem && <mesh ref={obj} castShadow position={[0, 0.52, 0]}><boxGeometry args={[0.12, 0.1, 0.12]} /><meshStandardMaterial color={activeItem.color} roughness={0.5} metalness={0.1} /></mesh>}
      <Html position={[0, H + 0.16, 0]} center distanceFactor={3.5} occlude={false}>
        <div style={{ pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "#fff", background: activeItem ? (floats ? "#0d9488" : "#b45309") : "rgba(15,23,42,0.8)", padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>
          {activeItem ? (floats ? "Floats" : "Sinks") : "Tank of water"}
        </div>
      </Html>
    </group>
  );
}

/* Water station for the solubility lab — the beaker shows the dissolving result. */
function WaterStation({ activeItem }) {
  const soluble = activeItem && activeItem.category === "soluble";
  const insoluble = activeItem && activeItem.category === "insoluble";
  const waterColor = soluble ? activeItem.color : "#bfe3f0";
  const H = 0.5, liqH = 0.34;
  return (
    <group position={[0, 0, 0.66]} scale={1.2}>
      <mesh castShadow position={[0, H / 2, 0]}><cylinderGeometry args={[0.22, 0.2, H, 40, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.2, 0.2, 0.024, 40]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, H, 0]}><torusGeometry args={[0.22, 0.01, 10, 40]} /><GlassMaterial /></mesh>
      <mesh position={[0, liqH / 2 + 0.02, 0]}><cylinderGeometry args={[0.198, 0.182, liqH, 40]} /><meshStandardMaterial color={waterColor} transparent opacity={insoluble ? 0.82 : 0.6} roughness={0.15} emissive={waterColor} emissiveIntensity={soluble ? 0.15 : 0.04} /></mesh>
      {insoluble && activeItem.shape !== "liquid" && (
        <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.17, 0.17, 0.05, 32]} /><meshStandardMaterial color={activeItem.color} roughness={1} /></mesh>
      )}
      {insoluble && activeItem.shape === "liquid" && (
        <mesh position={[0, liqH + 0.005, 0]}><cylinderGeometry args={[0.196, 0.196, 0.04, 40]} /><meshStandardMaterial color={activeItem.color} transparent opacity={0.85} roughness={0.2} /></mesh>
      )}
      <mesh position={[0.09, 0.36, 0]} rotation={[0, 0, 0.16]}><cylinderGeometry args={[0.008, 0.008, 0.52, 12]} /><GlassMaterial opacity={0.5} /></mesh>
      <Html position={[0, H + 0.14, 0]} center distanceFactor={3.5} occlude={false}>
        <div style={{ pointerEvents: "none", fontSize: 11, fontWeight: 700, color: "#0369a1", background: "rgba(255,255,255,0.88)", padding: "2px 9px", borderRadius: 6, whiteSpace: "nowrap" }}>Beaker of Water</div>
      </Html>
    </group>
  );
}

function GenScene({ spec, items, active, tested, onExamine }) {
  const n = items.length;
  const positions = items.map((_, i) => [(i - (n - 1) / 2) * 0.62, 0.02, 0.12]);
  const activeIdx = items.findIndex((it) => it.id === active);
  const activeItem = items[activeIdx];
  const activeX = activeIdx >= 0 ? positions[activeIdx][0] : 0;
  return (
    <>
      <SceneEnv />
      <LabRoom />
      <BenchInstruments />
      {items.map((it, i) => (
        <Item3D
          key={it.id}
          item={it}
          position={positions[i]}
          selected={active === it.id}
          tested={!!tested[it.id]}
          accent={spec.accent}
          lift={spec.mode === "magnet" && active === it.id && it.category === "magnetic" ? 1 : 0}
          onExamine={onExamine}
        />
      ))}
      {spec.mode === "magnet" && <BarMagnet activeX={activeX} active={activeIdx >= 0} attracted={!!(activeItem && activeItem.category === "magnetic")} />}
      {spec.mode === "water" && <WaterStation activeItem={activeItem} />}
      {spec.mode === "mix" && <NeutraliseStation activeItem={activeItem} />}
      {spec.mode === "rust" && <RustStation activeItem={activeItem} />}
      {spec.mode === "burn" && activeIdx >= 0 && <BurnRig x={activeX} burning={!!(activeItem && activeItem.category === "combustible")} />}
      {spec.mode === "reflect" && activeIdx >= 0 && <ReflectRig x={activeX} regular={!!(activeItem && activeItem.category === "regular")} />}
      {spec.mode === "slide" && activeIdx >= 0 && <SlideRig x={activeX} lowFriction={!!(activeItem && activeItem.category === "low")} />}
      {spec.mode === "tyndall" && <TyndallStation activeItem={activeItem} />}
      {spec.mode === "states" && activeIdx >= 0 && <StatesRig x={activeX} state={activeItem.category} />}
      {spec.mode === "reagent" && <FoodTestStation activeItem={activeItem} />}
      {spec.mode === "float" && <FloatTank activeItem={activeItem} />}
      {spec.mode === "optics" && activeIdx >= 0 && <OpticsRig x={activeX} converging={!!(activeItem && activeItem.category === "convex")} />}
      {spec.mode === "examine" && activeIdx >= 0 && <ConductivityTester position={[activeX, 0.0, 0.6]} lit={!!(activeItem && (activeItem.category === "metal" || activeItem.category === "conductor"))} />}
      {spec.mode === "light" && activeIdx >= 0 && <LightRig x={activeX} category={activeItem.category} />}
      {spec.mode === "thermo" && activeIdx >= 0 && <ThermoRig x={activeX} temp={activeItem.temp} />}
      {spec.mode === "inspect" && activeIdx >= 0 && <Magnifier x={activeX} />}
      {spec.mode === "glow" && activeIdx >= 0 && <GlowRig x={activeX} lit={!!(activeItem && activeItem.category === "luminous")} />}
    </>
  );
}

export function GenLab3D({ spec, onExit, onComplete, addXp }) {
  const items = spec.items;
  const isMobile = useIsMobile();
  const socratic = !!(spec.socratic && spec.socratic.enabled);
  const [tested, setTested] = gUS({});
  const [verdicts, setVerdicts] = gUS({});
  const [predictions, setPredictions] = gUS({}); // itemId -> { category, reason }
  const [predictFor, setPredictFor] = gUS(null); // item awaiting a prediction (opens the overlay)
  const [predReason, setPredReason] = gUS("");
  const [active, setActive] = gUS(null);
  const [graded, setGraded] = gUS(false);
  const [voiceOn, setVoiceOn] = gUS(true);
  const [speaking, setSpeaking] = gUS(false);
  const [mood, setMood] = gUS("happy");
  const [msg, setMsg] = gUS(
    socratic
      ? `Welcome to the ${spec.title} lab! ${spec.aim} Here we work like real scientists — before each test, I'll ask you to predict what happens. Tap a sample on the bench to make your first prediction.`
      : `Welcome to the ${spec.title} lab! ${spec.aim} Drag to look around, then tap a sample on the bench to examine it.`
  );
  const [showQuiz, setShowQuiz] = gUS(false);
  const [picked, setPicked] = gUS(null);
  const answeredRef = gUR(false);

  const labelFor = (key) => { const c = (spec.categories || []).find((c) => c.key === key); return c ? c.label : key; };

  gUE(() => { loadClipManifest(); return () => cancelSpeech(); }, []);

  const say = gUC((text) => {
    setMsg(text); setMood("thinking");
    if (!voiceOn) { setSpeaking(true); setTimeout(() => { setSpeaking(false); setMood("happy"); }, 2400); return; }
    speak(text, { onStart: () => setSpeaking(true), onEnd: () => { setSpeaking(false); setMood("happy"); } });
  }, [voiceOn]);

  const testedCount = items.filter((i) => tested[i.id]).length;
  const allTested = testedCount === items.length;
  const allVerdicts = items.every((i) => verdicts[i.id]);

  // Reveal the sample (run the 3D test + narrate). In Socratic mode the narration
  // becomes a prediction-vs-result contrast; otherwise it's the plain fact.
  const reveal = (item, pred) => {
    setActive(item.id);
    setTested((t) => ({ ...t, [item.id]: true }));
    if (socratic && pred) explainPrediction(item, pred);
    else say(item.fact);
  };

  // Contrast the student's prediction with what actually happened. Hits use a free
  // local template; only MISSES call Gemini (the moment that needs real teaching).
  const explainPrediction = async (item, pred) => {
    const hit = pred.category === item.category;
    const predLabel = labelFor(pred.category), correctLabel = labelFor(item.category);
    if (hit) { addXp(5); say(`Great prediction — you said ${predLabel}, and you're right! ${item.fact}`); return; }
    // instant free feedback first, then refine with Gemini if reachable
    say(`Good scientific guess! You predicted ${predLabel}. Let's see what really happens… ${item.fact}`);
    try {
      const better = await sparkExplain({
        experiment: `${spec.cls} ${spec.subject} — ${spec.title}`,
        item: item.name, prediction: predLabel, actual: correctLabel, reason: pred.reason, wasCorrect: false,
      });
      if (better) say(better);
    } catch { /* keep the local template */ }
  };

  const examine = (item) => {
    // Socratic gate: first tap on an un-predicted item opens the prediction overlay.
    if (socratic && !predictions[item.id]) { setPredictFor(item); setPredReason(""); return; }
    reveal(item, predictions[item.id]);
  };

  const submitPrediction = (cat) => {
    const item = predictFor; if (!item) return;
    const pred = { category: cat, reason: predReason.trim() };
    setPredictions((p) => ({ ...p, [item.id]: pred }));
    setPredictFor(null); setPredReason("");
    reveal(item, pred);
  };

  const setVerdict = (id, cat) => { if (!graded) setVerdicts((v) => ({ ...v, [id]: cat })); };

  const answerQuiz = (idx) => {
    if (answeredRef.current) return;
    setPicked(idx);
    if (idx === spec.question.ans) { answeredRef.current = true; addXp(15); say(spec.question.correctMsg); setTimeout(() => setShowQuiz(false), 3000); }
    else { say(spec.question.incorrectMsg); setTimeout(() => setPicked(null), 2800); }
  };

  const submit = () => {
    const correct = items.filter((i) => verdicts[i.id] === i.category).length;
    setGraded(true);
    const xp = 30 + correct * 8; addXp(xp); setMood("celebrate");
    say(`Great work! You classified ${correct} of ${items.length} correctly. Compiling your lab report.`);
    const observations = items.map((i) => ({
      name: i.name, correct: i.category, studentVerdict: verdicts[i.id],
      prediction: predictions[i.id]?.category ?? null,
      predictionReason: predictions[i.id]?.reason ?? null,
    }));
    // Inquiry signal: how often the student's up-front hypothesis matched reality.
    const predicted = observations.filter((o) => o.prediction);
    const predictionAccuracy = predicted.length
      ? predicted.filter((o) => o.prediction === o.correct).length / predicted.length : null;
    const minDelay = new Promise((r) => setTimeout(r, 2600));
    const feedback = gradeLab({ experiment: `${spec.cls} ${spec.subject} — ${spec.title}`, observations }).then((g) => g.feedback).catch(() => null);
    Promise.all([feedback, minDelay]).then(([aiFeedback]) => {
      onComplete({ experimentId: spec.id, correct, total: items.length, xp, aiFeedback, generic: true, title: spec.title, aim: spec.aim, conclusion: spec.conclusion, observations, predictionAccuracy, chapter: spec.chapter, cls: spec.cls, subject: spec.subject });
    });
  };

  const activeItem = items.find((i) => i.id === active);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.paper }} className="grid-blueprint">
      {/* header */}
      <div style={{ height: 60, background: C.inkDeep, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", flexShrink: 0, zIndex: 30, borderBottom: `1px solid ${C.lineDark}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onExit} className="press" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.lineInk}`, color: "#fff", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Ic n="back" s={14} c="#fff" sw={2} />Exit Lab
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: spec.accent + "30", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n={spec.icon} s={15} c="#fff" sw={2} /></div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1 }} className="font-display">{spec.title} · 3D Lab</div>
              <div className="mono" style={{ fontSize: 9.5, color: C.ink30, marginTop: 2 }}>{spec.cls.toUpperCase()} · {spec.subject.toUpperCase()} · WEBGL</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="mono" style={{ fontSize: 11, color: C.ink30 }}>{testedCount}/{items.length} EXAMINED</span>
          <div style={{ width: 110, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: (testedCount / items.length) * 100 + "%", background: `linear-gradient(90deg,${spec.accent},${C.lime})`, transition: "width .4s" }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: 0 }}>
        {/* left: 3D + table */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }} className="blueprint-grid">
          <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "14px 14px 64px" : "20px 28px 80px" }}>
            {/* NCERT info */}
            <div className="card-glass" style={{ background: C.cream, borderRadius: 12, padding: "14px 18px", marginBottom: 18, borderLeft: `4px solid ${spec.accent}` }}>
              <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: spec.accent, letterSpacing: "0.06em" }}>{spec.chapter}</span>
              <p style={{ fontSize: 13, color: C.ink70, lineHeight: 1.5, marginTop: 5 }}><b>Aim:</b> {spec.aim}</p>
            </div>

            {/* 3D viewport */}
            <div style={{ height: isMobile ? 300 : 440, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}`, marginBottom: isMobile ? 16 : 22, boxShadow: "0 12px 40px rgba(15,23,42,0.10)", background: "#eef2f6" }}>
              <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.0, 3.0], fov: 45 }}>
                <GenScene spec={spec} items={items} active={active} tested={tested} onExamine={examine} />
              </Canvas>
            </div>

            {/* bonus quiz */}
            {spec.question && !answeredRef.current && (
              <button onClick={() => setShowQuiz((s) => !s)} className="press" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.violetPale, color: C.violet, border: "none", borderRadius: 100, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
                <Ic n="spark" s={14} c={C.violet} sw={2} /> {showQuiz ? "Hide" : "Bonus question (+15 XP)"}
              </button>
            )}
            {showQuiz && spec.question && (
              <div className="card-glass" style={{ background: C.cream, borderRadius: 12, padding: "16px 20px", marginBottom: 20, border: `1px solid ${C.violetPale}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, marginBottom: 10 }}>{spec.question.q}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {spec.question.options.map((o, i) => {
                    const sel = picked === i, correct = i === spec.question.ans;
                    return (
                      <button key={i} onClick={() => answerQuiz(i)} disabled={picked !== null && correct} className="press" style={{ textAlign: "left", background: sel ? (correct ? C.emPale : C.coralPale) : C.paper, color: sel ? (correct ? C.emDeep : C.coral) : C.ink70, border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {String.fromCharCode(65 + i)}. {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* observation table */}
            <div className="observation-ledger" style={{ background: C.cream, borderRadius: 12, border: `1px solid ${C.line}`, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px", borderBottom: `1px solid ${C.line}`, background: C.paperWarm }}>
                <Ic n="note" s={15} c={spec.accent} sw={2} />
                <h4 style={{ fontSize: 14.5, fontWeight: 700, color: C.ink }}>Observation Table</h4>
                <span className="mono" style={{ fontSize: 10, color: C.ink30, marginLeft: "auto", fontWeight: 700 }}>CLASSIFY EACH SAMPLE</span>
              </div>
              {items.map((item, idx) => {
                const v = verdicts[item.id]; const done = tested[item.id];
                const isCorrect = graded && v === item.category, isWrong = graded && v && v !== item.category;
                return (
                  <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.6fr", gap: 12, alignItems: "center", padding: "12px 18px", borderBottom: idx < items.length - 1 ? `1px solid ${C.lineSoft}` : "none", background: isCorrect ? "rgba(13,148,136,0.05)" : isWrong ? "rgba(234,88,12,0.05)" : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 14, height: 14, borderRadius: 4, background: item.color, border: `1px solid ${C.line}`, display: "inline-block", flexShrink: 0 }} /><span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{item.name}</span></div>
                    <div>
                      {!done ? <span className="mono" style={{ fontSize: 11, color: C.ink15 }}>examine in 3D first ↑</span> : (
                        <div style={{ display: "inline-flex", background: C.paperWarm, borderRadius: 8, padding: 3, gap: 3 }}>
                          {spec.categories.map((c) => {
                            const sel = v === c.key, ans = graded && item.category === c.key, wrongSel = graded && sel && item.category !== c.key;
                            return (
                              <button key={c.key} onClick={() => setVerdict(item.id, c.key)} className="press" style={{ border: "none", cursor: graded ? "default" : "pointer", fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 6, background: ans ? c.color : sel ? (wrongSel ? C.coralPale : c.color) : "transparent", color: ans ? "#fff" : sel ? (wrongSel ? C.coral : "#fff") : C.ink50 }}>
                                {c.label}{ans && !sel ? " ✓" : ""}{wrongSel ? " ✗" : ""}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {allTested && allVerdicts && !graded && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}><Btn v="primary" lg icon="check" onClick={submit}>Grade & Compile Lab Report</Btn></div>
            )}
            {graded && <div style={{ textAlign: "center", marginTop: 26 }}><p style={{ fontSize: 15.5, fontWeight: 700, color: spec.accent }}>Compiling your report…</p></div>}
          </div>
        </div>

        {/* right: Spark HUD (same position/UI as the flagship lab) */}
        <aside className="voice-hud-panel">
          <div className="voice-hud-header">
            <SparkAvatar size={42} mood={mood} glow />
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>Spark <span style={{ width: 7, height: 7, borderRadius: "50%", background: voiceOn ? C.lime : C.ink30, animation: voiceOn ? "pulse 2s infinite" : "none" }} /></div>
              <div className="mono" style={{ fontSize: 9.5, color: spec.accent, fontWeight: 700 }}>YOUR LAB GUIDE</div>
            </div>
          </div>
          <div className="voice-hud-soundwave-core"><VoiceWaveform active={speaking} color={spec.accent} /></div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="voice-overlay-msg">
              <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: spec.accent, textTransform: "uppercase", marginBottom: 6 }}>Spark says</div>
              {msg}
            </div>
          </div>
          <div className="voice-hud-controls">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="mono"><div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>NARRATION</div><div style={{ fontSize: 12, color: voiceOn ? C.lime : "#cbd5e1", fontWeight: 700 }}>{voiceOn ? "● On" : "Muted"}</div></div>
              <div className="mono" style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>RENDER</div><div style={{ fontSize: 12, color: C.emBright, fontWeight: 700 }}>WebGL · 3D</div></div>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button onClick={() => { const nx = !voiceOn; setVoiceOn(nx); if (!nx) { cancelSpeech(); setSpeaking(false); } }} className={`voice-btn-mic ${voiceOn ? "active" : "muted"}`}>
                <Ic n={voiceOn ? "mic" : "lock"} s={24} c="#fff" sw={2} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Socratic prediction overlay — shown before a sample is revealed ── */}
      {predictFor && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card-glass" style={{ background: C.paper, borderRadius: 18, padding: "26px 28px", maxWidth: 460, width: "100%", boxShadow: "0 24px 60px rgba(15,23,42,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Ic n="spark" s={16} c={spec.accent} sw={2} />
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: spec.accent, letterSpacing: "0.06em" }}>MAKE YOUR PREDICTION</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9, margin: "10px 0 12px" }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, background: predictFor.color, border: `1px solid ${C.line}` }} />
              <span style={{ fontSize: 17, fontWeight: 800, color: C.ink }}>{predictFor.name}</span>
            </div>
            <p style={{ fontSize: 13.5, color: C.ink70, lineHeight: 1.5, marginBottom: 16 }}>{spec.socratic.predictPrompt}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {spec.categories.map((c) => (
                <button key={c.key} onClick={() => submitPrediction(c.key)} className="press" style={{ flex: 1, minWidth: 130, cursor: "pointer", border: `1.5px solid ${c.color}`, background: c.color + "12", color: C.ink, borderRadius: 12, padding: "12px 14px", textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: c.color }}>{c.label}</div>
                  {c.desc && <div style={{ fontSize: 11, color: C.ink50, marginTop: 2 }}>{c.desc}</div>}
                </button>
              ))}
            </div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.ink50, display: "block", marginBottom: 5 }}>Why do you think so? (optional)</label>
            <textarea value={predReason} onChange={(e) => setPredReason(e.target.value)} rows={2} placeholder="Because…"
              style={{ width: "100%", resize: "vertical", border: `1.5px solid ${C.line}`, borderRadius: 10, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", color: C.ink, outline: "none", background: C.cream }} />
            <div style={{ fontSize: 11, color: C.ink30, marginTop: 10, textAlign: "center" }}>Pick a prediction above — then watch what really happens.</div>
          </div>
        </div>
      )}

      <AskSpark experiment={`${spec.cls} ${spec.subject} — ${spec.title}. ${spec.aim}`} getLabState={() => ({ examined: `${testedCount}/${items.length}`, activeItem: active })} />
    </div>
  );
}
