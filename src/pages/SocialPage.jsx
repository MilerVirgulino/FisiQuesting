import React, { useEffect, useMemo, useState } from "react";
import { Bell, Eye, EyeOff, Plus, Search, Send, ShoppingBag, Sparkles, Trash2, UsersRound } from "lucide-react";
import AvatarPreview from "../components/AvatarPreview.jsx";
import AdminClassViewControl from "../components/AdminClassViewControl.jsx";
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
import { getRenderablePixelArtSrc } from "../utils/pixelArt";
import {
  buyShowcaseSlot,
  deleteShowcaseLook,
  FREE_SHOWCASE_SLOTS,
  getOwnedOptionsByCategory,
  getShowcaseSlotCount,
  listMyFotonizationIds,
  listMyShowcaseLooks,
  listPublishedShowcaseLooks,
  listShowcaseNotifications,
  markShowcaseNotificationsRead,
  MAX_SHOWCASE_SLOTS,
  saveShowcaseLook,
  setShowcaseLookStatus,
  toggleFotonization
} from "../services/showcaseService";
import { defaultAvatar, getAvatarOption, loadAvatarCatalog } from "../services/avatarCatalogService";
import { getEffectiveClassProfile, readAdminClassView } from "../services/adminViewService";

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
  const emojiSrc = getRenderablePixelArtSrc({
    pixelData: interaction?.emojiPixelData || selectedEmoji?.pixelData,
    imageDataUrl: interaction?.emojiSrc || selectedEmoji?.src
  });
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

function LookCredits({ look }) {
  const credits = Object.values(look?.itemCredits || {}).filter((item) => item.creatorName);
  if (!credits.length) return <p className="muted">Sem creditos de criador registrados para este look.</p>;

  return (
    <div className="showcase-credit-list">
      {credits.map((item) => (
        <span key={`${item.categoryKey}-${item.itemId}`}>
          {item.categoryLabel || item.categoryKey}: {item.label} · Criado por {item.creatorName}
        </span>
      ))}
    </div>
  );
}

function ShowcaseLookEditor({ profile, catalog, look, slotIndex, onCancel, onSaved, onError }) {
  const [name, setName] = useState(look?.name || "");
  const [status, setStatus] = useState(look?.status || "draft");
  const [equippedItems, setEquippedItems] = useState(() => ({
    ...defaultAvatar,
    ...(look?.equippedItems || profile?.avatar || {}),
    kind: "chibi"
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ownedSections = useMemo(() => getOwnedOptionsByCategory(profile, catalog), [profile, catalog]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveShowcaseLook({
        profile,
        lookId: look?.id,
        slotIndex,
        name,
        status,
        equippedItems
      });
      await onSaved?.();
    } catch (saveError) {
      const message = saveError?.message || "Nao foi possivel salvar o look.";
      setError(message);
      onError?.(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="showcase-editor" onSubmit={handleSave}>
      <div className="showcase-editor-preview">
        <AvatarPreview avatar={equippedItems} size={148} catalog={catalog} />
      </div>
      <div className="showcase-editor-fields">
        <label>
          Nome do look
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Look eletrizante" />
        </label>
        <label>
          Visibilidade
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="draft">Rascunho oculto</option>
            <option value="published">Publicado</option>
          </select>
        </label>
        <div className="showcase-item-select-grid">
          {ownedSections.map(({ category, options }) => (
            <label key={category.key}>
              {category.label}
              <select
                value={equippedItems[category.key] || ""}
                onChange={(event) => setEquippedItems((current) => ({ ...current, [category.key]: event.target.value }))}
                disabled={!options.length}
              >
                {options.map((option) => (
                  <option value={option.id} key={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="row-actions">
          <button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar look"}</button>
          <button type="button" className="secondary" onClick={onCancel}>Cancelar</button>
        </div>
        {error && <p className="muted">{error}</p>}
      </div>
    </form>
  );
}

function ShowcaseLookCard({ look, catalog, own = false, fotonized = false, onEdit, onDelete, onStatus, onFotonize, onDetails }) {
  const published = look.status === "published" && !look.hidden;
  const fotonizeIcon = getAvatarOption(catalog, "emojis", "emojis_fotonizar_placeholder");
  const fotonizationCount = Number(look.fotonizationCount || 0);

  return (
    <article className={`showcase-look-card ${published ? "published" : "draft"}`}>
      <button type="button" className="showcase-look-preview" onClick={onDetails} aria-label={`Ver detalhes de ${look.name || "look"}`}>
        <AvatarPreview avatar={look.equippedItems} size={164} catalog={catalog} />
      </button>
      <div className="showcase-look-body">
        <span>{published ? "Publicado" : look.hidden ? "Oculto pelo professor" : "Rascunho"}</span>
        <h3>{look.name || "Look sem nome"}</h3>
        <p>{look.ownerNickname || "Colega"}</p>
        <div className="showcase-look-stats" aria-label={`${fotonizationCount} fotonizacao(oes)`}>
          {fotonizeIcon?.src ? (
            <img className="showcase-stat-icon" src={fotonizeIcon.src} alt="" />
          ) : (
            <Sparkles size={18} />
          )}
          <strong>{fotonizationCount}</strong>
        </div>
        <small>{timestampToLabel(look.updatedAt || look.createdAt)}</small>
      </div>
      {own ? (
        <div className="showcase-card-actions">
          <button type="button" className="secondary" onClick={onEdit}>Editar</button>
          <button type="button" className="secondary" onClick={onStatus}>
            {published ? <EyeOff size={15} /> : <Eye size={15} />}
            {published ? "Ocultar" : "Publicar"}
          </button>
          <button type="button" className="danger-button" onClick={onDelete}>
            <Trash2 size={15} />
            Excluir
          </button>
        </div>
      ) : (
        <button type="button" className={`showcase-fotonize-button ${fotonized ? "active" : ""}`} onClick={onFotonize} disabled={!onFotonize}>
          {fotonizeIcon?.src ? (
            <img className="showcase-fotonize-icon" src={fotonizeIcon.src} alt="" />
          ) : (
            <Sparkles size={30} />
          )}
          <span>{fotonized ? "Fotonizado" : "Fotonizar"}</span>
        </button>
      )}
    </article>
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
  const [activeSocialTab, setActiveSocialTab] = useState("colleagues");
  const [showcaseTab, setShowcaseTab] = useState("mine");
  const [catalog, setCatalog] = useState(null);
  const [myLooks, setMyLooks] = useState([]);
  const [publishedLooks, setPublishedLooks] = useState([]);
  const [fotonizedLookIds, setFotonizedLookIds] = useState(new Set());
  const [showcaseNotifications, setShowcaseNotifications] = useState([]);
  const [showShowcaseNotifications, setShowShowcaseNotifications] = useState(false);
  const [editingLook, setEditingLook] = useState(null);
  const [selectedLook, setSelectedLook] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingLookEditor, setLoadingLookEditor] = useState(false);
  const [sending, setSending] = useState(false);
  const [buyingSlot, setBuyingSlot] = useState(false);
  const [fotonizingLookId, setFotonizingLookId] = useState("");
  const [adminClassView, setAdminClassView] = useState(() => readAdminClassView());
  const [economyConfig, setEconomyConfig] = useState({ emojiSendPrice: 0 });
  const isAdmin = profile?.role === "admin";
  const classProfile = getEffectiveClassProfile(profile, adminClassView);
  const showcaseAuthorProfile = isAdmin ? classProfile : profile;

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getSocialConfig(),
      listSocialStudents(),
      listEmojiItems(profile),
      listUserInteractions(profile.id),
      getEconomyConfig(),
      loadAvatarCatalog(),
      listMyShowcaseLooks(profile.id),
      listPublishedShowcaseLooks(),
      listShowcaseNotifications(profile.id)
    ])
      .then(async ([config, loadedStudents, loadedEmojis, loadedInteractions, loadedEconomyConfig, loadedCatalog, loadedMyLooks, loadedPublishedLooks, loadedNotifications]) => {
        if (!active) return;
        const fotonizedIds = await listMyFotonizationIds(profile.id, loadedPublishedLooks);
        if (!active) return;
        setScope(config.visibilityScope || "class");
        setStudents(loadedStudents);
        setEmojis(loadedEmojis);
        setInteractions(loadedInteractions);
        setEconomyConfig(loadedEconomyConfig);
        setCatalog(loadedCatalog);
        setMyLooks(loadedMyLooks);
        setPublishedLooks(loadedPublishedLooks);
        setFotonizedLookIds(fotonizedIds);
        setShowcaseNotifications(loadedNotifications);
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
    const allowed = filterStudentsBySocialScope(students, classProfile, scope);
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
  }, [students, classProfile, scope, filters]);

  const filterGrades = useMemo(() => [...new Set(visibleStudents.map((student) => student.grade).filter(Boolean))], [visibleStudents]);
  const filterClasses = useMemo(() => [...new Set(visibleStudents.map((student) => student.className).filter(Boolean))], [visibleStudents]);
  const unreadInteractions = interactions.filter((item) => item.status === "unread");
  const sendCost = Number(economyConfig.emojiSendPrice || 0);
  const showcaseSlotPrice = Number(economyConfig.showcaseSlotPrice || 0);
  const slotCount = getShowcaseSlotCount(profile);
  const occupiedSlots = new Set(myLooks.map((look) => Number(look.slotIndex || 0)));
  const visibleOwnerIds = new Set(visibleStudents.map((student) => student.id));
  const isLookInSocialScope = (look) => {
    if (visibleOwnerIds.has(look.ownerId)) return true;
    if (look.ownerRole === "admin") {
      return true;
    }
    return !look.ownerGrade && !look.ownerClassName && scope === "all";
  };
  const visibleShowcaseLooks = publishedLooks
    .filter((look) => look.ownerId !== profile.id)
    .filter(isLookInSocialScope);
  const unreadShowcaseNotifications = showcaseNotifications.filter((notification) => notification.status === "unread");

  async function refreshShowcase() {
    const [loadedMyLooks, loadedPublishedLooks, loadedNotifications] = await Promise.all([
      listMyShowcaseLooks(profile.id),
      listPublishedShowcaseLooks(),
      listShowcaseNotifications(profile.id)
    ]);
    setMyLooks(loadedMyLooks);
    setPublishedLooks(loadedPublishedLooks);
    setShowcaseNotifications(loadedNotifications);
    setFotonizedLookIds(await listMyFotonizationIds(profile.id, loadedPublishedLooks));
  }

  async function handleToggleShowcaseNotifications() {
    const willOpen = !showShowcaseNotifications;
    setShowShowcaseNotifications(willOpen);
    if (!willOpen || !unreadShowcaseNotifications.length) return;

    const unreadIds = new Set(unreadShowcaseNotifications.map((notification) => notification.id));
    setShowcaseNotifications((current) => current.map((notification) => (
      unreadIds.has(notification.id) ? { ...notification, status: "read" } : notification
    )));

    try {
      await markShowcaseNotificationsRead(unreadShowcaseNotifications);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel marcar notificacoes como vistas.");
    }
  }

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
    setSelectedEmoji({
      id: interaction.emojiId,
      label: interaction.emojiLabel,
      pixelData: interaction.emojiPixelData || null,
      src: interaction.emojiSrc
    });

    if (interaction.status === "unread" && interaction.toUserId === profile.id) {
      await markInteractionRead(interaction.id);
      setInteractions((current) => current.map((item) => (
        item.id === interaction.id ? { ...item, status: "read" } : item
      )));
      window.dispatchEvent(new Event("fisioquest:social-updated"));
    }
  }

  async function handleBuyShowcaseSlot() {
    const ok = window.confirm(`Comprar um espaco extra na Vitrine por ${showcaseSlotPrice} moedas?`);
    if (!ok) return;

    setBuyingSlot(true);
    setMessage("");
    try {
      const result = await buyShowcaseSlot(profile.id);
      if (result.maxReached) {
        setMessage(`Voce ja atingiu o limite de ${MAX_SHOWCASE_SLOTS} espacos.`);
        return;
      }
      if (result.insufficientCoins) {
        setMessage(`Moedas insuficientes. O espaco custa ${result.price || showcaseSlotPrice} moedas.`);
        return;
      }
      await refreshProfile?.();
      setMessage("Espaco extra comprado para sua Vitrine.");
    } finally {
      setBuyingSlot(false);
    }
  }

  async function handleDeleteLook(look) {
    const ok = window.confirm(`Excluir o look "${look.name || "sem nome"}"? O espaco sera liberado, mas moedas nao serao devolvidas.`);
    if (!ok) return;
    await deleteShowcaseLook(look.id);
    await refreshShowcase();
  }

  async function handleToggleLookStatus(look) {
    await setShowcaseLookStatus(look.id, look.status === "published" ? "draft" : "published");
    await refreshShowcase();
  }

  async function handleToggleFotonization(look) {
    setFotonizingLookId(look.id);
    setMessage("");
    try {
      const active = fotonizedLookIds.has(look.id);
      const result = await toggleFotonization({ look, profile, active });
      if (result.ownLook) {
        setMessage("Voce nao pode fotonizar o proprio look.");
        return;
      }
      await refreshShowcase();
      setMessage(result.active ? `Voce fotonizou "${look.name}".` : `Voce desfez a fotonizacao de "${look.name}".`);
    } catch (error) {
      setMessage(error?.message || "Nao foi possivel fotonizar este look.");
    } finally {
      setFotonizingLookId("");
    }
  }

  async function handleStartLook(slotIndex) {
    setMessage("");

    if (!profile?.id) {
      setMessage("Perfil nao carregado. Entre novamente e tente montar a Vitrine.");
      return;
    }

    if (!catalog) {
      setEditingLook({ slotIndex, waitingForCatalog: true });
      setLoadingLookEditor(true);
      setMessage("Carregando os itens do avatar para abrir o editor...");
      try {
        const loadedCatalog = await loadAvatarCatalog({ force: true });
        setCatalog(loadedCatalog);
      } catch (error) {
        setEditingLook(null);
        setMessage(error?.message || "Nao foi possivel carregar os itens do avatar para montar o look.");
        return;
      } finally {
        setLoadingLookEditor(false);
      }
    }

    setEditingLook({ slotIndex });
  }

  return (
    <section className="page-stack">
      <div className="teacher-hero social-hero">
        <div>
          <p className="eyebrow">Colegas</p>
          <h2>{activeSocialTab === "showcase" ? "Monte looks e visite vitrines." : "Veja os personagens e envie interacoes."}</h2>
          <span>{scope === "all" ? "Todos podem se ver." : scope === "grade" ? "Visivel entre estudantes da mesma serie." : "Visivel entre estudantes da mesma turma."}</span>
        </div>
        <UsersRound size={40} />
      </div>

      <div className="avatar-tabs social-tabs" role="tablist" aria-label="Colegas">
        <button type="button" className={activeSocialTab === "colleagues" ? "active" : ""} onClick={() => setActiveSocialTab("colleagues")}>
          Colegas
        </button>
        <button type="button" className={activeSocialTab === "showcase" ? "active" : ""} onClick={() => setActiveSocialTab("showcase")}>
          Vitrine
        </button>
      </div>

      {isAdmin && (
        <AdminClassViewControl
          value={adminClassView}
          onChange={setAdminClassView}
          label="ADM visualizando como aluno desta turma"
        />
      )}

      {loading && <p className="muted">Carregando painel social...</p>}

      {!loading && activeSocialTab === "colleagues" && (
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

      {!loading && activeSocialTab === "showcase" && (
        <section className="showcase-panel">
          <div className="avatar-tabs social-tabs" role="tablist" aria-label="Vitrine">
            <button type="button" className={showcaseTab === "mine" ? "active" : ""} onClick={() => setShowcaseTab("mine")}>
              Minha Vitrine
            </button>
            <button type="button" className={showcaseTab === "friends" ? "active" : ""} onClick={() => setShowcaseTab("friends")}>
              Vitrine dos Colegas
            </button>
          </div>

          {(unreadShowcaseNotifications.length > 0 || showShowcaseNotifications) && showcaseNotifications.length > 0 && (
            <div className="showcase-notification-bubble">
              <button
                type="button"
                className="showcase-notification-trigger"
                onClick={handleToggleShowcaseNotifications}
                aria-expanded={showShowcaseNotifications}
              >
                <Bell size={18} />
                <strong>{unreadShowcaseNotifications.length}</strong>
                <span>novas</span>
              </button>
              {showShowcaseNotifications && (
                <div className="showcase-notification-popover">
                  <div className="showcase-notification-heading">
                    <strong>Notificacoes</strong>
                    <button type="button" className="secondary" onClick={() => setShowShowcaseNotifications(false)}>
                      Esconder
                    </button>
                  </div>
                  {showcaseNotifications.slice(0, 5).map((notification) => (
                    <span key={notification.id}>{notification.message}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {showcaseTab === "mine" && (
            <div className="showcase-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Minha Vitrine</p>
                  <h3>{myLooks.length}/{slotCount} manequim(ns) ocupados</h3>
                  <span>O primeiro espaco e gratis. Looks nao alteram seu avatar principal.</span>
                </div>
                <ShoppingBag size={24} />
              </div>

              {editingLook ? (
                catalog ? (
                  <ShowcaseLookEditor
                    profile={showcaseAuthorProfile}
                    catalog={catalog}
                    look={editingLook.id ? editingLook : null}
                    slotIndex={editingLook.slotIndex}
                    onCancel={() => setEditingLook(null)}
                    onSaved={async () => {
                      setEditingLook(null);
                      setMessage("Look salvo na Vitrine.");
                      await refreshShowcase();
                    }}
                    onError={setMessage}
                  />
                ) : (
                  <article className="showcase-empty-slot">
                    <ShoppingBag size={28} />
                    <h3>Preparando editor</h3>
                    <p>Carregando os itens do avatar para montar este look.</p>
                    <button type="button" className="secondary" onClick={() => setEditingLook(null)}>
                      Voltar
                    </button>
                  </article>
                )
              ) : (
                <>
                  <div className="showcase-slot-grid">
                    {Array.from({ length: slotCount }).map((_, index) => {
                      const look = myLooks.find((item) => Number(item.slotIndex || 0) === index);
                      if (look) {
                        return (
                          <ShowcaseLookCard
                            key={look.id}
                            look={look}
                            catalog={catalog}
                            own
                            onDetails={() => setSelectedLook(look)}
                            onEdit={() => setEditingLook(look)}
                            onStatus={() => handleToggleLookStatus(look)}
                            onDelete={() => handleDeleteLook(look)}
                          />
                        );
                      }

                      return (
                        <article className="showcase-empty-slot" key={`slot-${index}`}>
                          <Plus size={28} />
                          <h3>Espaco vazio</h3>
                          <p>Manequim {index + 1}</p>
                          <button type="button" onClick={() => handleStartLook(index)} disabled={loadingLookEditor}>
                            {loadingLookEditor ? "Abrindo..." : "Montar look"}
                          </button>
                        </article>
                      );
                    })}
                  </div>

                  <div className="showcase-buy-slot">
                    <div>
                      <strong>{profile.coins || 0} moedas</strong>
                      <span>Espaco extra: {showcaseSlotPrice} moedas · limite {MAX_SHOWCASE_SLOTS}</span>
                    </div>
                    <button type="button" className="secondary" onClick={handleBuyShowcaseSlot} disabled={buyingSlot || slotCount >= MAX_SHOWCASE_SLOTS}>
                      {buyingSlot ? "Comprando..." : "Comprar novo espaco"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {showcaseTab === "friends" && (
            <div className="showcase-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Vitrine dos Colegas</p>
                  <h3>{visibleShowcaseLooks.length} look(s) visiveis</h3>
                  <span>Fotonize composicoes publicadas por colegas dentro do alcance social atual.</span>
                </div>
                <Sparkles size={24} />
              </div>
              <div className="showcase-slot-grid">
                {visibleShowcaseLooks.map((look) => (
                  <ShowcaseLookCard
                    key={look.id}
                    look={look}
                    catalog={catalog}
                    fotonized={fotonizedLookIds.has(look.id)}
                    onDetails={() => setSelectedLook(look)}
                    onFotonize={fotonizingLookId === look.id ? null : () => handleToggleFotonization(look)}
                  />
                ))}
                {!visibleShowcaseLooks.length && (
                  <article className="showcase-empty-slot">
                    <Sparkles size={28} />
                    <h3>Nenhum look publicado por enquanto</h3>
                    <p>Quando colegas publicarem vitrines, elas aparecem aqui.</p>
                  </article>
                )}
              </div>
            </div>
          )}

          {selectedLook && (
            <div className="showcase-detail-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Detalhes do look</p>
                  <h3>{selectedLook.name || "Look sem nome"}</h3>
                  <span>{selectedLook.ownerNickname || "Colega"} · {Number(selectedLook.fotonizationCount || 0)} fotonizacao(oes)</span>
                </div>
                <button type="button" className="secondary" onClick={() => setSelectedLook(null)}>Fechar</button>
              </div>
              <div className="showcase-detail-grid">
                <AvatarPreview avatar={selectedLook.equippedItems} size={180} catalog={catalog} />
                <LookCredits look={selectedLook} />
              </div>
            </div>
          )}
        </section>
      )}

      {message && <p className="muted">{message}</p>}
    </section>
  );
}
