import React, { useEffect, useMemo, useState } from "react";
import AdminClassViewControl from "../components/AdminClassViewControl.jsx";
import AvatarPreview from "../components/AvatarPreview.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import QuestList from "../components/QuestList.jsx";
import StatCard from "../components/StatCard.jsx";
import { listDailyQuests } from "../services/progressService";
import { useAuth } from "../services/authService.jsx";
import { getRankingUserProfiles, getWeeklyRankingConfig } from "../services/analyticsService";
import { getEffectiveClassProfile, readAdminClassView } from "../services/adminViewService";
import { loadAvatarCatalog } from "../services/avatarCatalogService";
import { getLevelInfo } from "../utils/levels";

function rankingMatchesProfile(ranking, profile) {
  if (!ranking || ranking.published === false) return false;
  const audience = ranking.audience || {};
  const gradeMatches = !audience.grade || audience.grade === profile?.grade;
  const classMatches = !audience.className || audience.className === profile?.className;
  return gradeMatches && classMatches;
}

function getRankingAudienceLabel(ranking) {
  const audience = ranking?.audience || {};
  if (audience.grade && audience.className) return `${audience.grade} / ${audience.className}`;
  if (audience.grade) return audience.grade;
  return "Geral";
}

function getRankingSlices(config) {
  if (!config?.published) return [];
  const slices = Array.isArray(config.rankings) && config.rankings.length
    ? config.rankings
    : (Array.isArray(config.entries) && config.entries.length ? [config] : []);

  return slices.filter((ranking) => ranking?.published !== false && Array.isArray(ranking.entries) && ranking.entries.length);
}

function hydrateRankingAvatars(rankings, profiles) {
  const profilesById = new Map(profiles.map((student) => [student.id, student]));
  return rankings.map((ranking) => ({
    ...ranking,
    entries: ranking.entries.map((entry) => ({
      ...entry,
      avatar: profilesById.get(entry.userId)?.avatar || entry.avatar
    }))
  }));
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const [quests, setQuests] = useState([]);
  const [weeklyRanking, setWeeklyRanking] = useState(null);
  const [avatarCatalog, setAvatarCatalog] = useState(null);
  const [rankingProfiles, setRankingProfiles] = useState([]);
  const [adminClassView, setAdminClassView] = useState(() => readAdminClassView());
  const levelInfo = getLevelInfo(profile?.totalXp || 0);
  const accuracy = profile?.solvedCount ? Math.round(((profile.correctCount || 0) / profile.solvedCount) * 100) : 0;
  const classProfile = getEffectiveClassProfile(profile, adminClassView);
  const visibleWeeklyRankings = useMemo(
    () => hydrateRankingAvatars(
      getRankingSlices(weeklyRanking).filter((ranking) => rankingMatchesProfile(ranking, classProfile)),
      rankingProfiles
    ),
    [weeklyRanking, classProfile, rankingProfiles]
  );

  useEffect(() => {
    listDailyQuests().then(setQuests).catch(console.error);
    getWeeklyRankingConfig()
      .then(async (config) => {
        setWeeklyRanking(config);
        const userIds = getRankingSlices(config).flatMap((ranking) => ranking.entries.map((entry) => entry.userId));
        if (userIds.length) {
          setRankingProfiles(await getRankingUserProfiles(userIds));
        }
      })
      .catch(console.error);
    loadAvatarCatalog().then(setAvatarCatalog).catch(console.error);
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

      {profile?.role === "admin" && (
        <div className="dashboard-ranking-view-control">
          <AdminClassViewControl
            value={adminClassView}
            onChange={setAdminClassView}
            label="Rankings vistos como professor desta turma"
          />
        </div>
      )}

      {visibleWeeklyRankings.map((ranking) => {
        const myRankingEntry = ranking.entries?.find((entry) => entry.userId === profile?.id);

        return (
          <section className="student-weekly-ranking" key={ranking.id || `${ranking.weekKey}-${getRankingAudienceLabel(ranking)}`}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Ranking semanal</p>
                <h2>{ranking.title || "Ranking semanal"}</h2>
                <span>{ranking.weekLabel || "Semana atual"} - {getRankingAudienceLabel(ranking)}</span>
              </div>
              {myRankingEntry ? <strong>Seu lugar: #{myRankingEntry.position}</strong> : <strong>{getRankingAudienceLabel(ranking)}</strong>}
            </div>
            <div className="student-ranking-list">
              {ranking.entries.map((entry) => (
                <article className={entry.userId === profile?.id ? "active" : ""} key={entry.userId}>
                  <b>{entry.position}</b>
                  <AvatarPreview avatar={entry.avatar} size={46} catalog={avatarCatalog} />
                  <div className="student-ranking-info">
                    <strong>{entry.name}</strong>
                    <span>Nivel {entry.level || 1} - {entry.grade} / {entry.className}</span>
                  </div>
                  <small>{entry.weeklyXp} XP - {entry.weeklyAccuracy}% acerto</small>
                </article>
              ))}
            </div>
          </section>
        );
      })}
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
