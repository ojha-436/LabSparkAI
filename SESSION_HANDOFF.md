# LabSpark AI — Session Handoff (current state)

> **New session? Read this file first.** It is the single source of truth for where the project stands, how it's built, how to run/deploy it, and what to do next. Companion docs: `CONTEXT_GRAPH.md` (diagrams), `PROJECT_OVERVIEW.md` (pitch + market), `DESIGN_HANDOFF.md` (design system), `README.md` (setup).

---

## 0. TL;DR

LabSpark AI is an **AI-tutored 3D virtual science lab** for NCERT Class 6–10. It is **built and deployed live**. A student enters a 3D lab room, performs an experiment with realistic apparatus, talks to **"Spark"** (a Google Gemini tutor, voice + text), gets AI-graded, and earns a certificate.

- **Status:** production. **42 fully interactive labs** live (CBSE-aligned). Classes **6–10 are all 100% complete** — every catalogued lab is `ready`, covering the syllabus's classic Physics & Chemistry practicals. Per-class ready counts: C6 = 10, C7 = 8, C8 = 8, C9 = 8, C10 = 8. No placeholders remain.
- **Revenue-engine layer (Step 1 — done, deployed):** teacher/class layer + auto-generated CBSE practical-file PDF. See "Classroom & Practical File" section below.
- **Roles + relationship graph (Step 1.5 — done, deployed, E2E-verified):** Student / Teacher / Parent chosen at sign-up → role-specific home. Teacher⇄Student via class code; Parent⇄Student via family code. Live teacher roster, class announcement/post stream, privacy-safe parent progress view. See "Roles, Dashboards & Family Graph" section below.

## Roles, Dashboards & Family Graph

- **Role at sign-up:** `RoleChooser`/`RoleSetupPage` in `roles.jsx`; `login.jsx` captures role+name via `onRoleHint(role,name)` BEFORE auth fires (race-free, set in `app.jsx` `pendingRoleRef`/`pendingNameRef`). `users/{uid}.role` ∈ student|teacher|parent. `app.jsx` `homeFor(role)` routes: teacher→TeacherPage, parent→ParentDashboard, student→Dashboard; missing role→`RoleSetupPage`.
- **Teacher⇄Student:** class code (existing). **Live roster/submissions/stream** via `onSnapshot` (`watchRoster/watchSubmissions/watchPosts` in `classroom.js`). **Class stream** = `classes/{code}/posts` (announcements by teacher, messages by members) — `ClassStream` component used in the teacher `ClassDetail` (Students/Stream tabs) and the student `StudentClassView` (open a joined class).
- **Parent⇄Student:** `family.js` — student has a 6-char **family code** (`familyCodes/{CODE}`→studentUid, + `ensureFamilyCode`); student writes a parent-readable **progress mirror** `students/{uid}` (`writeStudentMirror`, refreshed in `persist()` and on completion). Parent links via the code (`linkChild` → `students/{uid}/guardians/{parentUid}` validated against the code in rules); `ParentDashboard` (`parent.jsx`) reads each child's mirror — **no lab catalogue**, just XP/level/labs/scores. Student shows the code on `InviteParentPage`.
- **⚠️ Firestore "rules are not filters" — critical:** teacher reads of `members`/`submissions` are authorised by `resource.data.teacherUid`, so the **client query MUST filter `.where("teacherUid","==",uid)`** or the whole query is permission-denied. This was the real "teacher can't see joined students" bug. `classroom.js` `teacherMembers/teacherSubs` apply the filter. Any new teacher-scoped query must do the same.
- **Verified E2E (Playwright, live Firestore + deployed rules):** teacher signup→class create; student signup→join (visible to teacher: "1 student joined"); announcement posts to the stream; parent signup→link by family code→sees child "Aarav Sharma" Level 1. New rules deployed.

## Classroom & Practical File (the B2B wedge)

The institutional layer that turns the B2C demo into something schools pay for. **Additive and non-breaking** — the solo-student flow is untouched.

- **`src/practicalfile.js`** — client-side jsPDF generator (deps: `jspdf`, `jspdf-autotable`). Builds a CBSE-format **Science Practical File** (cover page with student/school/class/roll + one section per lab: Aim, Materials, Theory/Procedure, Observation Table, Result/Conclusion, Viva, Score). Pulls rich detail from the lab's `GEN_LABS` spec and the student's own per-item verdicts; falls back to `CATALOG` for the two non-`GEN_LABS` labs (acid-base, circuit). `downloadPracticalFile(student, completions)` (full file) and `downloadLabRecord(student, completion)` (one lab). ₹0 marginal cost. Verified generating in Node (4-page PDF).
- **`src/classroom.js`** — Firestore data layer. Model: `classes/{CODE}` `{code, teacherUid, teacherName, className, school, grade, subject, createdAt}`; subcollections `members/{studentUid}` and `submissions/{uid__labId}`, both with **denormalised `teacherUid`**. 6-char join codes (no ambiguous chars). `createClass / listMyClasses / getClass / joinClass / getRoster / getSubmissions / writeSubmission`.
- **`src/classroom.jsx`** — three pages (reuse `PageShell`, now exported from `profile.jsx`): `PracticalFilePage` (student downloads their file), `JoinClassPage` (student enters a code), `TeacherPage` (create class → share code → per-class roster × labs × avg-score table + per-student / bulk practical-file download via `ClassDetail`).
- **Wiring:** `app.jsx` — `DEFAULT_STUDENT.classes=[]`; `persist()` saves `classes`; `complete()` now stores a rich record (observations/aim/conclusion/chapter/cls/subject/aiFeedback) **and** mirrors a submission into every joined class; `onJoined()` stores membership; new views `practical`/`join`/`teacher`. `genlab3d.jsx` onComplete now passes `observations` + chapter/cls/subject. `dashboard.jsx` sidebar gains My Practical File · Join a Class · Teacher. `report.jsx` "Share with Teacher" stub → **"Download Practical Record"**.
- **`firestore.rules`** — added `classes/**`. Teacher reads (members/submissions) authorised via the denormalised `teacherUid` (**no `get()`** → scales to a whole class); writes are `get()`-validated against the real class so a student can't spoof a teacher. `get` on a class allowed for any signed-in user (join by code); `list` only returns the teacher's own classes. Deployed.
- **Known follow-ups:** bundle grew with jsPDF — consider lazy-loading `practicalfile.js`; a student can't yet *leave* a class; proctored "exam mode" + Google Classroom sync are the next institutional features (Step 1 backlog).
- **Live app:** https://gen-lang-client-0686614374.web.app
- **Repo:** https://github.com/ojha-436/LabSparkAI · **branch** `main` · **last commit** `cb74b20`
- **Local code:** `D:\google_Xbuild\LabSpark_AI` (moved OFF OneDrive — keep it there).
- Working tree is **clean and pushed** as of this handoff.

---

## 1. Environment & access

- **Project path:** `D:\google_Xbuild\LabSpark_AI` (Windows; shell is PowerShell + Git-Bash).
- **Gemini key:** lives ONLY in `server/.env` (git-ignored). It's an `AQ.…` token. Models available to it: `gemini-2.5-flash` (text, used), `gemini-3.1-flash-live-preview` (live voice, used), `gemini-2.5-flash-preview-tts` (clip generation). `gemini-2.0-flash` is NOT available to this account.
- **GCP/Firebase:** project `gen-lang-client-0686614374`; gcloud + firebase CLI authed as `princeojha436@gmail.com`; billing enabled. Backend = Cloud Run service `labspark-backend` in `asia-south1` (Mumbai).
- **Run locally:**
  - Backend: `cd server && npm run dev` (auto-loads `server/.env`; serves :8787)
  - Frontend: `npm run dev` (Vite :5173)
- **Build:** `npm run build` (expect "✓ 662 modules transformed").
- **Deploy frontend:** `npx firebase-tools deploy --only hosting --project gen-lang-client-0686614374`
- **Deploy backend:** `gcloud run deploy labspark-backend --source server --region asia-south1 --timeout 3600 --quiet` (env GEMINI_API_KEY persists across deploys).

---

## 2. Architecture

```
Browser (React+Vite, Firebase Hosting/CDN)
   │  Firebase ID token on every AI call
   ▼
Cloud Run backend (server/index.js, Express)  ──►  Google Gemini
   • POST /api/spark/ask  (text tutor)               2.5 Flash (text)
   • POST /api/grade      (JSON grading)             3.1-flash-live (voice)
   • WS   /api/live       (voice relay)
   • requireAuth + per-user rate limits + CORS lock
Firebase Auth + Firestore  ── users/{uid}: profile, progress, completions, certificates
```

**Tech:** React 18, Vite, React Three Fiber/`drei` (WebGL 3D), Firebase (Auth/Firestore/Hosting), Node/Express on Cloud Run, `firebase-admin` (token verify), `ws` (live relay). Styling = inline styles reading the `C` token object (`src/tokens.js`) + utility classes in `src/index.css` (NOT Tailwind).

---

## 3. Repo / file map

```
src/
  main.jsx            entry
  app.jsx             routing + auth + student state + browser History (back button)
  tokens.js           design tokens (C object) ; index.css mirrors as CSS vars
  index.css           design system / utility classes / animations
  firebaseInit.js     firebase init (exports auth, db, default firebase)
  api.js              frontend→backend (attaches ID token; graceful fallback)
  speech.js           free TTS + on-device STT + pre-generated clip playback
  landing.jsx         marketing page + creator card (CREATOR config; photo public/creator.jpg)
  login.jsx           Google + email auth
  dashboard.jsx       catalogue: Class 6–10 cards → drill into subject
  profile.jsx         ProfilePage / ProgressPage / AchievementsPage + Avatar
  report.jsx          report + NCERT certificate (+ GenericReport branch for data labs)
  lab3d.jsx           FLAGSHIP 3D Acids & Bases lab (bespoke; litmus dip)
  circuitlab.jsx      Electric Circuit lab (older 2.5D CSS; NOT cost-optimised yet)
  lab3dscene.jsx      SHARED 3D room: SceneEnv, LabRoom, BenchInstruments + glass/instrument models
  labitems3d.jsx      realistic procedural item models (Item3D shape switch) + tools/rigs
  genlab3d.jsx        DATA-DRIVEN 3D lab engine (renders any GEN_LABS spec)
  genlabdata.js       GEN_LABS = the lab "content" (specs)  ← add new labs here
  genlab.jsx          legacy 2.5D engine (kept, UNUSED — app routes to genlab3d)
  spark.jsx           SPARK_QA FAQ cache + sparkAnswerStrict
  askspark.jsx        on-demand "Ask Spark" floating panel
  voicelive.js        live two-way voice client (WS + mic capture + playback)
  ui.jsx, labpanel.jsx  shared UI primitives
server/
  index.js            Gemini tutor + grader + live WS relay + auth/rate-limit/CORS
  generate-narration.mjs  one-time TTS clip generator (writes public/narration/*.wav + manifest)
  Dockerfile, .env(.example), .gcloudignore
public/narration/     pre-generated Spark voice clips (faq-0..6.wav + manifest.json)
docs: PROJECT_OVERVIEW.md, DESIGN_HANDOFF.md, CONTEXT_GRAPH.md, PRD_LabSpark_AI.md, README.md
deliverable: LabSpark_AI_Pitch_Deck.pptx
```

---

## 4. Lab catalogue (exact, current)

**42 fully interactive (status `ready`):**

| id | Class | Subject | Renderer / mode | Experiment |
|---|---|---|---|---|
| acid-base | 7 | Chemistry | `lab3d.jsx` (bespoke 3D) | Litmus: dip strips, classify acid/base/neutral |
| circuit | 7 | Physics | `circuitlab.jsx` (2.5D) | Build circuit; conductor/insulator |
| solubility | 6 | Chemistry | genlab3d · `water` | Dissolve in water → soluble/insoluble |
| magnetism | 6 | Physics | genlab3d · `magnet` | Magnet test → magnetic/non-magnetic |
| materials-light | 6 | Chemistry | genlab3d · `light` | Torch+screen → transparent/translucent/opaque |
| separation | 6 | Chemistry | genlab3d · `inspect` | Choose handpicking/winnowing/sieving/filtration |
| motion | 6 | Physics | genlab3d · `motion` | Animated toys → linear/circular/oscillatory |
| temperature | 6 | Physics | genlab3d · `thermo` | Thermometer → cold/warm/hot |
| changes | 7 | Chemistry | genlab3d · `inspect` | Physical vs chemical change |
| neutralise | 7 | Chemistry | genlab3d · `mix` | Neutralisation: add a base/acid (indicator turns green) |
| heat-transfer | 7 | Physics | genlab3d · `inspect` | Conduction/convection/radiation |
| luminous | 7 | Physics | genlab3d · `glow` | Luminous vs non-luminous (dark test) |
| metals-nonmetals | 8 | Chemistry | genlab3d · `examine` | Conductivity tester → metal/non-metal |
| rusting | 8 | Chemistry | genlab3d · `rust` | Iron-nail set-ups → rusts / stays shiny |
| combustion | 8 | Chemistry | genlab3d · `burn` | Flame test → combustible / non-combustible |
| reflection | 8 | Physics | genlab3d · `reflect` | Parallel rays → regular / diffused reflection |
| friction | 8 | Physics | genlab3d · `slide` | Block slides → more / less friction |
| solutions | 9 | Chemistry | genlab3d · `tyndall` | Light beam → solution / colloid / suspension |
| states-of-matter | 9 | Chemistry | genlab3d · `states` | Particle box → solid / liquid / gas |
| elements-compounds | 9 | Chemistry | genlab3d · `inspect` | Classify element / compound / mixture |
| force | 9 | Physics | genlab3d · `inspect` | Newton's first / second / third law |
| energy | 9 | Physics | genlab3d · `inspect` | Kinetic vs potential energy |
| food-components | 6 | Chemistry | genlab3d · `reagent` | Food tests → starch / protein / fat |
| water-states | 6 | Chemistry | genlab3d · `inspect` | Evaporation / condensation / freezing |
| fibre-fabric | 6 | Chemistry | genlab3d · `inspect` | Plant / animal / synthetic fibre |
| float-sink | 6 | Physics | genlab3d · `float` | Floats / sinks in a water tank |
| electric-effects | 7 | Physics | genlab3d · `inspect` | Heating vs magnetic effect of current |
| heat-conductors | 7 | Physics | genlab3d · `inspect` | Good vs poor conductors of heat |
| sound | 8 | Physics | genlab3d · `inspect` | Audible / ultrasonic / infrasonic |
| liquids-conduct | 8 | Physics | genlab3d · `examine` | Liquids: conducts / does not conduct |
| force-pressure | 8 | Physics | genlab3d · `inspect` | Contact vs non-contact force |
| motion-types | 9 | Physics | genlab3d · `inspect` | Uniform vs non-uniform motion |
| mass-weight | 9 | Physics | genlab3d · `inspect` | Mass vs weight |
| atom-particles | 9 | Chemistry | genlab3d · `inspect` | Proton / electron / neutron by charge |
| reactions | 10 | Chemistry | genlab3d · `inspect` | Combination / decomposition / displacement / double |
| metals-reactivity | 10 | Chemistry | genlab3d · `inspect` | Reactivity series: highly / moderately / least |
| carbon-compounds | 10 | Chemistry | genlab3d · `inspect` | Hydrocarbon / alcohol / carboxylic acid |
| salts | 10 | Chemistry | genlab3d · `inspect` | Acidic / basic / neutral salts |
| lens | 10 | Physics | genlab3d · `optics` | Parallel rays → convex (converge) / concave (diverge) |
| electricity | 10 | Physics | genlab3d · `inspect` | Series vs parallel circuits |
| human-eye | 10 | Physics | genlab3d · `inspect` | Myopia vs hypermetropia |
| magnetic-effects | 10 | Physics | genlab3d · `inspect` | Electric motor vs generator |

**0 placeholders** — every catalogued lab (Classes 6–10) is now `ready`. (Future scope: a Biology subject track — cell, nutrition, microorganisms — which needs new 3D models + a dashboard subject tab.)

---

## 5. How the data-driven 3D lab engine works (the scaling lever)

**To add a new classification lab, you usually write DATA ONLY:**
1. Add a spec to `GEN_LABS` in `src/genlabdata.js`.
2. Add a matching `CATALOG` entry in `src/data.js` with the same `id` and `status: "ready"`.
3. `app.jsx` auto-routes any `GEN_LABS[id]` to `<GenLab3D>` (view `"genlab"`). `report.jsx` auto-renders its certificate (`data.generic`).

**Lab spec shape** (`genlabdata.js`): `{ id, title, cls, subject, chapter, icon, accent, mode, aim, theory, materials[], testVerb, categories:[{key,label,color,desc}], items[], question:{q,options,ans,correctMsg,incorrectMsg}, conclusion }`.
**Item shape:** `{ id, name, shape, color, category, fact, temp?(thermo), labelY? }`.

**`mode` → on-bench rig** (in `genlab3d.jsx` / `labitems3d.jsx`):
- `magnet` → `BarMagnet` (magnetic items lift to it)
- `water` → `WaterStation` (soluble tints water, insoluble = sediment/oil layer)
- `examine` → `ConductivityTester` (bulb lights for metals)
- `light` → `LightRig` (torch + beam + screen spot/shadow)
- `thermo` → `ThermoRig` (mercury animates to `item.temp`, °C badge)
- `inspect` → `Magnifier` (hovers over active item)
- `motion` → no rig; the toy **shape animates** when selected (via `active` prop)
- `glow` → `GlowRig` (point light + pulsing halo when item is luminous)
- `mix` → `NeutraliseStation` (beaker of universal indicator; starts red for an acidic sample / purple for a basic one, a matching dropper adds base or acid, colour lerps to neutral green — defined in `genlab3d.jsx`)
- `rust` → `RustStation` (iron nail in a test tube; turns rust-brown + dull when air+moisture present, stays shiny otherwise — defined in `genlab3d.jsx`)
- `burn` → `BurnRig` (a burning matchstick approaches; a flame leaps up if the sample is combustible — `labitems3d.jsx`)
- `reflect` → `ReflectRig` (3 parallel rays hit the surface; reflected parallel if regular, scattered if diffused — `labitems3d.jsx`)
- `slide` → `SlideRig` (a block slides on the surface — glides far on low friction, barely moves on high — `labitems3d.jsx`)
- `tyndall` → `TyndallStation` (a beam crosses the beaker — invisible in a true solution, scatters/glows in a colloid, cloudy + settling in a suspension — `genlab3d.jsx`)
- `states` → `StatesRig` (a transparent box of particles — vibrating lattice (solid), loose drifting (liquid), free flight (gas) — `labitems3d.jsx`)
- `reagent` → `FoodTestStation` (a spotting tile + reagent dropper; the well lerps to the test's positive colour — blue-black starch / violet protein / oily-yellow fat — `genlab3d.jsx`)
- `float` → `FloatTank` (the sample bobs at the water surface if it floats, sinks to the bottom if denser than water — `genlab3d.jsx`)
- `examine` now lights the `ConductivityTester` bulb for category `metal` **or** `conductor` (so it serves both the metals lab and the conducting-liquids lab)
- `optics` → `OpticsRig` (three parallel rays pass through a lens glyph — converge to a focus for a convex lens, spread apart for a concave lens — `labitems3d.jsx`)

**Available `shape` models** (`SHAPES` map in `labitems3d.jsx`): nail, pin, coin, foil, wire, ruler, strip, ribbon, lump, slab, frosted, sheet, block, panel, cup, fan, pendulum, swing, car, top, ball, orb, bulb, candle, spoon, powder, grains, crystal, liquid, mixture, specks. Need a new look? Add a model fn + register it in `SHAPES`. Animated shapes read the `active` prop.

Every 3D lab reuses `lab3dscene.jsx` (`SceneEnv`+`LabRoom`+`BenchInstruments`) so the room, lighting, wall charts and **Spark HUD position/UI are identical** everywhere. The flagship `lab3d.jsx` keeps its own copy of the scene (deliberately not refactored to import lab3dscene, to protect the verified flagship — could be unified later).

---

## 6. AI, cost & security model

- **Cost-optimised:** routine narration is FREE (browser TTS + cached `public/narration` clips). Paid Gemini is used only for (a) novel "Ask Spark" questions not in the FAQ cache, and (b) one end-of-lab `gradeLab` call. Common questions answered from `SPARK_QA` (spark.jsx) at ₹0. Live native-audio voice is opt-in "premium" (the expensive mode — it once cost ₹25/session before this rework; now a standard lab is well under ₹1).
- **Security (deployed):** every `/api/*` requires a Firebase ID token (`requireAuth`); `/api/live` WS needs a first `{type:"auth",token}` handshake; per-user rate limits 20/min + 300/day; CORS locked to web.app/firebaseapp.com/localhost. Verified: unauth → 401, bad token → 401, WS bad auth → close 1008, real signed-in token → 200.
- **All AI goes through `api.js` / `speech.js`** (token + graceful fallback) — never call the backend directly from a component.

---

## 7. Conventions & gotchas (read before editing)

- **Stay on D:** the project was on OneDrive, which kept offloading/locking `node_modules` (vite/rollup binaries vanished). If a build fails with "Cannot find module", do `rm -rf node_modules && npm install`.
- **Design tokens:** use the `C` object / CSS vars — never hardcode hex. Teal = primary, indigo = AI/Spark accent.
- **No responsive breakpoints exist** (no `@media`). Desktop-first; labs assume ≥~900px and a fixed 348px Spark HUD. Mobile is a known TODO.
- **Local visual QA limits:** LibreOffice/Poppler are NOT installed, so `.pptx`/PDF rendering can't be auto-verified here. For 3D labs, verify headlessly via Playwright: mount a temp preview, dispatch `PointerEvent`s across the canvas at y≈410 until the "X/N EXAMINED" counter increments, screenshot, then delete the temp files. (Pixel sampling needs `preserveDrawingBuffer`.)
- **Accessibility:** mouse/visual-first today; clickable `<div>`s, missing focus rings/ARIA, no `prefers-reduced-motion`. Fixes are spec'd in `DESIGN_HANDOFF.md`.
- **`circuitlab.jsx`** still calls Gemini (`sparkReact`) per switch toggle — not yet cost-optimised like the rest; candidate to migrate to the scripted-narration pattern.
- **markitdown** console output shows mojibake (`?`/`�`) for unicode — that's console encoding, not a file problem.
- The `.pptx` deck is committed as a binary in the repo.

---

## 8. Roadmap / suggested next steps

- **Class 8–10 labs** (next content push): Class 8 Phys (reflection), Class 8 Chem (rusting), Class 9 (force, solutions), Class 10 (reactions, lens). All can be `genlab3d` data specs; add new `shape` models/rigs as needed (e.g. a mirror/ray rig for reflection, a force/spring rig).
- **Monetisation engine** (PRD pillar): freemium credits, Razorpay/Stripe, B2B school dashboard.
- **Mobile-responsive** layouts + low-end device tuning.
- **NCERT-textbook RAG** grounding (Vertex AI Search) for citeable answers.
- **Multilingual Spark** (Hindi + regional).
- **Accessibility (WCAG)** pass.
- Optional: unify `lab3d.jsx` to import `lab3dscene.jsx` (remove the duplicate scene copy); cost-optimise `circuitlab.jsx`.

---

## 9. Outstanding small items
- Creator name in `landing.jsx` `CREATOR` is a placeholder ("Prince Kumar"); GitHub handle is `ojha-436` (possibly "Prince Ojha") — confirm and update. Drop a profile photo at `public/creator.jpg`.
- If the Gemini key was shared in chat, consider rotating it (the app reads it from env, no code change needed).
