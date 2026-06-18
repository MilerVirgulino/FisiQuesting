import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase-init";
import battleBalance from "../data/battleBalance.json";
import { getPetCarePenalty } from "./petCareService";

export const baseBattleStats = battleBalance.baseStats;

export function getAvatarLevel(totalXp = 0) {
  return Math.max(1, Math.floor(Number(totalXp || 0) / 100) + 1);
}

export function normalizeBattleStats(avatar = {}) {
  return {
    attack: Number(avatar.attack ?? avatar.power ?? baseBattleStats.attack),
    defense: Number(avatar.defense ?? baseBattleStats.defense),
    speed: Number(avatar.speed ?? baseBattleStats.speed),
    hp: Number(avatar.hp ?? avatar.energy ?? baseBattleStats.hp)
  };
}

function roundByConfig(value, mode) {
  if (mode === "ceil") return Math.ceil(value);
  if (mode === "floor") return Math.floor(value);
  return Math.round(value);
}

export function getEffectiveBattleStats(stats = {}) {
  const allocatedStats = {
    ...baseBattleStats,
    ...stats
  };

  return Object.entries(baseBattleStats).reduce((effective, [key, baseValue]) => {
    const perPoint = Number(battleBalance.statScaling.stats[key]?.perPoint ?? 1);
    const investedPoints = Math.max(0, Number(allocatedStats[key] || baseValue) - Number(baseValue));
    const rawValue = Number(baseValue) + investedPoints * perPoint;

    return {
      ...effective,
      [key]: Math.max(1, roundByConfig(rawValue, battleBalance.statScaling.rounding))
    };
  }, {});
}

export function getSpentStatPoints(avatar = {}) {
  const stats = normalizeBattleStats(avatar);
  return Object.entries(baseBattleStats).reduce((total, [key, baseValue]) => {
    return total + Math.max(0, Number(stats[key] || 0) - baseValue);
  }, 0);
}

export function getAvailableStatPoints({ totalXp = 0, avatar = {} }) {
  const level = getAvatarLevel(totalXp);
  return Math.max(0, (level - 1) * 3 - getSpentStatPoints(avatar));
}

export function getBattleProfile(profile) {
  const avatar = profile?.avatar || {};
  const allocatedStats = normalizeBattleStats(avatar);
  const effectiveStats = getEffectiveBattleStats(allocatedStats);
  const penalty = getPetCarePenalty(profile?.petCare);
  const battleStats = {
    ...effectiveStats,
    attack: Math.max(1, Math.round(effectiveStats.attack * Number(penalty.damageMultiplier))),
    speed: Math.max(1, Math.round(effectiveStats.speed * Number(penalty.speedMultiplier)))
  };
  const maxHp = Math.max(Number(battleBalance.hp.minMaxHp), Number(effectiveStats.hp || baseBattleStats.hp));

  return {
    uid: profile?.id,
    name: profile?.name || "Estudante",
    avatar,
    stats: battleStats,
    baseStats: allocatedStats,
    effectiveStats,
    penalty,
    level: getAvatarLevel(profile?.totalXp),
    maxHp,
    hp: maxHp
  };
}

export function saveBattleStats(userId, avatar, stats) {
  return updateDoc(doc(db, "users", userId), {
    "avatar.attack": Number(stats.attack),
    "avatar.defense": Number(stats.defense),
    "avatar.speed": Number(stats.speed),
    "avatar.hp": Number(stats.hp),
    "avatar.power": Number(stats.attack),
    "avatar.energy": Number(stats.hp),
    "avatar.updatedAt": serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
