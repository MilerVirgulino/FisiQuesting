import React, { useEffect, useMemo, useState } from "react";
import AvatarInventoryPicker from "./AvatarInventoryPicker.jsx";
import AvatarPreview from "./AvatarPreview.jsx";
import ChoicePills from "./ChoicePills.jsx";
import PixelAccessoryEditor from "./PixelAccessoryEditor.jsx";
import {
  defaultAvatar,
  getAvatarCategories,
  getAvatarItemPrice,
  getAvatarOptions,
  getAvatarShopCategories,
  loadAvatarCatalog
} from "../services/avatarCatalogService";
import { ACCESSORY_REQUEST_PRICE, createAccessoryRequest } from "../services/accessoryRequestService";
import { saveUserAvatar } from "../services/avatarService";
import { buyAvatarItem, userOwnsAvatarItem } from "../services/avatarShopService";
import { getEconomyConfig } from "../services/economyService";
import { pixelDataToDataUrl } from "../utils/pixelArt";

const ACCESSORY_DRAFT_STORAGE_KEY = "fisioquest.pixelAccessoryDraft";
const EMOJI_DRAFT_STORAGE_KEY = "fisioquest.pixelEmojiDraft";

function normalizeAvatar(avatar, catalog) {
  const avatarCategories = getAvatarCategories(catalog);
  const normalized = {
    ...defaultAvatar,
    ...(avatar || {}),
    kind: "chibi",
    shirts: avatar?.shirts || avatar?.outfit || defaultAvatar.shirts,
    mouths: avatar?.mouths || avatar?.mouth || defaultAvatar.mouths,
    pants: avatar?.pants || defaultAvatar.pants,
    shoes: avatar?.shoes || defaultAvatar.shoes,
    pets: avatar?.pets || defaultAvatar.pets
  };

  avatarCategories.forEach((category) => {
    const options = getAvatarOptions(catalog, category);
    const exists = options.some((option) => option.id === normalized[category.key]);
    if (!exists) {
      normalized[category.key] = options[0]?.id || defaultAvatar[category.key] || "";
    }
  });

  return normalized;
}

function getEquipableAvatar(avatar, profile, catalog) {
  return getAvatarCategories(catalog).reduce((current, category) => {
    if (userOwnsAvatarItem(profile, category.key, current[category.key], catalog)) {
      return current;
    }

    return {
      ...current,
      [category.key]: getAvatarOptions(catalog, category)[0]?.id || defaultAvatar[category.key] || ""
    };
  }, avatar);
}

export default function AvatarEditor({ userId, profile, onSaved }) {
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [avatar, setAvatar] = useState(() => normalizeAvatar(profile?.avatar, null));
  const [activeTab, setActiveTab] = useState("customize");
  const [saving, setSaving] = useState(false);
  const [buyingItemId, setBuyingItemId] = useState("");
  const [shopMessage, setShopMessage] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestPixelData, setRequestPixelData] = useState(null);
  const [requestType, setRequestType] = useState("avatarItem");
  const [requestGuideBaseId, setRequestGuideBaseId] = useState(defaultAvatar.base);
  const [draftBasePixelData, setDraftBasePixelData] = useState(null);
  const [draftBaseToken, setDraftBaseToken] = useState("");
  const [requestingAccessory, setRequestingAccessory] = useState(false);
  const [clearDraftToken, setClearDraftToken] = useState(0);
  const [economyConfig, setEconomyConfig] = useState({ customCreationPrice: ACCESSORY_REQUEST_PRICE });

  const avatarCategories = getAvatarCategories(catalog);
  const shopCategories = getAvatarShopCategories(catalog);
  const creationPrice = Number(economyConfig.customCreationPrice || ACCESSORY_REQUEST_PRICE);
  const coins = Number(profile?.coins || 0);
  const equipableAvatar = getEquipableAvatar(avatar, profile, catalog);
  const baseOptions = getAvatarOptions(catalog, "base").filter((option) => option.source !== "svg" && option.src);
  const selectedGuideBase = baseOptions.find((option) => option.id === requestGuideBaseId) || baseOptions[0] || null;
  const previewAvatar = previewItem
    ? { ...equipableAvatar, [previewItem.categoryKey]: previewItem.itemId }
    : equipableAvatar;
  const shopSections = shopCategories
    .map((category) => ({
      category,
      items: getAvatarOptions(catalog, category)
        .filter((option) => !userOwnsAvatarItem(profile, category.key, option.id, catalog))
        .map((option) => ({ ...option, category }))
    }))
    .filter((section) => section.items.length > 0);
  const requestPreviewSrc = useMemo(() => {
    if (!requestPixelData) return "";
    return pixelDataToDataUrl(requestPixelData);
  }, [requestPixelData]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);

    Promise.all([loadAvatarCatalog(), getEconomyConfig()])
      .then(([loadedCatalog, loadedEconomyConfig]) => {
        if (!active) return;
        setCatalog(loadedCatalog);
        setEconomyConfig(loadedEconomyConfig);
        setAvatar(normalizeAvatar(profile?.avatar, loadedCatalog));
        const availableBases = getAvatarOptions(loadedCatalog, "base").filter((option) => option.source !== "svg" && option.src);
        if (availableBases.length) {
          setRequestGuideBaseId((current) => (
            availableBases.some((option) => option.id === current) ? current : availableBases[0].id
          ));
        }
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profile?.avatar]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveUserAvatar(userId, equipableAvatar);
      await onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  async function handleBuy(category, itemId) {
    setShopMessage("");
    setBuyingItemId(itemId);
    try {
      const result = await buyAvatarItem({ userId, categoryKey: category.key, itemId });

      if (result.insufficientCoins) {
        setShopMessage("Moedas insuficientes para comprar este item.");
        return;
      }

      if (result.purchased || result.alreadyOwned) {
        await onSaved?.();
        setShopMessage(result.purchased ? "Item comprado." : "Voce ja possui este item.");
        setPreviewItem(null);
        setActiveTab("customize");
      }
    } finally {
      setBuyingItemId("");
    }
  }

  function handleRemixItem(item, category) {
    if (!item.pixelData) return;
    const isEmoji = category.key === "emojis";
    setRequestType(isEmoji ? "emoji" : "avatarItem");
    setRequestTitle(`${item.label || "Criacao"} remix`);
    setRequestDescription("");
    setRequestPixelData(item.pixelData);
    setDraftBasePixelData(item.pixelData);
    setDraftBaseToken(`${item.id}-${Date.now()}`);
    setActiveTab("create");
  }

  async function handleAccessoryRequest(event) {
    event.preventDefault();
    setShopMessage("");

    const isEmojiRequest = requestType === "emoji";
    const requestCategory = isEmojiRequest ? "emojis" : "accessories";
    const fallbackFileName = isEmojiRequest ? "emoji" : "acessorio";

    if (!requestTitle.trim() || !requestPixelData) {
      setShopMessage(isEmojiRequest ? "Informe um nome e desenhe o emoji." : "Informe um nome e desenhe o item.");
      return;
    }

    setRequestingAccessory(true);
    try {
      const result = await createAccessoryRequest({
        userId,
        profile,
        title: requestTitle,
        description: requestDescription,
        pixelData: requestPixelData,
        fileName: `${requestTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") || fallbackFileName}.png`,
        category: requestCategory
      });

      if (result.insufficientCoins) {
        setShopMessage("Moedas insuficientes para enviar uma criacao.");
        return;
      }

      setRequestTitle("");
      setRequestDescription("");
      setRequestPixelData(null);
      setDraftBasePixelData(null);
      setDraftBaseToken("");
      setClearDraftToken((current) => current + 1);
      await onSaved?.();
      setShopMessage(isEmojiRequest ? "Emoji enviado para avaliacao do professor." : "Criacao enviada para avaliacao do professor.");
    } finally {
      setRequestingAccessory(false);
    }
  }

  return (
    <section className="avatar-editor">
      <div className="avatar-editor-preview">
        <AvatarPreview avatar={previewAvatar} size={172} />
        <strong>{coins} moedas</strong>
        {previewItem && (
          <button type="button" className="secondary" onClick={() => setPreviewItem(null)}>
            Limpar pre-visualizacao
          </button>
        )}
      </div>

      <div className="avatar-editor-form">
        <div className="avatar-tabs" role="tablist" aria-label="Avatar">
          <button type="button" className={activeTab === "customize" ? "active" : ""} onClick={() => setActiveTab("customize")}>
            Personalizar
          </button>
          <button type="button" className={activeTab === "shop" ? "active" : ""} onClick={() => setActiveTab("shop")}>
            Loja
          </button>
          <button type="button" className={activeTab === "create" ? "active" : ""} onClick={() => setActiveTab("create")}>
            Criar
          </button>
        </div>

        {catalogLoading && <p className="muted">Carregando catalogo do avatar...</p>}

        {activeTab === "customize" && !catalogLoading && (
          <form onSubmit={handleSubmit}>
            <AvatarInventoryPicker
              categories={avatarCategories}
              catalog={catalog}
              profile={profile}
              avatar={equipableAvatar}
              onChange={(categoryKey, itemId) => setAvatar({ ...avatar, [categoryKey]: itemId })}
            />

            <button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar avatar"}
            </button>
          </form>
        )}

        {activeTab === "shop" && !catalogLoading && (
          <div className="avatar-shop-list">
            {shopSections.length === 0 && <p className="muted">Voce ja possui todos os itens disponiveis.</p>}
            {shopSections.map((section) => (
              <section className="avatar-shop-section" key={section.category.key}>
                <h3>{section.category.label}</h3>
                <div className="avatar-shop-section-grid">
                  {section.items.map((item) => {
                    const price = getAvatarItemPrice(catalog, item.category.key, item.id);
                    const canPreviewOnAvatar = item.category.key !== "emojis";
                    const isPreviewing = previewItem?.categoryKey === item.category.key && previewItem?.itemId === item.id;
                    return (
                      <article className="avatar-shop-card" key={`${item.category.key}-${item.id}`}>
                        <div className="avatar-shop-thumb">
                          {item.source === "svg" ? <span>{item.label}</span> : <img src={item.src} alt="" />}
                        </div>
                        <div>
                          <span>{item.category.label}</span>
                          <strong>{item.label}</strong>
                          <small>{price} moedas</small>
                        </div>
                        <div className="avatar-shop-actions">
                          <button
                            type="button"
                            className="secondary"
                            disabled={!canPreviewOnAvatar || isPreviewing}
                            onClick={() => canPreviewOnAvatar && setPreviewItem({ categoryKey: item.category.key, itemId: item.id })}
                          >
                            {!canPreviewOnAvatar ? "Emoji" : isPreviewing ? "Na previa" : "Pre-visualizar"}
                          </button>
                          <button
                            type="button"
                            disabled={buyingItemId === item.id || coins < price}
                            onClick={() => handleBuy(item.category, item.id)}
                          >
                            {buyingItemId === item.id ? "Comprando..." : "Comprar"}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            disabled={!item.pixelData}
                            onClick={() => handleRemixItem(item, item.category)}
                          >
                            Usar como base
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {activeTab === "create" && (
          <form className="accessory-request-form" onSubmit={handleAccessoryRequest}>
            <div className="accessory-request-heading">
              <div>
                <p className="eyebrow">Oficina</p>
                <h3>{requestType === "emoji" ? "Criar emoji" : "Criar sprite"}</h3>
                <span>
                  {requestType === "emoji"
                    ? `Custa ${creationPrice} moedas. O desenho e livre e vai ocupar o espaco central nas interacoes.`
                    : `Custa ${creationPrice} moedas. Desenhe por cima do guia; o professor define se vira base, roupa ou outro item.`}
                </span>
              </div>
              {requestPreviewSrc && <img src={requestPreviewSrc} alt={requestType === "emoji" ? "Previa do emoji criado" : "Previa do acessorio criado"} />}
            </div>
            <div className="creation-type-toggle" role="group" aria-label="Tipo de criacao">
              <button
                type="button"
                className={requestType === "avatarItem" ? "active" : ""}
                onClick={() => {
                  setRequestType("avatarItem");
                  setRequestPixelData(null);
                  setDraftBasePixelData(null);
                  setDraftBaseToken("");
                }}
              >
                Item do avatar
              </button>
              <button
                type="button"
                className={requestType === "emoji" ? "active" : ""}
                onClick={() => {
                  setRequestType("emoji");
                  setRequestPixelData(null);
                  setDraftBasePixelData(null);
                  setDraftBaseToken("");
                }}
              >
                Emoji
              </button>
            </div>
            {requestType !== "emoji" && (
              baseOptions.length ? (
                <ChoicePills
                  label="Corpo guia"
                  value={selectedGuideBase?.id || ""}
                  options={baseOptions.map((option) => ({ value: option.id, label: option.label }))}
                  onChange={setRequestGuideBaseId}
                  className="blocky"
                />
              ) : (
                <p className="muted">Nenhum corpo publicado</p>
              )
            )}
            {requestType !== "emoji" && !selectedGuideBase && (
              <p className="muted">
                Nenhum corpo base publicado no Firebase ainda. Aprove uma criacao na categoria Base para ela aparecer como guia.
              </p>
            )}
            <PixelAccessoryEditor
              key={requestType}
              onPixelDataChange={setRequestPixelData}
              storageKey={requestType === "emoji" ? EMOJI_DRAFT_STORAGE_KEY : ACCESSORY_DRAFT_STORAGE_KEY}
              clearDraftToken={clearDraftToken}
              showGuide={requestType !== "emoji"}
              guideSrc={requestType !== "emoji" ? selectedGuideBase?.src || "" : ""}
              initialPixelData={draftBasePixelData}
              initialPixelDataToken={draftBaseToken}
            />
            <label>
              {requestType === "emoji" ? "Nome do emoji" : "Nome do sprite"}
              <input
                value={requestTitle}
                onChange={(event) => setRequestTitle(event.target.value)}
                placeholder={requestType === "emoji" ? "Ex.: Energia feliz" : "Ex.: Oculos relampago"}
                maxLength={48}
              />
            </label>
            <label>
              Descricao
              <textarea
                value={requestDescription}
                onChange={(event) => setRequestDescription(event.target.value)}
                placeholder="Conte a ideia do item."
                maxLength={240}
              />
            </label>
            <button type="submit" disabled={requestingAccessory || coins < creationPrice}>
              {requestingAccessory ? "Enviando..." : `Enviar por ${creationPrice} moedas`}
            </button>
          </form>
        )}

        {shopMessage && <p className="muted">{shopMessage}</p>}
      </div>
    </section>
  );
}
