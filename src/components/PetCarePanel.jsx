import React, { useMemo, useState } from "react";
import { Apple, BatteryMedium, Utensils } from "lucide-react";
import { feedPet, getFoodItems, getPetCarePenalty } from "../services/petCareService";

export default function PetCarePanel({ userId, profile, onSaved }) {
  const [buyingFoodId, setBuyingFoodId] = useState("");
  const [message, setMessage] = useState("");
  const penalty = useMemo(() => getPetCarePenalty(profile?.petCare), [profile?.petCare]);
  const { state } = penalty;
  const foods = getFoodItems();
  const energyPercent = Math.round((state.energy / state.maxEnergy) * 100);
  const coins = Number(profile?.coins || 0);

  async function handleFeed(foodId) {
    setMessage("");
    setBuyingFoodId(foodId);
    try {
      const result = await feedPet({ userId, foodId });
      if (result.insufficientCoins) {
        setMessage("Moedas insuficientes para comprar essa comida.");
        return;
      }
      await onSaved?.();
      setMessage("Personagem alimentado.");
    } finally {
      setBuyingFoodId("");
    }
  }

  return (
    <section className="avatar-note pet-care-panel">
      <div className="stat-panel-heading">
        <div>
          <strong>Energia do personagem</strong>
          <p>{penalty.label} · {state.energy}/{state.maxEnergy}</p>
        </div>
        <BatteryMedium size={24} />
      </div>

      <div className="pet-energy-track" aria-label={`Energia ${state.energy} de ${state.maxEnergy}`}>
        <span style={{ width: `${energyPercent}%` }} />
      </div>

      <div className="pet-penalty-card">
        <Utensils size={20} />
        <div>
          <strong>{penalty.description}</strong>
          <span>
            {penalty.damagePenaltyPercent > 0 || penalty.speedPenaltyPercent > 0
              ? `Penalidade: -${penalty.damagePenaltyPercent}% dano, -${penalty.speedPenaltyPercent}% velocidade.`
              : "Sem reducao de desempenho em batalha."}
          </span>
          <small>Batalha custa {state.battleCost} energia. Minimo para batalhar: {state.minimumToBattle}.</small>
        </div>
      </div>

      <div className="food-shop-grid">
        {foods.map((food) => (
          <article className="food-card" key={food.id}>
            <Apple size={22} />
            <div>
              <strong>{food.label}</strong>
              <span>{food.description}</span>
              <small>+{food.energy} energia · {food.price} moedas</small>
            </div>
            <button
              type="button"
              disabled={buyingFoodId === food.id || coins < food.price || state.energy >= state.maxEnergy}
              onClick={() => handleFeed(food.id)}
            >
              {buyingFoodId === food.id ? "Comprando..." : "Comprar"}
            </button>
          </article>
        ))}
      </div>

      {message && <p className="muted">{message}</p>}
    </section>
  );
}
