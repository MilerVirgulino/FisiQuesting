import React from "react";
import { HeartPulse, Shield, Sparkles, Swords, Zap } from "lucide-react";
import AvatarEditor from "../components/AvatarEditor.jsx";
import AvatarStatsPanel from "../components/AvatarStatsPanel.jsx";
import { getAvatarLevel, normalizeBattleStats } from "../services/avatarStats";
import { useAuth } from "../services/authService.jsx";

export default function AvatarPage() {
  const { firebaseUser, profile, refreshProfile } = useAuth();
  const avatar = profile?.avatar || {
    level: 1,
    attack: 10,
    defense: 8,
    speed: 6,
    hp: 10,
    wins: 0,
    losses: 0
  };
  const stats = normalizeBattleStats(avatar);
  const level = getAvatarLevel(profile?.totalXp);

  return (
    <section className="page-stack">
      <div className="avatar-hero">
        <div>
          <p className="eyebrow">Avatar chibi</p>
          <h2>Personalize seu personagem de batalha.</h2>
          <span>Missoes rendem XP, moedas e pontos para batalha.</span>
        </div>
        <div className="coin-balance">
          <Sparkles size={24} />
          <strong>{profile?.coins || 0}</strong>
          <span>moedas</span>
        </div>
      </div>

      <AvatarEditor userId={firebaseUser.uid} profile={profile} onSaved={refreshProfile} />
      <AvatarStatsPanel userId={firebaseUser.uid} profile={profile} onSaved={refreshProfile} />

      <section className="avatar-stats">
        <article>
          <Sparkles size={22} />
          <span>Nivel</span>
          <strong>{level}</strong>
        </article>
        <article>
          <Swords size={22} />
          <span>Ataque</span>
          <strong>{stats.attack}</strong>
        </article>
        <article>
          <Shield size={22} />
          <span>Defesa</span>
          <strong>{stats.defense}</strong>
        </article>
        <article>
          <Zap size={22} />
          <span>Velocidade</span>
          <strong>{stats.speed}</strong>
        </article>
        <article>
          <HeartPulse size={22} />
          <span>HP</span>
          <strong>{stats.hp}</strong>
        </article>
        <article>
          <Swords size={22} />
          <span>Duelos</span>
          <strong>{avatar.wins || 0}/{avatar.losses || 0}</strong>
        </article>
      </section>

      <section className="avatar-note">
        <strong>Batalha</strong>
        <p>
          Cada nivel libera 3 pontos. Distribua entre ataque, defesa, velocidade e HP para preparar seu personagem.
        </p>
      </section>
    </section>
  );
}
