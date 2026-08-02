# LabSpark AI — Implementation Plan: Socratic Spark + Teacher Live-Class & Marks

> **Scope:** Full build plan for the two prioritised features.
> **Primary buyer:** schools & teachers (drives Feature B priority). **Secondary:** government / NGO at scale.
> **Author's stance:** written as the engineer who owns this platform — every task points at a real file, endpoint, or Firestore path that exists today.

- **Feature A — Socratic Spark:** Predict → Observe → Explain inquiry loop. *(This is the "only AI can do this" moment — the unique/attractive axis.)*
- **Feature B — Teacher Live-Class + marks-linked practical file:** assignments, live class run, projector/turn-taking mode, AI-drafted marks with teacher override, gradebook export. *(This is the adoption/revenue axis — the reason a school pays.)*

---

## 0. Current architecture (the ground truth we build on)

| Layer | File(s) | What it does today |
|---|---|---|
| Lab engine | `src/genlab3d.jsx` | 3D data-labs: manipulate → **classify (verdicts)** → `finish()` → `gradeLab()` → `onComplete()` |
| Lab specs | `src/genlabdata.js` | `GEN_LABS[id]` = `{ items[], categories[], question, aim, theory, conclusion, mode, … }` |
| App state | `src/app.jsx` | `complete(rec)` builds the completion record, `persist()`s to Firestore, mirrors to classes via `writeSubmission()` |
| AI client | `src/api.js` | `askSpark()`, `sparkReact()`, `gradeLab()` → POST to backend |
| Backend | `server/index.js` | `/api/spark/ask`, `/api/spark/react`, `/api/grade` (JSON), `WS /api/live`; auth + rate limit; `SPARK_SYSTEM` persona; `generate()` |
| Classroom data | `src/classroom.js` | `createClass`, `joinClass`, `writeSubmission`, `watch{Roster,Submissions,Posts}`, `addPost` |
| Classroom UI | `src/classroom.jsx` | `TeacherPage` → `ClassDetail` (roster × submissions), `JoinClassPage`, `ClassStream` |
| Practical file | `src/practicalfile.js` | jsPDF CBSE record; observation table already renders `studentVerdict` vs `correct` |
| Roles | `src/roles.jsx` | `student / teacher / parent` |

**Completion record shape** (`app.jsx` `complete()`), the contract everything downstream depends on:

```js
{ id, name, experimentId, title, date, correct, total, xp,
  observations: [{ name, correct, studentVerdict }], aim, conclusion,
  chapter, cls, subject, aiFeedback }
```

**Design rules we must not break:**
1. **Gemini key stays server-side only.** All AI additions are new/extended endpoints in `server/index.js`, never client calls.
2. **Cost discipline.** New AI calls reuse the free-narration-first, cache-second, Gemini-last pattern. One lab session must stay well under ₹1.
3. **"Rules are not filters."** Every new teacher-readable Firestore collection denormalises `teacherUid` so security rules authorise reads without a `get()`.
4. **A new lab = one spec object.** Feature A must be spec-driven, not hand-coded per lab.

---

# FEATURE A — Socratic Spark (Predict → Observe → Explain)

## A.1 Product behaviour

Today the flow is *do → classify → grade*. We insert an inquiry loop so a student reasons like a scientist:

1. **Predict** — before manipulating an item, Spark asks: *"Before you test the iron nail — do you think the magnet will grab it? Why?"* Student picks a category **and** (optionally) types a one-line reason.
2. **Observe** — the existing 3D interaction plays (magnet test, dissolve, etc.).
3. **Explain** — Spark contrasts prediction vs result: *"You said non-magnetic, but it jumped to the magnet. What does that tell us about iron?"* — reinforcing on a hit, gently correcting the misconception on a miss.
4. **Safe-fail sandbox (stretch)** — allow the deliberately "wrong" action (mix wrong chemicals / short a circuit) and have Spark explain the failure. Impossible in a rationed physical lab; a strong differentiator.

The predict step is the pedagogical payload; the explain step is where mispredictions ("productive failure") become the teaching moment.

## A.2 Data model changes

**Lab spec (`genlabdata.js`)** — additive, optional, so all 42 labs keep working:

```js
// per-lab, optional
socratic: {
  enabled: true,
  predictPrompt: "Will the magnet attract this? Why do you think so?",
  explainOnHit:  "You predicted right — {item} is {label} because {reason}.",
  explainOnMiss: "You predicted {predicted}, but {item} is actually {correct}. {fact}",
}
// per-item, optional override
items: [{ id:"ironnail", …, predictHint:"Think about what it's made of." }]
```

If `socratic.enabled` is absent/false → lab runs exactly as today (zero-risk rollout, opt-in per lab).

**Observation record** grows two optional fields (backward compatible — practical file & grading already tolerate missing keys):

```js
observations: [{
  name, correct, studentVerdict,
  prediction,        // NEW: the category the student guessed BEFORE observing
  predictionReason,  // NEW: optional free-text reason
}]
```

Derived metric per lab: `predictionAccuracy = hits / itemsPredicted` — surfaced to student (report) and teacher (gradebook) as an **inquiry / reasoning** signal distinct from the final classification score.

## A.3 Backend changes (`server/index.js`)

**1. Extend `SPARK_SYSTEM`** with a Socratic clause:

```
When the student makes a PREDICTION, never reveal the answer. Ask one short "why"
that nudges their reasoning. When you EXPLAIN after an observation, explicitly name
whether their prediction matched, then give the one-sentence reason. Celebrate a
wrong prediction as a good scientific guess — never make them feel wrong for trying.
```

**2. New endpoint `POST /api/spark/explain`** (the contrast step). Reuses `generate()`, `maxOutputTokens: 220`, `thinkingBudget: 0`:

```js
app.post("/api/spark/explain", async (req, res) => {
  const { experiment, item, prediction, actual, reason, wasCorrect } = req.body || {};
  const prompt =
    `Experiment: ${experiment}. The student tested "${item}".\n` +
    `They PREDICTED it was "${prediction}"${reason ? ` because "${reason}"` : ""}.\n` +
    `The real result is "${actual}" (prediction was ${wasCorrect ? "correct" : "wrong"}).\n` +
    `In 1–2 spoken sentences, tell them if their prediction matched and why, ` +
    `Socratically. Encourage the guess even if wrong.`;
  const answer = await generate({ prompt, maxOutputTokens: 220 });
  res.json({ answer: answer?.trim() || "" });
});
```

**Cost control (mandatory):** the predict *prompt* is scripted (`socratic.predictPrompt`) → ₹0. Only the *explain* step optionally hits Gemini. Add a **client-side heuristic fallback**: on a hit, speak `explainOnHit` (template, free); only call `/api/spark/explain` on a **miss** (the moment that actually needs adaptive teaching) — this caps AI cost to ~mispredictions per lab, typically 1–2.

## A.4 Frontend changes (`src/genlab3d.jsx`)

Introduce a per-item **phase machine**. Today `finish()` reads `verdicts`; we add a `predictions` map and a phase gate.

```js
const [phase, setPhase] = useState("intro");   // intro → predict → observe → explain → classify → done
const [predictions, setPredictions] = useState({});   // itemId -> { category, reason }
const [predAccuracy, setPredAccuracy] = useState(null);
```

Flow per item (only when `spec.socratic?.enabled`):
1. **predict** — render a `PredictPrompt` overlay (reuse the quiz-button styling at `genlab3d.jsx:384`): category chips + optional one-line reason input. Store into `predictions[item.id]`.
2. **observe** — existing 3D interaction runs unchanged.
3. **explain** — compute `wasCorrect = prediction === item.category`; hit → speak template via `say()`; miss → `await sparkExplain(...)` then `say()`. Set mood `celebrate`/`think`.
4. Continue to the existing classify/verdict UI.

`finish()` change — enrich observations and compute accuracy:

```js
const observations = items.map((i) => ({
  name: i.name, correct: i.category, studentVerdict: verdicts[i.id],
  prediction: predictions[i.id]?.category ?? null,
  predictionReason: predictions[i.id]?.reason ?? null,
}));
const predicted = observations.filter(o => o.prediction);
const predAccuracy = predicted.length
  ? predicted.filter(o => o.prediction === o.correct).length / predicted.length : null;
onComplete({ …existing, observations, predictionAccuracy: predAccuracy });
```

**`src/api.js`** — add `sparkExplain({ experiment, item, prediction, actual, reason, wasCorrect })` mirroring `sparkReact`.

**`src/app.jsx`** `complete()` — carry `predictionAccuracy` into `rec` (one line; flows to Firestore, practical file, class submission automatically).

## A.5 Practical file (`src/practicalfile.js`)

Add a **Hypothesis** column to the observation table (`labSection`, ~line 121). CBSE practical format explicitly values a *hypothesis/prediction* — this makes the generated file look more authentically like a lab record:

```
["#", "Sample / Item", "Predicted", "Your Answer", "Correct", "Remark"]
```

Render `labelOf(spec, o.prediction)`; fall back to "—" when absent so the 40 non-Socratic labs still render cleanly.

## A.6 Phasing & acceptance (Feature A)

| Milestone | Deliverable | Done when |
|---|---|---|
| A0 | `socratic` block added to **one** flagship lab (magnetism) + spec typing | Lab loads, no regression on other 41 |
| A1 | `phase` machine + `PredictPrompt` overlay in `genlab3d.jsx` | Student can predict before observing on magnetism |
| A2 | `/api/spark/explain` + `sparkExplain()` + hit-template / miss-AI fallback | Explain step speaks correctly on hit and miss |
| A3 | `predictionAccuracy` end-to-end (report + Firestore + PDF Hypothesis column) | Value visible in report and practical file |
| A4 | Roll `socratic` blocks out to top ~10 labs | Content-only, no code change |
| A5 (stretch) | Safe-fail sandbox action + Spark failure explanation | One lab demonstrates safe failure |

**Riskiest assumption:** students engage with predict instead of skipping. **Cheap test:** ship A0–A2 behind a per-lab flag; instrument `% predictions with a typed reason` and `lab completion rate` vs a non-Socratic control lab. If completion drops sharply, make the reason field optional-er / shorten the loop.

---

# FEATURE B — Teacher Live-Class + Marks-Linked Practical File

Builds directly on the shipped `classroom.js/jsx`. Four capabilities: **Assignments → Live run → Marks (AI-drafted, teacher-approved) → Gradebook/records export.**

## B.1 Firestore schema (extends existing `classes/{CODE}`)

```
classes/{CODE}/assignments/{labId}
    { labId, title, cls, subject, teacherUid, assignedAt, dueAt, live:false, required:true }

classes/{CODE}/submissions/{uid__labId}     // EXISTS — extend with marks fields:
    { …existing…, predictionAccuracy, aiMark, aiMarkMax, teacherMark, marksApproved:false, gradedBy, gradedAt }

classes/{CODE}/live/current                  // singleton — the running live session
    { labId, title, startedAt, teacherUid, active, mode:"individual"|"projector" }

classes/{CODE}/presence/{studentUid}         // ephemeral live status (heartbeat)
    { studentUid, teacherUid, name, rollNo, labId, status:"joined"|"in-lab"|"submitted", stepPct, updatedAt }
```

`teacherUid` denormalised on **every** doc (rules-not-filters rule). Presence docs are written by the student client on a throttled heartbeat (every ~5s while in a live lab) and are safe to be stale/garbage-collected.

## B.2 `src/classroom.js` — new data functions

```js
// Assignments
export async function assignLab(code, { labId, title, cls, subject, dueAt, required })
export function watchAssignments(code, cb)          // student sees "assigned to you"
export async function removeAssignment(code, labId)

// Live session (teacher controls the singleton; students watch it)
export async function startLive(code, { labId, title, mode })   // sets live/current active
export async function stopLive(code)
export function watchLive(code, cb)                 // student auto-enters lab when live goes active

// Presence (student heartbeat + teacher live board)
export async function heartbeat(code, { labId, status, stepPct })   // throttled, from student lab
export function watchPresence(code, cb)             // teacher live board (teacherUid-filtered)

// Marks
export async function setTeacherMark(code, uid, labId, { teacherMark, marksApproved })
export function computeAiMark(sub)                  // pure fn: derive mark from correct/total (+ predictionAccuracy weight)
```

`writeSubmission()` (already called from `app.jsx`) gets extended to also stamp `aiMark`/`aiMarkMax` via `computeAiMark()` at submit time, with `marksApproved:false` (teacher must confirm — solves the AI-trust problem).

**Marks scheme** (`computeAiMark`, tunable, defaults to CBSE-style /5 internal):
```
aiMark = round( 0.7 * (correct/total) * MAX  +  0.3 * (predictionAccuracy ?? correct/total) * MAX )
```
Weighting *reasoning* (prediction accuracy) into the mark is what ties Feature A and B together and reflects NEP's inquiry emphasis.

## B.3 `src/classroom.jsx` — UI additions

**Teacher `ClassDetail`** — add two tabs beside the existing *Students & Records* / *Class Stream*:

1. **Assign** tab — grid of `GEN_LABS` (filtered by class `grade`/`subject`), each with *Assign* + due-date. Writes `assignments/{labId}`. Shows completion count per assignment (derived from live `submissions`).
2. **Live** tab — the classroom-run board:
   - Teacher picks an assigned lab → **Start Live** (`startLive`). 
   - Real-time grid from `watchPresence` + `watchSubmissions`: each student card shows status chip (joined / in-lab `stepPct%` / submitted `score`). This is the "run the practical with the whole class" view teachers actually stand in front of.
   - **Projector / turn-taking mode** (`mode:"projector"`): for one shared device / one screen. Renders a large roster with a "Now: <student name>" pointer the teacher advances; the lab runs once on the projected screen and each turn's result is attributed to the pointed student. Directly serves under-resourced schools with 1 device per class.
   - **Stop Live** ends the session.

**Student side** — `watchLive` + `watchAssignments`:
   - Assigned labs get an **"Assigned by <teacher> · due <date>"** ribbon on the dashboard (`dashboard.jsx`).
   - When a class goes **live**, the joined student gets a banner **"Your teacher started <lab> — Join now"** that deep-links into `genlab3d`. Student lab emits `heartbeat()` on phase changes.

**Marks review** — in *Students & Records*, each submission row gains:
   - `aiMark / aiMarkMax` shown as a **draft chip**, an editable number input (teacher override), and an **Approve** toggle (`setTeacherMark`). 
   - Bulk **"Approve all AI marks"** for the trusting teacher.
   - This is the trust mechanism: AI proposes, teacher disposes; we measure override rate.

## B.4 Gradebook & records export (`src/practicalfile.js` + new)

- **Practical file** already exists and works per-student and class-wide (`downloadPracticalFile`, `downloadFor`, `downloadAll`). Extend the score strip in `labSection` to print **`Marks: teacherMark ?? aiMark / max` + "Assessed by teacher" / "AI draft"** so the printed file reflects approved marks.
- **New `src/gradebook.js`** — `downloadGradebookCSV(cls, roster, subs)` → one row per student × assigned lab with `correct/total`, `predictionAccuracy`, `aiMark`, `teacherMark`, `approved`. CSV is what schools paste into their internal-assessment / report-card systems — this is the deliverable that makes the product "compliance paperwork removed", not "nice demo".
- Optional: a one-page **class summary PDF** (averages, completion, per-lab distribution) for the file cover / HOD review.

## B.5 Security rules (`firestore.rules`) — must ship with B

Mirror the existing member/submission pattern. Additive rules:

```
match /classes/{code}/assignments/{labId} {
  allow read: if signedIn();                                  // any member can read assignments
  allow write: if isClassTeacher(code);                       // get()-validated on write
}
match /classes/{code}/live/{doc} {
  allow read: if signedIn();
  allow write: if isClassTeacher(code);
}
match /classes/{code}/presence/{uid} {
  allow read:  if resource.data.teacherUid == request.auth.uid;   // teacher board (rules-not-filters)
  allow write: if request.auth.uid == uid;                        // student writes own heartbeat
}
// submissions: student writes own (uid__labId); teacher may update ONLY marks fields:
match /classes/{code}/submissions/{sid} {
  allow read:   if resource.data.teacherUid == request.auth.uid || owns(sid);
  allow create: if owns(sid);
  allow update: if isClassTeacher(code)
                && onlyChanged(['teacherMark','marksApproved','gradedBy','gradedAt']);
}
```

`isClassTeacher(code)` = `get(/classes/$(code)).data.teacherUid == request.auth.uid` (write-path only, so the per-class get() cost is acceptable). Reads stay get()-free via denormalised `teacherUid`.

## B.6 Phasing & acceptance (Feature B)

| Milestone | Deliverable | Done when |
|---|---|---|
| B0 | Firestore rules for assignments/live/presence/marks + emulator tests | A student cannot read another class; teacher cannot edit non-mark fields |
| B1 | `assignLab` + Assign tab + student assignment ribbon | Teacher assigns; student sees it on dashboard |
| B2 | `startLive`/`watchLive` + student "Join now" banner + heartbeat + teacher Live board | Teacher starts a lab; all students appear live with status |
| B3 | Projector / turn-taking mode | One device runs the class; results attributed per turn |
| B4 | `computeAiMark` in `writeSubmission` + marks review UI + approve | AI mark drafts on submit; teacher overrides & approves |
| B5 | Practical-file marks strip + `gradebook.js` CSV + class summary PDF | Teacher exports an approved gradebook a school can ingest |

**Riskiest assumption:** teachers trust AI marks enough to let them count. **Cheap test:** B4 ships marks as *draft + one-click override*; instrument **override rate** and **time-to-approve** in a 2–3 teacher pilot. High override → tune `computeAiMark` weights or add rubric transparency before selling on "auto-grading".

**Second risk (buyer-critical):** the school actually runs a class on shared/low-end devices. B3 (projector mode) is the mitigation; validate on the cheapest Android + a projector before the first school pilot.

---

## C. Cross-cutting: sequencing, cost, testing

**Build order (recommended):** B0 → B1 → B2 → A0–A3 → B4 → B5 → B3 → A4 → (A5 / summary PDF).
Rationale: land the **buyer-facing** assignment+live+marks spine first (B0–B2, B4–B5) because school/teacher is the buyer; interleave Socratic (A) because it upgrades the *content quality* the live class shows off and feeds `predictionAccuracy` into the marks scheme.

**Cost guardrails:**
- Feature A adds AI calls only on **mispredictions** (hits use free templates). Budget ≈ 1–2 short Gemini calls per lab on top of the single existing grade call.
- Feature B is almost entirely Firestore reads/writes + client PDF/CSV → **₹0 marginal AI cost**. Presence heartbeats are throttled (~5s) and capped; use `onSnapshot` unsubscribe on unmount (pattern already in `ClassDetail`).
- Watch Firestore read fan-out on the Live board: a 40-student class × frequent heartbeats. Throttle heartbeats to phase-changes + a 10s max cadence; consider collapsing presence into a single `live/current` map if read counts spike.

**Testing:**
- **Rules:** Firestore emulator suite for every B0 rule (cross-class isolation, mark-field-only teacher updates, student-owns-heartbeat).
- **Regression:** the 40 non-Socratic labs must complete unchanged (A is opt-in per spec); practical file must render with and without `prediction`/marks fields.
- **Manual pilot script:** 1 teacher creates class → assigns lab → starts live → 3 students (incl. one low-end Android) join → predict/observe/explain → submit → teacher reviews & approves marks → exports gradebook + practical files. This script is also the hackathon demo.

**Explicitly out of scope (parked):** offline/Lite-mode 2D fallback and multilingual Spark (Feature #1 from brainstorm) — separate plan; do not entangle with A/B. Parent-facing marks view (reuse `family.js`) is a fast follow after B4.

---

## D. File-change checklist (quick reference)

**Feature A**
- `src/genlabdata.js` — add optional `socratic{}` per lab (+ `predictHint` per item)
- `server/index.js` — extend `SPARK_SYSTEM`; add `POST /api/spark/explain`
- `src/api.js` — add `sparkExplain()`
- `src/genlab3d.jsx` — phase machine, `PredictPrompt` overlay, enrich `observations`, compute `predictionAccuracy`
- `src/app.jsx` — carry `predictionAccuracy` into completion `rec`
- `src/practicalfile.js` — Hypothesis column
- `src/report.jsx` — show prediction accuracy to student

**Feature B**
- `firestore.rules` — assignments / live / presence / marks rules (+ emulator tests)
- `src/classroom.js` — `assignLab`, `watchAssignments`, `startLive`/`stopLive`/`watchLive`, `heartbeat`/`watchPresence`, `setTeacherMark`, `computeAiMark`; extend `writeSubmission`
- `src/classroom.jsx` — Assign tab, Live board + projector mode, marks review UI, student assignment ribbon + live "Join now" banner
- `src/dashboard.jsx` — assigned-lab ribbon + live banner
- `src/genlab3d.jsx` — emit `heartbeat()` on phase change when in a live/assigned context
- `src/practicalfile.js` — marks strip reflects approved mark
- `src/gradebook.js` *(new)* — CSV export + optional class-summary PDF
