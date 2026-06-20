import React, { useEffect, useMemo, useState } from "react";
import { Bell, Search, Send, Sparkles, UsersRound } from "lucide-react";
import AvatarPreview from "../components/AvatarPreview.jsx";
import { useAuth } from "../services/authService.jsx";
import {
  filterStudentsBySocialScope,
  getSocialConfig,
  listEmojiItems,
  listSocialStudents,
  listUserInteractions,
  markInteractionRead,
  sendAvatarInteraction
} from "../services/socialService";
import { getEconomyConfig } from "../services/economyService";

function timestampToLabel(value) {
  if (!value) return "Agora";
  const millis = typeof value.toMillis === "function"
    ? value.toMillis()
    : typeof value.seconds === "number"
      ? value.seconds * 1000
      : new Date(value).getTime();
  if (!Number.isFinite(millis)) return "Agora";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(millis));
}

function InteractionScene({ currentProfile, target, interaction, selectedEmoji }) {
  const leftAvatar = interaction?.fromAvatar || currentProfile?.avatar;
  const leftName = interaction?.fromName || currentProfile?.name || "Voce";
  const rightAvatar = interaction?.toAvatar || target?.avatar;
  const rightName = interaction?.toName || target?.name || "Colega";
  const emojiSrc = interaction?.emojiSrc || selectedEmoji?.src;
  const emojiLabel = interaction?.emojiLabel || selectedEmoji?.label || "Emoji";

  return (
    <div className="social-scene-grid" aria-label="Cena de interacao">
      <div className="social-scene-character">
        <AvatarPreview avatar={leftAvatar} size={118} />
        <strong>{leftName}</strong>
      </div>
      <div className="social-scene-emoji">
        {emojiSrc ? <img src={emojiSrc} alt={emojiLabel} /> : <Sparkles size={34} />}
      </div>
      <div className="social-scene-character">
        <AvatarPreview avatar={rightAvatar} size={118} />
        <strong>{rightName}</strong>
      </div>
    </div>
  );
}

export default function SocialPage() {
  const { profile, refreshProfile } = useAuth();
  const [students, setStudents] = useState([]);
  const [emojis, setEmojis] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [scope, setScope] = useState("class");
  const [filters, setFilters] = useState({ search: "", grade: "", className: "" });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedEmoji, setSelectedEmoji] = useState(null);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [economyConfig, setEconomyConfig] = useState({ emojiSendPrice: 0 });

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getSocialConfig(),
      listSocialStudents(),
      listEmojiItems(profile),
      listUserInteractions(profile.id),
      getEconomyConfig()
    ])
      .then(([config, loadedStudents, loadedEmojis, loadedInteractions, loadedEconomyConfig]) => {
        if (!active) return;
        setScope(config.visibilityScope || "class");
        setStudents(loadedStudents);
        setEmojis(loadedEmojis);
        setInteractions(loadedInteractions);
        setEconomyConfig(loadedEconomyConfig);
      })
      .catch((error) => {
        if (active) setMessage(error?.message || "Nao foi possivel carregar os colegas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profile.id]);

  const visibleStudents = useMemo(() => {
    const allowed = filterStudentsBySocialScope(students, profile, scope);
    const search = filters.search.trim().toLowerCase();

    return allowed
      .filter((student) => !filters.grade || student.grade === filters.grade)
      .filter((student) => !filters.className || student.className === filters.className)
      .filter((student) => {
        if (!search) return true;
        return [student.name, student.grade, student.className]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      });
  }, [students, profile, scope, filters]);

  const filterGrades = useMemo(() => [...new Set(visibleStudents.map((student) => student.grade).filter(Boolean))], [visibleStudents]);
  const filterClasses = useMemo(() => [...new Set(visibleStudents.map((student) => student.className).filter(Boolean))], [visibleStudents]);
  const unreadInteractions = interactions.filter((item) => item.status === "unread");
  const sendCost = Number(economyConfig.emojiSendPrice || 0);

  async function handleSendInteraction() {
    if (!selectedStudent || !selectedEmoji) {
      setMessage("Escolha um colega e um emoji para enviar.");
      return;
    }

    setSending(true);
    setMessage("");
    try {
      const result = await sendAvatarInteraction({ fromProfile: profile, toUser: selectedStudent, emoji: selectedEmoji });
      if (result.insufficientCoins) {
        setMessage(`Moedas insuficientes. Enviar este emoji custa ${result.sendCost || sendCost} moedas.`);
        return;
      }
      if (result.notOwned) {
        setMessage("Compre este emoji na loja antes de usar.");
        return;
      }
      await refreshProfile?.();
      const updatedInteractions = await listUserInteractions(profile.id);
      setInteractions(updatedInteractions);
      setMessage(`Interacao enviada para ${selectedStudent.name || "colega"} por ${result.sendCost || sendCost} moedas.`);
      setSelectedEmoji(null);
    } finally {
      setSending(false);
    }
  }

  async function handleOpenInteraction(interaction) {
    const otherUser = interaction.fromUserId === profile.id
      ? {
        id: interaction.toUserId,
        name: interaction.toName,
        grade: interaction.toGrade,
        className: interaction.toClassName,
        avatar: interaction.toAvatar
      }
      : {
        id: interaction.fromUserId,
        name: interaction.fromName,
        grade: interaction.fromGrade,
        className: interaction.fromClassName,
        avatar: interaction.fromAvatar
      };
    setSelectedInteraction(interaction);
    setSelectedStudent(otherUser);
    setSelectedEmoji({ id: interaction.emojiId, label: interaction.emojiLabel, src: interaction.emojiSrc });

    if (interaction.status === "unread" && interaction.toUserId === profile.id) {
      await markInteractionRead(interaction.id);
      setInteractions((current) => current.map((item) => (
        item.id === interaction.id ? { ...item, status: "read" } : item
      )));
      window.dispatchEvent(new Event("fisioquest:social-updated"));
    }
  }

  return (
    <section className="page-stack">
      <div className="teacher-hero social-hero">
        <div>
          <p className="eyebrow">Colegas</p>
          <h2>Veja os personagens e envie interacoes.</h2>
          <span>{scope === "all" ? "Todos podem se ver." : scope === "grade" ? "Visivel entre estudantes da mesma serie." : "Visivel entre estudantes da mesma turma."}</span>
        </div>
        <UsersRound size={40} />
      </div>

      {loading && <p className="muted">Carregando painel social...</p>}

      {!loading && (
        <>
          <section className="social-notification-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Historico</p>
                <h3>{unreadInteractions.length ? `${unreadInteractions.length} interacao nova` : "Interacoes dos colegas"}</h3>
              </div>
              <Bell size={24} />
            </div>
            <div className="social-interaction-list">
              {interactions.map((interaction) => {
                const isSent = interaction.fromUserId === profile.id;
                return (
                <button
                  type="button"
                  key={interaction.id}
                  className={interaction.status === "unread" ? "unread" : ""}
                  onClick={() => handleOpenInteraction(interaction)}
                >
                  <span>{isSent ? "Enviado" : interaction.status === "unread" ? "Novo" : "Visto"}</span>
                  <strong>{isSent ? `Voce enviou ${interaction.emojiLabel} para ${interaction.toName}` : `${interaction.fromName} enviou ${interaction.emojiLabel}`}</strong>
                  <small>{timestampToLabel(interaction.createdAt)}</small>
                </button>
              );})}
              {!interactions.length && <p className="muted">Quando alguem enviar um emoji para voce, ele aparece aqui.</p>}
            </div>
          </section>

          <section className="social-layout">
            <div className="social-roster-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Personagens</p>
                  <h3>{visibleStudents.length} colegas visiveis</h3>
                </div>
                <Search size={24} />
              </div>

              <div className="social-filters">
                <input
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                  placeholder="Buscar aluno"
                />
                <select value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })}>
                  <option value="">Serie</option>
                  {filterGrades.map((grade) => <option value={grade} key={grade}>{grade}</option>)}
                </select>
                <select value={filters.className} onChange={(event) => setFilters({ ...filters, className: event.target.value })}>
                  <option value="">Turma</option>
                  {filterClasses.map((className) => <option value={className} key={className}>{className}</option>)}
                </select>
              </div>

              <div className="social-roster-grid">
                {visibleStudents.map((student) => (
                  <button
                    type="button"
                    className={selectedStudent?.id === student.id ? "active" : ""}
                    key={student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      setSelectedInteraction(null);
                    }}
                  >
                    <AvatarPreview avatar={student.avatar} size={76} />
                    <strong>{student.name || "Colega"}</strong>
                    <span>{student.grade} - {student.className}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="social-interaction-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Interacao</p>
                  <h3>{selectedStudent ? `Com ${selectedStudent.name || "colega"}` : "Escolha um personagem"}</h3>
                </div>
                <Sparkles size={24} />
              </div>

              <InteractionScene
                currentProfile={profile}
                target={selectedStudent}
                selectedEmoji={selectedEmoji}
                interaction={selectedInteraction}
              />

              <div className="social-emoji-strip">
                {emojis.map((emoji) => (
                  <button
                    type="button"
                    className={selectedEmoji?.id === emoji.id ? "active" : ""}
                    key={emoji.id}
                    onClick={() => {
                      setSelectedEmoji(emoji);
                      setSelectedInteraction(null);
                    }}
                    title={emoji.label}
                    aria-label={emoji.label}
                  >
                    <img src={emoji.src} alt="" />
                  </button>
                ))}
                {!emojis.length && <p className="muted">Compre emojis na loja para usar nas interacoes.</p>}
              </div>

              <small className="social-send-cost">Custo de envio: {sendCost} moedas. Depois de comprado, o emoji pode ser usado quantas vezes quiser.</small>

              <button
                type="button"
                onClick={handleSendInteraction}
                disabled={sending || !selectedStudent || !selectedEmoji}
              >
                <Send size={16} />
                {sending ? "Enviando..." : "Enviar emoji"}
              </button>
            </div>
          </section>
        </>
      )}

      {message && <p className="muted">{message}</p>}
    </section>
  );
}
