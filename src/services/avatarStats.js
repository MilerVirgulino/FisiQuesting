import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase-init";
import battleBalance from "../data/battleBalance.json";

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
  const stats = normalizeBattleStats(avatar);
  const maxHp = Math.max(Number(battleBalance.hp.minMaxHp), Number(stats.hp || baseBattleStats.hp));

  return {
    uid: profile?.id,
    name: profile?.name || "Estudante",
    avatar,
    stats,
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
