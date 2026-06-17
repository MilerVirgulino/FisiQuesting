import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase-init";

export async function listUsers() {
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function approveUser(userId, patch = {}) {
  return updateDoc(doc(db, "users", userId), {
    ...patch,
    status: "approved",
    updatedAt: serverTimestamp()
  });
}

export function updateUserClass(userId, patch) {
  return updateDoc(doc(db, "users", userId), {
    grade: patch.grade || "",
    className: patch.className || "",
    updatedAt: serverTimestamp()
  });
}

export function rejectUser(userId) {
  return updateDoc(doc(db, "users", userId), {
    status: "rejected",
    updatedAt: serverTimestamp()
  });
}

export function saveAppConfig(config) {
  return setDoc(
    doc(db, "appConfig", "gamification"),
    {
      xpByDifficulty: config.xpByDifficulty,
      levelFormula: config.levelFormula || "120 * level^1.45",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export function createDailyQuest(quest) {
  return addDoc(collection(db, "dailyQuests"), {
    ...quest,
    target: Number(quest.target || 1),
    rewardXp: Number(quest.rewardXp || 0),
    active: Boolean(quest.active),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
