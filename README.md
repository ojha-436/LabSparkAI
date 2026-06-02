# LabSpark AI

AI-first virtual science laboratory for NCERT Class 6–10 Physics & Chemistry.
"Spark" is a **real Gemini-powered** Socratic tutor that reacts to what the
student does in the sandbox and grades their practical.

## Architecture

```
React + Vite (this repo root)  ──HTTPS──>  Cloud Run backend (server/)  ──>  Gemini API
        │                                          (holds GEMINI_API_KEY)
        └── Firebase Auth + Firestore (student progress)
```

- **Frontend** (`/src`): Vite + React, deployed to Firebase Hosting (`dist/`).
- **Backend** (`/server`): Express + `@google/genai`, deployed to Cloud Run.
  The Gemini key lives only here — never shipped to the browser.
- **Spark calls degrade gracefully**: if the backend is unreachable, the UI
  falls back to built-in canned responses so it still works offline.

## 1. Local development

### Backend (Gemini)
```bash
cd server
npm install
cp .env.example .env        # then paste your Gemini API key into .env
npm run dev                 # http://localhost:8787  (uses node --env-file=.env)
```
Get a key from Google AI Studio (https://aistudio.google.com/apikey).

### Frontend
```bash
npm install
cp .env.example .env.local  # VITE_API_BASE defaults to http://localhost:8787
npm run dev                 # http://localhost:5173
```

## 2. Deploy the backend to Cloud Run
```bash
cd server
gcloud run deploy labspark-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY,GEMINI_MODEL=gemini-2.5-flash
```
Copy the printed service URL.

## 3. Deploy the frontend to Firebase Hosting
```bash
# point the frontend at the deployed backend:
echo "VITE_API_BASE=https://YOUR-CLOUD-RUN-URL" > .env.production.local
npm run build
firebase deploy --only hosting
```

## 4. Firestore
Rules (`firestore.rules`) let each signed-in student read/write only their own
`users/{uid}` progress document. Deploy them with:
```bash
firebase deploy --only firestore:rules
```

## Backend endpoints
| Method | Path | Purpose |
| --- | --- | --- |
| GET  | `/health` | Liveness + whether Gemini is configured |
| POST | `/api/spark/ask` | Free-form question, grounded in lab context |
| POST | `/api/spark/react` | Short spoken reaction to a sandbox action |
| POST | `/api/grade` | Conceptual grading + feedback for a completed lab |

## Status vs. PRD
Done: real Gemini tutor + grader, Vite build, Cloud Run backend, Firestore
progress persistence, secured rules.
Not yet (later phases): two-way live voice (Gemini Live API), payments
(Stripe/Razorpay) + investor dashboard, the 4 remaining labs, Vertex AI Search
RAG grounding. The billing UI in the dashboard is still mock display only.
