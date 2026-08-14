/* ── Shared 3D lab-room scene (React Three Fiber) ──
   Reusable environment used by EVERY 3D lab so the room, lighting, wall
   charts, workbench and instruments look identical across experiments.
   All geometry is procedural — no external 3D model assets. */
import React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { C } from "./tokens.js";

const { useRef: sUR, useMemo: sUM } = React;

export function GlassMaterial(props) {
  return (
    <meshPhysicalMaterial
      transparent opacity={1} transmission={1} roughness={0.05} metalness={0}
      thickness={0.35} ior={1.5} clearcoat={1} clearcoatRoughness={0.06}
      reflectivity={0.5} envMapIntensity={1.3} color="#ffffff"
      attenuationColor="#eaf6ff" attenuationDistance={2} {...props}
    />
  );
}

/* Vivid lab-liquid material. */
export function liquidProps(color) {
  return { color, roughness: 0.12, metalness: 0.0, transparent: true, opacity: 0.92, emissive: color, emissiveIntensity: 0.22 };
}

/* ── Wall art (procedural canvas-texture posters) ── */
function makeTexture(w, h, draw) {
  const cvs = document.createElement("canvas");
  cvs.width = w; cvs.height = h;
  draw(cvs.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}
function drawPeriodicTable(ctx, w, h) {
  ctx.fillStyle = "#0f172a"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff"; ctx.font = "bold 34px Arial"; ctx.textAlign = "center";
  ctx.fillText("PERIODIC TABLE OF THE ELEMENTS", w / 2, 46);
  const cols = 18, rows = 7, pad = 24, top = 70;
  const cw = (w - pad * 2) / cols, chh = (h - top - 20) / rows;
  const cats = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#eab308"];
  const filled = (r, c) => (r === 0 && (c === 0 || c === 17)) || (r === 1 && (c <= 1 || c >= 12)) || (r === 2 && (c <= 1 || c >= 12)) || (r >= 3 && r <= 5) || (r === 6 && c >= 2);
  const syms = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Fe", "Cu", "Zn", "Ag", "Au", "Hg", "Pb"];
  let s = 0; ctx.textAlign = "center";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!filled(r, c)) continue;
    const x = pad + c * cw, y = top + r * chh;
    ctx.fillStyle = cats[(r + c) % cats.length]; ctx.fillRect(x + 1.5, y + 1.5, cw - 3, chh - 3);
    ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.font = `bold ${Math.floor(chh * 0.42)}px Arial`;
    ctx.fillText(syms[s % syms.length], x + cw / 2, y + chh * 0.62); s++;
  }
}
function drawPHScale(ctx, w, h) {
  ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 40px Arial"; ctx.textAlign = "left"; ctx.fillText("pH SCALE", 30, 56);
  const bx = 30, by = 84, bw = w - 60, bh = h - 150;
  const g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  g.addColorStop(0, "#e11d48"); g.addColorStop(0.35, "#f59e0b"); g.addColorStop(0.5, "#22c55e"); g.addColorStop(0.7, "#3b82f6"); g.addColorStop(1, "#6d28d9");
  ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 26px Arial"; ctx.textAlign = "center";
  for (let i = 0; i <= 14; i++) ctx.fillText(String(i), bx + (bw / 14) * i, by + bh + 36);
}
function drawMolecule(ctx, w, h) {
  ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0f172a"; ctx.font = `bold ${Math.floor(w * 0.11)}px Arial`; ctx.textAlign = "center"; ctx.fillText("WATER  H₂O", w / 2, h * 0.16);
  const ox = w / 2, oy = h * 0.55, R = w * 0.16, r = w * 0.1;
  const h1 = [ox - w * 0.22, oy + h * 0.16], h2 = [ox + w * 0.22, oy + h * 0.16];
  ctx.strokeStyle = "#475569"; ctx.lineWidth = w * 0.04;
  ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(h1[0], h1[1]); ctx.moveTo(ox, oy); ctx.lineTo(h2[0], h2[1]); ctx.stroke();
  ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.floor(R)}px Arial`; ctx.fillText("O", ox, oy + R * 0.35);
  [h1, h2].forEach((p) => { ctx.fillStyle = "#bfdbfe"; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#1e3a8a"; ctx.font = `bold ${Math.floor(r)}px Arial`; ctx.fillText("H", p[0], p[1] + r * 0.35); });
}
function drawClock(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = w / 2;
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.96, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#0f172a"; ctx.lineWidth = w * 0.03; ctx.stroke();
  ctx.strokeStyle = "#334155"; ctx.lineWidth = w * 0.012;
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82); ctx.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9); ctx.stroke(); }
  ctx.strokeStyle = "#0f172a"; ctx.lineCap = "round";
  ctx.lineWidth = w * 0.03; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - R * 0.35, cy - R * 0.28); ctx.stroke();
  ctx.lineWidth = w * 0.022; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R * 0.4, cy - R * 0.22); ctx.stroke();
  ctx.fillStyle = "#0d9488"; ctx.beginPath(); ctx.arc(cx, cy, R * 0.05, 0, Math.PI * 2); ctx.fill();
}
function drawSafety(ctx, w, h) {
  ctx.fillStyle = "#facc15"; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0f172a"; ctx.beginPath(); ctx.moveTo(w / 2, h * 0.16); ctx.lineTo(w * 0.84, h * 0.6); ctx.lineTo(w * 0.16, h * 0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#facc15"; ctx.font = `bold ${Math.floor(w * 0.34)}px Arial`; ctx.textAlign = "center"; ctx.fillText("!", w / 2, h * 0.55);
  ctx.fillStyle = "#0f172a"; ctx.font = `bold ${Math.floor(w * 0.1)}px Arial`; ctx.fillText("SAFETY FIRST", w / 2, h * 0.78);
  ctx.font = `${Math.floor(w * 0.07)}px Arial`; ctx.fillText("WEAR GOGGLES & GLOVES", w / 2, h * 0.9);
}
function Poster({ texture, position, size }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.015]}><boxGeometry args={[size[0] + 0.06, size[1] + 0.06, 0.03]} /><meshStandardMaterial color="#3b2f2a" roughness={0.7} /></mesh>
      <mesh><planeGeometry args={size} /><meshBasicMaterial map={texture} toneMapped={false} /></mesh>
    </group>
  );
}
function WallArt() {
  const z = -2.37;
  const periodic = sUM(() => makeTexture(1024, 460, drawPeriodicTable), []);
  const ph = sUM(() => makeTexture(640, 360, drawPHScale), []);
  const safety = sUM(() => makeTexture(420, 420, drawSafety), []);
  const molecule = sUM(() => makeTexture(420, 360, drawMolecule), []);
  const clock = sUM(() => makeTexture(256, 256, drawClock), []);
  return (
    <group>
      <Poster texture={periodic} position={[0, 1.78, z]} size={[1.9, 0.86]} />
      <Poster texture={ph} position={[-1.75, 0.95, z]} size={[0.86, 0.48]} />
      <Poster texture={molecule} position={[-1.7, 1.62, z]} size={[0.62, 0.5]} />
      <Poster texture={safety} position={[1.75, 0.92, z]} size={[0.5, 0.5]} />
      <group position={[1.85, 1.62, z]}>
        <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.27, 0.27, 0.04, 36]} /><meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.3} /></mesh>
        <mesh position={[0, 0, 0.002]}><circleGeometry args={[0.25, 48]} /><meshBasicMaterial map={clock} toneMapped={false} transparent /></mesh>
      </group>
    </group>
  );
}

/* ── Instruments ── */
export function Microscope({ position }) {
  const metal = "#1f2937", steel = "#9ca3af";
  return (
    <group position={position} rotation={[0, 0.5, 0]} scale={0.42}>
      <mesh castShadow position={[0, 0.04, 0]}><cylinderGeometry args={[0.34, 0.4, 0.08, 32]} /><meshStandardMaterial color={metal} roughness={0.4} metalness={0.6} /></mesh>
      <mesh castShadow position={[-0.12, 0.5, 0]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.12, 0.9, 0.14]} /><meshStandardMaterial color={metal} roughness={0.4} metalness={0.6} /></mesh>
      <mesh position={[0.12, 0.42, 0]}><boxGeometry args={[0.34, 0.05, 0.34]} /><meshStandardMaterial color={steel} roughness={0.3} metalness={0.7} /></mesh>
      <mesh castShadow position={[0.12, 0.9, 0]}><cylinderGeometry args={[0.08, 0.08, 0.5, 24]} /><meshStandardMaterial color={metal} roughness={0.4} metalness={0.6} /></mesh>
      <mesh position={[0.12, 1.2, 0.05]} rotation={[0.4, 0, 0]}><cylinderGeometry args={[0.05, 0.06, 0.18, 20]} /><meshStandardMaterial color={metal} roughness={0.3} metalness={0.7} /></mesh>
      <mesh position={[0.12, 0.6, 0]}><coneGeometry args={[0.07, 0.14, 20]} /><meshStandardMaterial color={steel} roughness={0.2} metalness={0.8} /></mesh>
    </group>
  );
}
export function Thermometer({ position }) {
  return (
    <group position={position} rotation={[0, 0, 0.12]}>
      <mesh castShadow position={[0, 0.35, 0]}><cylinderGeometry args={[0.022, 0.022, 0.7, 16]} /><GlassMaterial opacity={0.4} /></mesh>
      <mesh position={[0, 0.05, 0]}><sphereGeometry args={[0.04, 16, 16]} /><meshStandardMaterial color="#dc2626" roughness={0.3} emissive="#dc2626" emissiveIntensity={0.2} /></mesh>
      <mesh position={[0, 0.28, 0]}><cylinderGeometry args={[0.012, 0.012, 0.42, 12]} /><meshStandardMaterial color="#dc2626" roughness={0.3} /></mesh>
    </group>
  );
}
export function Beaker({ position, color = "#2563eb", scale = 1, fill = 0.62 }) {
  const H = 0.4, liqH = H * fill;
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, H / 2, 0]}><cylinderGeometry args={[0.2, 0.18, H, 36, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.18, 0.18, 0.024, 36]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, H, 0]}><torusGeometry args={[0.2, 0.01, 10, 36]} /><GlassMaterial /></mesh>
      <mesh position={[0, liqH / 2 + 0.02, 0]}><cylinderGeometry args={[0.182, 0.168, liqH, 36]} /><meshStandardMaterial {...liquidProps(color)} /></mesh>
      <mesh position={[0, liqH + 0.02, 0]}><cylinderGeometry args={[0.182, 0.182, 0.006, 36]} /><meshStandardMaterial {...liquidProps(color)} opacity={0.7} /></mesh>
      {[0.3, 0.5, 0.7, 0.9].map((f, i) => (<mesh key={i} position={[0.198, H * f, 0]}><boxGeometry args={[0.006, 0.004, 0.05]} /><meshBasicMaterial color="#fff" toneMapped={false} transparent opacity={0.85} /></mesh>))}
      <mesh position={[0, H * 0.42, 0.205]}><planeGeometry args={[0.13, 0.07]} /><meshBasicMaterial color="#fff" toneMapped={false} transparent opacity={0.9} /></mesh>
    </group>
  );
}
export function BunsenBurner({ position }) {
  const flame = sUR();
  useFrame((s) => { if (flame.current) { const t = s.clock.elapsedTime; flame.current.scale.y = 1 + Math.sin(t * 14) * 0.12; flame.current.scale.x = flame.current.scale.z = 1 + Math.sin(t * 11) * 0.05; } });
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.02, 0]}><cylinderGeometry args={[0.13, 0.16, 0.04, 24]} /><meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.6} /></mesh>
      <mesh castShadow position={[0, 0.2, 0]}><cylinderGeometry args={[0.035, 0.05, 0.36, 20]} /><meshStandardMaterial color="#374151" roughness={0.4} metalness={0.7} /></mesh>
      <group ref={flame} position={[0, 0.5, 0]}>
        <mesh><coneGeometry args={[0.05, 0.26, 18]} /><meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.4} transparent opacity={0.85} /></mesh>
        <mesh position={[0, -0.03, 0]}><coneGeometry args={[0.03, 0.16, 18]} /><meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1.8} transparent opacity={0.9} /></mesh>
        <pointLight color="#fb923c" intensity={0.6} distance={1.4} position={[0, 0.1, 0]} />
      </group>
    </group>
  );
}
export function ConicalFlask({ position, color = "#a78bfa" }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.13, 0]}><coneGeometry args={[0.17, 0.28, 32, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh castShadow position={[0, 0.33, 0]}><cylinderGeometry args={[0.045, 0.045, 0.14, 20, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.4, 0]}><torusGeometry args={[0.045, 0.008, 10, 20]} /><GlassMaterial opacity={0.5} /></mesh>
      <mesh position={[0, 0.085, 0]}><coneGeometry args={[0.13, 0.17, 32]} /><meshStandardMaterial {...liquidProps(color)} /></mesh>
    </group>
  );
}
export function GraduatedCylinder({ position, color = "#34d399" }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]}><cylinderGeometry args={[0.09, 0.09, 0.02, 24]} /><meshStandardMaterial color="#cbd5e1" roughness={0.5} /></mesh>
      <mesh castShadow position={[0, 0.28, 0]}><cylinderGeometry args={[0.05, 0.05, 0.52, 28, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.042, 0.042, 0.34, 24]} /><meshStandardMaterial {...liquidProps(color)} /></mesh>
      {[0.18, 0.3, 0.42, 0.5].map((y, i) => (<mesh key={i} position={[0.05, y, 0]}><boxGeometry args={[0.004, 0.003, 0.03]} /><meshBasicMaterial color="#fff" toneMapped={false} transparent opacity={0.8} /></mesh>))}
    </group>
  );
}

/* The room: floor, walls, wainscot, window, wall art, shelf, workbench. */
export function LabRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} receiveShadow><planeGeometry args={[24, 24]} /><meshStandardMaterial color="#eef2f6" roughness={0.7} metalness={0.05} /></mesh>
      <mesh position={[0, 2.4, -2.4]} receiveShadow><planeGeometry args={[24, 5]} /><meshStandardMaterial color="#eaf0f5" roughness={1} /></mesh>
      <mesh position={[0, 0.2, -2.39]} receiveShadow><planeGeometry args={[24, 1.7]} /><meshStandardMaterial color="#9fb3bd" roughness={0.95} /></mesh>
      <mesh position={[0, 1.05, -2.37]}><boxGeometry args={[24, 0.05, 0.04]} /><meshStandardMaterial color="#64748b" roughness={0.8} /></mesh>
      <mesh position={[-6, 1.4, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[12, 7]} /><meshStandardMaterial color="#e3eaf0" roughness={1} side={2} /></mesh>
      <mesh position={[6, 1.4, 0]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[12, 7]} /><meshStandardMaterial color="#e3eaf0" roughness={1} side={2} /></mesh>
      <mesh position={[-2.2, 2.05, -2.38]}><planeGeometry args={[1.6, 0.9]} /><meshStandardMaterial color="#e0f2fe" emissive="#bae6fd" emissiveIntensity={0.6} roughness={1} /></mesh>
      <WallArt />
      <mesh position={[1.9, 1.6, -2.3]}><boxGeometry args={[2.4, 0.05, 0.3]} /><meshStandardMaterial color="#94703a" roughness={0.8} /></mesh>
      {[1.2, 1.7, 2.2, 2.7].map((x, i) => (<mesh key={i} position={[x, 1.78, -2.3]}><cylinderGeometry args={[0.07, 0.06, 0.22, 20, 1, true]} /><meshStandardMaterial color={["#fca5a5", "#a7f3d0", "#bfdbfe", "#fde68a"][i]} transparent opacity={0.6} roughness={0.2} /></mesh>))}
      <mesh position={[0, -0.08, 0]} receiveShadow><boxGeometry args={[6, 0.16, 2.2]} /><meshPhysicalMaterial color="#26262b" roughness={0.35} metalness={0.2} clearcoat={0.8} clearcoatRoughness={0.25} /></mesh>
      <mesh position={[0, -0.08, 1.11]}><boxGeometry args={[6, 0.18, 0.04]} /><meshStandardMaterial color="#7c5a33" roughness={0.6} /></mesh>
      <mesh position={[0, -0.38, 0.15]}><boxGeometry args={[5.7, 0.46, 1.7]} /><meshStandardMaterial color="#3f4750" roughness={0.7} /></mesh>
    </group>
  );
}

/* Decorative instrument cluster shared by all labs (positions kept clear of
   the central work area where each lab places its own interactive items). */
export function BenchInstruments() {
  return (
    <>
      <Microscope position={[-2.25, 0, -0.15]} />
      <Thermometer position={[1.55, 0.0, -0.3]} />
      <Beaker position={[2.45, 0, -0.25]} color="#2563eb" scale={1.15} fill={0.66} />
      <Beaker position={[2.55, 0, 0.45]} color="#d946ef" scale={0.82} fill={0.6} />
      <BunsenBurner position={[-1.6, 0, 0.62]} />
      <ConicalFlask position={[-0.7, 0, 0.66]} color="#f97316" />
      <GraduatedCylinder position={[2.0, 0, 0.66]} color="#22c55e" />
    </>
  );
}

/* Lighting + procedural environment + ground shadows + orbit camera. */
export function SceneEnv() {
  return (
    <>
      <color attach="background" args={["#eaf1f7"]} />
      <fog attach="fog" args={["#eaf1f7", 7, 16]} />
      <hemisphereLight args={["#ffffff", "#c7d2da", 0.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight color="#fff4e6" position={[3, 5, 4]} intensity={1.25} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
      <directionalLight color="#dbeafe" position={[-4, 3, -2]} intensity={0.45} />
      <pointLight position={[0, 2, 2]} intensity={0.4} />
      <Environment resolution={128}>
        <Lightformer intensity={1.2} position={[0, 3, 2]} scale={[6, 3, 1]} />
        <Lightformer intensity={0.6} position={[-3, 1, 1]} scale={[3, 3, 1]} />
      </Environment>
      <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={8} blur={2.4} far={2} />
      <OrbitControls enablePan={false} minDistance={1.6} maxDistance={5} minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.15} target={[0, 0.25, 0]} />
    </>
  );
}
