import { arrayUnion, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase-init";
import { getAvatarItemPrice, isFreeAvatarItem } from "../data/avatarItems";

export function getOwnedAvatarItems(profile) {
  return Array.isArray(profile?.ownedAvatarItems) ? profile.ownedAvatarItems : [];
}

export function userOwnsAvatarItem(profile, categoryKey, itemId) {
  return isFreeAvatarItem(categoryKey, itemId) || getOwnedAvatarItems(profile).includes(itemId);
}

export async function buyAvatarItem({ userId, categoryKey, itemId }) {
  const price = getAvatarItemPrice(categoryKey, itemId);

  if (price <= 0) {
    return { purchased: false, free: true };
  }

  const userRef = doc(db, "users", userId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const profile = snapshot.exists() ? snapshot.data() : {};
    const ownedAvatarItems = Array.isArray(profile.ownedAvatarItems) ? profile.ownedAvatarItems : [];

    if (ownedAvatarItems.includes(itemId)) {
      return { purchased: false, alreadyOwned: true, coins: Number(profile.coins || 0) };
    }

    const coins = Number(profile.coins || 0);
    if (coins < price) {
      return { purchased: false, insufficientCoins: true, coins };
    }

    transaction.update(userRef, {
      coins: coins - price,
      ownedAvatarItems: arrayUnion(itemId),
      updatedAt: serverTimestamp()
    });

    return { purchased: true, coins: coins - price };
  });
}
