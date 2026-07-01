import React, { useEffect, useState } from "react";
import { defaultAvatar, getAvatarOption, loadAvatarCatalog, usesPngSprite } from "../services/avatarCatalogService";
import { normalizeAvatarLayerOrder } from "../utils/avatarLayers";

function normalizeAvatar(avatar) {
  return {
    ...defaultAvatar,
    ...(avatar || {}),
    shirts: avatar?.shirts || avatar?.outfit || defaultAvatar.shirts,
    mouths: avatar?.mouths || avatar?.mouth || defaultAvatar.mouths,
    pants: avatar?.pants || defaultAvatar.pants,
    shoes: avatar?.shoes || defaultAvatar.shoes,
    pets: avatar?.pets || defaultAvatar.pets,
    accessories2: avatar?.accessories2 || defaultAvatar.accessories2,
    layerOrder: normalizeAvatarLayerOrder(avatar?.layerOrder)
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
  const hasPngShoes = usesPngSprite(activeCatalog, "shoes", normalized.shoes);
  const hasPngAccessories = usesPngSprite(activeCatalog, "accessories", normalized.accessories);
  const hasPngAccessories2 = usesPngSprite(activeCatalog, "accessories", normalized.accessories2);
  const hasPngPets = usesPngSprite(activeCatalog, "pets", normalized.pets);
  const layers = {
    base: hasPngBase ? <EggSpriteLayer key="base" catalog={activeCatalog} category="base" id={normalized.base} /> : null,
    hair: hasPngHair ? <EggSpriteLayer key="hair" catalog={activeCatalog} category="hair" id={normalized.hair} /> : null,
    eyes: hasPngEyes ? <EggSpriteLayer key="eyes" catalog={activeCatalog} category="eyes" id={normalized.eyes} /> : null,
    mouths: hasPngMouth ? <EggSpriteLayer key="mouths" catalog={activeCatalog} category="mouths" id={normalized.mouths} /> : null,
    shirts: hasPngShirt ? <EggSpriteLayer key="shirts" catalog={activeCatalog} category="shirts" id={normalized.shirts} /> : null,
    pants: hasPngPants ? <EggSpriteLayer key="pants" catalog={activeCatalog} category="pants" id={normalized.pants} /> : null,
    shoes: hasPngShoes ? <EggSpriteLayer key="shoes" catalog={activeCatalog} category="shoes" id={normalized.shoes} /> : null,
    accessories: (
      <React.Fragment key="accessories">
        {hasPngAccessories ? <EggSpriteLayer catalog={activeCatalog} category="accessories" id={normalized.accessories} /> : null}
        {hasPngAccessories2 ? <EggSpriteLayer catalog={activeCatalog} category="accessories" id={normalized.accessories2} /> : null}
      </React.Fragment>
    ),
    pets: hasPngPets ? <EggSpriteLayer key="pets" catalog={activeCatalog} category="pets" id={normalized.pets} /> : null
  };

  return (
    <div className="modular-avatar-preview egg-avatar-preview" style={{ width: size, height: size }}>
      <svg viewBox="0 0 256 256" role="img" aria-label="Avatar chibi cabecao">
        <ellipse cx="128" cy="229" rx="56" ry="10" fill="#000000" opacity="0.08" />
        {layers.base}
        {layers.hair}
        {layers.eyes}
        {layers.mouths}
        {normalized.layerOrder.map((categoryKey) => layers[categoryKey])}
      </svg>
    </div>
  );
}
