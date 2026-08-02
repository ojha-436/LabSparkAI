/* ── Auto-generated worksheet + answer key (PDF) ──
   Turns a lab spec (+ optional AI-generated questions) into a printable practice
   worksheet for students and a separate answer key for the teacher. Pure
   client-side (jsPDF) → ₹0 marginal cost. Works fully offline from the spec;
   AI questions (mcqs/short) are layered on when available. */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const INK = [15, 23, 42];
const SUB = [100, 116, 139];
const GREEN = [13, 148, 136];
const LINE = [203, 213, 225];

const letter = (i) => String.fromCharCode(65 + i);

function head(doc, spec, tag) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 16, "F");
  doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(11);
  doc.text("LabSpark AI", 14, 10.5);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(186, 230, 253);
  doc.text(tag, W - 14, 10.5, { align: "right" });
}

function titleBlock(doc, spec, subtitle) {
  const W = doc.internal.pageSize.getWidth();
  let y = 26;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...GREEN);
  doc.text(`${(spec.cls || "").toUpperCase()} · ${(spec.subject || "").toUpperCase()}`, 14, y); y += 7;
  doc.setFontSize(16).setTextColor(...INK);
  doc.text(doc.splitTextToSize(spec.title || "Practice Worksheet", W - 28), 14, y); y += 7;
  if (spec.chapter) { doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...SUB); doc.text(spec.chapter, 14, y); y += 6; }
  doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(...SUB);
  doc.text(subtitle, 14, y); y += 6;
  return y;
}

function fieldRow(doc, y) {
  const W = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...LINE).setLineWidth(0.3);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...SUB);
  doc.text("Name: ______________________________", 14, y);
  doc.text("Roll No: ___________", W / 2 + 20, y);
  doc.text("Date: ____________", W - 14, y, { align: "right" });
  return y + 8;
}

/* Build the multi-question worksheet. `extra` = { mcqs:[{q,options,ans}], short:[{q,a}] } or null. */
export function buildWorksheet(spec, extra) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const cats = spec.categories || [];
  const catLabel = (key) => { const c = cats.find((c) => c.key === key); return c ? c.label : key; };
  const mcqs = (extra && Array.isArray(extra.mcqs)) ? extra.mcqs : [];
  const shorts = (extra && Array.isArray(extra.short)) ? extra.short : [];

  // ── Student worksheet ──
  head(doc, spec, "Practice Worksheet");
  let y = titleBlock(doc, spec, `Aim: ${spec.aim || ""}`);
  y = fieldRow(doc, y + 2);

  // Section A — Classification
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
  doc.text("A. Classify each item", 14, y); y += 3;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...SUB);
  doc.text(`Write the correct group for each item. Groups: ${cats.map((c) => c.label).join(" / ")}`, 14, y + 4);
  autoTable(doc, {
    startY: y + 8, margin: { left: 14, right: 14 }, theme: "grid",
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 10, cellPadding: 3, lineColor: LINE, textColor: INK, minCellHeight: 9 },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 70 } },
    head: [["#", "Item", "Your answer"]],
    body: (spec.items || []).map((it, i) => [i + 1, it.name, ""]),
  });
  y = doc.lastAutoTable.finalY + 10;

  // Section B — MCQ (spec viva + AI mcqs)
  const allMcq = [];
  if (spec.question) allMcq.push({ q: spec.question.q, options: spec.question.options, ans: spec.question.ans });
  mcqs.forEach((m) => allMcq.push(m));
  if (allMcq.length) {
    if (y > 240) { doc.addPage(); head(doc, spec, "Practice Worksheet"); y = 26; }
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
    doc.text("B. Multiple choice — circle the correct answer", 14, y); y += 8;
    allMcq.forEach((m, i) => {
      if (y > 265) { doc.addPage(); head(doc, spec, "Practice Worksheet"); y = 26; }
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...INK);
      const q = doc.splitTextToSize(`${i + 1}. ${m.q}`, W - 28);
      doc.text(q, 14, y); y += q.length * 5 + 1;
      doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...SUB);
      (m.options || []).forEach((o, oi) => {
        const line = doc.splitTextToSize(`${letter(oi)}. ${o}`, W - 40);
        doc.text(line, 20, y); y += line.length * 5;
      });
      y += 3;
    });
  }

  // Section C — Short answer
  if (shorts.length) {
    if (y > 250) { doc.addPage(); head(doc, spec, "Practice Worksheet"); y = 26; }
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
    doc.text("C. Short answer", 14, y); y += 8;
    shorts.forEach((s, i) => {
      if (y > 262) { doc.addPage(); head(doc, spec, "Practice Worksheet"); y = 26; }
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...INK);
      const q = doc.splitTextToSize(`${i + 1}. ${s.q}`, W - 28);
      doc.text(q, 14, y); y += q.length * 5 + 2;
      doc.setDrawColor(...LINE).setLineWidth(0.2);
      doc.line(14, y, W - 14, y); y += 6; doc.line(14, y, W - 14, y); y += 8;
    });
  }

  // ── Answer key (teacher) ──
  doc.addPage();
  head(doc, spec, "Answer Key · Teacher");
  let ky = titleBlock(doc, spec, "Answer key — for teacher use");
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
  doc.text("A. Classification answers", 14, ky); ky += 2;
  autoTable(doc, {
    startY: ky + 3, margin: { left: 14, right: 14 }, theme: "grid",
    headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontSize: 9 },
    styles: { fontSize: 10, cellPadding: 2.5, lineColor: LINE, textColor: INK },
    columnStyles: { 0: { cellWidth: 10 } },
    head: [["#", "Item", "Correct group"]],
    body: (spec.items || []).map((it, i) => [i + 1, it.name, catLabel(it.category)]),
  });
  ky = doc.lastAutoTable.finalY + 8;

  if (allMcq.length) {
    if (ky > 250) { doc.addPage(); head(doc, spec, "Answer Key · Teacher"); ky = 26; }
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
    doc.text("B. MCQ answers", 14, ky); ky += 7;
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...INK);
    allMcq.forEach((m, i) => {
      if (ky > 275) { doc.addPage(); head(doc, spec, "Answer Key · Teacher"); ky = 26; }
      const ans = (m.options && typeof m.ans === "number") ? `${letter(m.ans)}. ${m.options[m.ans]}` : "—";
      const line = doc.splitTextToSize(`${i + 1}. ${ans}`, W - 28);
      doc.text(line, 14, ky); ky += line.length * 5 + 1;
    });
    ky += 4;
  }
  if (shorts.length) {
    if (ky > 250) { doc.addPage(); head(doc, spec, "Answer Key · Teacher"); ky = 26; }
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...INK);
    doc.text("C. Short-answer model answers", 14, ky); ky += 7;
    shorts.forEach((s, i) => {
      if (ky > 265) { doc.addPage(); head(doc, spec, "Answer Key · Teacher"); ky = 26; }
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...INK);
      const q = doc.splitTextToSize(`${i + 1}. ${s.q}`, W - 28); doc.text(q, 14, ky); ky += q.length * 5;
      doc.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...SUB);
      const a = doc.splitTextToSize(s.a || "", W - 28); doc.text(a, 14, ky); ky += a.length * 4.6 + 4;
    });
  }
  return doc;
}

const safe = (s) => (s || "worksheet").replace(/[^a-z0-9]+/gi, "_").slice(0, 40);

export function downloadWorksheet(spec, extra) {
  const doc = buildWorksheet(spec, extra);
  doc.save(`Worksheet_${safe(spec.title)}.pdf`);
}
