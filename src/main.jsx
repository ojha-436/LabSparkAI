/* ── Vite entry point ── */
import "./index.css";
import "./firebaseInit.js";
import { createRoot } from "react-dom/client";
import { App } from "./app.jsx";

createRoot(document.getElementById("root")).render(<App />);
