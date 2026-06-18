import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase-init";

export function normalizeClassText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

export async function listOpenMissionsForClass({ grade, className, includeAllOpen = false }) {
  const normalizedGrade = normalizeClassText(grade);
  const normalizedClassName = normalizeClassText(className);

  if (includeAllOpen) {
    const snapshot = await getDocs(
      query(
        collection(db, "weeklyMissions"),
        where("status", "==", "open")
      )
    );

    return sortMissions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
  }

  if (!normalizedGrade || !normalizedClassName) return [];

  const snapshot = await getDocs(
    query(
      collection(db, "weeklyMissions"),
      where("status", "==", "open"),
      where("targetGrade", "==", normalizedGrade),
      where("targetClass", "==", normalizedClassName)
    )
  );

  return sortMissions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function listAllMissions() {
  const snapshot = await getDocs(query(collection(db, "weeklyMissions"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function createMission(mission) {
  return addDoc(collection(db, "weeklyMissions"), {
    title: mission.title,
    description: mission.description,
    targetGrade: normalizeClassText(mission.targetGrade),
    targetClass: normalizeClassText(mission.targetClass),
    questionIds: mission.questionIds,
    status: mission.status || "open",
    rewardXp: Number(mission.rewardXp || 0),
    rewardCoins: Number(mission.rewardCoins || 0),
    startsAt: mission.startsAt || "",
    endsAt: mission.endsAt || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function updateMission(missionId, patch) {
  return updateDoc(doc(db, "weeklyMissions", missionId), {
    ...patch,
    ...(patch.targetGrade !== undefined ? { targetGrade: normalizeClassText(patch.targetGrade) } : {}),
    ...(patch.targetClass !== undefined ? { targetClass: normalizeClassText(patch.targetClass) } : {}),
    updatedAt: serverTimestamp()
  });
}

function sortMissions(missions) {
  return missions.sort((a, b) => String(b.createdAt?.seconds || "").localeCompare(String(a.createdAt?.seconds || "")));
}
