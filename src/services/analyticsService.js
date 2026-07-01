import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase-init";

export const defaultWeeklyRankingConfig = {
  published: false,
  title: "Ranking semanal",
  weekKey: "",
  weekLabel: "",
  audience: {
    grade: "",
    className: ""
  },
  entries: [],
  rankings: []
};

function normalizeRankingSlice(ranking) {
  return {
    title: ranking?.title || defaultWeeklyRankingConfig.title,
    weekKey: ranking?.weekKey || "",
    weekLabel: ranking?.weekLabel || "",
    limit: Number(ranking?.limit || 5),
    published: ranking?.published !== false,
    audience: {
      ...defaultWeeklyRankingConfig.audience,
      ...(ranking?.audience || {})
    },
    entries: Array.isArray(ranking?.entries) ? ranking.entries : [],
    id: ranking?.id || ""
  };
}

export async function getWeeklyRankingConfig() {
  const snapshot = await getDoc(doc(db, "appConfig", "weeklyRanking"));
  if (!snapshot.exists()) return defaultWeeklyRankingConfig;
  const data = snapshot.data();
  const fallbackRanking = normalizeRankingSlice(data);
  const rankings = Array.isArray(data.rankings)
    ? data.rankings.map(normalizeRankingSlice).filter((ranking) => ranking.entries.length)
    : [];

  return {
    ...defaultWeeklyRankingConfig,
    ...data,
    audience: {
      ...defaultWeeklyRankingConfig.audience,
      ...(data.audience || {})
    },
    entries: Array.isArray(data.entries) ? data.entries : [],
    rankings: rankings.length ? rankings : (fallbackRanking.entries.length ? [fallbackRanking] : [])
  };
}

export function saveWeeklyRankingConfig(config) {
  return setDoc(
    doc(db, "appConfig", "weeklyRanking"),
    {
      ...defaultWeeklyRankingConfig,
      ...config,
      audience: {
        ...defaultWeeklyRankingConfig.audience,
        ...(config.audience || {})
      },
      entries: Array.isArray(config.entries) ? config.entries : [],
      rankings: Array.isArray(config.rankings) ? config.rankings.map(normalizeRankingSlice) : [],
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export function deleteWeeklyRankingConfig() {
  return deleteDoc(doc(db, "appConfig", "weeklyRanking"));
}

export async function getRankingUserProfiles(userIds) {
  const uniqueIds = [...new Set((userIds || []).filter(Boolean))];
  const snapshots = await Promise.all(uniqueIds.map((userId) => getDoc(doc(db, "users", userId))));
  return snapshots
    .filter((snapshot) => snapshot.exists())
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
}
