import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase-init";
import {
  defaultAvatar,
  getAvatarCategories,
  getAvatarOption,
  getAvatarOptions,
  isFreeAvatarItem,
  loadAvatarCatalog
} from "./avatarCatalogService";
import { getOwnedAvatarItems, userOwnsAvatarItem } from "./avatarShopService";
import { getEconomyConfig } from "./economyService";
import { normalizeAvatarLayerOrder } from "../utils/avatarLayers";

export const FREE_SHOWCASE_SLOTS = 1;
export const MAX_SHOWCASE_SLOTS = 8;

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getShowcaseSlotCount(profile) {
  return Math.max(FREE_SHOWCASE_SLOTS, Number(profile?.showcaseSlots || FREE_SHOWCASE_SLOTS));
}

function normalizeShowcaseAvatar(avatar, catalog, profile) {
  const normalized = {
    ...defaultAvatar,
    ...(avatar || {}),
    kind: "chibi",
    layerOrder: normalizeAvatarLayerOrder(avatar?.layerOrder)
  };

  getAvatarCategories(catalog).forEach((category) => {
    const options = getAvatarOptions(catalog, category)
      .filter((option) => userOwnsAvatarItem(profile, category.key, option.id, catalog));
    const current = normalized[category.key];
    if (!options.some((option) => option.id === current)) {
      normalized[category.key] = options[0]?.id || defaultAvatar[category.key] || "";
    }
  });

  if (!userOwnsAvatarItem(profile, "accessories", normalized.accessories2, catalog)) {
    normalized.accessories2 = defaultAvatar.accessories2;
  }

  return normalized;
}

function buildItemCredits(equippedItems, catalog) {
  return Object.entries(equippedItems || {}).reduce((credits, [categoryKey, itemId]) => {
    const lookupCategoryKey = categoryKey === "accessories2" ? "accessories" : categoryKey;
    const item = getAvatarOption(catalog, lookupCategoryKey, itemId);
    if (!item || item.source === "svg") return credits;

    credits[categoryKey] = {
      itemId,
      label: item.label || itemId,
      creatorId: item.creatorId || "",
      creatorName: item.creatorName || "criador aprovado",
      categoryKey: lookupCategoryKey,
      categoryLabel: categoryKey === "accessories2" ? "Acessorio extra" : item.categoryLabel || lookupCategoryKey
    };
    return credits;
  }, {});
}

export function getOwnedOptionsByCategory(profile, catalog) {
  return getAvatarCategories(catalog).map((category) => ({
    category,
    options: getAvatarOptions(catalog, category)
      .filter((option) => userOwnsAvatarItem(profile, category.key, option.id, catalog))
  }));
}

export async function buildInitialShowcaseAvatar(profile, currentAvatar = null) {
  const catalog = await loadAvatarCatalog();
  return normalizeShowcaseAvatar(currentAvatar || profile?.avatar || {}, catalog, profile);
}

export async function listMyShowcaseLooks(userId) {
  const snapshot = await getDocs(query(
    collection(db, "showcaseLooks"),
    where("ownerId", "==", userId)
  ));

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => Number(a.slotIndex || 0) - Number(b.slotIndex || 0));
}

export async function listPublishedShowcaseLooks({ pageSize = 60 } = {}) {
  const snapshot = await getDocs(query(
    collection(db, "showcaseLooks"),
    where("status", "==", "published"),
    where("hidden", "==", false),
    limit(pageSize)
  ));

  return sortLooksByDate(
    snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
  );
}

export async function listMyFotonizationIds(userId, looks) {
  const entries = await Promise.all(
    looks.map(async (look) => {
      const snapshot = await getDoc(doc(db, "showcaseLooks", look.id, "fotonizations", userId));
      return snapshot.exists() ? look.id : null;
    })
  );
  return new Set(entries.filter(Boolean));
}

export async function listShowcaseNotifications(userId) {
  const snapshot = await getDocs(query(
    collection(db, "showcaseNotifications"),
    where("toUserId", "==", userId),
    limit(20)
  ));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
}

export async function markShowcaseNotificationsRead(notifications) {
  const unreadNotifications = notifications.filter((notification) => notification.status === "unread");
  if (!unreadNotifications.length) return;

  const batch = writeBatch(db);
  unreadNotifications.forEach((notification) => {
    batch.update(doc(db, "showcaseNotifications", notification.id), {
      status: "read",
      readAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
}

export async function saveShowcaseLook({ profile, lookId, slotIndex, name, status, equippedItems }) {
  if (profile?.status !== "approved") {
    throw new Error("Sua conta precisa estar aprovada para salvar looks na Vitrine.");
  }

  const catalog = await loadAvatarCatalog();
  const slotCount = getShowcaseSlotCount(profile);
  const normalizedSlot = Number(slotIndex);

  if (!Number.isInteger(normalizedSlot) || normalizedSlot < 0 || normalizedSlot >= slotCount) {
    throw new Error("Espaco de manequim indisponivel.");
  }

  const normalizedAvatar = normalizeShowcaseAvatar(equippedItems, catalog, profile);
  const ownedItems = getOwnedAvatarItems(profile);
  const invalidItem = getAvatarCategories(catalog).find((category) => {
    const itemId = normalizedAvatar[category.key];
    return itemId && !isFreeAvatarItem(catalog, category.key, itemId) && !ownedItems.includes(itemId) && category.key !== "base";
  });
  const invalidAccessory2 = normalizedAvatar.accessories2
    && !isFreeAvatarItem(catalog, "accessories", normalizedAvatar.accessories2)
    && !ownedItems.includes(normalizedAvatar.accessories2);

  if (invalidItem || invalidAccessory2) {
    throw new Error("O look contem item que ainda nao pertence ao aluno.");
  }

  const payload = {
    ownerId: profile.id,
    ownerNickname: profile.nickname || profile.name || "Colega",
    ownerRole: profile.role || "student",
    ownerGrade: profile.grade || "",
    ownerClassName: profile.className || "",
    name: String(name || "Look da Vitrine").trim(),
    slotIndex: normalizedSlot,
    status: status === "published" ? "published" : "draft",
    hidden: false,
    equippedItems: normalizedAvatar,
    itemCredits: buildItemCredits(normalizedAvatar, catalog),
    updatedAt: serverTimestamp()
  };

  if (lookId) {
    await updateDoc(doc(db, "showcaseLooks", lookId), payload);
    return lookId;
  }

  const lookRef = doc(collection(db, "showcaseLooks"));
  await setDoc(lookRef, {
    ...payload,
    fotonizationCount: 0,
    createdAt: serverTimestamp()
  });
  return lookRef.id;
}

export async function deleteShowcaseLook(lookId) {
  await deleteDoc(doc(db, "showcaseLooks", lookId));
}

export async function setShowcaseLookStatus(lookId, status) {
  await updateDoc(doc(db, "showcaseLooks", lookId), {
    status: status === "published" ? "published" : "draft",
    updatedAt: serverTimestamp()
  });
}

export async function setShowcaseLookHidden({ lookId, hidden, adminId = "" }) {
  await updateDoc(doc(db, "showcaseLooks", lookId), {
    hidden: Boolean(hidden),
    hiddenAt: hidden ? serverTimestamp() : null,
    hiddenBy: hidden ? adminId : "",
    updatedAt: serverTimestamp()
  });
}

export async function buyShowcaseSlot(userId) {
  const economy = await getEconomyConfig();
  const price = Number(economy.showcaseSlotPrice || 0);
  const userRef = doc(db, "users", userId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const profile = snapshot.exists() ? snapshot.data() : {};
    const coins = Number(profile.coins || 0);
    const currentSlots = getShowcaseSlotCount(profile);

    if (currentSlots >= MAX_SHOWCASE_SLOTS) {
      return { purchased: false, maxReached: true, coins, slots: currentSlots };
    }

    if (coins < price) {
      return { purchased: false, insufficientCoins: true, coins, price, slots: currentSlots };
    }

    transaction.update(userRef, {
      coins: coins - price,
      showcaseSlots: currentSlots + 1,
      updatedAt: serverTimestamp()
    });

    return { purchased: true, coins: coins - price, price, slots: currentSlots + 1 };
  });
}

export async function toggleFotonization({ look, profile, active }) {
  if (look.ownerId === profile.id) {
    return { changed: false, ownLook: true };
  }

  const lookRef = doc(db, "showcaseLooks", look.id);
  const fotonizationRef = doc(db, "showcaseLooks", look.id, "fotonizations", profile.id);
  const notificationRef = doc(collection(db, "showcaseNotifications"));

  return runTransaction(db, async (transaction) => {
    const [lookSnapshot, fotonizationSnapshot] = await Promise.all([
      transaction.get(lookRef),
      transaction.get(fotonizationRef)
    ]);

    if (!lookSnapshot.exists()) {
      throw new Error("Look nao encontrado.");
    }

    const lookData = lookSnapshot.data();
    if (lookData.ownerId === profile.id) {
      return { changed: false, ownLook: true };
    }

    if (active && fotonizationSnapshot.exists()) {
      transaction.delete(fotonizationRef);
      transaction.update(lookRef, {
        fotonizationCount: increment(-1),
        updatedAt: serverTimestamp()
      });
      return { changed: true, active: false };
    }

    if (!active && !fotonizationSnapshot.exists()) {
      transaction.set(fotonizationRef, {
        userId: profile.id,
        userNickname: profile.nickname || profile.name || "Colega",
        createdAt: serverTimestamp()
      });
      transaction.update(lookRef, {
        fotonizationCount: increment(1),
        updatedAt: serverTimestamp()
      });
      transaction.set(notificationRef, {
        type: "fotonization",
        toUserId: lookData.ownerId,
        fromUserId: profile.id,
        fromNickname: profile.nickname || profile.name || "Colega",
        lookId: look.id,
        lookName: lookData.name || "Look",
        message: `${profile.nickname || profile.name || "Colega"} fotonizou seu look "${lookData.name || "Look"}".`,
        status: "unread",
        createdAt: serverTimestamp()
      });
      return { changed: true, active: true };
    }

    return { changed: false, active };
  });
}

export function sortLooksByDate(looks) {
  return [...looks].sort((a, b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt));
}
