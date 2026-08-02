/* ── True-3D (WebGL / React Three Fiber) Acids & Bases laboratory ──
   Replaces the CSS pseudo-3D viewport with a real rendered lab room:
   a workbench, a test-tube rack with liquid-filled glass tubes, and
   instruments (microscope, thermometer, beaker). All geometry is
   procedural — no external 3D model assets to license or host.
   Reuses the existing lab logic, Socratic questions, Gemini reactions,
   grading, and voice HUD. */
import React from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Lightformer, ContactShadows, Html } from "@react-three/drei";
import { C } from "./tokens.js";
import { SUBSTANCES } from "./data.js";
import { Ic, Btn, SparkAvatar, VoiceWaveform, useIsMobile } from "./ui.jsx";
import { ResultsTable, IntroOverlay } from "./labpanel.jsx";
import { GuideBar, dipResult } from "./lab.jsx";
import { gradeLab } from "./api.js";
import { LiveVoice } from "./voicelive.js";
import { AskSpark } from "./askspark.jsx";
import { speak, cancelSpeech, loadClipManifest } from "./speech.js";

const { useState: tUS, useEffect: tUE, useRef: tUR, useCallback: tUC, useMemo: tUM } = React;

const STRIP_BLUE = "#2563eb";
const STRIP_RED = "#e11d48";

/* The 6 everyday samples loaded onto the rack. */
const RACK_IDS = ["lemon", "vinegar", "soda", "soap", "salt", "water"];

/* ════════════════ 3D building blocks ════════════════ */

function GlassMaterial(props) {
  return (
    <meshPhysicalMaterial
      transparent
      opacity={1}
      transmission={1}
      roughness={0.05}
      metalness={0}
      thickness={0.35}
      ior={1.5}
      clearcoat={1}
      clearcoatRoughness={0.06}
      reflectivity={0.5}
      envMapIntensity={1.3}
      color="#ffffff"
      attenuationColor="#eaf6ff"
      attenuationDistance={2}
      {...props}
    />
  );
}

/* Vivid lab-liquid material — saturated, slightly glowing, like dyed solutions. */
function liquidProps(color) {
  return { color, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.92, emissive: color, emissiveIntensity: 0.22 };
}

/* A single test tube: glass shell + coloured liquid + optional litmus strip. */
function TestTube({ substance, position, selected, result, dippedStrip, onSelect }) {
  const group = tUR();
  const [hovered, setHovered] = tUS(false);
  // gentle spin + lift for the selected tube
  useFrame((_, dt) => {
    if (!group.current) return;
    const targetY = selected ? position[1] + 0.18 : position[1];
    group.current.position.y += (targetY - group.current.position.y) * Math.min(1, dt * 6);
    if (selected) group.current.rotation.y += dt * 0.6;
    else group.current.rotation.y += (0 - group.current.rotation.y) * Math.min(1, dt * 6);
  });

  const stripColor = dippedStrip === "blue" ? STRIP_BLUE : STRIP_RED;
  const stripTip = result && result[dippedStrip] ? result[dippedStrip].c : stripColor;

  return (
    <group
      ref={group}
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect(substance.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
    >
      {/* glass body */}
      <mesh castShadow position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.5, 24, 1, true]} />
        <GlassMaterial side={2} />
      </mesh>
      {/* rounded bottom */}
      <mesh castShadow position={[0, 0.0, 0]}>
        <sphereGeometry args={[0.085, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <GlassMaterial side={2} />
      </mesh>
      {/* rim */}
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[0.085, 0.012, 12, 24]} />
        <GlassMaterial opacity={0.5} transmission={0.6} />
      </mesh>
      {/* liquid */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.073, 0.073, 0.32, 24]} />
        <meshStandardMaterial {...liquidProps(substance.liquid)} />
      </mesh>
      <mesh position={[0, -0.005, 0]}>
        <sphereGeometry args={[0.073, 20, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshStandardMaterial {...liquidProps(substance.liquid)} />
      </mesh>
      {/* litmus strip dipped in */}
      {selected && dippedStrip && (
        <group position={[0, 0.42, 0]}>
          <mesh>
            <boxGeometry args={[0.03, 0.42, 0.006]} />
            <meshStandardMaterial color={stripColor} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <boxGeometry args={[0.032, 0.12, 0.008]} />
            <meshStandardMaterial color={stripTip} roughness={0.8} />
          </mesh>
        </group>
      )}
      {/* selection glow ring */}
      {selected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.11, 0.15, 32]} />
          <meshBasicMaterial color={C.emBright} transparent opacity={0.8} />
        </mesh>
      )}
      {/* floating name label — only for the hovered/selected tube, so they never overlap */}
      {(selected || hovered) && (
        <Html position={[0, 0.74, 0]} center distanceFactor={3} zIndexRange={[20, 0]} occlude={false}>
          <div style={{ pointerEvents: "none", fontSize: 13, fontWeight: 700, color: "#fff", background: selected ? C.emBright : "rgba(15,23,42,0.85)", padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>
            {substance.name} <span style={{ opacity: 0.7, fontWeight: 600 }}>· {substance.formula}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* Wooden test-tube rack frame. */
function Rack({ count }) {
  const width = count * 0.5 + 0.2;
  const wood = "#a16207";
  const woodDark = "#854d0e";
  return (
    <group position={[0, 0, 0]}>
      {/* base */}
      <mesh receiveShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[width, 0.04, 0.4]} />
        <meshStandardMaterial color={woodDark} roughness={0.8} />
      </mesh>
      {/* top bar with holes (approximated by a slim plank) */}
      <mesh position={[0, 0.34, -0.02]}>
        <boxGeometry args={[width, 0.05, 0.18]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>
      {/* legs */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (width / 2 - 0.04), 0.18, -0.02]}>
          <boxGeometry args={[0.05, 0.34, 0.18]} />
          <meshStandardMaterial color={wood} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* A recognisable microscope built from primitives. */
function Microscope({ position }) {
  const metal = "#1f2937";
  const steel = "#9ca3af";
  return (
    <group position={position} rotation={[0, 0.5, 0]} scale={0.42}>
      <mesh castShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.34, 0.4, 0.08, 32]} />
        <meshStandardMaterial color={metal} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* arm */}
      <mesh castShadow position={[-0.12, 0.5, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.12, 0.9, 0.14]} />
        <meshStandardMaterial color={metal} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* stage */}
      <mesh position={[0.12, 0.42, 0]}>
        <boxGeometry args={[0.34, 0.05, 0.34]} />
        <meshStandardMaterial color={steel} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* body tube */}
      <mesh castShadow position={[0.12, 0.9, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 24]} />
        <meshStandardMaterial color={metal} roughness={0.4} metalness={0.6} />
      </mesh>
      {/* eyepiece */}
      <mesh position={[0.12, 1.2, 0.05]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.18, 20]} />
        <meshStandardMaterial color={metal} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* objective */}
      <mesh position={[0.12, 0.6, 0]}>
        <coneGeometry args={[0.07, 0.14, 20]} />
        <meshStandardMaterial color={steel} roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
}

/* Thermometer standing in a small stand. */
function Thermometer({ position }) {
  return (
    <group position={position} rotation={[0, 0, 0.12]}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.7, 16]} />
        <GlassMaterial opacity={0.4} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#dc2626" roughness={0.3} emissive="#dc2626" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 12]} />
        <meshStandardMaterial color="#dc2626" roughness={0.3} />
      </mesh>
    </group>
  );
}

/* A glass beaker with vivid coloured liquid, graduation ticks and a label. */
function Beaker({ position, color = "#2563eb", scale = 1, fill = 0.62 }) {
  const H = 0.4;
  const liqH = H * fill;
  return (
    <group position={position} scale={scale}>
      {/* glass wall */}
      <mesh castShadow position={[0, H / 2, 0]}>
        <cylinderGeometry args={[0.2, 0.18, H, 36, 1, true]} />
        <GlassMaterial side={2} />
      </mesh>
      {/* base */}
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.024, 36]} />
        <GlassMaterial side={2} />
      </mesh>
      {/* rim */}
      <mesh position={[0, H, 0]}>
        <torusGeometry args={[0.2, 0.01, 10, 36]} />
        <GlassMaterial />
      </mesh>
      {/* coloured liquid */}
      <mesh position={[0, liqH / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.182, 0.168, liqH, 36]} />
        <meshStandardMaterial {...liquidProps(color)} />
      </mesh>
      {/* meniscus top */}
      <mesh position={[0, liqH + 0.02, 0]}>
        <cylinderGeometry args={[0.182, 0.182, 0.006, 36]} />
        <meshStandardMaterial {...liquidProps(color)} opacity={0.7} />
      </mesh>
      {/* white graduation ticks */}
      {[0.3, 0.5, 0.7, 0.9].map((f, i) => (
        <mesh key={i} position={[0.198, H * f, 0.0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.006, 0.004, 0.05]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.85} />
        </mesh>
      ))}
      {/* white label patch */}
      <mesh position={[0, H * 0.42, 0.205]}>
        <planeGeometry args={[0.13, 0.07]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

/* ── Wall art: posters drawn procedurally onto canvas textures ──
   (No external image files — keeps the build self-contained and copyright-safe.) */
function makeTexture(w, h, draw) {
  const cvs = document.createElement("canvas");
  cvs.width = w; cvs.height = h;
  const ctx = cvs.getContext("2d");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Classic 18×7 periodic-table layout with element symbols and category colours.
function drawPeriodicTable(ctx, w, h) {
  ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff"; ctx.font = "bold 34px Arial"; ctx.textAlign = "center";
  ctx.fillText("PERIODIC TABLE OF THE ELEMENTS", w / 2, 46);
  const cols = 18, rows = 7;
  const pad = 24, top = 70;
  const cw = (w - pad * 2) / cols, chh = (h - top - 20) / rows;
  const cats = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#eab308"];
  // which cells are filled (rough periodic-table silhouette)
  const filled = (r, c) =>
    (r === 0 && (c === 0 || c === 17)) ||
    (r === 1 && (c <= 1 || c >= 12)) ||
    (r === 2 && (c <= 1 || c >= 12)) ||
    (r >= 3 && r <= 5) ||
    (r === 6 && c >= 2);
  const syms = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Fe", "Cu", "Zn", "Ag", "Au", "Hg", "Pb"];
  let s = 0;
  ctx.textAlign = "center";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!filled(r, c)) continue;
      const x = pad + c * cw, y = top + r * chh;
      ctx.fillStyle = cats[(r + c) % cats.length];
      ctx.fillRect(x + 1.5, y + 1.5, cw - 3, chh - 3);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `bold ${Math.floor(chh * 0.42)}px Arial`;
      ctx.fillText(syms[s % syms.length], x + cw / 2, y + chh * 0.62);
      s++;
    }
  }
}

function drawPHScale(ctx, w, h) {
  ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 40px Arial"; ctx.textAlign = "left";
  ctx.fillText("pH SCALE", 30, 56);
  const barX = 30, barY = 84, barW = w - 60, barH = h - 150;
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0, "#e11d48"); grad.addColorStop(0.35, "#f59e0b");
  grad.addColorStop(0.5, "#22c55e"); grad.addColorStop(0.7, "#3b82f6");
  grad.addColorStop(1, "#6d28d9");
  ctx.fillStyle = grad; ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 26px Arial"; ctx.textAlign = "center";
  for (let i = 0; i <= 14; i++) ctx.fillText(String(i), barX + (barW / 14) * i, barY + barH + 36);
  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#e11d48"; ctx.textAlign = "left"; ctx.fillText("ACID", barX, barY + barH + 70);
  ctx.fillStyle = "#22c55e"; ctx.textAlign = "center"; ctx.fillText("NEUTRAL", w / 2, barY + barH + 70);
  ctx.fillStyle = "#6d28d9"; ctx.textAlign = "right"; ctx.fillText("BASE", barX + barW, barY + barH + 70);
}

// Colourful molecular-structure diagram (H2O) — a real chemistry-lab wall chart.
function drawMolecule(ctx, w, h) {
  ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0f172a"; ctx.font = `bold ${Math.floor(w * 0.11)}px Arial`; ctx.textAlign = "center";
  ctx.fillText("WATER  H₂O", w / 2, h * 0.16);
  const ox = w / 2, oy = h * 0.55, R = w * 0.16, r = w * 0.1;
  const h1 = [ox - w * 0.22, oy + h * 0.16], h2 = [ox + w * 0.22, oy + h * 0.16];
  // bonds
  ctx.strokeStyle = "#475569"; ctx.lineWidth = w * 0.04;
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(h1[0], h1[1]); ctx.moveTo(ox, oy); ctx.lineTo(h2[0], h2[1]); ctx.stroke();
  // oxygen (red)
  ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.floor(R)}px Arial`; ctx.fillText("O", ox, oy + R * 0.35);
  // hydrogens (white/blue)
  [h1, h2].forEach((p) => {
    ctx.fillStyle = "#bfdbfe"; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e3a8a"; ctx.font = `bold ${Math.floor(r)}px Arial`; ctx.fillText("H", p[0], p[1] + r * 0.35);
  });
  ctx.fillStyle = "#64748b"; ctx.font = `${Math.floor(w * 0.05)}px Arial`;
  ctx.fillText("Bond angle 104.5°", w / 2, h * 0.94);
}

// Round wall clock face (drawn onto a circle).
function drawClock(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = w / 2;
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.96, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#0f172a"; ctx.lineWidth = w * 0.03; ctx.stroke();
  ctx.strokeStyle = "#334155"; ctx.lineWidth = w * 0.012;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82);
    ctx.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
    ctx.stroke();
  }
  // hands (static, ~10:10 — the classic display time)
  ctx.strokeStyle = "#0f172a"; ctx.lineCap = "round";
  ctx.lineWidth = w * 0.03; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - R * 0.35, cy - R * 0.28); ctx.stroke();
  ctx.lineWidth = w * 0.022; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.4, cy - R * 0.22); ctx.stroke();
  ctx.fillStyle = "#0d9488"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.05, 0, Math.PI * 2); ctx.fill();
}

function drawSafety(ctx, w, h) {
  ctx.fillStyle = "#facc15"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0f172a"; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(w / 2, h * 0.16); ctx.lineTo(w * 0.84, h * 0.6); ctx.lineTo(w * 0.16, h * 0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#facc15"; ctx.font = `bold ${Math.floor(w * 0.34)}px Arial`; ctx.textAlign = "center";
  ctx.fillText("!", w / 2, h * 0.55);
  ctx.fillStyle = "#0f172a"; ctx.font = `bold ${Math.floor(w * 0.1)}px Arial`;
  ctx.fillText("SAFETY FIRST", w / 2, h * 0.78);
  ctx.font = `${Math.floor(w * 0.07)}px Arial`;
  ctx.fillText("WEAR GOGGLES & GLOVES", w / 2, h * 0.9);
}

function Poster({ texture, position, size, framed = true }) {
  return (
    <group position={position}>
      {framed && (
        <mesh position={[0, 0, -0.015]}>
          <boxGeometry args={[size[0] + 0.06, size[1] + 0.06, 0.03]} />
          <meshStandardMaterial color="#3b2f2a" roughness={0.7} />
        </mesh>
      )}
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

function WallArt() {
  const z = -2.37;
  const periodic = tUM(() => makeTexture(1024, 460, drawPeriodicTable), []);
  const ph = tUM(() => makeTexture(640, 360, drawPHScale), []);
  const safety = tUM(() => makeTexture(420, 420, drawSafety), []);
  const molecule = tUM(() => makeTexture(420, 360, drawMolecule), []);
  const clock = tUM(() => makeTexture(256, 256, drawClock), []);
  return (
    <group>
      <Poster texture={periodic} position={[0, 1.78, z]} size={[1.9, 0.86]} />
      <Poster texture={ph} position={[-1.75, 0.95, z]} size={[0.86, 0.48]} />
      <Poster texture={molecule} position={[-1.7, 1.62, z]} size={[0.62, 0.5]} />
      <Poster texture={safety} position={[1.75, 0.92, z]} size={[0.5, 0.5]} />
      {/* round wall clock */}
      <group position={[1.85, 1.62, z]}>
        <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.27, 0.27, 0.04, 36]} />
          <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.002]}>
          <circleGeometry args={[0.25, 48]} />
          <meshBasicMaterial map={clock} toneMapped={false} transparent />
        </mesh>
      </group>
    </group>
  );
}

/* Bunsen burner with a flickering blue/orange flame. */
function BunsenBurner({ position }) {
  const flame = tUR();
  useFrame((s) => {
    if (flame.current) {
      const t = s.clock.elapsedTime;
      flame.current.scale.y = 1 + Math.sin(t * 14) * 0.12;
      flame.current.scale.x = flame.current.scale.z = 1 + Math.sin(t * 11) * 0.05;
    }
  });
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.13, 0.16, 0.04, 24]} />
        <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.035, 0.05, 0.36, 20]} />
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.7} />
      </mesh>
      <group ref={flame} position={[0, 0.5, 0]}>
        <mesh>
          <coneGeometry args={[0.05, 0.26, 18]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.4} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, -0.03, 0]}>
          <coneGeometry args={[0.03, 0.16, 18]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.8} transparent opacity={0.9} />
        </mesh>
        <pointLight color="#fb923c" intensity={0.6} distance={1.4} position={[0, 0.1, 0]} />
      </group>
    </group>
  );
}

/* Erlenmeyer (conical) flask with coloured liquid. */
function ConicalFlask({ position, color = "#a78bfa" }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.13, 0]}>
        <coneGeometry args={[0.17, 0.28, 32, 1, true]} />
        <GlassMaterial side={2} />
      </mesh>
      <mesh castShadow position={[0, 0.33, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.14, 20, 1, true]} />
        <GlassMaterial side={2} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <torusGeometry args={[0.045, 0.008, 10, 20]} />
        <GlassMaterial opacity={0.5} />
      </mesh>
      {/* liquid (smaller cone) */}
      <mesh position={[0, 0.085, 0]}>
        <coneGeometry args={[0.13, 0.17, 32]} />
        <meshStandardMaterial {...liquidProps(color)} />
      </mesh>
    </group>
  );
}

/* Graduated measuring cylinder. */
function GraduatedCylinder({ position, color = "#34d399" }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.02, 24]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.52, 28, 1, true]} />
        <GlassMaterial side={2} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.042, 0.042, 0.34, 24]} />
        <meshStandardMaterial {...liquidProps(color)} />
      </mesh>
      {/* graduation ticks */}
      {[0.18, 0.3, 0.42, 0.5].map((y, i) => (
        <mesh key={i} position={[0.05, y, 0]}>
          <boxGeometry args={[0.004, 0.003, 0.03]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* The room: floor, back wall, window glow, a shelf with decorative beakers. */
function LabRoom() {
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial color="#eef2f6" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* back wall (upper, light) */}
      <mesh position={[0, 2.4, -2.4]} receiveShadow>
        <planeGeometry args={[24, 5]} />
        <meshStandardMaterial color="#eaf0f5" roughness={1} />
      </mesh>
      {/* wainscot (lower, muted lab teal-grey) */}
      <mesh position={[0, 0.2, -2.39]} receiveShadow>
        <planeGeometry args={[24, 1.7]} />
        <meshStandardMaterial color="#9fb3bd" roughness={0.95} />
      </mesh>
      {/* trim line */}
      <mesh position={[0, 1.05, -2.37]}>
        <boxGeometry args={[24, 0.05, 0.04]} />
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </mesh>
      {/* side walls for enclosure */}
      <mesh position={[-6, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#e3eaf0" roughness={1} side={2} />
      </mesh>
      <mesh position={[6, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[12, 7]} />
        <meshStandardMaterial color="#e3eaf0" roughness={1} side={2} />
      </mesh>
      {/* window glow */}
      <mesh position={[-2.2, 2.05, -2.38]}>
        <planeGeometry args={[1.6, 0.9]} />
        <meshStandardMaterial color="#e0f2fe" emissive="#bae6fd" emissiveIntensity={0.6} roughness={1} />
      </mesh>

      {/* posters: periodic table, pH scale, chemist portraits, safety */}
      <WallArt />
      {/* wall shelf */}
      <mesh position={[1.9, 1.6, -2.3]}>
        <boxGeometry args={[2.4, 0.05, 0.3]} />
        <meshStandardMaterial color="#94703a" roughness={0.8} />
      </mesh>
      {[1.2, 1.7, 2.2, 2.7].map((x, i) => (
        <mesh key={i} position={[x, 1.78, -2.3]}>
          <cylinderGeometry args={[0.07, 0.06, 0.22, 20, 1, true]} />
          <meshStandardMaterial color={["#fca5a5", "#a7f3d0", "#bfdbfe", "#fde68a"][i]} transparent opacity={0.6} roughness={0.2} />
        </mesh>
      ))}
      {/* workbench countertop — glossy black lab resin */}
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[6, 0.16, 2.2]} />
        <meshPhysicalMaterial color="#26262b" roughness={0.35} metalness={0.2} clearcoat={0.8} clearcoatRoughness={0.25} />
      </mesh>
      {/* warm wooden edge trim */}
      <mesh position={[0, -0.08, 1.11]}>
        <boxGeometry args={[6, 0.18, 0.04]} />
        <meshStandardMaterial color="#7c5a33" roughness={0.6} />
      </mesh>
      {/* cabinet body */}
      <mesh position={[0, -0.38, 0.15]}>
        <boxGeometry args={[5.7, 0.46, 1.7]} />
        <meshStandardMaterial color="#3f4750" roughness={0.7} />
      </mesh>
    </group>
  );
}

/* The full 3D scene. */
function LabScene({ tubes, activeSub, results, dippedStrip, onSelect }) {
  const n = tubes.length;
  return (
    <>
      <color attach="background" args={["#eaf1f7"]} />
      <fog attach="fog" args={["#eaf1f7", 7, 16]} />
      <hemisphereLight args={["#ffffff", "#c7d2da", 0.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight color="#fff4e6" position={[3, 5, 4]} intensity={1.25} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
      <directionalLight color="#dbeafe" position={[-4, 3, -2]} intensity={0.45} />
      <pointLight position={[0, 2, 2]} intensity={0.4} />

      {/* procedural environment (no external HDRI download) for glassy reflections */}
      <Environment resolution={128}>
        <Lightformer intensity={1.2} position={[0, 3, 2]} scale={[6, 3, 1]} />
        <Lightformer intensity={0.6} position={[-3, 1, 1]} scale={[3, 3, 1]} />
      </Environment>

      <LabRoom />
      <Rack count={n} />

      {tubes.map((s, i) => (
        <TestTube
          key={s.id}
          substance={s}
          position={[(i - (n - 1) / 2) * 0.5, 0.06, 0.02]}
          selected={activeSub === s.id}
          result={results[s.id]}
          dippedStrip={activeSub === s.id ? dippedStrip : null}
          onSelect={onSelect}
        />
      ))}

      {/* instruments on the bench */}
      <Microscope position={[-2.25, 0, -0.15]} />
      <Thermometer position={[1.55, 0.0, -0.3]} />

      {/* vivid beaker set (varied sizes & colours, like a real glassware kit) */}
      <Beaker position={[2.45, 0, -0.25]} color="#2563eb" scale={1.15} fill={0.66} />
      <Beaker position={[2.55, 0, 0.45]} color="#d946ef" scale={0.82} fill={0.6} />
      <Beaker position={[1.95, 0, 0.62]} color="#ef4444" scale={0.66} fill={0.55} />

      {/* front row of glassware (off to the sides so the rack stays clickable) */}
      <BunsenBurner position={[-1.6, 0, 0.6]} />
      <ConicalFlask position={[-0.6, 0, 0.66]} color="#f97316" />
      <GraduatedCylinder position={[0.7, 0, 0.66]} color="#22c55e" />

      <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={8} blur={2.4} far={2} />

      <OrbitControls
        enablePan={false}
        minDistance={1.6}
        maxDistance={5}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0.25, 0]}
      />
    </>
  );
}

/* ════════════════ The lab (logic + 3D + HUD) ════════════════ */

function Lab3D({ onExit, onComplete, addXp }) {
  const isMobile = useIsMobile();
  const [phase, setPhase] = tUS("intro");
  const tubes = SUBSTANCES.filter((s) => RACK_IDS.includes(s.id));

  const [results, setResults] = tUS(() => Object.fromEntries(tubes.map((s) => [s.id, { blue: null, red: null, verdict: null }])));
  const [activeSub, setActiveSub] = tUS(null);
  const [isDipping, setIsDipping] = tUS(false);
  const [dippedStrip, setDippedStrip] = tUS(null);
  const [answeredQuestions, setAnsweredQuestions] = tUS({});
  const [activeQuestion, setActiveQuestion] = tUS(null);
  const [selectedOption, setSelectedOption] = tUS(null);

  const [voiceActive, setVoiceActive] = tUS(true);
  const [voiceSpeaking, setVoiceSpeaking] = tUS(false);
  const [voiceMsg, setVoiceMsg] = tUS("Welcome to the 3D lab, scientist! I'm Spark. Drag to look around, then click any test tube on the rack to begin.");
  const [mood, setMood] = tUS("happy");
  const [graded, setGraded] = tUS(false);

  // ── Live two-way voice (Gemini Live API) ──
  const [liveStatus, setLiveStatus] = tUS("off"); // off|connecting|listening|speaking|error
  const liveRef = tUR(null);

  const stopLive = tUC(() => {
    if (liveRef.current) { liveRef.current.stop(); liveRef.current = null; }
    setLiveStatus("off");
    setVoiceActive(true); // restore event narration (TTS) after live ends
  }, []);

  const toggleLive = tUC(() => {
    if (liveRef.current) { stopLive(); return; }
    setVoiceActive(false); // mute the canned TTS so it doesn't overlap live audio
    try { window.speechSynthesis.cancel(); } catch (e) {}
    const lv = new LiveVoice({
      experiment: "Class 7 Chemistry — Acids, Bases & Indicators (litmus). The student is at a 3D lab bench with test tubes of everyday liquids and litmus paper.",
      onState: (s, detail) => {
        setLiveStatus(s);
        if (s === "speaking") setMood("happy");
        if (s === "error") { setVoiceMsg("Live voice error: " + (detail || "")); liveRef.current = null; }
        if (s === "closed") liveRef.current = null;
      },
      onCaption: (who, text) => {
        if (!text) return;
        setVoiceMsg((who === "you" ? "🧑‍🎓 You: " : "🔊 Spark: ") + text);
      },
    });
    liveRef.current = lv;
    setLiveStatus("connecting");
    lv.start();
  }, [stopLive]);

  tUE(() => () => { if (liveRef.current) liveRef.current.stop(); }, []);

  // Scripted narration — uses a pre-generated voice clip if available, else
  // free browser TTS. Zero AI cost. Skipped while live voice is active.
  const triggerVoiceResponse = tUC((text, delay = 3500, clipKey) => {
    setVoiceMsg(text);
    setMood("thinking");
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine"; osc.frequency.setValueAtTime(620, ctx.currentTime);
      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
    if (voiceActive) {
      speak(text, {
        clipKey,
        onStart: () => setVoiceSpeaking(true),
        onEnd: () => { setVoiceSpeaking(false); setMood("happy"); },
      });
    } else {
      setVoiceSpeaking(true);
      setTimeout(() => { setVoiceSpeaking(false); setMood("happy"); }, delay);
    }
  }, [voiceActive]);

  tUE(() => { loadClipManifest(); return () => cancelSpeech(); }, []);

  const tested = tubes.filter((s) => results[s.id].blue || results[s.id].red);
  const allTested = tested.length === tubes.length;
  const allVerdicts = tubes.every((s) => results[s.id].verdict);

  const selectTube = (subId) => {
    if (isDipping) return;
    setActiveSub(subId);
    setDippedStrip(null); // clear the previously-shown strip when switching tubes
    const sub = tubes.find((s) => s.id === subId);
    if (!sub) return;
    if (!answeredQuestions[subId]) {
      setActiveQuestion({ ...sub.question, subId });
      setSelectedOption(null);
      triggerVoiceResponse(`${sub.name} selected. Quick question for bonus XP — ${sub.question.q} You can also just dip the litmus to test it.`, 5000);
    } else {
      setActiveQuestion(null);
      triggerVoiceResponse(`${sub.name} (${sub.formula}) selected. Dip the blue or red litmus paper to test it.`, 2200);
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
      setTimeout(() => setActiveQuestion(null), 3500);
    } else {
      triggerVoiceResponse(activeQuestion.incorrectMsg, 4000);
      setTimeout(() => setSelectedOption(null), 3200);
    }
  };

  const startLitmusTest = (strip) => {
    if (!activeSub || isDipping) return;
    const sub = tubes.find((s) => s.id === activeSub);
    if (!sub) return;
    setIsDipping(true);
    setDippedStrip(strip);
    setMood("thinking");
    triggerVoiceResponse(`Dipping ${strip} litmus indicator into ${sub.name}...`, 1800);

    setTimeout(() => {
      const res = dipResult(strip, sub.type);
      const firstEver = !results[activeSub].blue && !results[activeSub].red;
      setResults((r) => ({ ...r, [activeSub]: { ...r[activeSub], [strip]: res } }));
      // Deterministic scripted narration — the outcome is fully known locally,
      // so no Gemini call is needed here (the AI is on-demand via "Ask Spark").
      const line = res.changed
        ? `Aha! The ${strip} litmus turned ${strip === "blue" ? "red" : "blue"}! ${sub.name} shows the presence of ${sub.type === "acid" ? "free hydrogen H plus" : "hydroxyl O H minus"} ions.`
        : `No colour change on the ${strip} litmus. ${sub.name} looks neutral. What verdict will you record?`;
      triggerVoiceResponse(line, 4500);
      if (firstEver) addXp(10);
    }, 1100);

    // Keep the coloured strip in the tube after the dip — it stays visible
    // until the student selects a different tube (per requested behaviour).
    setTimeout(() => { setIsDipping(false); }, 2800);
  };

  tUE(() => {
    if (allTested && !graded) {
      triggerVoiceResponse("Excellent! All tubes tested. 🎉 Now assign a verdict (Acid, Base, or Neutral) for each in the table below.", 5000);
      addXp(20);
    }
  }, [allTested]); // eslint-disable-line

  const setVerdict = (subId, v) => {
    setResults((r) => ({ ...r, [subId]: { ...r[subId], verdict: v } }));
    const sub = tubes.find((s) => s.id === subId);
    if (sub) triggerVoiceResponse(`Verdict saved: ${sub.name} as ${v.toUpperCase()}.`, 1800);
  };

  const submit = () => {
    const correct = tubes.filter((s) => results[s.id].verdict === s.type).length;
    setGraded(true);
    const xp = 30 + correct * 8;
    addXp(xp);
    setMood("celebrate");
    triggerVoiceResponse(`Graded! You correctly identified ${correct} of ${tubes.length} chemicals. Your CBSE transcript is ready.`, 6000);
    const observations = tubes.map((s) => ({ name: s.name, formula: s.formula, correctType: s.type, studentVerdict: results[s.id].verdict }));
    const minDelay = new Promise((r) => setTimeout(r, 3200));
    const feedback = gradeLab({ experiment: "Class 7 Chemistry — Acids, Bases & Indicators (litmus)", observations }).then((g) => g.feedback).catch(() => null);
    Promise.all([feedback, minDelay]).then(([aiFeedback]) => {
      onComplete({ results: Object.fromEntries(tubes.map((s) => [s.id, results[s.id]])), correct, total: tubes.length, xp, aiFeedback });
    });
  };

  const guide = !activeSub
    ? { step: 1, text: "Drag to orbit the 3D lab, then click a test tube on the rack to begin", icon: "flask" }
    : !allTested
    ? { step: 2, text: "Dip blue or red litmus paper into the active tube", icon: "drop" }
    : !allVerdicts
    ? { step: 3, text: "Assign chemical verdicts (Acid, Base, Neutral) in the observation table", icon: "eye" }
    : { step: 3, text: "Observations complete! Submit to compile your CBSE transcript", icon: "check" };

  const activeSubObj = tubes.find((s) => s.id === activeSub);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.paper, overflow: "hidden" }}>
      {/* header */}
      <div style={{ height: 60, background: C.inkDeep, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px", flexShrink: 0, zIndex: 30, borderBottom: `1px solid ${C.lineDark}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onExit} className="press" style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.lineInk}`, color: "#fff", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Ic n="back" s={14} c="#fff" sw={2} />Exit Workbench
          </button>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(13,148,136,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="flask" s={15} c={C.emBright} sw={2} /></div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1 }} className="font-display">Class 7 Chemistry · 3D Lab</div>
              <div className="mono" style={{ fontSize: 9.5, color: C.ink30, marginTop: 2 }}>EXP 05 · ACIDS & BASES · WEBGL</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="mono" style={{ fontSize: 11, color: C.ink30 }}>{tested.length}/{tubes.length} TUBE(S) TESTED</span>
          <div style={{ width: 120, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: (tested.length / tubes.length) * 100 + "%", background: `linear-gradient(90deg,${C.emBright},${C.lime})`, transition: "width .5s" }} />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: 0 }}>
        {/* left: 3D + console + table */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }} className="blueprint-grid">
          <GuideBar guide={guide} />
          <div style={{ maxWidth: 900, margin: "0 auto", padding: isMobile ? "14px 14px 56px" : "20px 28px 60px" }}>
            {/* 3D viewport */}
            <div style={{ height: isMobile ? 300 : 440, borderRadius: 16, overflow: "hidden", border: `1px solid ${C.line}`, marginBottom: isMobile ? 16 : 24, boxShadow: "0 12px 40px rgba(15,23,42,0.10)", background: "#eef2f6" }}>
              <Canvas shadows dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 1.0, 3.0], fov: 45 }}>
                <LabScene
                  tubes={tubes}
                  activeSub={activeSub}
                  results={results}
                  dippedStrip={dippedStrip}
                  onSelect={selectTube}
                />
              </Canvas>
            </div>

            {/* selected substance console */}
            {activeSubObj && (
              <div className="card-glass" style={{ padding: "20px 24px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, border: `1.5px solid ${C.line}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(2,132,199,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic n="flask" s={22} c="#0284c7" sw={2} /></div>
                  <div>
                    <h4 style={{ fontSize: 15.5, color: C.ink, fontWeight: 700 }}>{activeSubObj.name} <span style={{ color: "#0284c7", fontSize: 12.5, fontWeight: 700 }}>({activeSubObj.formula})</span></h4>
                    <p style={{ fontSize: 12.5, color: C.ink50, marginTop: 2 }}>{activeSubObj.hint}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn v="outline" sm icon="drop" disabled={isDipping || results[activeSub].blue} onClick={() => startLitmusTest("blue")} style={{ color: STRIP_BLUE, borderColor: STRIP_BLUE + "33" }}>Dip Blue Litmus</Btn>
                  <Btn v="outline" sm icon="drop" disabled={isDipping || results[activeSub].red} onClick={() => startLitmusTest("red")} style={{ color: STRIP_RED, borderColor: STRIP_RED + "33" }}>Dip Red Litmus</Btn>
                  <Btn v="light" sm onClick={() => setActiveSub(null)} disabled={isDipping}>Return to Rack</Btn>
                </div>
              </div>
            )}

            <ResultsTable activeSubstances={tubes} results={results} graded={graded} onVerdict={setVerdict} />

            {allVerdicts && !graded && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                <Btn v="primary" lg icon="check" onClick={submit}>Grade & Compile Lab Transcript</Btn>
              </div>
            )}
            {graded && (
              <div style={{ textAlign: "center", marginTop: 28 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.emBright }}>Compiling CBSE Transcript & Badges...</p>
              </div>
            )}
          </div>
        </div>

        {/* right: voice HUD */}
        <aside className="voice-hud-panel">
          <div className="voice-hud-header">
            <SparkAvatar size={42} mood={mood} glow />
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 7 }}>
                Spark <span style={{ width: 7, height: 7, borderRadius: "50%", background: voiceActive ? C.lime : C.ink30, animation: voiceActive ? "pulse 2s infinite" : "none" }} />
              </div>
              <div className="mono" style={{ fontSize: 9.5, color: C.emBright, letterSpacing: "0.04em", fontWeight: 700 }}>GEMINI MULTIMODAL VOICE</div>
            </div>
          </div>
          <div className="voice-hud-soundwave-core">
            <VoiceWaveform active={voiceSpeaking} color={voiceSpeaking ? C.emBright : "#4f46e5"} />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="voice-overlay-msg">
              <div className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: C.emBright, textTransform: "uppercase", marginBottom: 6 }}>Spoken Transcript Feed</div>
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
                    if (selectedOption !== null && isSelected) btnClass += isCorrect ? " correct" : " incorrect";
                    return (
                      <button key={oIdx} className={btnClass} onClick={() => handleOptionClick(oIdx)} disabled={selectedOption !== null}>
                        {oIdx === 0 ? "A) " : "B) "}{opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="voice-hud-controls">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="mono">
                <div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>NARRATION</div>
                <div style={{ fontSize: 12, color: voiceActive ? C.lime : "#cbd5e1", fontWeight: 700, marginTop: 2 }}>{voiceActive ? "● On" : "Muted"}</div>
              </div>
              <div className="mono" style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: C.ink30, fontWeight: 600 }}>ASK SPARK</div>
                <div style={{ fontSize: 12, color: C.emBright, fontWeight: 700, marginTop: 2 }}>Bottom-left ↙</div>
              </div>
            </div>

            {/* Primary, free control: mute / unmute the guided narration */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <button
                onClick={() => {
                  const next = !voiceActive;
                  setVoiceActive(next);
                  if (!next) { cancelSpeech(); setVoiceMsg("Narration muted. Use Ask Spark anytime for help."); setVoiceSpeaking(false); setMood("happy"); }
                  else triggerVoiceResponse("Narration on. I'll guide you step by step.", 2500);
                }}
                className={`voice-btn-mic ${voiceActive ? "active" : "muted"}`}
                title={voiceActive ? "Mute narration" : "Unmute narration"}
              >
                <Ic n={voiceActive ? "mic" : "lock"} s={24} c="#fff" sw={2} />
              </button>
            </div>

            {/* Premium live voice — clearly marked as credit-using, off by default */}
            <button
              onClick={toggleLive}
              className="press"
              style={{
                width: "100%", marginTop: 2, padding: "8px 0", borderRadius: 10, cursor: "pointer",
                fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                color: liveStatus === "off" ? C.ink50 : "#fff",
                background: liveStatus === "off" ? "transparent" : C.coral,
                border: liveStatus === "off" ? `1px dashed ${C.lineInk}` : "none",
              }}
            >
              <Ic n={liveStatus === "off" ? "mic" : "lock"} s={13} c={liveStatus === "off" ? C.ink50 : "#fff"} sw={2} />
              {liveStatus === "off" ? "Premium: live voice chat (uses credits)" : "End live conversation"}
            </button>
          </div>
        </aside>
      </div>

      {phase !== "intro" && (
        <AskSpark
          experiment="Class 7 Chemistry — Acids, Bases & Indicators (litmus). The student is at a 3D lab bench testing everyday liquids with blue and red litmus paper."
          getLabState={() => ({
            activeSubstance: activeSubObj ? `${activeSubObj.name} (${activeSubObj.formula})` : null,
            tubesTested: `${tested.length}/${tubes.length}`,
            currentStep: guide.text,
          })}
        />
      )}

      {phase === "intro" && (
        <IntroOverlay onStart={() => { setPhase("work"); triggerVoiceResponse("Welcome to your 3D lab! Drag to orbit around the bench, then click a test tube on the rack and answer my question to begin testing.", 6000); }} />
      )}
    </div>
  );
}

export { Lab3D };
