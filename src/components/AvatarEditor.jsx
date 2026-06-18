import React, { useState } from "react";
import AvatarPreview from "./AvatarPreview.jsx";
import { avatarCategories, defaultAvatar, getAvatarItemPrice, getAvatarOptions } from "../data/avatarItems";
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

        {shopMessage && <p className="muted">{shopMessage}</p>}
      </div>
    </section>
  );
}
