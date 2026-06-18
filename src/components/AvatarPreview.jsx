import React from "react";
import { defaultAvatar, getAvatarOption, usesPngSprite } from "../data/avatarItems";

function normalizeAvatar(avatar) {
  return {
    ...defaultAvatar,
    ...(avatar || {})
  };
}

function AvatarSvgBase({ avatar }) {
  const skin = "#ffe7b4";

  return (
    <>
      <path
        d="M88 143 C74 166 65 191 58 211 C55 220 62 226 71 221 C83 214 91 193 99 169"
        fill={skin}
        stroke="#332414"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M168 143 C182 166 191 191 198 211 C201 220 194 226 185 221 C173 214 165 193 157 169"
        fill={skin}
        stroke="#332414"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M91 143 C99 131 114 126 128 126 C142 126 157 131 165 143 C177 164 179 205 170 234 C165 244 149 244 143 234 L137 192 C135 183 121 183 119 192 L113 234 C107 244 91 244 86 234 C77 205 79 164 91 143 Z"
        fill={skin}
        stroke="#332414"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path d="M113 119 C117 137 139 137 143 119 L143 146 C138 154 118 154 113 146 Z" fill={skin} stroke="#332414" strokeWidth="5" strokeLinejoin="round" />
      <path
        d="M128 9 C167 9 188 43 188 83 C188 125 163 147 128 147 C93 147 68 125 68 83 C68 43 89 9 128 9 Z"
        fill={skin}
        stroke="#332414"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d="M68 87 C56 86 51 96 53 108 C56 124 68 130 75 120"
        fill={skin}
        stroke="#332414"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M188 87 C200 86 205 96 203 108 C200 124 188 130 181 120"
        fill={skin}
        stroke="#332414"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M98 29 C86 45 79 69 79 101"
        fill="none"
        stroke="#fff6dc"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path d="M95 136 C113 147 143 147 161 136" fill="none" stroke="#d9a96d" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      <path d="M122 190 C126 196 130 196 134 190" fill="none" stroke="#d9a96d" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
    </>
  );
}

function EggSpriteLayer({ category, id }) {
  const option = getAvatarOption(category, id);

  if (!option || option.source === "svg") {
    return null;
  }

  return <image href={option.src} x="0" y="0" width="256" height="256" style={{ imageRendering: "pixelated" }} />;
}

export default function AvatarPreview({ avatar, size = 128 }) {
  const normalized = normalizeAvatar(avatar);
  const hasPngBase = usesPngSprite("base", normalized.base);
  const hasPngHair = usesPngSprite("hair", normalized.hair);
  const hasPngEyes = usesPngSprite("eyes", normalized.eyes);
  const hasPngMouth = usesPngSprite("mouth", normalized.mouth);
  const hasPngOutfit = usesPngSprite("outfit", normalized.outfit);
  const hasPngAccessories = usesPngSprite("accessories", normalized.accessories);

  return (
    <div className="modular-avatar-preview egg-avatar-preview" style={{ width: size, height: size }}>
      <svg viewBox="0 0 256 256" role="img" aria-label="Avatar chibi cabecao">
        <ellipse cx="128" cy="229" rx="56" ry="10" fill="#000000" opacity="0.08" />
        {hasPngBase ? (
          <EggSpriteLayer category="base" id={normalized.base} />
        ) : (
          <AvatarSvgBase avatar={normalized} />
        )}
        {hasPngHair ? <EggSpriteLayer category="hair" id={normalized.hair} /> : null}
        {hasPngEyes ? <EggSpriteLayer category="eyes" id={normalized.eyes} /> : null}
        {hasPngMouth ? <EggSpriteLayer category="mouth" id={normalized.mouth} /> : null}
        {normalized.eyes !== "eyes_none" && (
          <>
            <ellipse cx="89" cy="127" rx="10" ry="5" fill="#fb7185" opacity="0.35" />
            <ellipse cx="167" cy="127" rx="10" ry="5" fill="#fb7185" opacity="0.35" />
          </>
        )}
        {hasPngOutfit ? <EggSpriteLayer category="outfit" id={normalized.outfit} /> : null}
        {hasPngAccessories ? <EggSpriteLayer category="accessories" id={normalized.accessories} /> : null}
      </svg>
    </div>
  );
}
