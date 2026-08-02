/* ── Gradebook CSV export ──
   One row per student × lab, with correctness, inquiry (prediction) accuracy and
   the marks a school pastes into its internal-assessment / report-card system.
   Pure client-side → ₹0 marginal cost. */
import { computeAiMark } from "./classroom.js";

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/* students: [{ name, rollNo, subs: [submission…] }] (as built in the teacher dashboard). */
export function downloadGradebookCSV(cls, students) {
  const header = ["Roll", "Student", "Lab", "Correct", "Total", "Prediction Accuracy", "AI Mark", "Teacher Mark", "Final Mark", "Max", "Approved", "Date"];
  const rows = [header];

  (students || []).forEach((st) => {
    (st.subs || []).forEach((s) => {
      const aiMark = typeof s.aiMark === "number" ? s.aiMark : computeAiMark(s);
      const max = s.aiMarkMax || 5;
      const finalMark = typeof s.teacherMark === "number" ? s.teacherMark : aiMark;
      rows.push([
        st.rollNo || "", st.name || "", s.title || s.labId || "",
        s.correct ?? "", s.total ?? "",
        typeof s.predictionAccuracy === "number" ? Math.round(s.predictionAccuracy * 100) + "%" : "",
        aiMark, typeof s.teacherMark === "number" ? s.teacherMark : "", finalMark, max,
        s.marksApproved ? "yes" : "no", s.date || "",
      ]);
    });
  });

  const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Gradebook_${(cls.className || "class").replace(/[^a-z0-9]+/gi, "_")}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
