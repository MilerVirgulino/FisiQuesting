import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase-init";
import { baseBattleStats, normalizeBattleStats } from "./avatarStats";

export function saveUserAvatar(userId, avatar) {
  const stats = normalizeBattleStats(avatar);

  return updateDoc(doc(db, "users", userId), {
    avatar: {
      kind: "egg",
      base: avatar.base || "egg_plain",
      eyes: avatar.eyes || "eyes_dot",
      mouth: avatar.mouth || "mouth_smile",
      outfit: avatar.outfit || "outfit_none",
      hair: avatar.hair || null,
      accessories: avatar.accessories || "accessories_none",
      colors: avatar.colors || {},
      level: Number(avatar.level || 1),
      attack: Number(stats.attack || baseBattleStats.attack),
      defense: Number(stats.defense || baseBattleStats.defense),
      speed: Number(stats.speed || baseBattleStats.speed),
      hp: Number(stats.hp || baseBattleStats.hp),
      power: Number(stats.attack || baseBattleStats.attack),
      energy: Number(stats.hp || baseBattleStats.hp),
      wins: Number(avatar.wins || 0),
      losses: Number(avatar.losses || 0),
      updatedAt: serverTimestamp()
    },
    updatedAt: serverTimestamp()
  });
}
