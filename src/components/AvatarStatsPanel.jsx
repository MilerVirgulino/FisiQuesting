import React, { useEffect, useMemo, useState } from "react";
import { Activity, HeartPulse, Shield, Swords, Zap } from "lucide-react";
import {
  getAvailableStatPoints,
  getAvatarLevel,
  normalizeBattleStats,
  saveBattleStats
} from "../services/avatarStats";

const statConfig = [
  { key: "attack", label: "Ataque", icon: Swords },
  { key: "defense", label: "Defesa", icon: Shield },
  { key: "speed", label: "Velocidade", icon: Zap },
  { key: "hp", label: "HP", icon: HeartPulse }
];

export default function AvatarStatsPanel({ userId, profile, onSaved }) {
  const avatar = profile?.avatar || {};
  const initialStats = useMemo(() => normalizeBattleStats(avatar), [avatar]);
  const [stats, setStats] = useState(initialStats);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  const level = getAvatarLevel(profile?.totalXp);
  const originalAvailable = getAvailableStatPoints({ totalXp: profile?.totalXp, avatar });
  const spentNow = statConfig.reduce((total, item) => {
    return total + Math.max(0, Number(stats[item.key]) - Number(initialStats[item.key]));
  }, 0);
  const available = Math.max(0, originalAvailable - spentNow);

  function addPoint(key) {
    if (available <= 0) return;
    setStats((current) => ({
      ...current,
      [key]: Number(current[key]) + 1
    }));
  }

  function removePoint(key) {
    if (Number(stats[key]) <= Number(initialStats[key])) return;
    setStats((current) => ({
      ...current,
      [key]: Number(current[key]) - 1
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveBattleStats(userId, avatar, stats);
      await onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="avatar-note stat-panel">
      <div className="stat-panel-heading">
        <div>
          <strong>Atributos de batalha</strong>
          <p>Nivel {level} · {profile?.totalXp || 0} XP · {available} pontos livres</p>
        </div>
        <Activity size={24} />
      </div>

      <div className="stat-distribution-grid">
        {statConfig.map((item) => {
          const Icon = item.icon;
          return (
            <article className="stat-distribution-item" key={item.key}>
              <Icon size={20} />
              <span>{item.label}</span>
              <strong>{stats[item.key]}</strong>
              <div className="stat-stepper">
                <button type="button" onClick={() => removePoint(item.key)} disabled={stats[item.key] <= initialStats[item.key]}>
                  -
                </button>
                <button type="button" onClick={() => addPoint(item.key)} disabled={available <= 0}>
                  +
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <button type="button" onClick={handleSave} disabled={saving || spentNow <= 0}>
        {saving ? "Salvando..." : "Salvar atributos"}
      </button>
    </section>
  );
}
