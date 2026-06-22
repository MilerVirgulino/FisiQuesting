import React, { useEffect, useState } from "react";
import { defaultAvatar, getAvatarOption, loadAvatarCatalog, usesPngSprite } from "../services/avatarCatalogService";

function normalizeAvatar(avatar) {
  return {
    ...defaultAvatar,
    ...(avatar || {}),
    shirts: avatar?.shirts || avatar?.outfit || defaultAvatar.shirts,
    mouths: avatar?.mouths || avatar?.mouth || defaultAvatar.mouths,
    pants: avatar?.pants || defaultAvatar.pants,
    pets: avatar?.pets || defaultAvatar.pets
  };
}

function EggSpriteLayer({ catalog, category, id }) {
  const option = getAvatarOption(catalog, category, id);

  if (!option || option.source === "svg" || !option.src) {
    return null;
  }

  return <image href={option.src} x="0" y="0" width="256" height="256" preserveAspectRatio="xMidYMid meet" style={{ imageRendering: "pixelated" }} />;
}

export default function AvatarPreview({ avatar, size = 128, catalog: providedCatalog = null }) {
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    if (providedCatalog) {
      setCatalog(null);
      return undefined;
    }

    let active = true;
    loadAvatarCatalog()
      .then((loadedCatalog) => {
        if (active) setCatalog(loadedCatalog);
      })
      .catch(() => {
        if (active) setCatalog(null);
      });
    return () => {
      active = false;
    };
  }, [providedCatalog]);

  const normalized = normalizeAvatar(avatar);
  const activeCatalog = providedCatalog || catalog;
  if (activeCatalog?.categories) {
    activeCatalog.categories.forEach((category) => {
      const options = Object.values(activeCatalog.byCategory?.[category.key]?.items || {});
      if (options.length && !options.some((option) => option.id === normalized[category.key])) {
        normalized[category.key] = options[0].id;
      }
    });
  }
  const hasPngBase = usesPngSprite(activeCatalog, "base", normalized.base);
  const hasPngHair = usesPngSprite(activeCatalog, "hair", normalized.hair);
  const hasPngEyes = usesPngSprite(activeCatalog, "eyes", normalized.eyes);
  const hasPngMouth = usesPngSprite(activeCatalog, "mouths", normalized.mouths);
  const hasPngShirt = usesPngSprite(activeCatalog, "shirts", normalized.shirts);
  const hasPngPants = usesPngSprite(activeCatalog, "pants", normalized.pants);
  const hasPngAccessories = usesPngSprite(activeCatalog, "accessories", normalized.accessories);
  const hasPngPets = usesPngSprite(activeCatalog, "pets", normalized.pets);

  return (
    <div className="modular-avatar-preview egg-avatar-preview" style={{ width: size, height: size }}>
      <svg viewBox="0 0 256 256" role="img" aria-label="Avatar chibi cabecao">
        <ellipse cx="128" cy="229" rx="56" ry="10" fill="#000000" opacity="0.08" />
        {hasPngBase ? <EggSpriteLayer catalog={activeCatalog} category="base" id={normalized.base} /> : null}
        {hasPngHair ? <EggSpriteLayer catalog={activeCatalog} category="hair" id={normalized.hair} /> : null}
        {hasPngEyes ? <EggSpriteLayer catalog={activeCatalog} category="eyes" id={normalized.eyes} /> : null}
        {hasPngMouth ? <EggSpriteLayer catalog={activeCatalog} category="mouths" id={normalized.mouths} /> : null}
        {normalized.eyes !== "eyes_none" && (
          <>
            <ellipse cx="89" cy="127" rx="10" ry="5" fill="#fb7185" opacity="0.35" />
            <ellipse cx="167" cy="127" rx="10" ry="5" fill="#fb7185" opacity="0.35" />
          </>
        )}
        {hasPngShirt ? <EggSpriteLayer catalog={activeCatalog} category="shirts" id={normalized.shirts} /> : null}
        {hasPngPants ? <EggSpriteLayer catalog={activeCatalog} category="pants" id={normalized.pants} /> : null}
        {hasPngAccessories ? <EggSpriteLayer catalog={activeCatalog} category="accessories" id={normalized.accessories} /> : null}
        {hasPngPets ? <EggSpriteLayer catalog={activeCatalog} category="pets" id={normalized.pets} /> : null}
      </svg>
    </div>
  );
}
