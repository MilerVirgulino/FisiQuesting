import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase-init";
import { maybeDateKey, toDateKey } from "../utils/date";

export function normalizeClassText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export function normalizeGradeText(value) {
  const text = normalizeClassText(value).toLowerCase();
  const match = text.match(/[1-3]/);
  return match ? `${match[0]} ano` : normalizeClassText(value);
}

export function normalizeClassNameText(value) {
  return normalizeClassText(value).toUpperCase();
}

function gradeAliases(value) {
  const normalized = normalizeGradeText(value);
  const number = normalized.match(/[1-3]/)?.[0];
  if (!number) return [normalized].filter(Boolean);

  return [...new Set([
    normalized,
    number,
    `${number}º ano`,
    `${number}\u00ba ano`,
    `${number}o ano`
  ])];
}

function classNameAliases(value) {
  const normalized = normalizeClassNameText(value);
  return [...new Set([normalized, normalized.toLowerCase()].filter(Boolean))];
}

function isSameGrade(left, right) {
  const leftNumber = normalizeGradeText(left).match(/[1-3]/)?.[0] || "";
  const rightNumber = normalizeGradeText(right).match(/[1-3]/)?.[0] || "";
  return Boolean(leftNumber && rightNumber && leftNumber === rightNumber);
}

function isSameClassName(left, right) {
  return normalizeClassNameText(left) === normalizeClassNameText(right);
}

function isMissionForClass(mission, grade, className) {
  return isSameGrade(mission.targetGrade, grade) && isSameClassName(mission.targetClass, className);
}

function isMissionOpen(mission) {
  const status = String(mission.status || "open").trim().toLowerCase();
  return ["open", "active", "ativa", "aberta"].includes(status);
}

function missionDateInfo(mission, now = new Date()) {
  const today = toDateKey(now);
  const startsAt = maybeDateKey(mission.startsAt);
  const endsAt = maybeDateKey(mission.endsAt);
  const startsInFuture = Boolean(startsAt && today < startsAt);
  const ended = Boolean(endsAt && today > endsAt);

  return {
    today,
    startsAt,
    endsAt,
    inWindow: !startsInFuture && !ended,
    startsInFuture,
    ended
  };
}

export async function listOpenMissionsForClass({ grade, className, includeAllOpen = false }) {
  const normalizedGrade = normalizeGradeText(grade);
  const normalizedClassName = normalizeClassNameText(className);

  const snapshot = await getDocs(collection(db, "weeklyMissions"));
  const allMissions = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const statusMissions = allMissions.filter(isMissionOpen);
  const datedMissions = statusMissions.filter((mission) => isMissionInDateWindow(mission));

  if (includeAllOpen) {
    return sortMissions(datedMissions);
  }

  if (!normalizedGrade || !normalizedClassName) {
    return [];
  }

  return sortMissions(datedMissions.filter((mission) => isMissionForClass(mission, normalizedGrade, normalizedClassName)));
}

export async function listAllMissions() {
  const snapshot = await getDocs(query(collection(db, "weeklyMissions"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function createMission(mission) {
  return addDoc(collection(db, "weeklyMissions"), {
    title: mission.title,
    description: mission.description,
    targetGrade: normalizeGradeText(mission.targetGrade),
    targetClass: normalizeClassNameText(mission.targetClass),
    questionIds: mission.questionIds,
    status: mission.status || "open",
    rewardXp: Number(mission.rewardXp || 0),
    rewardCoins: Number(mission.rewardCoins || 0),
    targetMinutes: Number(mission.targetMinutes || 0),
    startsAt: mission.startsAt || "",
    endsAt: mission.endsAt || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function updateMission(missionId, patch) {
  return updateDoc(doc(db, "weeklyMissions", missionId), {
    ...patch,
    ...(patch.rewardXp !== undefined ? { rewardXp: Number(patch.rewardXp || 0) } : {}),
    ...(patch.rewardCoins !== undefined ? { rewardCoins: Number(patch.rewardCoins || 0) } : {}),
    ...(patch.targetMinutes !== undefined ? { targetMinutes: Number(patch.targetMinutes || 0) } : {}),
    ...(patch.targetGrade !== undefined ? { targetGrade: normalizeGradeText(patch.targetGrade) } : {}),
    ...(patch.targetClass !== undefined ? { targetClass: normalizeClassNameText(patch.targetClass) } : {}),
    updatedAt: serverTimestamp()
  });
}

export function deleteMission(missionId) {
  return deleteDoc(doc(db, "weeklyMissions", missionId));
}

export function isMissionInDateWindow(mission, now = new Date()) {
  return missionDateInfo(mission, now).inWindow;
}

function sortMissions(missions) {
  return missions.sort((a, b) => String(b.createdAt?.seconds || "").localeCompare(String(a.createdAt?.seconds || "")));
}
