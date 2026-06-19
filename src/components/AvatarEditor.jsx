import React, { useState } from "react";
import AvatarPreview from "./AvatarPreview.jsx";
import PixelAccessoryEditor from "./PixelAccessoryEditor.jsx";
import { avatarCategories, defaultAvatar, getAvatarItemPrice, getAvatarOptions } from "../data/avatarItems";
import { ACCESSORY_REQUEST_PRICE, createAccessoryRequest } from "../services/accessoryRequestService";
import { saveUserAvatar } from "../services/avatarService";
import { buyAvatarItem, userOwnsAvatarItem } from "../services/avatarShopService";

function normalizeAvatar(avatar) {
  const normalized = {
    ...defaultAvatar,
    ...(avatar || {}),
    kind: "chibi",
    shirts: avatar?.shirts || avatar?.outfit || defaultAvatar.shirts,
    mouths: avatar?.mouths || avatar?.mouth || defaultAvatar.mouths,
    pants: avatar?.pants || defaultAvatar.pants,
    pets: avatar?.pets || defaultAvatar.pets
  };

  avatarCategories.forEach((category) => {
    const options = getAvatarOptions(category);
    const exists = options.some((option) => option.id === normalized[category.key]);
    if (!exists) {
      normalized[category.key] = defaultAvatar[category.key];
    }
  });

  return normalized;
}

function getEquipableAvatar(avatar, profile) {
  return avatarCategories.reduce((current, category) => {
    if (userOwnsAvatarItem(profile, category.key, current[category.key])) {
      return current;
    }

    return {
      ...current,
      [category.key]: defaultAvatar[category.key]
    };
  }, avatar);
}

export default function AvatarEditor({ userId, profile, onSaved }) {
  const [avatar, setAvatar] = useState(() => normalizeAvatar(profile?.avatar));
  const [activeTab, setActiveTab] = useState("customize");
  const [saving, setSaving] = useState(false);
  const [buyingItemId, setBuyingItemId] = useState("");
  const [shopMessage, setShopMessage] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestImage, setRequestImage] = useState(null);
  const [requestingAccessory, setRequestingAccessory] = useState(false);
  const coins = Number(profile?.coins || 0);
  const equipableAvatar = getEquipableAvatar(avatar, profile);
  const previewAvatar = previewItem
    ? { ...equipableAvatar, [previewItem.categoryKey]: previewItem.itemId }
    : equipableAvatar;
  const shopSections = avatarCategories
    .map((category) => ({
      category,
      items: getAvatarOptions(category)
      .filter((option) => !userOwnsAvatarItem(profile, category.key, option.id))
      .map((option) => ({ ...option, category }))
    }))
    .filter((section) => section.items.length > 0);

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

  async function handleAccessoryRequest(event) {
    event.preventDefault();
    setShopMessage("");

    if (!requestTitle.trim() || !requestImage) {
      setShopMessage("Informe um nome e anexe o PNG do acessorio.");
      return;
    }

    setRequestingAccessory(true);
    try {
      const result = await createAccessoryRequest({
        userId,
        profile,
        title: requestTitle,
        description: requestDescription,
        imageDataUrl: requestImage,
        fileName: `${requestTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_") || "acessorio"}.png`
      });

      if (result.insufficientCoins) {
        setShopMessage("Moedas insuficientes para enviar uma criacao.");
        return;
      }

      setRequestTitle("");
      setRequestDescription("");
      setRequestImage(null);
      await onSaved?.();
      setShopMessage("Criacao enviada para avaliacao do professor.");
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
          <button
            type="button"
            className={activeTab === "customize" ? "active" : ""}
            onClick={() => setActiveTab("customize")}
          >
            Personalizar
          </button>
          <button
            type="button"
            className={activeTab === "shop" ? "active" : ""}
            onClick={() => setActiveTab("shop")}
          >
            Loja
          </button>
          <button
            type="button"
            className={activeTab === "create" ? "active" : ""}
            onClick={() => setActiveTab("create")}
          >
            Criar
          </button>
        </div>

        {activeTab === "customize" && (
          <form onSubmit={handleSubmit}>
            <div className="avatar-category-grid">
              {avatarCategories.map((category) => {
                const ownedOptions = getAvatarOptions(category).filter((option) => {
                  return userOwnsAvatarItem(profile, category.key, option.id);
                });
                const selectedItemId = ownedOptions.some((option) => option.id === equipableAvatar[category.key])
                  ? equipableAvatar[category.key]
                  : defaultAvatar[category.key];

                return (
                  <div className="avatar-shop-row" key={category.key}>
                    <label>
                      {category.label}
                      <select
                        value={selectedItemId}
                        onChange={(event) => setAvatar({ ...avatar, [category.key]: event.target.value })}
                      >
                        {ownedOptions.map((option) => (
                          <option value={option.id} key={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>

            <button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar avatar"}
            </button>
          </form>
        )}

        {activeTab === "shop" && (
          <div className="avatar-shop-list">
            {shopSections.length === 0 && <p className="muted">Voce ja possui todos os itens disponiveis.</p>}
            {shopSections.map((section) => (
              <section className="avatar-shop-section" key={section.category.key}>
                <h3>{section.category.label}</h3>
                <div className="avatar-shop-section-grid">
                  {section.items.map((item) => {
                    const price = getAvatarItemPrice(item.category.key, item.id);
                    const isPreviewing = previewItem?.categoryKey === item.category.key && previewItem?.itemId === item.id;
                    return (
                      <article className="avatar-shop-card" key={`${item.category.key}-${item.id}`}>
                        <div className="avatar-shop-thumb">
                          <img src={item.src} alt="" />
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
                            disabled={isPreviewing}
                            onClick={() => setPreviewItem({ categoryKey: item.category.key, itemId: item.id })}
                          >
                            {isPreviewing ? "Na previa" : "Pre-visualizar"}
                          </button>
                          <button
                            type="button"
                            disabled={buyingItemId === item.id || coins < price}
                            onClick={() => handleBuy(item.category, item.id)}
                          >
                            {buyingItemId === item.id ? "Comprando..." : "Comprar"}
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
                <h3>Criar acessorio</h3>
                <span>Custa {ACCESSORY_REQUEST_PRICE} moedas. Desenhe na camada de cima; o corpo do chibi e so referencia.</span>
              </div>
              {requestImage && <img src={requestImage} alt="Previa do acessorio criado" />}
            </div>
            <PixelAccessoryEditor onChange={setRequestImage} />
            <label>
              Nome do acessorio
              <input
                value={requestTitle}
                onChange={(event) => setRequestTitle(event.target.value)}
                placeholder="Ex.: Oculos relampago"
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
            <button type="submit" disabled={requestingAccessory || coins < ACCESSORY_REQUEST_PRICE}>
              {requestingAccessory ? "Enviando..." : `Enviar por ${ACCESSORY_REQUEST_PRICE} moedas`}
            </button>
          </form>
        )}

        {shopMessage && <p className="muted">{shopMessage}</p>}
      </div>
    </section>
  );
}
