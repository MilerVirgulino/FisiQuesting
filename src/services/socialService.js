import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase-init";
import { getAvatarOptions, isFreeAvatarItem, loadAvatarCatalog } from "./avatarCatalogService";
import { getOwnedAvatarItems } from "./avatarShopService";
import { getEconomyConfig } from "./economyService";

export const socialVisibilityOptions = [
  { value: "class", label: "Apenas turma" },
  { value: "grade", label: "Toda a serie" },
  { value: "all", label: "Todos" }
];

const defaultSocialConfig = {
  visibilityScope: "class"
};

export async function getSocialConfig() {
  const snapshot = await getDoc(doc(db, "appConfig", "social"));
  return snapshot.exists() ? { ...defaultSocialConfig, ...snapshot.data() } : defaultSocialConfig;
}

export async function saveSocialConfig(config) {
  return setDoc(
    doc(db, "appConfig", "social"),
    {
      visibilityScope: config.visibilityScope || "class",
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function listSocialStudents() {
  const snapshot = await getDocs(query(collection(db, "users"), orderBy("name", "asc")));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((user) => user.role !== "admin" && user.status === "approved");
}

export function filterStudentsBySocialScope(students, profile, scope) {
  return students
    .filter((student) => student.id !== profile?.id)
    .filter((student) => {
      if (scope === "all") return true;
      if (scope === "grade") return student.grade === profile?.grade;
      return student.grade === profile?.grade && student.className === profile?.className;
    });
}

export async function listEmojiItems(profile) {
  const catalog = await loadAvatarCatalog();
  const ownedItems = getOwnedAvatarItems(profile);
  return getAvatarOptions(catalog, "emojis")
    .filter((item) => item.id !== "emojis_none" && item.source !== "svg")
    .filter((item) => ownedItems.includes(item.id) || isFreeAvatarItem(catalog, "emojis", item.id))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

export async function sendAvatarInteraction({ fromProfile, toUser, emoji }) {
  const economy = await getEconomyConfig();
  const catalog = await loadAvatarCatalog();
  const sendCost = Number(economy.emojiSendPrice || 0);
  const freeEmoji = isFreeAvatarItem(catalog, "emojis", emoji.id);
  const userRef = doc(db, "users", fromProfile.id);
  const interactionRef = doc(collection(db, "avatarInteractions"));

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const coins = Number(userData.coins || 0);
    const ownedItems = Array.isArray(userData.ownedAvatarItems) ? userData.ownedAvatarItems : [];

    if (!ownedItems.includes(emoji.id) && !freeEmoji) {
      return { sent: false, notOwned: true, coins };
    }

    if (coins < sendCost) {
      return { sent: false, insufficientCoins: true, coins, sendCost };
    }

    transaction.update(userRef, {
      coins: coins - sendCost,
      updatedAt: serverTimestamp()
    });

    transaction.set(interactionRef, {
      fromUserId: fromProfile.id,
      fromName: fromProfile.name || "Colega",
      fromGrade: fromProfile.grade || "",
      fromClassName: fromProfile.className || "",
      fromAvatar: fromProfile.avatar || {},
      toUserId: toUser.id,
      toName: toUser.name || "Colega",
      toGrade: toUser.grade || "",
      toClassName: toUser.className || "",
      toAvatar: toUser.avatar || {},
      emojiId: emoji.id,
      emojiLabel: emoji.label,
      emojiSrc: emoji.src,
      sendCost,
      status: "unread",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { sent: true, interactionId: interactionRef.id, coins: coins - sendCost, sendCost };
  });
}

export async function listUserInteractions(userId) {
  const [receivedSnapshot, sentSnapshot] = await Promise.all([
    getDocs(query(
    collection(db, "avatarInteractions"),
    where("toUserId", "==", userId)
    )),
    getDocs(query(
      collection(db, "avatarInteractions"),
      where("fromUserId", "==", userId)
    ))
  ]);

  const byId = new Map();
  [...receivedSnapshot.docs, ...sentSnapshot.docs].forEach((item) => {
    byId.set(item.id, { id: item.id, ...item.data() });
  });

  return [...byId.values()]
    .sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
}

export async function listReceivedInteractions(userId) {
  const snapshot = await getDocs(query(
    collection(db, "avatarInteractions"),
    where("toUserId", "==", userId)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
}

export async function listUnreadInteractionCount(userId) {
  const snapshot = await getDocs(query(
    collection(db, "avatarInteractions"),
    where("toUserId", "==", userId)
  ));
  return snapshot.docs.filter((item) => item.data().status === "unread").length;
}

export async function markInteractionRead(interactionId) {
  return updateDoc(doc(db, "avatarInteractions", interactionId), {
    status: "read",
    readAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
