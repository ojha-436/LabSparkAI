/* One-time TTS generation of Spark's voice clips for the most-repeated lines
   (the FAQ answers). Output: ../public/narration/<key>.wav + manifest.json.
   The frontend speech.js plays these clips when present (consistent voice, ₹0),
   and falls back to free browser TTS otherwise.
   Run from server/:  node --env-file=.env generate-narration.mjs */
import { GoogleGenAI } from "@google/genai";
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "narration");
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const VOICE = process.env.GEMINI_TTS_VOICE || "Kore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Must match SPARK_QA order in src/spark.jsx (clipKeys faq-0..faq-N).
const FAQ = [
  "Litmus is a natural dye made from lichens. It's an indicator that changes colour to tell us if something is an acid or a base. Blue litmus turns red in acid; red litmus turns blue in a base.",
  "Acids taste sour, like lemon, and turn blue litmus red. Their pH is below 7. Never taste lab chemicals though — that's what indicators are for!",
  "Bases feel slippery and taste bitter. They turn red litmus blue and have a pH above 7. Soap and baking soda are common bases.",
  "Neutral substances are neither acid nor base. Their pH is exactly 7, like pure water and salt water. Litmus paper doesn't change colour in them.",
  "The pH scale runs from 0 to 14. Below 7 is acid, exactly 7 is neutral, and above 7 is a base. The further from 7, the stronger it is!",
  "The dye molecules in litmus have a different shape in acids versus bases, and each shape reflects light differently, so we see a different colour. Clever chemistry!",
  "Pick up a litmus strip from the tray and dip it into a test tube. Watch what colour it becomes, then I'll help you figure out if it's an acid, base, or neutral.",
];

function pcmToWav(pcmBuf, sampleRate = 24000, channels = 1, bits = 16) {
  const byteRate = (sampleRate * channels * bits) / 8;
  const blockAlign = (channels * bits) / 8;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcmBuf.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcmBuf.length, 40);
  return Buffer.concat([header, pcmBuf]);
}

async function tts(text) {
  const resp = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    },
  });
  const b64 = resp?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (!b64) throw new Error("no audio in response");
  return Buffer.from(b64, "base64");
}

mkdirSync(OUT_DIR, { recursive: true });
const manifest = {};
for (let i = 0; i < FAQ.length; i++) {
  const key = `faq-${i}`;
  process.stdout.write(`generating ${key}… `);
  try {
    const pcm = await tts(FAQ[i]);
    writeFileSync(join(OUT_DIR, `${key}.wav`), pcmToWav(pcm));
    manifest[key] = `/narration/${key}.wav`;
    console.log("ok");
  } catch (e) {
    console.log("FAILED:", (e?.message || e).toString().slice(0, 120));
  }
}
writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`\nDone. ${Object.keys(manifest).length}/${FAQ.length} clips. Manifest → public/narration/manifest.json`);
process.exit(0);
