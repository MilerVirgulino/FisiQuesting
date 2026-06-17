import React, { useEffect, useState } from "react";
import ProgressBar from "../components/ProgressBar.jsx";
import QuestList from "../components/QuestList.jsx";
import StatCard from "../components/StatCard.jsx";
import { listDailyQuests } from "../services/progressService";
import { useAuth } from "../services/authService.jsx";
import { getLevelInfo } from "../utils/levels";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [quests, setQuests] = useState([]);
  const levelInfo = getLevelInfo(profile?.totalXp || 0);
  const accuracy = profile?.solvedCount ? Math.round(((profile.correctCount || 0) / profile.solvedCount) * 100) : 0;

  useEffect(() => {
    listDailyQuests().then(setQuests).catch(console.error);
  }, []);

  return (
    <section className="page-stack">
      <div className="hero-band">
        <div>
          <p className="eyebrow">Nível {levelInfo.level}</p>
          <h2>{profile?.name}, mantenha sua sequência de Física.</h2>
        </div>
        <strong>{profile?.totalXp || 0} XP</strong>
      </div>

      <ProgressBar value={levelInfo.progress} label={`Progresso para o nível ${levelInfo.level + 1}`} />

      <div className="stats-grid">
        <StatCard label="Questões resolvidas" value={profile?.solvedCount || 0} />
        <StatCard label="Taxa de acerto" value={`${accuracy}%`} />
        <StatCard label="Acertos" value={profile?.correctCount || 0} />
        <StatCard label="Maior sequência" value={profile?.bestStreak || 0} />
      </div>

      <section>
        <div className="section-heading">
          <h2>Quests diárias</h2>
          <span>Renovam a cada dia</span>
        </div>
        <QuestList quests={quests} />
      </section>
    </section>
  );
}
