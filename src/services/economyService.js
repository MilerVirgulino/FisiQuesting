import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase-init";

export const defaultEconomyConfig = {
  avatarItemPrice: 25,
  customCreationPrice: 150,
  emojiSendPrice: 5,
  showcaseSlotPrice: 200
};

export async function getEconomyConfig() {
  const snapshot = await getDoc(doc(db, "appConfig", "economy"));
  return snapshot.exists() ? { ...defaultEconomyConfig, ...snapshot.data() } : defaultEconomyConfig;
}

export async function saveEconomyConfig(config) {
  return setDoc(
    doc(db, "appConfig", "economy"),
    {
      avatarItemPrice: Number(config.avatarItemPrice || 0),
      customCreationPrice: Number(config.customCreationPrice || 0),
      emojiSendPrice: Number(config.emojiSendPrice || 0),
      showcaseSlotPrice: Number(config.showcaseSlotPrice || 0),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
