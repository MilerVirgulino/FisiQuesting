import React, { useEffect, useState } from "react";
import { defaultAvatar, getAvatarOption, loadAvatarCatalog, usesPngSprite } from "../services/avatarCatalogService";

const LOCAL_CHIBI_BASE_SRC = "/assets/egg-sprites/base/chibi_body.png";

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

export default function AvatarPreview({ avatar, size = 128 }) {
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
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
  }, []);

  const normalized = normalizeAvatar(avatar);
  const hasPngBase = usesPngSprite(catalog, "base", normalized.base);
  const hasPngHair = usesPngSprite(catalog, "hair", normalized.hair);
  const hasPngEyes = usesPngSprite(catalog, "eyes", normalized.eyes);
  const hasPngMouth = usesPngSprite(catalog, "mouths", normalized.mouths);
  const hasPngShirt = usesPngSprite(catalog, "shirts", normalized.shirts);
  const hasPngPants = usesPngSprite(catalog, "pants", normalized.pants);
  const hasPngAccessories = usesPngSprite(catalog, "accessories", normalized.accessories);
  const hasPngPets = usesPngSprite(catalog, "pets", normalized.pets);

  return (
    <div className="modular-avatar-preview egg-avatar-preview" style={{ width: size, height: size }}>
      <svg viewBox="0 0 256 256" role="img" aria-label="Avatar chibi cabecao">
        <ellipse cx="128" cy="229" rx="56" ry="10" fill="#000000" opacity="0.08" />
        {hasPngBase ? (
          <EggSpriteLayer catalog={catalog} category="base" id={normalized.base} />
        ) : (
          <image href={LOCAL_CHIBI_BASE_SRC} x="0" y="0" width="256" height="256" preserveAspectRatio="xMidYMid meet" style={{ imageRendering: "pixelated" }} />
        )}
        {hasPngHair ? <EggSpriteLayer catalog={catalog} category="hair" id={normalized.hair} /> : null}
        {hasPngEyes ? <EggSpriteLayer catalog={catalog} category="eyes" id={normalized.eyes} /> : null}
        {hasPngMouth ? <EggSpriteLayer catalog={catalog} category="mouths" id={normalized.mouths} /> : null}
        {normalized.eyes !== "eyes_none" && (
          <>
            <ellipse cx="89" cy="127" rx="10" ry="5" fill="#fb7185" opacity="0.35" />
            <ellipse cx="167" cy="127" rx="10" ry="5" fill="#fb7185" opacity="0.35" />
          </>
        )}
        {hasPngShirt ? <EggSpriteLayer catalog={catalog} category="shirts" id={normalized.shirts} /> : null}
        {hasPngPants ? <EggSpriteLayer catalog={catalog} category="pants" id={normalized.pants} /> : null}
        {hasPngAccessories ? <EggSpriteLayer catalog={catalog} category="accessories" id={normalized.accessories} /> : null}
        {hasPngPets ? <EggSpriteLayer catalog={catalog} category="pets" id={normalized.pets} /> : null}
      </svg>
    </div>
  );
}
