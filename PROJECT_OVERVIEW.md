# LabSpark AI — Project Overview, Architecture & Proposal

**Prepared for:** Leadership / Management review
**Status:** Working MVP, deployed live on Google Cloud
**Live app:** https://gen-lang-client-0686614374.web.app
**Repository:** https://github.com/ojha-436/LabSparkAI
**Date:** June 2026

---

## 1. Executive Summary

**LabSpark AI is an AI-first virtual science laboratory for Class 6–10 (CBSE/NCERT)** where students perform real, interactive practicals in a 3D lab room while a conversational AI tutor — **"Spark"** — guides them, answers their questions by voice or text, and grades their work with personalised feedback.

Unlike the static, animation-based virtual labs that dominate India today, LabSpark AI is built around a **live, talking AI co-teacher** and **true 3D interactive experiments**, delivered on a **scalable, low-cost Google Cloud architecture**.

**This is not a concept — it is already built and running in production:**
- ✅ Real Google **Gemini** AI tutor (text + live two-way voice), not scripted responses
- ✅ **True 3D (WebGL) lab rooms** with realistic apparatus and true-to-life processes
- ✅ **5 working NCERT labs** across Classes 6–10, Physics & Chemistry
- ✅ Student accounts, progress tracking, achievements & auto-generated lab certificates
- ✅ **Cost-engineered** so a typical lab session costs a fraction of a rupee
- ✅ Secured, rate-limited backend on **Cloud Run + Firebase**

**The ask:** resourcing to expand the lab catalogue, add the monetisation engine, and run school pilots — turning a proven prototype into a commercial product for India's 250M+ school students.

---

## 2. The Problem

Practical science is mandatory in CBSE/NCERT and carries board-exam marks, yet most Indian students get **little real lab time**:

- Government and low-income schools often lack functioning labs, chemicals, or equipment.
- Even well-equipped schools ration lab access; many "practicals" are copied from a manual.
- Existing digital alternatives are **passive** — students *watch* an animation or click through a fixed simulation. There is no one to *ask*, no adaptation, no real conversation.

The result: students memorise practicals instead of *doing* and *understanding* them. NEP 2020 explicitly pushes for **experiential, hands-on, technology-enabled learning** to fix exactly this gap.

---

## 3. The Market Opportunity

- India's **EdTech market is ~US$3.6 billion (2025)**, with **K-12 the largest segment at ~43%**. ([source](https://www.imarcgroup.com/india-edtech-market))
- **NEP 2020 + Digital India** mandate technology-led, experiential learning; **AR/VR and immersive lab experiences are named growth opportunities**. ([source](https://www.grandviewresearch.com/industry-analysis/education-technology-market))
- In **September 2025, NCERT launched DIKSHA 2.0 with AI-enabled adaptive learning** in 12 languages — government validation that **AI in school learning is now a national priority**. ([source](https://www.imarcgroup.com/india-edtech-market))
- Addressable base: **150M+ students in Classes 6–10** across CBSE/State boards.

**Timing:** the AI capability (Gemini), the policy tailwind (NEP 2020), and the cost curve (cheap cloud + AI) have only just converged. LabSpark AI is positioned exactly at that intersection.

---

## 4. The Solution — What LabSpark AI Does

A student logs in, picks their class and subject, and enters a **3D virtual lab room**. There they:

1. **Perform the experiment hands-on** — pick up apparatus, bring a magnet to materials, dip litmus paper, dissolve substances in water — with components that look and behave like the real thing.
2. **Talk to Spark, the AI tutor** — ask "why did it turn red?" by voice or text and get an instant, syllabus-grounded answer. Spark narrates each step like a teacher standing beside them.
3. **Record observations and get graded** — Spark evaluates their classifications and writes **personalised conceptual feedback**, then issues an **official lab certificate**.
4. **Track progress** — XP, levels, badges, completed-lab history, and downloadable reports, all saved to their account.

### Already-built capabilities
| Capability | Status |
|---|---|
| Conversational AI tutor (Gemini 2.5 Flash, text) | ✅ Live |
| Two-way **live voice** conversation (Gemini Live API) | ✅ Live (premium mode) |
| True **3D WebGL lab rooms** (React Three Fiber) | ✅ Live |
| 5 NCERT labs (Acids/Bases, Circuits, Solubility, Magnetism, Metals/Non-metals) | ✅ Live |
| Personalised AI grading + certificates | ✅ Live |
| Accounts, profiles, progress, achievements (Firestore) | ✅ Live |
| Cost optimisation (free narration + on-demand AI + cached answers) | ✅ Live |
| Auth-secured, rate-limited backend | ✅ Live |

---

## 5. Research Note — Competitive Landscape in India

> Commissioned to answer: *what comparable platforms exist in India today, and how is LabSpark AI different?*

India's virtual-lab space is real but **dominated by static simulations, not conversational AI**. The main players:

### OLabs (Amrita CREATE + CDAC, Govt-funded)
The flagship. **170+ interactive simulations, animations and lab videos**, NCERT/SCERT-aligned, **free** for registered schools, in 5 Indian languages. Coverage is mainly **Class 9–12** (some 6 & 10). ([source](https://www.olabs.edu.in/)) ([source](https://www.amrita.edu/project/online-labs/))
**Limitation:** essentially **2D step-by-step simulations with no AI tutor** — students follow a fixed script; there's nothing to ask and no adaptation.

### DIKSHA Virtual Labs (Govt / NCERT)
The national platform hosts **~218 virtual-lab activities** (164 science). DIKSHA 2.0 (Sept 2025) adds **AI-enabled *adaptive lessons*** and 12 languages. ([source](https://diksha.gov.in/virtuallabs.html)) ([source](https://www.imarcgroup.com/india-edtech-market))
**Limitation:** AI is applied to *content recommendation/lessons*, **not a live in-lab voice tutor**; the labs themselves remain simulation/animation based.

### LabInApp (acquired by BYJU'S, 2020)
Indian startup using **real-time 3D graphics** to visualise experiments; folded into BYJU'S. ([source](https://www.cbinsights.com/company/labinapp))
**Limitation:** 3D visualisation, but **not a conversational AI tutor**; tied to a paid edtech suite.

### PraxiLabs (global, used in India)
**210+ curriculum-aligned 3D simulations** with LMS integration and analytics. ([source](https://praxilabs.com/))
**Limitation:** **not India/NCERT-native**, institution-priced, and **no real-time conversational AI tutor**.

### How LabSpark AI is different

| Dimension | OLabs / DIKSHA | LabInApp / PraxiLabs | **LabSpark AI** |
|---|---|---|---|
| Core interaction | 2D simulation / animation | 3D visualisation | **3D experiment + live AI conversation** |
| AI tutor | ❌ none (DIKSHA = adaptive lessons) | ❌ none | ✅ **Gemini tutor that talks, listens & adapts in the lab** |
| Voice | ❌ | ❌ | ✅ **Two-way live voice (ask out loud, hear answers)** |
| Personalised grading & feedback | ❌ (fixed) | limited | ✅ **AI-written conceptual feedback + certificate** |
| NCERT Class 6–10 focus | partial | partial / global | ✅ **Purpose-built for 6–10** |
| "Ask anything" help | ❌ | ❌ | ✅ **On-demand Ask Spark (voice/text)** |
| Cloud-native cost model | govt-funded | enterprise | ✅ **~fraction of ₹1 / session, scales on GCP** |

**The one-line differentiator:** *Every other platform gives a student a simulation to watch. LabSpark AI gives them a science teacher to talk to — inside a real 3D experiment.* That is a category shift from **passive simulation** to **active, conversational, AI-tutored practice**, and no India-focused platform currently offers it.

---

## 6. Product Architecture (GCP-Native)

```
                         ┌─────────────────────────────┐
   Student (browser)     │   Firebase Hosting (CDN)    │   static React app (Vite build)
   ───────────────────►  │   gen-lang-client...web.app │
                         └───────────────┬─────────────┘
                                         │  HTTPS (Firebase ID token on every call)
                                         ▼
                         ┌─────────────────────────────┐        ┌──────────────────┐
   Auth + progress  ◄──► │   Cloud Run backend (Node)  │ ─────► │   Google Gemini  │
   (Firebase Auth /      │   • /api/spark/ask (text)   │        │   • 2.5 Flash    │
    Cloud Firestore)     │   • /api/grade (JSON)       │        │   • Live (audio) │
                         │   • /api/live (WebSocket)   │ ◄───── │   native-audio   │
                         │   key + rate-limits server  │        └──────────────────┘
                         └─────────────────────────────┘
```

**Key design decisions & trade-offs**
- **Frontend on Firebase Hosting (CDN):** instant global delivery, cheap, zero server for the UI.
- **AI behind Cloud Run, never in the browser:** the Gemini key stays server-side; every request requires a **Firebase Auth token** and is **rate-limited (20/min, 300/day per user)** to prevent cost abuse.
- **3D via WebGL (React Three Fiber), procedural models:** no licensed 3D assets to buy/host; the whole lab is code, so it's self-contained and instantly updatable.
- **Cost-first AI usage:** routine narration is free (browser speech + cached clips); the paid AI is only called for *novel* questions and end-of-lab grading. The expensive live-voice mode is opt-in/"premium".

### Technology stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Three Fiber / drei (WebGL 3D) |
| AI | Google Gemini 2.5 Flash (text), Gemini Live native-audio (voice), Gemini TTS (narration) |
| Backend | Node + Express on **Google Cloud Run**, WebSocket relay for live voice |
| Auth & Data | Firebase Authentication, Cloud Firestore |
| Hosting / CI | Firebase Hosting, Cloud Build (source deploy) |

---

## 7. Project Structure (Repository Map)

```
LabSpark_AI/
├─ index.html                  # Vite entry
├─ src/
│  ├─ main.jsx                 # app bootstrap
│  ├─ app.jsx                  # view routing, auth, student state, history/back-button
│  ├─ tokens.js                # design tokens (colors)  ← see DESIGN_HANDOFF.md
│  ├─ index.css                # design system / utility classes / animations
│  ├─ firebaseInit.js          # Firebase init (auth + firestore)
│  ├─ api.js                   # frontend→backend bridge (attaches auth token, graceful fallback)
│  ├─ speech.js                # free TTS + speech-to-text + cached voice clips
│  │
│  ├─ landing.jsx              # marketing landing page + creator section
│  ├─ login.jsx                # Google + email auth
│  ├─ dashboard.jsx            # class (6–10) → subject lab catalogue
│  ├─ profile.jsx              # Profile / Class Progress / Achievements pages
│  ├─ report.jsx               # lab report + NCERT certificate
│  │
│  ├─ lab3d.jsx                # flagship 3D Acids & Bases lab
│  ├─ lab3dscene.jsx           # SHARED 3D lab room (room, lights, instruments) — used by all 3D labs
│  ├─ labitems3d.jsx           # realistic 3D component models + tools (magnet, tester)
│  ├─ genlab3d.jsx             # data-driven 3D lab engine (new labs need only data)
│  ├─ genlabdata.js            # NCERT lab specifications (the lab "content")
│  ├─ circuitlab.jsx           # electric-circuit lab
│  ├─ spark.jsx / askspark.jsx # AI tutor logic + on-demand "Ask Spark" panel
│  ├─ voicelive.js             # live two-way voice client
│  └─ ui.jsx, labpanel.jsx     # shared UI primitives
│
├─ server/                     # Cloud Run backend
│  ├─ index.js                 # Gemini tutor + grader + live-voice relay + auth/rate-limit
│  ├─ generate-narration.mjs   # one-time TTS clip generator
│  └─ Dockerfile
├─ public/narration/           # pre-generated Spark voice clips (free playback)
├─ DESIGN_HANDOFF.md           # design system & component specs
└─ PRD_LabSpark_AI.md          # product requirements
```

**Why this structure matters for scaling:** new labs are **pure data**. To add a lab, a content author writes one spec object in `genlabdata.js` (aim, materials, items, correct answers, NCERT chapter); `genlab3d.jsx` + `labitems3d.jsx` render it in the shared 3D room automatically. **No new engineering per lab** — this is the scalability lever.

---

## 8. How It Works — Student Journey & AI Flow

1. **Sign in** (Google / email) → land on the **dashboard**, grouped by Class 6–10, then by subject.
2. **Open a lab** → enter the 3D room; Spark greets and narrates the aim (free voice).
3. **Experiment** → manipulate real 3D components; each action triggers a scripted, free explanation.
4. **Ask Spark** anytime → FAQ-cached answers are instant & free; only genuinely new questions call Gemini (cheap text).
5. **Classify & submit** → Gemini grades and writes feedback; an official certificate is generated and stored.
6. **Progress** → XP/badges/history persist to the student's account; certificates live in Achievements.

---

## 9. Working Plan / Roadmap

### ✅ Completed (live in production)
| Phase | Outcome |
|---|---|
| 0 — Foundation | Migrated to Vite + React build; GCP-native architecture |
| 1 — Real AI | Gemini text tutor + grader on Cloud Run (replaced earlier scripted responses) |
| 2 — Live voice | Two-way Gemini Live voice relay (WebSocket) |
| 3 — 3D labs | True 3D lab room; flagship Acids & Bases; shared scene engine |
| 4 — Cost optimisation | Free narration + on-demand AI + cached TTS → ~₹0 standard session |
| 5 — Platform | Profiles, class→subject dashboard, progress, achievements, certificates |
| 6 — Security | Auth-token gating + rate limits + locked CORS on all AI endpoints |
| 7 — Lab expansion | Data-driven engine + 3 new NCERT labs with realistic 3D components |

### ⏭️ Next (the resourcing ask)
| Priority | Initiative | Why |
|---|---|---|
| P0 | **Lab catalogue expansion** to 20–30 labs (Classes 6–10, all of Physics/Chem/Bio) | Depth drives adoption; now cheap (data-only) |
| P0 | **Monetisation engine** — freemium credits + Razorpay/Stripe + school B2B dashboard | Revenue path; PRD-defined |
| P1 | **School pilots** (3–5 schools) + teacher analytics | Proof, testimonials, B2B pipeline |
| P1 | **Mobile-responsive** layouts + low-end device tuning | Reach beyond desktop |
| P2 | **NCERT-textbook RAG grounding** (Vertex AI Search) | Citable, exam-accurate answers |
| P2 | **Multilingual Spark** (Hindi + regional) | Match OLabs/DIKSHA reach; widen TAM |
| P2 | **Accessibility (WCAG)** pass | Inclusivity + institutional requirements |

---

## 10. Cost & Unit Economics (why this is viable)

The early prototype used the expensive always-on live-voice model and cost **~₹25 per lab** — unviable at scale. We **re-engineered the AI usage**:
- **Guided narration is free** (on-device speech + pre-generated cached clips).
- **AI is on-demand** — only novel "Ask Spark" questions and one end-of-lab grading call hit the paid model.
- **Common questions are answered from a local cache** at ₹0.
- **Live voice is opt-in "premium"**, capped per user.

**Result: a typical lab now costs well under ₹1**, comfortably supporting a freemium + low-price subscription model and an ≥80% gross margin target. This cost discipline is a core competitive moat — the platform stays affordable for Indian price points.

---

## 11. Security & Privacy

- Gemini API key is **server-side only** (Cloud Run env var), never shipped to the browser.
- **Every AI call requires a valid Firebase Auth token**; the live-voice WebSocket uses an auth handshake.
- **Per-user rate limits** (20/min, 300/day) prevent quota/cost abuse; **CORS locked** to our domains.
- Each student can **read/write only their own** Firestore record (security rules enforced).
- Profile photos are resized client-side and stored compactly; no raw media servers.

---

## 12. Current Status & Links

- **Live app:** https://gen-lang-client-0686614374.web.app
- **Backend:** Google Cloud Run (`asia-south1`, Mumbai)
- **Code:** https://github.com/ojha-436/LabSparkAI
- **Supporting docs:** `PRD_LabSpark_AI.md` (requirements), `DESIGN_HANDOFF.md` (design system), `README.md` (run/deploy)

---

## 13. Recommendation / The Ask

LabSpark AI has already cleared the hardest, riskiest milestones — **a real conversational AI tutor, true 3D labs, a secure scalable cloud backend, and a viable cost model** — and is **live today**. What remains is largely **content scaling (cheap, data-only) and go-to-market (monetisation + pilots)**.

**Recommendation:** approve a focused build phase to (1) expand to 20–30 labs, (2) ship the monetisation engine, and (3) run 3–5 school pilots. This converts a proven, differentiated prototype into a revenue-generating product aimed at the largest segment (K-12) of a US$3.6B and fast-growing market — with a defensible "AI tutor in a 3D lab" position that no India-focused competitor currently holds.

---

## Sources
- OLabs — Amrita Vishwa Vidyapeetham & CDAC: https://www.olabs.edu.in/ · https://www.amrita.edu/project/online-labs/
- DIKSHA Virtual Labs (Govt of India / NCERT): https://diksha.gov.in/virtuallabs.html
- LabInApp (CB Insights): https://www.cbinsights.com/company/labinapp
- PraxiLabs: https://praxilabs.com/
- India EdTech market (IMARC): https://www.imarcgroup.com/india-edtech-market
- Education Technology Market (Grand View Research): https://www.grandviewresearch.com/industry-analysis/education-technology-market
