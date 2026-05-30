/* ════════════════════════════════════════════════════════════════
   LabSpark AI — Refined JavaScript Design Tokens
   ════════════════════════════════════════════════════════════════ */

const C = {
  ink: "#0f172a",       // Slate 900
  inkDeep: "#020617",   // Slate 950
  inkSoft: "#1e293b",   // Slate 800
  paper: "#f8fafc",     // Slate 50
  paperWarm: "#f1f5f9", // Slate 100
  cream: "#ffffff",     // Pure White
  white: "#ffffff",
  em: "#0f766e",        // Teal 700
  emBright: "#0d9488",  // Teal 600
  emDeep: "#115e59",    // Teal 800
  emPale: "#ccfbf1",    // Teal 100
  lime: "#16a34a",      // Green 600
  gold: "#d97706",      // Amber 600
  goldBright: "#f59e0b",// Amber 500
  goldPale: "#fef3c7",  // Amber 100
  coral: "#ea580c",     // Orange 600
  coralPale: "#ffedd5", // Orange 100
  violet: "#4f46e5",    // Indigo 600
  violetPale: "#e0e7ff",// Indigo 100
  sky: "#2563eb",       // Blue 600
  skyPale: "#dbeafe",   // Blue 100
  ink70: "#334155",
  ink50: "#64748b",
  ink30: "#94a3b8",
  ink15: "#cbd5e1",
  line: "#e2e8f0",
  lineSoft: "#f1f5f9",
  lineDark: "#334155",
  lineInk: "rgba(255, 255, 255, 0.08)",
};

/* litmus / indicator science colors */
const SCI = {
  acidStrong: "#e11d48", // Rose 600
  acidMild: "#f97316",   // Orange 500
  neutral: "#16a34a",    // Green 600
  baseMild: "#2563eb",   // Blue 600
  baseStrong: "#4f46e5", // Indigo 600
};

// Kept empty since index.css handles all base stylesheet rules directly
const GLOBAL_STYLES = "";

window.C = C;
window.SCI = SCI;
window.GLOBAL_STYLES = GLOBAL_STYLES;
