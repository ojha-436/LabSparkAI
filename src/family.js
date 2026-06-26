/* ── Family layer: links a parent to their child and exposes a read-only
   progress mirror the parent can see (the student never shares write access). */
import firebase, { db } from "./firebaseInit.js";

const AB = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function gen() { let s = ""; for (let i = 0; i < 6; i++) s += AB[Math.floor(Math.random() * AB.length)]; return s; }
const uid = () => firebase.auth().currentUser && firebase.auth().currentUser.uid;

/* Ensure the student has a shareable family code (and its lookup doc). Returns the code. */
export async function ensureFamilyCode(student) {
  const u = uid();
  if (!u) return null;
  if (student.familyCode) {
    db.collection("familyCodes").doc(student.familyCode).set({ studentUid: u, studentName: student.name || "Student" }, { merge: true }).catch(() => {});
    return student.familyCode;
  }
  let code = gen();
  for (let i = 0; i < 5; i++) {
    const ref = db.collection("familyCodes").doc(code);
    const snap = await ref.get();
    if (!snap.exists) { await ref.set({ studentUid: u, studentName: student.name || "Student" }); return code; }
    code = gen();
  }
  throw new Error("Could not allocate a family code, please try again.");
}

/* Write/refresh the parent-readable progress mirror for the signed-in student. */
export async function writeStudentMirror(student) {
  const u = uid();
  if (!u) return;
  await db.collection("students").doc(u).set({
    studentUid: u, name: student.name || "Student", klass: student.klass || "", school: student.school || "", rollNo: student.rollNo || "",
    xp: student.xp || 0, level: student.level || 1, done: student.done || 0, streak: student.streak || 1,
    completions: (student.completions || []).map((c) => ({ id: c.id, name: c.name, date: c.date, correct: c.correct, total: c.total })),
    updatedAt: Date.now(),
  }, { merge: true }).catch(() => {});
}

/* Parent links to a child by entering the student's family code. Returns {studentUid, name}. */
export async function linkChild(code, parent) {
  const u = uid();
  if (!u) throw new Error("Please sign in first.");
  code = (code || "").toUpperCase().trim();
  const snap = await db.collection("familyCodes").doc(code).get();
  if (!snap.exists) throw new Error("No student found with that family code. Ask your child for the code on their dashboard.");
  const { studentUid, studentName } = snap.data();
  await db.collection("students").doc(studentUid).collection("guardians").doc(u).set({
    parentUid: u, parentName: parent.name || "Parent", studentUid, code, linkedAt: Date.now(),
  });
  return { studentUid, name: studentName || "My child" };
}

/* Read a linked child's progress mirror (parent side). */
export async function getChildProgress(studentUid) {
  const snap = await db.collection("students").doc(studentUid).get();
  return snap.exists ? snap.data() : null;
}
