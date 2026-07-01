import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase-init";
import { normalizeAvatarLayerOrder } from "../utils/avatarLayers";
import { baseBattleStats, normalizeBattleStats } from "./avatarStats";

export function saveUserAvatar(userId, avatar) {
  const stats = normalizeBattleStats(avatar);

  return updateDoc(doc(db, "users", userId), {
    avatar: {
      kind: "chibi",
      base: avatar.base || "",
      eyes: avatar.eyes || "eyes_none",
      mouths: avatar.mouths || avatar.mouth || "mouth_none",
      shirts: avatar.shirts || avatar.outfit || "shirt_none",
      pants: avatar.pants || "pants_none",
      shoes: avatar.shoes || "shoes_none",
      hair: avatar.hair || null,
      accessories: avatar.accessories || "accessories_none",
      accessories2: avatar.accessories2 || "accessories_none",
      pets: avatar.pets || "pets_none",
      layerOrder: normalizeAvatarLayerOrder(avatar.layerOrder),
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
