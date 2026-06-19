import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../firebase-init";
import { normalizeClassNameText, normalizeGradeText } from "./missionService";

export async function listUsers() {
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listMissionAttempts() {
  const snapshot = await getDocs(collection(db, "missionAttempts"));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function approveUser(userId, patch = {}) {
  return updateDoc(doc(db, "users", userId), {
    ...patch,
    ...(patch.grade !== undefined ? { grade: normalizeGradeText(patch.grade) } : {}),
    ...(patch.className !== undefined ? { className: normalizeClassNameText(patch.className) } : {}),
    status: "approved",
    updatedAt: serverTimestamp()
  });
}

export function updateUserClass(userId, patch) {
  return updateDoc(doc(db, "users", userId), {
    grade: normalizeGradeText(patch.grade),
    className: normalizeClassNameText(patch.className),
    updatedAt: serverTimestamp()
  });
}

export function updateUserProfile(userId, patch) {
  return updateDoc(doc(db, "users", userId), {
    name: String(patch.name || "").trim(),
    email: String(patch.email || "").trim(),
    grade: normalizeGradeText(patch.grade),
    className: normalizeClassNameText(patch.className),
    status: patch.status || "pending",
    updatedAt: serverTimestamp()
  });
}

export function deleteUserProfile(userId) {
  return deleteDoc(doc(db, "users", userId));
}

export function sendUserPasswordReset(email) {
  return sendPasswordResetEmail(auth, email);
}

export function awardUserReward(userId, reward) {
  return updateDoc(doc(db, "users", userId), {
    totalXp: increment(Number(reward.xp || 0)),
    coins: increment(Number(reward.coins || 0)),
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
