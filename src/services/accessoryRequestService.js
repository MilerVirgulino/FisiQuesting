import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase-init";
import { buildAvatarItemFromRequest, clearAvatarCatalogCache } from "./avatarCatalogService";
import { defaultEconomyConfig, getEconomyConfig } from "./economyService";

export const ACCESSORY_REQUEST_PRICE = defaultEconomyConfig.customCreationPrice;
export const ACCESSORY_REQUEST_MAX_BYTES = 450 * 1024;

export async function createAccessoryRequest({ userId, profile, title, description, imageDataUrl, fileName, category = "accessories" }) {
  const userRef = doc(db, "users", userId);
  const requestRef = doc(collection(db, "customAccessoryRequests"));
  const economy = await getEconomyConfig();
  const requestPrice = Number(economy.customCreationPrice || 0);

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const coins = Number(userData.coins || 0);

    if (coins < requestPrice) {
      return { created: false, insufficientCoins: true, coins };
    }

    transaction.update(userRef, {
      coins: coins - requestPrice,
      updatedAt: serverTimestamp()
    });

    transaction.set(requestRef, {
      userId,
      userName: profile?.name || profile?.email || "Aluno",
      userEmail: profile?.email || "",
      grade: profile?.grade || "",
      className: profile?.className || "",
      title: String(title || "").trim(),
      description: String(description || "").trim(),
      imageDataUrl,
      fileName: fileName || "accessory.png",
      category,
      pricePaid: requestPrice,
      status: "pending",
      votes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { created: true, requestId: requestRef.id, coins: coins - requestPrice };
  });
}

export async function listAccessoryRequests() {
  const snapshot = await getDocs(query(collection(db, "customAccessoryRequests"), orderBy("createdAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function updateAccessoryRequestStatus(requestId, status) {
  return updateDoc(doc(db, "customAccessoryRequests", requestId), {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function updateAccessoryRequestDetails(requestId, details) {
  await updateDoc(doc(db, "customAccessoryRequests", requestId), {
    ...details,
    updatedAt: serverTimestamp()
  });
  clearAvatarCatalogCache();
}

export async function approveAccessoryRequestToShop(request, { price, categoryKey }) {
  const published = buildAvatarItemFromRequest(request, { price, categoryKey });
  await updateDoc(doc(db, "customAccessoryRequests", request.id), {
    status: "listed",
    shopItemId: published.itemId,
    shopCategoryKey: published.shopCategoryKey,
    shopCategoryLabel: published.shopCategoryLabel,
    shopFolder: published.shopFolder,
    shopPrice: Number(price || 0),
    updatedAt: serverTimestamp()
  });
  clearAvatarCatalogCache();
  return published;
}

export async function deleteAccessoryRequest(requestId) {
  await deleteDoc(doc(db, "customAccessoryRequests", requestId));
  clearAvatarCatalogCache();
}
