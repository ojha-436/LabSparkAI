/* ── Live two-way voice client (Gemini Live API via the backend relay) ──
   - Captures mic audio, downsamples to 16 kHz PCM16, streams over WebSocket.
   - Receives 24 kHz PCM16 audio frames and plays them back gap-free.
   - Surfaces live input/output transcriptions as captions.
   Everything degrades safely: any failure calls onState('error'). */

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8787").replace(/\/$/, "");

function wsURL(experiment) {
  const base = API_BASE.replace(/^http/, "ws");
  return `${base}/api/live?experiment=${encodeURIComponent(experiment || "science lab")}`;
}

function floatTo16kPCM(float32, inRate) {
  // resample to 16000 Hz (linear) then convert to Int16
  const outRate = 16000;
  const ratio = inRate / outRate;
  const outLen = Math.floor(float32.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, float32.length - 1);
    const s = float32[i0] + (float32[i1] - float32[i0]) * (idx - i0);
    out[i] = Math.max(-1, Math.min(1, s)) * 0x7fff;
  }
  return out;
}

function b64ToInt16(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

export class LiveVoice {
  constructor({ experiment, onState, onCaption }) {
    this.experiment = experiment;
    this.onState = onState || (() => {});
    this.onCaption = onCaption || (() => {});
    this.ws = null;
    this.micCtx = null;
    this.playCtx = null;
    this.stream = null;
    this.processor = null;
    this.source = null;
    this.nextStart = 0;
    this.sources = new Set();
    this.stopped = false;
  }

  async start() {
    this.onState("connecting");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      this.onState("error", "Microphone permission denied");
      return;
    }

    this.playCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    this.nextStart = 0;

    this.ws = new WebSocket(wsURL(this.experiment));
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {};
    this.ws.onerror = () => { if (!this.stopped) this.onState("error", "Connection error"); };
    this.ws.onclose = () => { if (!this.stopped) this.onState("closed"); };
    this.ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.type === "ready") { this._startMic(); this.onState("listening"); }
      else if (m.type === "audio") { this._playChunk(m.data); this.onState("speaking"); }
      else if (m.type === "out") this.onCaption("spark", m.text);
      else if (m.type === "in") this.onCaption("you", m.text);
      else if (m.type === "interrupted") this._flush();
      else if (m.type === "turn") this.onState("listening");
      else if (m.type === "error") this.onState("error", m.message);
    };
  }

  _startMic() {
    this.micCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.source = this.micCtx.createMediaStreamSource(this.stream);
    this.processor = this.micCtx.createScriptProcessor(2048, 1, 1);
    this.source.connect(this.processor);
    this.processor.connect(this.micCtx.destination); // required in some browsers to fire
    const inRate = this.micCtx.sampleRate;
    this.processor.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== 1) return;
      const pcm = floatTo16kPCM(e.inputBuffer.getChannelData(0), inRate);
      this.ws.send(pcm.buffer);
    };
  }

  _playChunk(b64) {
    if (!this.playCtx) return;
    const int16 = b64ToInt16(b64);
    if (!int16.length) return;
    const buf = this.playCtx.createBuffer(1, int16.length, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 0x8000;
    const src = this.playCtx.createBufferSource();
    src.buffer = buf;
    src.connect(this.playCtx.destination);
    const now = this.playCtx.currentTime;
    this.nextStart = Math.max(this.nextStart, now);
    src.start(this.nextStart);
    this.nextStart += buf.duration;
    this.sources.add(src);
    src.onended = () => this.sources.delete(src);
  }

  _flush() {
    // model was interrupted (barge-in) — drop queued audio
    for (const s of this.sources) { try { s.stop(); } catch (e) {} }
    this.sources.clear();
    this.nextStart = 0;
  }

  stop() {
    this.stopped = true;
    try { this.processor && (this.processor.onaudioprocess = null); } catch (e) {}
    try { this.source && this.source.disconnect(); } catch (e) {}
    try { this.processor && this.processor.disconnect(); } catch (e) {}
    try { this.stream && this.stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    try { this.micCtx && this.micCtx.close(); } catch (e) {}
    this._flush();
    try { this.playCtx && this.playCtx.close(); } catch (e) {}
    try { this.ws && this.ws.send(JSON.stringify({ type: "end" })); } catch (e) {}
    try { this.ws && this.ws.close(); } catch (e) {}
    this.onState("closed");
  }
}
