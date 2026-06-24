/* ── Realistic procedural 3D models for lab components & tools ──
   Designed so each item actually looks like the real object resting on the
   bench (a nail looks like a nail, a coin like a coin), instead of a generic
   jar. Plus per-lab tools: a bar magnet, a water beaker, a conductivity tester.
   All meshes are origin-near-base so they sit on the workbench (y≈0). */
import React from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { C } from "./tokens.js";
import { GlassMaterial, liquidProps } from "./lab3dscene.jsx";

const { useRef: iUR, useState: iUS } = React;

const metalMat = (color, rough = 0.32) => ({ color, metalness: 0.95, roughness: rough });

/* ── individual component shapes (centred on origin, resting on bench) ── */
function NailModel({ color = "#9aa0a8" }) {
  // lies horizontally: head — shaft — point
  return (
    <group rotation={[0, 0, Math.PI / 2]} position={[0, 0.02, 0]}>
      <mesh castShadow><cylinderGeometry args={[0.016, 0.016, 0.34, 16]} /><meshStandardMaterial {...metalMat(color)} /></mesh>
      <mesh castShadow position={[0, 0.17, 0]}><cylinderGeometry args={[0.038, 0.038, 0.018, 20]} /><meshStandardMaterial {...metalMat(color)} /></mesh>
      <mesh castShadow position={[0, -0.19, 0]}><coneGeometry args={[0.016, 0.06, 16]} /><meshStandardMaterial {...metalMat(color)} /></mesh>
    </group>
  );
}
function PinModel({ color = "#cbd5e1" }) {
  // stylised safety pin: an open loop + a straight bar
  return (
    <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={1.1}>
      <mesh castShadow position={[-0.07, 0, 0]}><torusGeometry args={[0.045, 0.009, 12, 28]} /><meshStandardMaterial {...metalMat(color, 0.25)} /></mesh>
      <mesh castShadow position={[0.02, 0.03, 0]} rotation={[0, 0, 0.12]}><cylinderGeometry args={[0.009, 0.009, 0.2, 12]} rotation={[0, 0, Math.PI / 2]} /><meshStandardMaterial {...metalMat(color, 0.25)} /></mesh>
      <mesh castShadow position={[0.02, -0.03, 0]} rotation={[0, 0, -0.12]}><cylinderGeometry args={[0.009, 0.009, 0.2, 12]} /><meshStandardMaterial {...metalMat(color, 0.25)} /></mesh>
    </group>
  );
}
function CoinModel({ color = "#c0c5cc" }) {
  return (
    <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
      <cylinderGeometry args={[0.11, 0.11, 0.022, 40]} />
      <meshStandardMaterial {...metalMat(color, 0.3)} />
    </mesh>
  );
}
function FoilModel({ color = "#d4d8de" }) {
  // crumpled shiny sheet
  return (
    <group position={[0, 0.04, 0]}>
      <mesh castShadow rotation={[0.5, 0.3, 0.2]}><icosahedronGeometry args={[0.1, 0]} /><meshStandardMaterial color={color} metalness={0.9} roughness={0.25} flatShading /></mesh>
    </group>
  );
}
function WireModel({ color = "#b45309" }) {
  // coil of wire lying flat
  return (
    <group position={[0, 0.03, 0]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.1, 0.014, 14, 40]} /><meshStandardMaterial {...metalMat(color, 0.3)} /></mesh>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} scale={0.7}><torusGeometry args={[0.1, 0.014, 14, 40]} /><meshStandardMaterial {...metalMat(color, 0.3)} /></mesh>
    </group>
  );
}
function RulerModel({ color = "#60a5fa" }) {
  return (
    <group position={[0, 0.015, 0]}>
      <mesh castShadow><boxGeometry args={[0.42, 0.02, 0.07]} /><meshStandardMaterial color={color} transparent opacity={0.65} roughness={0.2} metalness={0.1} /></mesh>
      {[-0.16, -0.08, 0, 0.08, 0.16].map((x, i) => (
        <mesh key={i} position={[x, 0.011, 0.02]}><boxGeometry args={[0.004, 0.002, 0.02]} /><meshBasicMaterial color="#1e293b" /></mesh>
      ))}
    </group>
  );
}
function StripModel({ color = "#cbd5e1" }) {
  return <mesh castShadow position={[0, 0.02, 0]} rotation={[0, 0, 0.04]}><boxGeometry args={[0.34, 0.014, 0.06]} /><meshStandardMaterial {...metalMat(color, 0.35)} /></mesh>;
}
function RibbonModel({ color = "#d1d5db" }) {
  // thin curled magnesium ribbon
  return (
    <group position={[0, 0.03, 0]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.07, 0.006, 8, 28, Math.PI * 1.4]} /><meshStandardMaterial {...metalMat(color, 0.4)} /></mesh>
    </group>
  );
}
function LumpModel({ color = "#facc15" }) {
  // irregular rock/lump (sulphur, coal, etc.)
  return (
    <mesh castShadow position={[0, 0.06, 0]} rotation={[0.4, 0.6, 0.2]}>
      <dodecahedronGeometry args={[0.1, 0]} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.05} flatShading />
    </mesh>
  );
}
/* a shallow dish holding a mound of powder / grains / crystals / liquid */
function DishModel({ color = "#ffffff", kind = "powder" }) {
  return (
    <group position={[0, 0.02, 0]}>
      <mesh receiveShadow><cylinderGeometry args={[0.14, 0.12, 0.03, 32]} /><GlassMaterial side={2} opacity={0.5} /></mesh>
      {kind === "liquid" ? (
        <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.125, 0.115, 0.025, 32]} /><meshStandardMaterial {...liquidProps(color)} /></mesh>
      ) : kind === "crystal" ? (
        [[-0.04, 0.03, 0.02], [0.03, 0.035, -0.03], [0.01, 0.045, 0.04], [-0.02, 0.03, -0.02]].map((p, i) => (
          <mesh key={i} position={p} rotation={[0.3 * i, 0.5 * i, 0]}><octahedronGeometry args={[0.035, 0]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.1} flatShading /></mesh>
        ))
      ) : kind === "mixture" ? (
        <group>
          <mesh position={[0, 0.035, 0]}><sphereGeometry args={[0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={1} /></mesh>
          {[[-0.045, 0.075, 0.02], [0.04, 0.08, -0.025], [0.005, 0.095, 0.04], [-0.02, 0.07, -0.05]].map((pos, i) => (
            <mesh key={i} position={pos} rotation={[0.4 * i, 0.7 * i, 0]}><dodecahedronGeometry args={[0.024, 0]} /><meshStandardMaterial color="#3f3f46" roughness={0.8} flatShading /></mesh>
          ))}
        </group>
      ) : kind === "specks" ? (
        <group>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.125, 0.115, 0.025, 32]} /><meshStandardMaterial {...liquidProps(color)} /></mesh>
          {[[-0.05, 0.035, 0.03], [0.045, 0.035, -0.02], [0.0, 0.035, 0.055], [-0.03, 0.035, -0.045], [0.06, 0.035, 0.03]].map((pos, i) => (
            <mesh key={i} position={pos} rotation={[0, 0.9 * i, 0]}><boxGeometry args={[0.022, 0.006, 0.014]} /><meshStandardMaterial color="#2d3a26" roughness={0.9} /></mesh>
          ))}
        </group>
      ) : (
        <mesh position={[0, 0.035, 0]}><sphereGeometry args={[0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} roughness={kind === "grains" ? 1 : 0.9} /></mesh>
      )}
    </group>
  );
}

/* ── Light-test materials (Class 6 Ch 6 — Materials Around Us) ── */
function SlabModel({ color = "#dbeafe" }) {
  // clear glass slab standing upright
  return (
    <group position={[0, 0, 0]}>
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[0.26, 0.26, 0.045]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.28} transmission={0.92} roughness={0.04} ior={1.5} />
      </mesh>
      <mesh position={[0, 0.012, 0]}><boxGeometry args={[0.3, 0.024, 0.1]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} /></mesh>
    </group>
  );
}
function FrostedModel({ color = "#cbd5e1" }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[0.26, 0.26, 0.045]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.62} transmission={0.45} roughness={0.55} ior={1.4} />
      </mesh>
      <mesh position={[0, 0.012, 0]}><boxGeometry args={[0.3, 0.024, 0.1]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} /></mesh>
    </group>
  );
}
function SheetModel({ color = "#fef9c3" }) {
  // butter/tracing paper on a little stand, slightly bowed
  return (
    <group>
      <mesh castShadow position={[0, 0.16, 0]} rotation={[0, 0, 0.03]}>
        <boxGeometry args={[0.27, 0.28, 0.008]} />
        <meshStandardMaterial color={color} transparent opacity={0.8} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.012, 0]}><boxGeometry args={[0.3, 0.024, 0.1]} /><meshStandardMaterial color="#94a3b8" roughness={0.5} /></mesh>
    </group>
  );
}
function BlockModel({ color = "#92623a" }) {
  // solid wooden block with visible grain tone
  return (
    <group>
      <mesh castShadow position={[0, 0.13, 0]}>
        <boxGeometry args={[0.24, 0.26, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.13, 0.061]}><planeGeometry args={[0.2, 0.2]} /><meshStandardMaterial color="#7c4f2c" roughness={0.9} /></mesh>
    </group>
  );
}
function PanelModel({ color = "#cbd5e1" }) {
  // standing steel plate
  return (
    <group>
      <mesh castShadow position={[0, 0.15, 0]}>
        <boxGeometry args={[0.26, 0.26, 0.018]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.012, 0]}><boxGeometry args={[0.3, 0.024, 0.1]} /><meshStandardMaterial color="#64748b" roughness={0.5} /></mesh>
    </group>
  );
}
function CupModel({ color = "#bfe3f0" }) {
  // small glass tumbler with liquid
  return (
    <group>
      <mesh castShadow position={[0, 0.11, 0]}><cylinderGeometry args={[0.075, 0.062, 0.21, 28, 1, true]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.008, 0]}><cylinderGeometry args={[0.062, 0.062, 0.016, 28]} /><GlassMaterial side={2} /></mesh>
      <mesh position={[0, 0.085, 0]}><cylinderGeometry args={[0.062, 0.055, 0.14, 28]} /><meshStandardMaterial {...liquidProps(color)} /></mesh>
    </group>
  );
}

/* ── Motion toys (Class 6 Ch 5 — animated when examined) ── */
function FanModel({ color = "#60a5fa", active }) {
  const blades = iUR();
  useFrame((_, dt) => { if (blades.current) blades.current.rotation.z -= dt * (active ? 10 : 0.6); });
  return (
    <group>
      <mesh castShadow position={[0, 0.025, 0]}><cylinderGeometry args={[0.1, 0.13, 0.05, 24]} /><meshStandardMaterial color="#334155" roughness={0.5} metalness={0.4} /></mesh>
      <mesh castShadow position={[0, 0.17, 0]}><cylinderGeometry args={[0.022, 0.028, 0.26, 14]} /><meshStandardMaterial color="#334155" roughness={0.5} metalness={0.4} /></mesh>
      <group position={[0, 0.34, 0.03]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.045, 0.045, 0.05, 18]} /><meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} /></mesh>
        <group ref={blades}>
          {[0, 2.094, 4.188].map((a, i) => (
            <mesh key={i} castShadow position={[Math.cos(a) * 0.105, Math.sin(a) * 0.105, 0]} rotation={[0, 0, a]}>
              <boxGeometry args={[0.16, 0.06, 0.012]} />
              <meshStandardMaterial color={color} roughness={0.4} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}
function PendulumModel({ color = "#d97706", active }) {
  const piv = iUR(); const t = iUR(0);
  useFrame((_, dt) => { t.current += dt; if (piv.current) piv.current.rotation.z = Math.sin(t.current * (active ? 3.1 : 0.9)) * (active ? 0.55 : 0.05); });
  return (
    <group>
      <mesh position={[0, 0.015, 0]}><cylinderGeometry args={[0.11, 0.13, 0.03, 24]} /><meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} /></mesh>
      <mesh castShadow position={[-0.08, 0.27, 0]}><cylinderGeometry args={[0.013, 0.013, 0.5, 12]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[-0.02, 0.51, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.011, 0.011, 0.13, 10]} /><meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} /></mesh>
      <group ref={piv} position={[0.04, 0.51, 0]}>
        <mesh position={[0, -0.16, 0]}><cylinderGeometry args={[0.004, 0.004, 0.32, 8]} /><meshStandardMaterial color="#94a3b8" /></mesh>
        <mesh castShadow position={[0, -0.345, 0]}><sphereGeometry args={[0.05, 20, 20]} /><meshStandardMaterial color={color} metalness={0.55} roughness={0.3} /></mesh>
      </group>
    </group>
  );
}
function SwingModel({ color = "#dc2626", active }) {
  const piv = iUR(); const t = iUR(0);
  useFrame((_, dt) => { t.current += dt; if (piv.current) piv.current.rotation.x = Math.sin(t.current * (active ? 2.6 : 0.8)) * (active ? 0.5 : 0.04); });
  const post = (x) => (
    <mesh key={x} castShadow position={[x, 0.21, 0]}><cylinderGeometry args={[0.014, 0.016, 0.42, 12]} /><meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} /></mesh>
  );
  return (
    <group>
      {[-0.14, 0.14].map(post)}
      <mesh position={[0, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.013, 0.013, 0.32, 12]} /><meshStandardMaterial color="#475569" metalness={0.5} roughness={0.5} /></mesh>
      <group ref={piv} position={[0, 0.42, 0]}>
        {[-0.06, 0.06].map((x) => (
          <mesh key={x} position={[x, -0.14, 0]}><cylinderGeometry args={[0.0035, 0.0035, 0.28, 8]} /><meshStandardMaterial color="#94a3b8" /></mesh>
        ))}
        <mesh castShadow position={[0, -0.285, 0]}><boxGeometry args={[0.17, 0.02, 0.08]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      </group>
    </group>
  );
}
function CarModel({ color = "#dc2626", active }) {
  const g = iUR(); const t = iUR(0);
  useFrame((_, dt) => { t.current += dt; if (g.current) g.current.position.x = active ? Math.sin(t.current * 2.4) * 0.2 : g.current.position.x * 0.9; });
  const wheel = (x, z) => (
    <mesh key={`${x}${z}`} castShadow position={[x, 0.035, z]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.034, 0.034, 0.025, 18]} />
      <meshStandardMaterial color="#1f2937" roughness={0.7} />
    </mesh>
  );
  return (
    <group ref={g}>
      <mesh castShadow position={[0, 0.085, 0]}><boxGeometry args={[0.24, 0.07, 0.11]} /><meshStandardMaterial color={color} roughness={0.35} metalness={0.2} /></mesh>
      <mesh castShadow position={[-0.015, 0.15, 0]}><boxGeometry args={[0.12, 0.06, 0.095]} /><meshStandardMaterial color="#bfdbfe" roughness={0.2} metalness={0.1} transparent opacity={0.85} /></mesh>
      {wheel(-0.08, 0.062)}{wheel(0.08, 0.062)}{wheel(-0.08, -0.062)}{wheel(0.08, -0.062)}
    </group>
  );
}
function TopModel({ color = "#7c3aed", active }) {
  const g = iUR(); const t = iUR(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (!g.current) return;
    g.current.rotation.y += dt * (active ? 12 : 0.5);
    g.current.rotation.z = active ? 0.1 + Math.sin(t.current * 5) * 0.06 : 0;
  });
  return (
    <group ref={g} position={[0, 0.0, 0]}>
      <mesh castShadow position={[0, 0.085, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.085, 0.13, 24]} /><meshStandardMaterial color={color} roughness={0.3} metalness={0.2} /></mesh>
      <mesh castShadow position={[0, 0.185, 0]}><cylinderGeometry args={[0.05, 0.085, 0.07, 24]} /><meshStandardMaterial color="#f59e0b" roughness={0.3} /></mesh>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.012, 0.012, 0.06, 10]} /><meshStandardMaterial color="#374151" metalness={0.5} /></mesh>
    </group>
  );
}
function BallModel({ color = "#f59e0b", active }) {
  const g = iUR(); const t = iUR(0);
  useFrame((_, dt) => {
    t.current += dt;
    if (!g.current) return;
    const x = active ? Math.sin(t.current * 2.0) * 0.2 : 0;
    g.current.position.x = x;
    g.current.rotation.z = -x / 0.07;
  });
  return (
    <group ref={g}>
      <mesh castShadow position={[0, 0.07, 0]}><sphereGeometry args={[0.07, 24, 24]} /><meshStandardMaterial color={color} roughness={0.4} /></mesh>
      <mesh position={[0, 0.07, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.071, 0.006, 8, 28]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh>
    </group>
  );
}

/* ── Class 7 shapes ── */
function OrbModel({ color = "#fbbf24", active }) {
  // plain sphere on a small ring stand (sun, moon, planets…)
  return (
    <group>
      <mesh position={[0, 0.015, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.055, 0.012, 10, 28]} /><meshStandardMaterial color="#64748b" roughness={0.6} /></mesh>
      <mesh castShadow position={[0, 0.115, 0]}>
        <sphereGeometry args={[0.095, 28, 28]} />
        <meshStandardMaterial color={color} roughness={0.55} emissive={color} emissiveIntensity={active ? 0.55 : 0.12} />
      </mesh>
    </group>
  );
}
function BulbModel({ color = "#fde68a", active }) {
  // incandescent bulb standing on a brass screw base
  return (
    <group>
      <mesh position={[0, 0.045, 0]}><cylinderGeometry args={[0.045, 0.055, 0.09, 20]} /><meshStandardMaterial color="#b45309" metalness={0.75} roughness={0.35} /></mesh>
      {[0.022, 0.05, 0.078].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.047, 0.004, 8, 20]} /><meshStandardMaterial color="#92580c" metalness={0.7} roughness={0.4} /></mesh>
      ))}
      <mesh castShadow position={[0, 0.19, 0]}>
        <sphereGeometry args={[0.085, 24, 24]} />
        <meshStandardMaterial color={active ? "#fde047" : color} transparent opacity={0.85} roughness={0.15} emissive={active ? "#fbbf24" : "#000000"} emissiveIntensity={active ? 1.4 : 0} />
      </mesh>
      <mesh position={[0, 0.17, 0]}><torusGeometry args={[0.022, 0.004, 6, 14]} rotation={[0.4, 0, 0]} /><meshStandardMaterial color="#7c4a1e" /></mesh>
    </group>
  );
}
function CandleModel({ color = "#fef3c7", active }) {
  const flame = iUR();
  useFrame((s) => {
    if (!flame.current) return;
    const t = s.clock.elapsedTime;
    flame.current.scale.y = 1 + Math.sin(t * 12) * 0.15;
    flame.current.rotation.z = Math.sin(t * 7) * 0.08;
  });
  return (
    <group>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.07, 0.08, 0.024, 20]} /><meshStandardMaterial color="#9ca3af" metalness={0.5} roughness={0.4} /></mesh>
      <mesh castShadow position={[0, 0.12, 0]}><cylinderGeometry args={[0.035, 0.04, 0.2, 18]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>
      <mesh position={[0, 0.235, 0]}><cylinderGeometry args={[0.004, 0.004, 0.025, 6]} /><meshStandardMaterial color="#1f2937" /></mesh>
      <group ref={flame} position={[0, 0.275, 0]}>
        <mesh><coneGeometry args={[0.02, 0.07, 12]} /><meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={active ? 1.8 : 1.1} transparent opacity={0.9} /></mesh>
        <mesh position={[0, -0.012, 0]}><coneGeometry args={[0.01, 0.035, 10]} /><meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={2} /></mesh>
      </group>
      {active && <pointLight color="#fb923c" intensity={0.45} distance={1.2} position={[0, 0.3, 0]} />}
    </group>
  );
}
function SpoonModel({ color = "#cbd5e1" }) {
  // steel spoon resting tilted in a glass of hot liquid? — bare spoon lying on bench
  return (
    <group position={[0, 0.025, 0]} rotation={[0, 0.35, 0]}>
      <mesh castShadow rotation={[0, 0, Math.PI / 2]} position={[0.06, 0, 0]}><cylinderGeometry args={[0.011, 0.014, 0.24, 12]} /><meshStandardMaterial color={color} metalness={0.9} roughness={0.25} /></mesh>
      <mesh castShadow position={[-0.085, 0.005, 0]} rotation={[-Math.PI / 2.3, 0, 0]} scale={[1, 1.45, 0.45]}>
        <sphereGeometry args={[0.055, 18, 14]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.25} side={2} />
      </mesh>
    </group>
  );
}

const SHAPES = {
  nail: NailModel, pin: PinModel, coin: CoinModel, foil: FoilModel, wire: WireModel,
  ruler: RulerModel, strip: StripModel, ribbon: RibbonModel, lump: LumpModel,
  slab: SlabModel, frosted: FrostedModel, sheet: SheetModel, block: BlockModel, panel: PanelModel, cup: CupModel,
  fan: FanModel, pendulum: PendulumModel, swing: SwingModel, car: CarModel, top: TopModel, ball: BallModel,
  orb: OrbModel, bulb: BulbModel, candle: CandleModel, spoon: SpoonModel,
  powder: (p) => <DishModel {...p} kind="powder" />, grains: (p) => <DishModel {...p} kind="grains" />,
  crystal: (p) => <DishModel {...p} kind="crystal" />, liquid: (p) => <DishModel {...p} kind="liquid" />,
  mixture: (p) => <DishModel {...p} kind="mixture" />, specks: (p) => <DishModel {...p} kind="specks" />,
};

/* An item on the bench: its real 3D model + selection ring + hover label.
   `lift` (0..1) raises it (used when a magnet attracts it). */
export function Item3D({ item, position, selected, tested, accent, lift = 0, onExamine }) {
  const g = iUR();
  const [hover, setHover] = iUS(false);
  useFrame((_, dt) => {
    if (!g.current) return;
    const ty = position[1] + lift * 0.22;
    g.current.position.y += (ty - g.current.position.y) * Math.min(1, dt * 8);
    const tz = (selected && !lift) ? 0.07 : 0; // little tilt when picked up
    g.current.rotation.z += (tz - g.current.rotation.z) * Math.min(1, dt * 8);
  });
  const Shape = SHAPES[item.shape] || LumpModel;
  return (
    <group ref={g} position={position}
      onClick={(e) => { e.stopPropagation(); onExamine(item); }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = "default"; }}>
      <Shape color={item.color} active={selected} />
      {/* base ring on the bench */}
      {(selected || tested) && (
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.16, selected ? 0.2 : 0.18, 36]} />
          <meshBasicMaterial color={selected ? accent : "#0d9488"} transparent opacity={selected ? 0.85 : 0.6} />
        </mesh>
      )}
      <Html position={[0, item.labelY || 0.34, 0]} center distanceFactor={3} occlude={false}>
        {(selected || hover) && (
          <div style={{ pointerEvents: "none", fontSize: 12, fontWeight: 700, color: "#fff", background: selected ? accent : "rgba(15,23,42,0.85)", padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.25)" }}>{item.name}</div>
        )}
      </Html>
    </group>
  );
}

/* ── Tools ── */

/* Bar magnet that swings over to the active item; dips lower when it attracts. */
export function BarMagnet({ activeX, active, attracted }) {
  const g = iUR();
  useFrame((_, dt) => {
    if (!g.current) return;
    const tx = active ? activeX : 0;
    const ty = active ? (attracted ? 0.34 : 0.46) : 0.66;
    g.current.position.x += (tx - g.current.position.x) * Math.min(1, dt * 5);
    g.current.position.y += (ty - g.current.position.y) * Math.min(1, dt * 5);
  });
  return (
    <group ref={g} position={[0, 0.66, 0.05]} rotation={[0, 0, Math.PI / 2]}>
      {/* red north half */}
      <mesh castShadow position={[0, 0.09, 0]}><boxGeometry args={[0.1, 0.18, 0.1]} /><meshStandardMaterial color="#dc2626" roughness={0.4} metalness={0.3} /></mesh>
      {/* blue south half */}
      <mesh castShadow position={[0, -0.09, 0]}><boxGeometry args={[0.1, 0.18, 0.1]} /><meshStandardMaterial color="#2563eb" roughness={0.4} metalness={0.3} /></mesh>
      {/* steel poles */}
      <mesh position={[0, 0.185, 0]}><boxGeometry args={[0.104, 0.02, 0.104]} /><meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.3} /></mesh>
      <mesh position={[0, -0.185, 0]}><boxGeometry args={[0.104, 0.02, 0.104]} /><meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.3} /></mesh>
    </group>
  );
}

/* Conductivity tester: battery + bulb that lights when touching a metal. */
export function ConductivityTester({ position, lit }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.07, 0]}><boxGeometry args={[0.16, 0.14, 0.1]} /><meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.4} /></mesh>
      {/* bulb */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.05, 20, 20]} />
        <meshStandardMaterial color={lit ? "#fde047" : "#cbd5e1"} emissive={lit ? "#fbbf24" : "#000000"} emissiveIntensity={lit ? 1.6 : 0} transparent opacity={0.9} />
      </mesh>
      {lit && <pointLight color="#fde047" intensity={0.5} distance={1} position={[0, 0.24, 0]} />}
      <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.012, 0.012, 0.04, 12]} /><meshStandardMaterial color="#9ca3af" metalness={0.8} /></mesh>
    </group>
  );
}

/* Torch + light beam + screen: shows how much light passes through the
   active material (transparent / translucent / opaque). */
export function LightRig({ x, category }) {
  const passing = category === "transparent" ? 0.45 : category === "translucent" ? 0.16 : 0;
  return (
    <group position={[x, 0, 0]}>
      {/* torch pointing at the item (−z) */}
      <group position={[0, 0.14, 0.92]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh castShadow><cylinderGeometry args={[0.045, 0.05, 0.24, 20]} /><meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.5} /></mesh>
        <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.07, 0.05, 0.07, 20]} /><meshStandardMaterial color="#374151" roughness={0.3} metalness={0.6} /></mesh>
        <mesh position={[0, 0.187, 0]}><cylinderGeometry args={[0.062, 0.062, 0.01, 20]} /><meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={1.6} /></mesh>
      </group>
      <mesh position={[0, 0.06, 0.92]}><boxGeometry args={[0.05, 0.12, 0.05]} /><meshStandardMaterial color="#475569" roughness={0.6} /></mesh>
      {/* beam: torch → item */}
      <mesh position={[0, 0.15, 0.49]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.035, 0.58, 16, 1, true]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.38} side={2} depthWrite={false} />
      </mesh>
      {/* beam: item → screen (only if light passes) */}
      {passing > 0 && (
        <mesh position={[0, 0.15, -0.22]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[category === "translucent" ? 0.1 : 0.055, 0.05, 0.6, 16, 1, true]} />
          <meshBasicMaterial color="#fde047" transparent opacity={passing} side={2} depthWrite={false} />
        </mesh>
      )}
      {/* white screen behind the item */}
      <group position={[0, 0, -0.56]}>
        <mesh castShadow position={[0, 0.26, 0]}><boxGeometry args={[0.5, 0.42, 0.015]} /><meshStandardMaterial color="#ffffff" roughness={0.9} /></mesh>
        {[-0.18, 0.18].map((px) => (
          <mesh key={px} position={[px, 0.025, 0.03]}><boxGeometry args={[0.03, 0.05, 0.1]} /><meshStandardMaterial color="#64748b" roughness={0.6} /></mesh>
        ))}
        {/* light spot / shadow on the screen */}
        <mesh position={[0, 0.15, 0.009]}>
          <circleGeometry args={[category === "translucent" ? 0.11 : 0.075, 28]} />
          <meshBasicMaterial
            color={category === "opaque" ? "#475569" : "#fde047"}
            transparent
            opacity={category === "transparent" ? 0.9 : category === "translucent" ? 0.4 : 0.75}
          />
        </mesh>
      </group>
    </group>
  );
}

/* Big laboratory thermometer whose mercury rises to the sample's reading. */
export function ThermoRig({ x, temp = 25 }) {
  const merc = iUR();
  const H = 0.52;
  const frac = Math.min(1, Math.max(0, temp / 100));
  const target = 0.05 + frac * (H - 0.12);
  useFrame((_, dt) => {
    if (!merc.current) return;
    const cur = merc.current.scale.y;
    const next = cur + (target - cur) * Math.min(1, dt * 3);
    merc.current.scale.y = next;
    merc.current.position.y = 0.045 + next / 2;
  });
  return (
    <group position={[x + 0.34, 0, 0.1]}>
      <mesh position={[0, 0.012, 0]}><cylinderGeometry args={[0.09, 0.11, 0.024, 24]} /><meshStandardMaterial color="#374151" metalness={0.4} roughness={0.5} /></mesh>
      {/* glass stem */}
      <mesh castShadow position={[0, H / 2 + 0.04, 0]}><cylinderGeometry args={[0.026, 0.026, H, 16]} /><GlassMaterial opacity={0.35} /></mesh>
      {/* bulb */}
      <mesh position={[0, 0.05, 0]}><sphereGeometry args={[0.045, 18, 18]} /><meshStandardMaterial color="#dc2626" roughness={0.25} emissive="#dc2626" emissiveIntensity={0.25} /></mesh>
      {/* mercury column (animated via scale) */}
      <mesh ref={merc} position={[0, 0.07, 0]} scale={[1, 0.05, 1]}>
        <cylinderGeometry args={[0.011, 0.011, 1, 12]} />
        <meshStandardMaterial color="#dc2626" roughness={0.25} emissive="#dc2626" emissiveIntensity={0.2} />
      </mesh>
      {/* scale ticks */}
      {[0.12, 0.22, 0.32, 0.42, 0.52].map((y, i) => (
        <mesh key={i} position={[0.032, y, 0]}><boxGeometry args={[0.018, 0.004, 0.004]} /><meshBasicMaterial color="#0f172a" /></mesh>
      ))}
      <Html position={[0.2, H * frac + 0.12, 0]} center distanceFactor={3} occlude={false}>
        <div style={{ pointerEvents: "none", fontSize: 13, fontWeight: 800, color: "#fff", background: temp >= 50 ? "#dc2626" : temp <= 10 ? "#2563eb" : "#0d9488", padding: "3px 9px", borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>{temp}°C</div>
      </Html>
    </group>
  );
}

/* Darkened "light test" zone: when the active object is luminous it floods
   the area with light and a glow halo; non-luminous objects stay dark. */
export function GlowRig({ x, lit }) {
  const halo = iUR();
  useFrame((s) => {
    if (halo.current) halo.current.material.opacity = lit ? 0.35 + Math.sin(s.clock.elapsedTime * 3) * 0.1 : 0.0;
  });
  return (
    <group position={[x, 0, 0.1]}>
      {lit && <pointLight color="#fde68a" intensity={1.3} distance={2.4} position={[0, 0.35, 0]} />}
      <mesh ref={halo} position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.34, 36]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* Combustion (mode "burn"): a burning matchstick approaches the active sample;
   if it is combustible a flame leaps up from it, otherwise nothing catches. */
export function BurnRig({ x, burning }) {
  const flame = iUR();
  useFrame((s) => {
    if (!flame.current) return;
    const t = s.clock.elapsedTime;
    flame.current.scale.y = 1 + Math.sin(t * 12) * 0.18;
    flame.current.scale.x = 1 + Math.sin(t * 9) * 0.08;
  });
  return (
    <group position={[x, 0, 0.1]}>
      {/* burning matchstick brought in from the right */}
      <group position={[0.32, 0.2, 0]} rotation={[0, 0, -0.6]}>
        <mesh castShadow><cylinderGeometry args={[0.008, 0.008, 0.2, 8]} /><meshStandardMaterial color="#8b5a2b" roughness={0.8} /></mesh>
        <mesh position={[0, 0.12, 0]}><coneGeometry args={[0.02, 0.07, 12]} /><meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.6} transparent opacity={0.9} /></mesh>
      </group>
      {burning && (
        <group ref={flame} position={[0, 0.34, 0]}>
          <mesh><coneGeometry args={[0.07, 0.26, 16]} /><meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={1.6} transparent opacity={0.85} /></mesh>
          <mesh position={[0, -0.03, 0]}><coneGeometry args={[0.036, 0.14, 14]} /><meshStandardMaterial color="#fde047" emissive="#fde047" emissiveIntensity={2.1} /></mesh>
          <pointLight color="#fb923c" intensity={0.9} distance={1.8} position={[0, 0.1, 0]} />
        </group>
      )}
    </group>
  );
}

/* Reflection (mode "reflect"): three parallel rays strike the active surface.
   A regular (smooth) surface sends them back parallel; a rough surface
   scatters them in all directions (diffused reflection). */
export function ReflectRig({ x, regular }) {
  const L = 0.5, sy = 0.22, sz = 0.12;
  const inDir = -Math.PI / 4, outDir = Math.PI / 4;
  const sxs = [-0.12, 0, 0.12];
  const beam = (S, ang, len, op = 0.6) => (
    <mesh position={[S[0] + Math.cos(ang) * len / 2, S[1] + Math.sin(ang) * len / 2, sz]} rotation={[0, 0, ang - Math.PI / 2]}>
      <cylinderGeometry args={[0.006, 0.006, len, 8]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={op} depthWrite={false} />
    </mesh>
  );
  const diffAngles = [Math.PI * 0.2, Math.PI * 0.35, Math.PI * 0.5, Math.PI * 0.65, Math.PI * 0.8];
  return (
    <group position={[x, 0, 0]}>
      {sxs.map((sx, i) => {
        const P = [sx, sy, 0];
        const S = [P[0] - Math.cos(inDir) * L, P[1] - Math.sin(inDir) * L, 0];
        return <group key={"in" + i}>{beam(S, inDir, L)}</group>;
      })}
      {regular
        ? sxs.map((sx, i) => <group key={"out" + i}>{beam([sx, sy, 0], outDir, L)}</group>)
        : diffAngles.map((a, i) => <group key={"dif" + i}>{beam([0, sy, 0], a, 0.42, 0.5)}</group>)}
      <mesh position={[0, sy, sz]}><sphereGeometry args={[0.02, 12, 12]} /><meshBasicMaterial color="#f59e0b" /></mesh>
    </group>
  );
}

/* Friction (mode "slide"): a block is pushed across the active surface — it
   glides far and smoothly on a low-friction surface, barely budges on a
   high-friction (rough) one. */
export function SlideRig({ x, lowFriction }) {
  const blk = iUR();
  useFrame((s) => {
    if (blk.current) blk.current.position.x = Math.sin(s.clock.elapsedTime * (lowFriction ? 1.6 : 3.4)) * (lowFriction ? 0.24 : 0.05);
  });
  return (
    <group position={[x, 0, 0.12]}>
      <mesh receiveShadow position={[0, 0.02, 0]}>
        <boxGeometry args={[0.66, 0.03, 0.22]} />
        <meshStandardMaterial color={lowFriction ? "#bae6fd" : "#a16207"} roughness={lowFriction ? 0.12 : 1} metalness={lowFriction ? 0.35 : 0} />
      </mesh>
      <mesh ref={blk} castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.1, 0.08, 0.1]} />
        <meshStandardMaterial color="#dc2626" roughness={0.5} />
      </mesh>
    </group>
  );
}

/* States of matter (mode "states"): a transparent box of particles. In a solid
   they sit in a vibrating lattice; in a liquid they slip past one another near
   the bottom; in a gas they fly freely all over the box. */
export function StatesRig({ x, state }) {
  const refs = iUR([]);
  const N = state === "gas" ? 6 : 12;
  const col = state === "solid" ? "#2563eb" : state === "liquid" ? "#0d9488" : "#ea580c";
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < N; i++) {
      const m = refs.current[i];
      if (!m) continue;
      if (state === "solid") {
        const cx = ((i % 4) - 1.5) * 0.078, cy = (Math.floor(i / 4) - 1) * 0.078;
        m.position.set(cx + Math.sin(t * 9 + i) * 0.006, 0.24 + cy + Math.cos(t * 8 + i * 1.3) * 0.006, 0.12);
      } else if (state === "liquid") {
        const cx = ((i % 4) - 1.5) * 0.07, cy = Math.floor(i / 4) * 0.058;
        m.position.set(cx + Math.sin(t * 1.6 + i) * 0.05, 0.12 + cy + Math.sin(t * 1.2 + i * 2) * 0.02, 0.12 + Math.cos(t * 1.4 + i) * 0.04);
      } else {
        const a = i * 1.7;
        m.position.set(Math.sin(t * 2.4 + a) * 0.15, 0.24 + Math.cos(t * 2.0 + a * 1.3) * 0.13, 0.12 + Math.sin(t * 2.7 + a) * 0.1);
      }
    }
  });
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.24, 0.12]}>
        <boxGeometry args={[0.42, 0.42, 0.34]} />
        <meshPhysicalMaterial color="#dbeafe" transparent opacity={0.12} transmission={0.7} roughness={0.08} ior={1.3} />
      </mesh>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} position={[0, 0.24, 0.12]}>
          <sphereGeometry args={[0.024, 14, 14]} />
          <meshStandardMaterial color={col} roughness={0.4} emissive={col} emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
}

/* Magnifying glass that hovers over the active mixture. */
export function Magnifier({ x }) {
  const g = iUR();
  useFrame((s) => { if (g.current) g.current.position.y = 0.4 + Math.sin(s.clock.elapsedTime * 2.2) * 0.03; });
  return (
    <group ref={g} position={[x, 0.4, 0.16]} rotation={[-0.85, 0, 0]}>
      <mesh><torusGeometry args={[0.11, 0.016, 12, 36]} /><meshStandardMaterial color="#b45309" metalness={0.6} roughness={0.35} /></mesh>
      <mesh><circleGeometry args={[0.105, 32]} /><meshPhysicalMaterial color="#dbeafe" transparent opacity={0.3} transmission={0.85} roughness={0.05} side={2} /></mesh>
      <mesh position={[0.15, -0.15, 0]} rotation={[0, 0, -Math.PI / 4]}><cylinderGeometry args={[0.018, 0.022, 0.2, 12]} /><meshStandardMaterial color="#7c4a1e" roughness={0.6} /></mesh>
    </group>
  );
}
