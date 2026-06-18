import React, { useState } from "react";
import AvatarPreview from "./AvatarPreview.jsx";
import { avatarCategories, defaultAvatar, getAvatarOptions } from "../data/avatarItems";
import { saveUserAvatar } from "../services/avatarService";

const colorLabels = {
  egg: "Cor do ovo",
  accent: "Detalhes",
  outfit: "Roupa",
  hair: "Cabelo"
};

function normalizeAvatar(avatar) {
  const normalized = {
    ...defaultAvatar,
    ...(avatar || {}),
    kind: "egg",
    colors: {
      ...defaultAvatar.colors,
      ...(avatar?.colors || {})
    }
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

export default function AvatarEditor({ userId, profile, onSaved }) {
  const [avatar, setAvatar] = useState(() => normalizeAvatar(profile?.avatar));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveUserAvatar(userId, avatar);
      await onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="avatar-editor">
      <div className="avatar-editor-preview">
        <AvatarPreview avatar={avatar} size={172} />
      </div>

      <form className="avatar-editor-form" onSubmit={handleSubmit}>
        <div className="avatar-category-grid">
          {avatarCategories.map((category) => (
            <label key={category.key}>
              {category.label}
              <select
                value={avatar[category.key]}
                onChange={(event) => setAvatar({ ...avatar, [category.key]: event.target.value })}
              >
                {getAvatarOptions(category).map((option) => (
                  <option value={option.id} key={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div className="avatar-color-grid">
          {Object.entries(avatar.colors).map(([key, value]) => (
            <label key={key}>
              {colorLabels[key] || key}
              <input
                type="color"
                value={value}
                onChange={(event) => setAvatar({
                  ...avatar,
                  colors: {
                    ...avatar.colors,
                    [key]: event.target.value
                  }
                })}
              />
            </label>
          ))}
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar ovo"}
        </button>
      </form>
    </section>
  );
}
