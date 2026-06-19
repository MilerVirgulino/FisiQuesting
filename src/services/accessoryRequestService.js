import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase-init";

export const ACCESSORY_REQUEST_PRICE = 150;
export const ACCESSORY_REQUEST_MAX_BYTES = 450 * 1024;

export async function createAccessoryRequest({ userId, profile, title, description, imageDataUrl, fileName }) {
  const userRef = doc(db, "users", userId);
  const requestRef = doc(collection(db, "customAccessoryRequests"));

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const coins = Number(userData.coins || 0);

    if (coins < ACCESSORY_REQUEST_PRICE) {
      return { created: false, insufficientCoins: true, coins };
    }

    transaction.update(userRef, {
      coins: coins - ACCESSORY_REQUEST_PRICE,
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
      category: "accessories",
      pricePaid: ACCESSORY_REQUEST_PRICE,
      status: "pending",
      votes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { created: true, requestId: requestRef.id, coins: coins - ACCESSORY_REQUEST_PRICE };
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
