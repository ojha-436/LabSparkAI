# Graph Report - .  (2026-08-02)

## Corpus Check
- 70 files · ~99,259 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 423 nodes · 897 edges · 20 communities (19 shown, 1 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.55)
- Token cost: 128,000 input · 2,500 output

## Community Hubs (Navigation)
- Student UI & Design System
- Classroom & Teacher Tools
- Lab Engines & Speech
- Frontend Dependencies
- PDF Files & Worksheets
- App Shell & Family Auth
- Product Concepts (Docs)
- 3D Item Models
- Backend Dependencies
- 3D Lab Stations
- Backend Server & Auth
- 3D Scene & Textures
- Live Voice Streaming
- API Client Bridge
- Narration Audio Clips
- Narration Generation Script
- 3D Glassware Models
- 404 Page

## God Nodes (most connected - your core abstractions)
1. `C` - 22 edges
2. `Ic()` - 17 edges
3. `jspdf` - 13 edges
4. `gradeLab()` - 12 edges
5. `ClassDetail()` - 12 edges
6. `Btn()` - 12 edges
7. `SparkAvatar()` - 12 edges
8. `AskSpark()` - 11 edges
9. `speak()` - 11 edges
10. `Lab3D()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Design Token System (C object + CSS vars)` --rationale_for--> `LabSpark AI`  [INFERRED]
  DESIGN_HANDOFF.md → README.md
- `App()` --references--> `react`  [EXTRACTED]
  src/app.jsx → package.json
- `Build with Gemini XPRIZE Hackathon` --rationale_for--> `LabSpark AI`  [EXTRACTED]
  PRD_LabSpark_AI.md → README.md
- `Indian Virtual-Lab Competitive Landscape` --references--> `LabSpark AI`  [EXTRACTED]
  PROJECT_OVERVIEW.md → README.md
- `LabSpark AI` --references--> `NCERT/CBSE Class 6-10 Curriculum`  [EXTRACTED]
  README.md → PROJECT_OVERVIEW.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **GCP-Native System Architecture** — readme_labspark_ai, readme_cloud_run_backend, readme_firebase, project_overview_gemini, project_overview_react_three_fiber [EXTRACTED 0.85]
- **Data-Driven Lab Scaling Lever** — context_graph_genlab3d_engine, session_handoff_gen_labs_specs, project_overview_react_three_fiber [EXTRACTED 0.85]
- **Android TWA Delivery Path** — android_plan_pwa, android_spec_twa, android_build_asset_links, index_pwa_shell [EXTRACTED 0.85]

## Communities (20 total, 1 thin omitted)

### Community 0 - "Student UI & Design System"
Cohesion: 0.08
Nodes (35): askSpark(), sparkReact(), SUGGESTIONS, CircuitLab(), CLASS_ORDER, Dashboard(), CATALOG, CIRCUIT_MATERIALS (+27 more)

### Community 1 - "Classroom & Teacher Tools"
Cohesion: 0.11
Nodes (41): addPost(), addRosterEntries(), assignLab(), AssignTab(), ClassDetail(), ClassStream(), computeAiMark(), createClass() (+33 more)

### Community 2 - "Lab Engines & Speech"
Cohesion: 0.11
Nodes (26): gradeLab(), AskSpark(), GenLab3D(), GenLab(), Beaker(), ConicalFlask(), drawClock(), drawMolecule() (+18 more)

### Community 3 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (33): firebase, jspdf-autotable, dependencies, firebase, jspdf-autotable, react, react-dom, @react-three/drei (+25 more)

### Community 4 - "PDF Files & Worksheets"
Cohesion: 0.11
Nodes (31): jspdf, jspdf, LabAssignCard(), PracticalFilePage(), GEN_LABS, buildPracticalFile(), catFor(), coverPage() (+23 more)

### Community 5 - "App Shell & Family Auth"
Cohesion: 0.11
Nodes (25): App(), DEFAULT_STUDENT, homeFor(), InviteParentPage(), writeSubmission(), ensureFamilyCode(), gen(), getChildProgress() (+17 more)

### Community 6 - "Product Concepts (Docs)"
Cohesion: 0.09
Nodes (27): Digital Asset Links (assetlinks.json), Non-Disruption Guarantee, Installable Mobile PWA, Trusted Web Activity (TWA) + Bubblewrap, Data-Driven 3D Lab Engine (genlab3d), Design Token System (C object + CSS vars), PWA App Shell (index.html), Gradebook CSV Export (gradebook.js) (+19 more)

### Community 7 - "3D Item Models"
Cohesion: 0.09
Nodes (8): CoinModel(), metalMat(), NailModel(), PinModel(), RibbonModel(), SHAPES, StripModel(), WireModel()

### Community 8 - "Backend Dependencies"
Cohesion: 0.09
Nodes (21): cors, express, firebase-admin, @google/genai, dependencies, cors, express, firebase-admin (+13 more)

### Community 9 - "3D Lab Stations"
Cohesion: 0.11
Nodes (16): FoodTestStation(), hexLerp(), NeutraliseStation(), RustStation(), BarMagnet(), BurnRig(), ConductivityTester(), GlowRig() (+8 more)

### Community 10 - "Backend Server & Auth"
Cohesion: 0.12
Nodes (12): ALLOWED_ORIGINS, app, buckets, liveSessions, MAX_LIVE_PER_USER, RATE_PER_DAY, RATE_PER_MIN, requireAuth() (+4 more)

### Community 11 - "3D Scene & Textures"
Cohesion: 0.17
Nodes (11): BenchInstruments(), drawClock(), drawMolecule(), drawPeriodicTable(), drawPHScale(), drawSafety(), GlassMaterial(), LabRoom() (+3 more)

### Community 12 - "Live Voice Streaming"
Cohesion: 0.24
Nodes (6): auth, API_BASE, b64ToInt16(), floatTo16kPCM(), LiveVoice, wsURL()

### Community 13 - "API Client Bridge"
Cohesion: 0.33
Nodes (7): API_BASE, authHeader(), generateInsights(), generateWorksheet(), postJSON(), sparkExplain(), InsightsTab()

### Community 14 - "Narration Audio Clips"
Cohesion: 0.25
Nodes (7): faq-0, faq-1, faq-2, faq-3, faq-4, faq-5, faq-6

### Community 15 - "Narration Generation Script"
Cohesion: 0.25
Nodes (5): ai, __dirname, FAQ, manifest, OUT_DIR

### Community 16 - "3D Glassware Models"
Cohesion: 0.33
Nodes (6): Beaker(), ConicalFlask(), GraduatedCylinder(), liquidProps(), CupModel(), DishModel()

## Knowledge Gaps
- **82 isolated node(s):** `name`, `version`, `description`, `private`, `type` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend Dependencies` to `PDF Files & Worksheets`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `C` connect `Student UI & Design System` to `Classroom & Teacher Tools`, `Lab Engines & Speech`, `App Shell & Family Auth`, `3D Item Models`, `3D Lab Stations`, `3D Scene & Textures`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `jspdf` connect `PDF Files & Worksheets` to `Frontend Dependencies`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _82 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Student UI & Design System` be split into smaller, more focused modules?**
  _Cohesion score 0.08243727598566308 - nodes in this community are weakly interconnected._
- **Should `Classroom & Teacher Tools` be split into smaller, more focused modules?**
  _Cohesion score 0.10606060606060606 - nodes in this community are weakly interconnected._
- **Should `Lab Engines & Speech` be split into smaller, more focused modules?**
  _Cohesion score 0.10810810810810811 - nodes in this community are weakly interconnected._