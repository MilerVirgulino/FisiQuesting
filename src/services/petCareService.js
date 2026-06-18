import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import petCareBalance from "../data/petCareBalance.json";
import { db } from "../firebase-init";

const minuteMs = 60 * 1000;

export const petCareConfig = petCareBalance;

function clampEnergy(value) {
  return Math.max(
    petCareBalance.energy.min,
    Math.min(petCareBalance.energy.max, Number(value || 0))
  );
}

function timestampToMs(value) {
  if (!value) return Date.now();
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export function getPetCareState(petCare = {}, now = Date.now()) {
  const savedEnergy = Number(petCare.energy ?? petCareBalance.energy.initial);
  const updatedAtMs = timestampToMs(petCare.updatedAt);
  const elapsedMinutes = Math.max(0, Math.floor((now - updatedAtMs) / minuteMs));
  const decaySteps = Math.floor(elapsedMinutes / petCareBalance.energy.decayEveryMinutes);
  const energyLost = decaySteps * petCareBalance.energy.decayAmount;
  const energy = clampEnergy(savedEnergy - energyLost);

  return {
    energy,
    maxEnergy: petCareBalance.energy.max,
    updatedAtMs,
    energyLost,
    battleCost: petCareBalance.energy.battleCost,
    minimumToBattle: petCareBalance.energy.minimumToBattle,
    canBattle: energy >= petCareBalance.energy.minimumToBattle
  };
}

export function getPetCarePenalty(petCare = {}, now = Date.now()) {
  const state = getPetCareState(petCare, now);
  const penalty = petCareBalance.penalties.find((item) => state.energy >= item.minEnergy)
    || petCareBalance.penalties[petCareBalance.penalties.length - 1];

  return {
    ...penalty,
    damagePenaltyPercent: Math.round((1 - Number(penalty.damageMultiplier)) * 100),
    speedPenaltyPercent: Math.round((1 - Number(penalty.speedMultiplier)) * 100),
    state
  };
}

export function getFoodItems() {
  return petCareBalance.foods;
}

export async function feedPet({ userId, foodId }) {
  const food = petCareBalance.foods.find((item) => item.id === foodId);
  if (!food) throw new Error("Comida nao encontrada.");

  const userRef = doc(db, "users", userId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const profile = snapshot.exists() ? snapshot.data() : {};
    const coins = Number(profile.coins || 0);

    if (coins < food.price) {
      return { fed: false, insufficientCoins: true, coins };
    }

    const current = getPetCareState(profile.petCare);
    const nextEnergy = clampEnergy(current.energy + food.energy);

    transaction.update(userRef, {
      coins: coins - food.price,
      petCare: {
        energy: nextEnergy,
        updatedAt: serverTimestamp(),
        lastFoodId: food.id
      },
      updatedAt: serverTimestamp()
    });

    return { fed: true, coins: coins - food.price, energy: nextEnergy };
  });
}

export async function consumeBattleEnergy(userId) {
  const userRef = doc(db, "users", userId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const profile = snapshot.exists() ? snapshot.data() : {};
    const current = getPetCareState(profile.petCare);

    if (!current.canBattle) {
      return { consumed: false, insufficientEnergy: true, energy: current.energy };
    }

    const nextEnergy = clampEnergy(current.energy - petCareBalance.energy.battleCost);

    transaction.update(userRef, {
      petCare: {
        energy: nextEnergy,
        updatedAt: serverTimestamp(),
        lastBattleAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    return { consumed: true, energy: nextEnergy };
  });
}
