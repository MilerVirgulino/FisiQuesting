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

export async function listOpenMissionsForClass({ grade, className }) {
  if (!grade || !className) return [];

  const snapshot = await getDocs(
    query(
      collection(db, "weeklyMissions"),
      where("status", "==", "open"),
      where("targetGrade", "==", grade),
      where("targetClass", "==", className)
    )
  );

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => String(b.createdAt?.seconds || "").localeCompare(String(a.createdAt?.seconds || "")));
}

export async function listAllMissions() {
  const snapshot = await getDocs(query(collection(db, "weeklyMissions"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function createMission(mission) {
  return addDoc(collection(db, "weeklyMissions"), {
    title: mission.title,
    description: mission.description,
    targetGrade: mission.targetGrade,
    targetClass: mission.targetClass,
    questionIds: mission.questionIds,
    status: mission.status || "open",
    rewardXp: Number(mission.rewardXp || 0),
    startsAt: mission.startsAt || "",
    endsAt: mission.endsAt || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export function updateMission(missionId, patch) {
  return updateDoc(doc(db, "weeklyMissions", missionId), {
    ...patch,
    updatedAt: serverTimestamp()
  });
}
