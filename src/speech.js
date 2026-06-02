/* ── Shared speech helpers (zero ongoing API cost) ──
   speak():   plays a pre-generated voice clip if one exists for the given
              clipKey (consistent "Spark" voice, ₹0), else falls back to the
              browser's built-in SpeechSynthesis (also free, on-device).
   recognizeOnce(): free on-device speech-to-text via the Web Speech API.
   This is what makes the guided narration + "Ask Spark" essentially free. */

let clipManifest = null; // { clipKey: "/narration/<file>.wav" }

export async function loadClipManifest() {
  if (clipManifest !== null) return clipManifest;
  try {
    const r = await fetch("/narration/manifest.json", { cache: "force-cache" });
    clipManifest = r.ok ? await r.json() : {};
  } catch {
    clipManifest = {};
  }
  return clipManifest;
}

let current = null;
export function cancelSpeech() {
  try { window.speechSynthesis.cancel(); } catch (e) {}
  if (current && current.pause) { try { current.pause(); } catch (e) {} }
  current = null;
}

function speakTTS(text, onStart, onEnd) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.96; u.pitch = 1.02;
    const vcs = window.speechSynthesis.getVoices();
    const pref =
      vcs.find((v) => v.lang.includes("en-IN")) ||
      vcs.find((v) => v.lang.includes("en-GB")) ||
      vcs.find((v) => v.lang.includes("en-US")) ||
      vcs.find((v) => v.lang.startsWith("en")) ||
      vcs[0];
    if (pref) u.voice = pref;
    u.onstart = () => onStart && onStart();
    u.onend = () => onEnd && onEnd();
    u.onerror = () => onEnd && onEnd();
    window.speechSynthesis.speak(u);
  } catch (e) {
    onStart && onStart();
    setTimeout(() => onEnd && onEnd(), 1500);
  }
}

export function speak(text, { clipKey, onStart, onEnd } = {}) {
  cancelSpeech();
  const url = clipKey && clipManifest && clipManifest[clipKey];
  if (url) {
    const a = new Audio(url);
    current = a;
    a.onplay = () => onStart && onStart();
    a.onended = () => { if (current === a) current = null; onEnd && onEnd(); };
    a.onerror = () => speakTTS(text, onStart, onEnd);
    a.play().catch(() => speakTTS(text, onStart, onEnd));
    return;
  }
  speakTTS(text, onStart, onEnd);
}

export function recognitionSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/* One-shot speech-to-text. Returns the recognizer (call .stop() to cancel). */
export function recognizeOnce({ onResult, onError, onEnd } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { onError && onError("not-supported"); return null; }
  const r = new SR();
  r.lang = "en-IN";
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.continuous = false;
  r.onresult = (e) => onResult && onResult(e.results[0][0].transcript);
  r.onerror = (e) => onError && onError(e.error || "error");
  r.onend = () => onEnd && onEnd();
  try { r.start(); } catch (e) { onError && onError("start-failed"); }
  return r;
}
