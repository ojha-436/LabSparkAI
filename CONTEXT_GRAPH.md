# LabSpark AI — Context Graph

> **Purpose:** a single, persistent map of the *problem → solution → architecture → code* so context is never lost between sessions. (The `/build-graph` SQLite code-graph MCP isn't connected in this environment, so this Markdown graph + the `memory/` files serve that role. GitHub renders the Mermaid diagrams below.)

---

## 1. Problem → Solution Map

```mermaid
flowchart LR
    P["PROBLEM<br/>Indian students get little<br/>real practical-science time"]
    P --> P1["No working labs /<br/>equipment"]
    P --> P2["Lab time rationed;<br/>practicals copied"]
    P --> P3["Digital tools are passive<br/>(watch, can't ask)"]

    P1 --> S["SOLUTION: LabSpark AI<br/>AI tutor inside a 3D lab"]
    P2 --> S
    P3 --> S

    S --> S1["3D interactive labs<br/>(real apparatus + process)"]
    S --> S2["Spark: conversational<br/>Gemini tutor (voice + text)"]
    S --> S3["Personalised AI grading<br/>+ NCERT certificates"]
    S --> S4["Affordable: < ₹1 / session<br/>on Google Cloud"]
```

---

## 2. System Architecture

```mermaid
flowchart LR
    subgraph Client["Browser (React + Vite)"]
        UI["3D labs (R3F/WebGL)<br/>+ Spark HUD + Ask Spark"]
    end
    subgraph FB["Firebase"]
        AUTH["Auth"]
        FS["Firestore<br/>(profiles, progress, certs)"]
        HOST["Hosting / CDN"]
    end
    subgraph GCP["Google Cloud Run (server/)"]
        BE["Express backend<br/>auth-gated + rate-limited"]
    end
    GEM["Google Gemini<br/>2.5 Flash (text)<br/>Live native-audio (voice)"]

    HOST -. serves .-> UI
    UI -- "ID token on every call" --> BE
    UI <--> AUTH
    UI <--> FS
    BE -- "key server-side only" --> GEM
    BE <-->|"WebSocket relay"| GEM
```

**Endpoints (`server/index.js`):** `POST /api/spark/ask` (text) · `POST /api/grade` (JSON) · `WS /api/live` (voice relay) · `GET /health`. All `/api/*` require a Firebase ID token; limits 20/min, 300/day per user; CORS locked to the app domains.

---

## 3. Code / Module Graph (frontend)

```mermaid
flowchart TD
    main["main.jsx"] --> app["app.jsx<br/>(routing, auth, history/back)"]
    app --> landing["landing.jsx"]
    app --> login["login.jsx"]
    app --> dash["dashboard.jsx<br/>(class→subject)"]
    app --> report["report.jsx"]
    app --> profile["profile.jsx<br/>(Profile/Progress/Achievements)"]
    app --> lab3d["lab3d.jsx<br/>(Acids & Bases, flagship 3D)"]
    app --> circuit["circuitlab.jsx"]
    app --> genlab3d["genlab3d.jsx<br/>(3D engine for data labs)"]
    app --> data["data.js (CATALOG)"]
    app --> fb["firebaseInit.js"]

    genlab3d --> scene["lab3dscene.jsx<br/>(SHARED room/lights/instruments)"]
    genlab3d --> items["labitems3d.jsx<br/>(3D component models + tools)"]
    genlab3d --> gdata["genlabdata.js<br/>(NCERT lab specs = lab content)"]
    lab3d --> scene
    lab3d --> labpanel["labpanel.jsx"]
    items --> scene

    subgraph AI["AI + cost layer"]
        api["api.js (token + fallback)"]
        speech["speech.js (free TTS/STT + clips)"]
        voicelive["voicelive.js (live voice)"]
        askspark["askspark.jsx (on-demand help)"]
        spark["spark.jsx (FAQ cache)"]
    end
    lab3d --> AI
    genlab3d --> AI
    askspark --> api
    askspark --> spark
    api --> fb
    voicelive --> fb

    dash --> profile
    report --> gdata
    ui["ui.jsx + tokens.js (design system)"]
    scene --> ui
```

**Scaling lever:** a new lab = one spec object in `genlabdata.js` (shape, color, category, mode). `genlab3d.jsx` + `labitems3d.jsx` render it in the shared 3D room automatically — *no new engineering per lab*.

---

## 4. Student / AI Data Flow

```mermaid
sequenceDiagram
    participant U as Student
    participant L as 3D Lab (browser)
    participant B as Cloud Run
    participant G as Gemini
    U->>L: open lab, manipulate 3D components
    L-->>U: free scripted narration (browser TTS / cached clip)
    U->>L: "Ask Spark" question
    L->>L: FAQ cache hit? (free, ₹0)
    L->>B: else POST /api/spark/ask (+ID token)
    B->>G: Gemini text (key server-side)
    G-->>B: answer
    B-->>L: answer → spoken to student
    U->>L: classify items & submit
    L->>B: POST /api/grade
    B->>G: grade + feedback
    G-->>B: {score, feedback, badge}
    B-->>L: feedback → certificate + saved to Firestore
```

---

## 5. Status / Roadmap

```mermaid
flowchart LR
    subgraph Done["DONE — live"]
        d1["Gemini tutor + grader"]
        d2["Live voice"]
        d3["3D labs (5) + shared engine"]
        d4["Cost optimisation"]
        d5["Profiles/progress/certs"]
        d6["Security (auth + limits)"]
    end
    subgraph Next["NEXT — the ask"]
        n1["20–30 labs (data-only)"]
        n2["Monetisation + B2B"]
        n3["School pilots"]
        n4["Mobile responsive"]
        n5["RAG + multilingual"]
    end
    Done --> Next
```

---

## Key facts (quick recall)
- **Live app:** https://gen-lang-client-0686614374.web.app · **Repo:** https://github.com/ojha-436/LabSparkAI
- **Local path:** `D:\google_Xbuild\LabSpark_AI` (moved off OneDrive to stop node_modules corruption)
- **Backend:** Cloud Run `labspark-backend` (asia-south1) · model `gemini-2.5-flash`, live `gemini-3.1-flash-live-preview`
- **5 labs:** acid-base (3D flagship), circuit (2.5D), solubility, magnetism, metals-nonmetals (3D via engine)
- **Docs:** `PROJECT_OVERVIEW.md` (pitch), `DESIGN_HANDOFF.md` (design system), `PRD_LabSpark_AI.md`, `README.md`, this file
- **Deliverables:** `LabSpark_AI_Pitch_Deck.pptx`
- Full session history lives in the auto-memory at `memory/labspark-overview.md`.
