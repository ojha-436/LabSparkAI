# LabSpark AI — Developer / Design Handoff

> Generated from the implemented design (source of truth: `src/tokens.js`, `src/index.css`, and the React components). No Figma file is connected; values below are the **actual** ones shipping in production.

**Tech stack:** React 18 + Vite · React Three Fiber (`@react-three/fiber` / `drei`) for 3D labs · Firebase (Auth + Firestore + Hosting) · Cloud Run (Gemini backend). **Styling is NOT Tailwind** — it's a hybrid of inline styles reading a JS token object `C` (from `src/tokens.js`) plus utility classes and animations in `src/index.css`. CSS variables mirror the JS tokens in `:root`.

---

## Overview

An AI-first virtual science lab for NCERT Class 6–10. Core surfaces: **Landing → Auth → Dashboard (class→subject) → Lab (3D) → Report**, plus **Profile / Class Progress / Achievements**. Visual language = "scientific authority": near-black slate ink, **teal** as the primary action color, **indigo** as the AI/Spark accent, on light slate paper, with a `JetBrains Mono` "lab telemetry" voice for labels.

---

## Design Tokens

Tokens live in two mirrored places: **`C` object** (`src/tokens.js`, used by inline styles) and **CSS custom properties** (`src/index.css` `:root`, used by utility classes). Always reference a token, never a raw hex.

### Color — core
| Token (`C.`) | CSS var | Hex | Usage |
|---|---|---|---|
| `ink` | `--slate-900` | `#0f172a` | Primary text, dark surfaces |
| `inkDeep` | `--slate-950` | `#020617` | Lab headers, footer, deepest bg |
| `ink70` | `--slate-700` | `#334155` | Secondary text |
| `ink50` | `--slate-500` | `#64748b` | Tertiary/meta text |
| `ink30` | `--slate-400` | `#94a3b8` | Disabled / muted labels |
| `ink15` | `--slate-300` | `#cbd5e1` | Placeholders, faint dividers |
| `line` | `--slate-200` | `#e2e8f0` | Borders, dividers |
| `lineSoft` | `--slate-100` | `#f1f5f9` | Inner row dividers |
| `paper` | `--slate-50` | `#f8fafc` | App background |
| `paperWarm` | `--slate-100` | `#f1f5f9` | Inset panels, chips |
| `cream` / `white` | — | `#ffffff` | Cards, surfaces |

### Color — brand & state
| Token (`C.`) | Hex | Usage |
|---|---|---|
| `em` (teal-700) | `#0f766e` | Primary brand, "LabSpark" wordmark accent |
| `emBright` (teal-600) | `#0d9488` | **Primary CTA** (`btn-primary`), active states, links |
| `emDeep` (teal-800) | `#115e59` | Pressed/active text on teal |
| `emPale` (teal-100) | `#ccfbf1` | Success chips, selected pills |
| `violet` (indigo-600) | `#4f46e5` | **AI/Spark accent**, "premium", focus glows |
| `violetPale` (indigo-50) | `#e0e7ff` | AI chip backgrounds |
| `gold` (amber-600) | `#d97706` | XP, achievements |
| `goldPale` | `#fef3c7` | XP chip background |
| `coral` (orange-600) | `#ea580c` | Destructive / error / "end" actions |
| `coralPale` | `#ffedd5` | Error chip background |
| `lime` (green-600) | `#16a34a` | Live/positive status dots |
| `sky` (blue-600) | `#2563eb` | Misc subject accent |

### Color — science semantic (`SCI` in tokens.js)
| Token | Hex | Meaning |
|---|---|---|
| `SCI.acidStrong` | `#e11d48` | Acid (blue→red litmus); also the "red litmus" strip |
| `SCI.baseStrong` | `#4f46e5` | Base (red→blue litmus) |
| `SCI.neutral` | `#16a34a` | Neutral substances |
| (strip blue) | `#2563eb` | Blue litmus strip |

### Typography
| Role | Family | Weight | Size | Notes |
|---|---|---|---|---|
| Body | `Inter` | 400–700 | 13–14px | `line-height: 1.5` |
| Headings (`h1–h6`, `.font-display`) | `Plus Jakarta Sans` | 700–800 | `clamp()` (see below) | letter-spacing `-0.02 to -0.03em` |
| Mono / telemetry (`.mono`) | `JetBrains Mono` | 400–600 | 9.5–12px | UPPERCASE labels, status, units |

Fluid heading sizes (already in code): hero H1 `clamp(34px, 5.2vw, 56px)`; section H2 ~30px; card titles 14–22px. Body text 11–14.5px.

### Spacing, radius, elevation (conventions in use)
- **Spacing scale (px):** 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32 — used directly in inline styles. No named spacing tokens; treat the 4px-based scale as the system.
- **Radius:** chips/pills `100` (full); inputs/small `8`; cards `10–16`; icon tiles `6–9`.
- **Shadows:** card hover `0 10px 24px rgba(15,23,42,0.04)`; primary CTA hover `0 6px 16px rgba(13,148,136,0.18)`; modals `0 24px 60px rgba(15,23,42,0.28)`; glass cards use `backdrop-filter: blur(12px)`.

---

## Components

| Component | Source | Variants / Props | Notes |
|---|---|---|---|
| `Btn` | `ui.jsx` | `v`: `primary` \| `light` \| `dark` \| `outline` \| `ghost`; `lg` \| `sm`; `icon` / `iconL` (trailing/leading icon name); `full`, `disabled` | Maps to `.btn .btn-{v}`. See states table. |
| `Ic` | `ui.jsx` | `n` (name), `s` (size), `c` (color), `sw` (stroke width) | Inline SVG icon set (flask, spark, bolt, drop, beaker, atom, check, arrow, mic, lock, trophy, medal, chart, eye, note, etc.). 1.7 default stroke. |
| `Chip` | `ui.jsx` | `c`, `bg`, `icon` | Pill label, radius 6, 11px 600. |
| `SparkAvatar` | `ui.jsx` | `size`, `mood` (`happy`\|`thinking`\|`celebrate`), `glow` | Indigo→violet gradient rounded-square (radius 24%), sparkle glyph. The AI identity mark. |
| `VoiceWaveform` | `ui.jsx` | `active`, `color` | 18-bar animated equalizer; animates only when `active`. |
| `Avatar` | `profile.jsx` | `src`, `name`, `size`, `ring` | Circular; shows photo or gradient initials fallback. |
| Glass card | `.card-glass` | — | `rgba(255,255,255,0.7)` + `blur(12px)`, 1px slate border. |
| Lift card | `.lift-card` / `.hover-lift` | — | Hover `translateY(-3px)` + soft shadow, `0.2s cubic-bezier(.16,1,.3,1)`. |
| Voice HUD | `.voice-hud-panel` | — | **Fixed 348px** right rail in every lab: Spark avatar + status dot, waveform, transcript, narration mute, controls. **Spark always sits top-right of the lab.** |
| Observation table | `.observation-ledger` | — | Rows = samples; right column = category verdict pills; graded rows tint green/coral. |
| Ask Spark | `askspark.jsx` | floating button, bottom-left, z 90 | On-demand help panel (mic + text). FAQ-cached answers are free; novel → cheap Gemini text. |
| 3D scene | `lab3dscene.jsx` | `SceneEnv`, `LabRoom`, `BenchInstruments` | Shared room/lighting/instruments so **every lab looks identical**. |
| Lab components | `labitems3d.jsx` | `Item3D` (shape switch), `BarMagnet`, `ConductivityTester` | Procedural recognizable models (nail, coin, wire, lump, dish…). |

---

## Screens

| Screen | Component | Layout |
|---|---|---|
| Landing | `landing.jsx` | Sticky nav · hero (animated aurora bg, badge, fluid H1, CTAs, stat strip) · voice-demo · platform tabs · footer + creator card. `maxWidth 1000–1200`. |
| Auth | `login.jsx` | Centered glass card `maxWidth 440`, tabbed Sign in/Sign up, Google button, floating-label inputs. |
| Dashboard | `dashboard.jsx` | Sticky nav + 220px sidebar + main. Catalog is **2-step**: Class 6–10 cards → click → labs grouped by subject. |
| 3D Lab | `lab3d.jsx` (litmus) / `genlab3d.jsx` (others) | 60px header · left scroll column (440px `<Canvas>` + console + observation table) · **348px Spark HUD right** · floating Ask Spark bottom-left. |
| Report / Certificate | `report.jsx` | Centered `maxWidth 800`, confetti, badge, score stats, NCERT transcript card, Spark feedback, print/home/retry. |
| Profile / Progress / Achievements | `profile.jsx` | Shared `PageShell` (sticky back-nav + accent icon), `maxWidth 1000`. |

---

## States & Interactions

| Element | State | Behavior |
|---|---|---|
| `Btn` (any) | Hover | `translateY(-1.5px)` + variant shadow; transition `all 0.18s` |
| `Btn` | Active/press (`.press`) | `scale(0.985)` |
| `btn-primary` | Hover | bg `teal-600`→`teal-700`, shadow `0 6px 16px rgba(13,148,136,.18)` |
| `btn-light` | Hover | bg→`slate-50`, border→`slate-300` |
| `Btn` | Disabled | `opacity` reduced, pointer ignored (`onClick` guarded) |
| Auth submit | Loading | inline spinner, button disabled |
| Auth form | Error | coral chip with lock icon above the form |
| Lab tube/sample | Hover | cursor pointer + name label appears (only hovered/selected → never overlaps) |
| Lab tube/sample | Selected | lifts + accent glow ring; in magnet lab, magnetic items spring up to the magnet |
| Litmus dip | Result | colour stays in the tube **until another tube is selected** (not a timer) |
| Socratic MCQ | — | **Optional / non-blocking** (bonus +15 XP); never gates the experiment |
| Voice (narration) | Toggle | mic icon → lock icon; cancels speech synthesis |
| Live voice (premium) | States | `connecting` → `listening` → `speaking`; de-emphasized dashed button (uses credits) |
| Dashboard cards / sidebar | Click | Class card → subject view; "Class Progress"/"Achievements"/metric tiles are clickable |
| Browser **Back** | — | Navigates between in-app views via History API (e.g. lab → dashboard), does **not** exit the site |

---

## Responsive Behavior

> ⚠️ **Known gap:** there are **no `@media` breakpoints** in the codebase. Responsiveness today comes only from `clamp()` font sizes, `maxWidth` containers, and `flex-wrap`. This is acceptable for a **desktop-first** product but needs work for phones.

| Width | Current behavior |
|---|---|
| Desktop ≥1024px | Designed target. All layouts intended for this. |
| Tablet 768–1024px | Mostly holds (maxWidth containers + wrap); dashboard sidebar (220px) gets tight. |
| Mobile <768px | **Not yet adapted.** 3D labs assume a wide canvas + a fixed **348px** Spark HUD, so the lab UI overflows on phones. Landing/auth degrade more gracefully. |

**Recommendation for the implementing dev:** add breakpoints to (1) stack the lab's Spark HUD below the canvas under ~900px, (2) collapse the dashboard sidebar to a top bar, (3) reduce the `<Canvas>` height on mobile. Treat ≥900px as the supported minimum until then.

---

## Edge Cases

- **Empty — Achievements:** dashed card, trophy glyph, "No certificates yet. Complete a lab to earn your first!"
- **Empty — new student:** progress shows 0/total with 0% bar; dashboard greets by first name only.
- **Long text:** student name in nav profile menu truncates with `ellipsis`; lab/sample names use `white-space: nowrap` labels (keep names short — ≤ ~22 chars).
- **Profile photo:** uploads are **resized client-side to 256px JPEG** and stored as a data URL in Firestore (avoids Cloud Storage). >6 MB source rejected with a message. Missing photo → gradient initials.
- **AI offline / 401 / rate-limited:** all Spark calls **degrade gracefully** — Ask Spark falls back to the local FAQ; narration falls back to free browser TTS; grading falls back to a local score. UI never blocks on the network.
- **Backend cost guard:** AI requests require a Firebase auth token + are rate-limited (20/min, 300/day per user).

---

## Animation / Motion

| Element | Trigger | Animation | Duration | Easing |
|---|---|---|---|---|
| Buttons / cards | hover | translateY lift | `0.18–0.2s` | `cubic-bezier(.16,1,.3,1)` |
| `.press` | active | `scale(0.985)` | instant | — |
| Reveal-on-scroll (`.reveal`) | in-view (IntersectionObserver) | fade + rise | `~0.5s` staggered (`r1..r5`) | ease |
| Toast / messages | mount | `fadeUp` | `0.4s` | `cubic-bezier(.16,1,.3,1)` |
| Hero aurora blobs | always | drift/scale | `16–22s` loop | `ease-in-out` |
| Status dots / live | always | `pulse` | `2s` loop | — |
| Report celebration | mount | confetti fall + badge `sparkle` | `2–4.5s` | ease-in |
| 3D selected item | select | lerp lift + spin | frame-based (`~dt*6–8`) | linear lerp |
| Bar magnet | item selected | lerp toward item; magnetic item springs up | frame-based | linear lerp |
| Bunsen flame | always | sine scale flicker | continuous | — |

---

## Accessibility Notes

> Current honest state + required work. The app is **mouse/visual-first** today.

- **Keyboard:** native `<button>`/`<input>` elements are focusable and Enter-activatable (auth, Ask Spark input, dashboard). **Gaps:** several interactive `<div>`s (dashboard cards, profile dropdown trigger, lab sample clicks) are not keyboard-reachable — convert to `<button>` or add `role="button"` + `tabIndex={0}` + key handlers.
- **Focus order:** follows DOM order; **no visible focus-ring styling is customized** — add a clear `:focus-visible` outline (suggest 2px `violet`).
- **ARIA:** add `aria-label` to icon-only buttons (mic/narration toggle, close ×, send), `aria-pressed` to verdict pills, `role="dialog"` + focus-trap to the Ask Spark panel and the intro overlay, and `aria-live="polite"` on the Spark transcript so screen readers announce narration.
- **3D canvas:** the WebGL lab is not screen-reader accessible — the **observation table + Ask Spark provide the non-visual path**; ensure every action also updates accessible DOM (the table already does).
- **Color contrast:** teal-600 on white and ink on paper pass AA. Verify `ink30` muted text (it's borderline for small text) and verdict pills.
- **Motion:** add `@media (prefers-reduced-motion: reduce)` to disable aurora/confetti/flicker.

---

## Implementation Notes (for this React + Vite codebase)

1. **Use the `C` token object** in inline styles and the matching CSS var in classes — don't hardcode hex.
2. **New labs are data-driven:** add a spec to `genlabdata.js` (`shape`, `color`, `category`, `mode`) — no new 3D code needed; `labitems3d.jsx` already has the shape library.
3. **Every lab must reuse `lab3dscene.jsx`** (`SceneEnv` + `LabRoom` + `BenchInstruments`) so the room/lighting/Spark-HUD stay identical.
4. **All Spark/AI calls go through `api.js`/`speech.js`** which handle auth tokens + graceful fallback — never call the backend directly from a component.
