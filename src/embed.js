/* ── Embed mode helpers ──
   The Android Flutter app hosts each 3D lab inside a WebView. When the URL
   contains `?embed=1&labId=<id>`, we:
     • skip the landing/login screens and jump straight into the lab,
     • hide the app chrome (top nav, side voice HUD, exit chrome),
     • forward onExit / onComplete / askSpark to the native shell via
       `window.LabSparkBridge.emit(...)`.
*/
export function readEmbed() {
  const params = new URLSearchParams(window.location.search);
  const on = params.get("embed") === "1";
  return {
    on,
    labId: params.get("labId") || "",
    hideChrome: params.get("hideChrome") === "1",
  };
}

let ready = false;
export function emit(payload) {
  try {
    // flutter_inappwebview injects a bridge object at load time
    if (window.LabSparkBridge && typeof window.LabSparkBridge.emit === "function") {
      window.LabSparkBridge.emit(payload);
      return;
    }
    // Fallback for older InAppWebView versions
    if (window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === "function") {
      window.flutter_inappwebview.callHandler("lab", payload);
    }
  } catch (e) {
    // Not embedded — just log; the web-only build is fine.
    console.warn("[embed] emit failed", e);
  }
}

export function markReady() {
  if (ready) return;
  ready = true;
  emit({ type: "ready" });
}

export function reportProgress(progress) {
  emit({ type: "progress", ...progress });
}

export function reportComplete(results) {
  emit({ type: "complete", ...results });
}

export function reportExit() {
  emit({ type: "exit" });
}

/* Toggle a global CSS class so the stylesheet can hide chrome. */
export function applyEmbedBodyClass(embed) {
  if (typeof document === "undefined") return;
  if (embed.on) document.body.classList.add("embed-mode");
  else document.body.classList.remove("embed-mode");
}
