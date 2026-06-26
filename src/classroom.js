/* ── Classroom data layer (teacher ↔ student via a join code) ──
   Model (Firestore):
     classes/{CODE}                          { code, teacherUid, teacherName, className, school, grade, subject, createdAt }
     classes/{CODE}/members/{studentUid}      { studentUid, teacherUid, name, rollNo, joinedAt }
     classes/{CODE}/submissions/{uid__labId}  { studentUid, teacherUid, name, rollNo, labId, title, correct, total, xp, date, observations, ... }
   `teacherUid` is denormalised onto member/submission docs so security rules can
   authorise teacher reads WITHOUT a get() (scales to a whole class); writes are
   still get()-validated against the real class teacher to prevent spoofing. */
import firebase, { db } from "./firebaseInit.js";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I/L
function genCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export async function createClass({ teacherUid, teacherName, className, school, grade, subject }) {
  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const ref = db.collection("classes").doc(code);
    const snap = await ref.get();
    if (!snap.exists) {
      const data = {
        code, teacherUid, teacherName: teacherName || "Teacher",
        className: className || "My Class", school: school || "", grade: grade || "", subject: subject || "",
        createdAt: Date.now(),
      };
      await ref.set(data);
      return data;
    }
    code = genCode();
  }
  throw new Error("Could not allocate a class code, please try again.");
}

export async function listMyClasses(teacherUid) {
  const q = await db.collection("classes").where("teacherUid", "==", teacherUid).get();
  return q.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function getClass(code) {
  const snap = await db.collection("classes").doc((code || "").toUpperCase().trim()).get();
  return snap.exists ? snap.data() : null;
}

/* Student joins a class. Returns the membership record to store on the student doc. */
export async function joinClass(code, student) {
  const cls = await getClass(code);
  if (!cls) throw new Error("No class found with that code. Check the code with your teacher.");
  const uid = firebase.auth().currentUser && firebase.auth().currentUser.uid;
  if (!uid) throw new Error("Please sign in first.");
  await db.collection("classes").doc(cls.code).collection("members").doc(uid).set({
    studentUid: uid, teacherUid: cls.teacherUid,
    name: student.name || "Student", rollNo: student.rollNo || "", joinedAt: Date.now(),
  });
  return { code: cls.code, className: cls.className, teacherUid: cls.teacherUid, school: cls.school, grade: cls.grade };
}

// Firestore "rules are not filters": the teacher read rule authorises by
// resource.data.teacherUid, so the query MUST filter by teacherUid == my uid.
const myUid = () => (firebase.auth().currentUser && firebase.auth().currentUser.uid) || "__none__";
const teacherMembers = (code) => db.collection("classes").doc(code).collection("members").where("teacherUid", "==", myUid());
const teacherSubs = (code) => db.collection("classes").doc(code).collection("submissions").where("teacherUid", "==", myUid());

export async function getRoster(code) {
  const q = await teacherMembers(code).get();
  return q.docs.map((d) => d.data());
}

export async function getSubmissions(code) {
  const q = await teacherSubs(code).get();
  return q.docs.map((d) => d.data());
}

/* Live listeners — return an unsubscribe fn. Teacher dashboards use these so a
   student joining / submitting / posting shows up in real time. */
export function watchRoster(code, cb) {
  return teacherMembers(code).onSnapshot((q) => cb(q.docs.map((d) => d.data())), () => {});
}
export function watchSubmissions(code, cb) {
  return teacherSubs(code).onSnapshot((q) => cb(q.docs.map((d) => d.data())), () => {});
}
export function watchPosts(code, cb) {
  return db.collection("classes").doc(code).collection("posts").onSnapshot(
    (q) => cb(q.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))),
    () => {}
  );
}

/* Post to a class stream — an announcement (teacher) or a message (student). */
export async function addPost(code, { authorUid, authorName, authorRole, type, text }) {
  await db.collection("classes").doc(code).collection("posts").add({
    authorUid, authorName: authorName || "User", authorRole: authorRole || "student",
    type: type || "post", text: (text || "").slice(0, 2000), createdAt: Date.now(),
  });
}

/* Mirror a completed lab into a class the student has joined (called per membership). */
export async function writeSubmission(membership, student, completion) {
  const uid = firebase.auth().currentUser && firebase.auth().currentUser.uid;
  if (!uid || !membership || !membership.code) return;
  const labId = completion.experimentId || completion.id;
  await db.collection("classes").doc(membership.code).collection("submissions").doc(`${uid}__${labId}`).set({
    studentUid: uid, teacherUid: membership.teacherUid,
    name: student.name || "Student", rollNo: student.rollNo || "",
    labId, title: completion.name || completion.title || labId,
    correct: completion.correct ?? null, total: completion.total ?? null, xp: completion.xp ?? 0,
    date: completion.date || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    observations: completion.observations || [], conclusion: completion.conclusion || "",
    aim: completion.aim || "", chapter: completion.chapter || "", cls: completion.cls || "", subject: completion.subject || "",
  }, { merge: true });
}
