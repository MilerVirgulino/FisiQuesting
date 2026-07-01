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
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase-init";
import { getEconomyConfig } from "./economyService";
import { findBlockedWord } from "../utils/profanityFilter";

export const WALL_MESSAGE_COOLDOWN_MS = 8 * 60 * 60 * 1000;
export const WALL_MESSAGE_MAX_LENGTH = 240;

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getWallCooldownInfo(profile) {
  if (profile?.role === "admin") {
    return { blocked: false, remainingMs: 0, nextAt: 0 };
  }

  const lastSentAt = timestampToMillis(profile?.lastWallMessageAt);
  const nextAt = lastSentAt + WALL_MESSAGE_COOLDOWN_MS;
  const remainingMs = Math.max(0, nextAt - Date.now());
  return { blocked: remainingMs > 0, remainingMs, nextAt };
}

export function formatRemainingCooldown(remainingMs) {
  if (!remainingMs) return "agora";
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}h ${minutes}min`;
  if (hours) return `${hours}h`;
  return `${minutes}min`;
}

export async function listWallMessages({ includeHidden = false, pageSize = 60 } = {}) {
  const snapshot = includeHidden
    ? await getDocs(query(collection(db, "wallMessages"), limit(pageSize)))
    : await getDocs(query(collection(db, "wallMessages"), where("status", "==", "visible"), limit(pageSize)));

  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
}

export async function sendWallMessage({ profile, text }) {
  const cleanText = String(text || "").trim().replace(/\s+/g, " ");
  const blockedWord = findBlockedWord(cleanText);

  if (!cleanText) {
    throw new Error("Escreva um recado antes de enviar.");
  }

  if (cleanText.length > WALL_MESSAGE_MAX_LENGTH) {
    throw new Error(`O recado pode ter no maximo ${WALL_MESSAGE_MAX_LENGTH} caracteres.`);
  }

  if (blockedWord) {
    throw new Error("Esse recado tem uma palavra bloqueada. Reescreva antes de publicar.");
  }

  if (profile?.status !== "approved") {
    throw new Error("Sua conta precisa estar aprovada para publicar recados.");
  }

  const economy = await getEconomyConfig();
  const messageCost = Number(economy.wallMessagePrice || 0);
  const isAdmin = profile?.role === "admin";
  const userRef = doc(db, "users", profile.id);
  const messageRef = doc(collection(db, "wallMessages"));

  return runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const coins = Number(userData.coins || 0);
    const lastSentAt = timestampToMillis(userData.lastWallMessageAt);
    const remainingMs = isAdmin ? 0 : Math.max(0, lastSentAt + WALL_MESSAGE_COOLDOWN_MS - Date.now());

    if (remainingMs > 0) {
      return { sent: false, cooldown: true, remainingMs };
    }

    if (!isAdmin && coins < messageCost) {
      return { sent: false, insufficientCoins: true, coins, messageCost };
    }

    transaction.set(messageRef, {
      authorId: profile.id,
      authorName: profile.nickname || profile.name || "Colega",
      authorRole: profile.role || "student",
      authorGrade: profile.grade || "",
      authorClassName: profile.className || "",
      authorAvatar: profile.avatar || {},
      text: cleanText,
      status: "visible",
      highlighted: isAdmin,
      cost: isAdmin ? 0 : messageCost,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.update(userRef, {
      coins: isAdmin ? coins : coins - messageCost,
      lastWallMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { sent: true, messageId: messageRef.id, coins: isAdmin ? coins : coins - messageCost, messageCost: isAdmin ? 0 : messageCost };
  });
}

export async function setWallMessageStatus(messageId, status) {
  return updateDoc(doc(db, "wallMessages", messageId), {
    status: status === "hidden" ? "hidden" : "visible",
    updatedAt: serverTimestamp()
  });
}

export async function deleteWallMessage(messageId) {
  return deleteDoc(doc(db, "wallMessages", messageId));
}
