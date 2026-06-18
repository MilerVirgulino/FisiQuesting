import React from "react";
import { defaultAvatar, getAvatarOption, usesPngSprite } from "../data/avatarItems";

function normalizeAvatar(avatar) {
  return {
    ...defaultAvatar,
    ...(avatar || {}),
    colors: {
      ...defaultAvatar.colors,
      ...(avatar?.colors || {})
    }
  };
}

function EggPattern({ avatar }) {
  const accent = avatar.colors.accent;

  if (avatar.base === "egg_spots") {
    return (
      <>
        <circle cx="86" cy="92" r="9" fill={accent} opacity="0.38" />
        <circle cx="132" cy="68" r="7" fill={accent} opacity="0.32" />
        <circle cx="158" cy="124" r="10" fill={accent} opacity="0.3" />
        <circle cx="103" cy="154" r="6" fill={accent} opacity="0.28" />
      </>
    );
  }

  if (avatar.base === "egg_stripes") {
    return (
      <>
        <path d="M67 102 C95 116 143 116 172 101" fill="none" stroke={accent} strokeWidth="8" opacity="0.38" />
        <path d="M61 141 C93 158 148 158 181 140" fill="none" stroke={accent} strokeWidth="8" opacity="0.34" />
      </>
    );
  }

  if (avatar.base === "egg_shell") {
    return (
      <path
        d="M76 67 L91 78 L104 65 L119 80 L133 66 L147 81 L161 68"
        fill="none"
        stroke={accent}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    );
  }

  return null;
}

function EggEyes({ type }) {
  if (type === "eyes_happy") {
    return (
      <>
        <path d="M92 105 Q104 94 116 105" fill="none" stroke="#1f2937" strokeWidth="7" strokeLinecap="round" />
        <path d="M140 105 Q152 94 164 105" fill="none" stroke="#1f2937" strokeWidth="7" strokeLinecap="round" />
      </>
    );
  }

  if (type === "eyes_sleepy") {
    return (
      <>
        <path d="M91 103 Q104 109 117 103" fill="none" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
        <path d="M139 103 Q152 109 165 103" fill="none" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
      </>
    );
  }

  if (type === "eyes_star") {
    return (
      <>
        <path d="M104 88 L109 99 L121 100 L112 108 L115 120 L104 114 L93 120 L96 108 L87 100 L99 99 Z" fill="#1f2937" />
        <path d="M152 88 L157 99 L169 100 L160 108 L163 120 L152 114 L141 120 L144 108 L135 100 L147 99 Z" fill="#1f2937" />
      </>
    );
  }

  return (
    <>
      <ellipse cx="104" cy="104" rx="9" ry="13" fill="#1f2937" />
      <ellipse cx="152" cy="104" rx="9" ry="13" fill="#1f2937" />
      <circle cx="107" cy="99" r="3" fill="#ffffff" />
      <circle cx="155" cy="99" r="3" fill="#ffffff" />
    </>
  );
}

function EggMouth({ type }) {
  if (type === "mouth_o") {
    return <ellipse cx="128" cy="136" rx="9" ry="12" fill="#7f1d1d" />;
  }

  if (type === "mouth_calm") {
    return <path d="M116 136 Q128 141 140 136" fill="none" stroke="#7f1d1d" strokeWidth="5" strokeLinecap="round" />;
  }

  if (type === "mouth_grin") {
    return (
      <path
        d="M111 132 Q128 149 145 132 Q139 158 128 158 Q117 158 111 132 Z"
        fill="#ffffff"
        stroke="#7f1d1d"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    );
  }

  return <path d="M112 132 Q128 146 144 132" fill="none" stroke="#7f1d1d" strokeWidth="6" strokeLinecap="round" />;
}

function EggOutfit({ avatar }) {
  const color = avatar.colors.outfit;

  if (avatar.outfit === "outfit_scarf") {
    return (
      <>
        <path
          d="M70 148 C88 162 107 168 128 168 C149 168 168 162 186 148 C184 160 180 171 174 180 C145 191 111 191 82 180 C76 171 72 160 70 148 Z"
          fill={color}
          stroke="#1f2937"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M137 166 C148 174 158 189 164 211 C156 214 147 213 140 209 C137 190 132 178 122 168 Z"
          fill={color}
          stroke="#1f2937"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M82 160 C111 174 145 174 174 160" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
      </>
    );
  }

  if (avatar.outfit === "outfit_shirt") {
    return (
      <>
        <path
          d="M68 154 C83 173 104 184 128 184 C152 184 173 173 188 154 C187 175 181 196 170 213 C144 230 112 230 86 213 C75 196 69 175 68 154 Z"
          fill={color}
          stroke="#1f2937"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M103 158 C116 166 140 166 153 158" fill="none" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" />
        <path d="M82 183 C109 196 147 196 174 183" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
      </>
    );
  }

  if (avatar.outfit === "outfit_cape") {
    return (
      <>
        <path
          d="M79 145 C65 168 56 195 54 225 C75 219 95 211 111 199 C98 181 88 163 79 145 Z"
          fill={color}
          opacity="0.95"
          stroke="#1f2937"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M177 145 C191 168 200 195 202 225 C181 219 161 211 145 199 C158 181 168 163 177 145 Z"
          fill={color}
          opacity="0.95"
          stroke="#1f2937"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M80 146 C106 162 150 162 176 146" fill="none" stroke="#1f2937" strokeWidth="8" strokeLinecap="round" />
        <circle cx="96" cy="153" r="7" fill="#f8fafc" stroke="#1f2937" strokeWidth="4" />
        <circle cx="160" cy="153" r="7" fill="#f8fafc" stroke="#1f2937" strokeWidth="4" />
      </>
    );
  }

  return null;
}

function EggHair({ avatar }) {
  const color = avatar.colors.hair;

  if (avatar.hair === "hair_sprout") {
    return (
      <>
        <path d="M127 48 C119 29 130 19 144 16 C145 34 139 45 127 48 Z" fill="#22c55e" stroke="#1f2937" strokeWidth="5" />
        <path d="M128 50 C128 37 124 27 116 17" fill="none" stroke="#166534" strokeWidth="5" strokeLinecap="round" />
      </>
    );
  }

  if (avatar.hair === "hair_curl") {
    return <path d="M105 59 C112 37 151 38 148 62 C146 81 113 77 125 58" fill="none" stroke={color} strokeWidth="13" strokeLinecap="round" />;
  }

  if (avatar.hair === "hair_cap") {
    return (
      <>
        <path d="M80 65 C95 36 160 36 176 65 L169 83 L87 83 Z" fill={color} stroke="#1f2937" strokeWidth="5" />
        <path d="M78 78 C111 91 146 91 181 78" fill="none" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
      </>
    );
  }

  return null;
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
      <svg viewBox="0 0 256 256" role="img" aria-label="Avatar em formato de ovo">
        <ellipse cx="128" cy="132" rx="72" ry="98" fill="#000000" opacity="0.08" />
        {hasPngBase ? (
          <EggSpriteLayer category="base" id={normalized.base} />
        ) : (
          <>
            <path
              d="M128 28 C174 28 202 87 202 146 C202 201 169 232 128 232 C87 232 54 201 54 146 C54 87 82 28 128 28 Z"
              fill={normalized.colors.egg}
              stroke="#1f2937"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M88 54 C102 39 127 33 147 40"
              fill="none"
              stroke="#ffffff"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.35"
            />
            <EggPattern avatar={normalized} />
          </>
        )}
        {hasPngHair ? <EggSpriteLayer category="hair" id={normalized.hair} /> : <EggHair avatar={normalized} />}
        {hasPngEyes ? <EggSpriteLayer category="eyes" id={normalized.eyes} /> : <EggEyes type={normalized.eyes} />}
        {hasPngMouth ? <EggSpriteLayer category="mouth" id={normalized.mouth} /> : <EggMouth type={normalized.mouth} />}
        <ellipse cx="89" cy="127" rx="10" ry="5" fill="#fb7185" opacity="0.35" />
        <ellipse cx="167" cy="127" rx="10" ry="5" fill="#fb7185" opacity="0.35" />
        {hasPngOutfit ? <EggSpriteLayer category="outfit" id={normalized.outfit} /> : <EggOutfit avatar={normalized} />}
        {hasPngAccessories ? <EggSpriteLayer category="accessories" id={normalized.accessories} /> : null}
      </svg>
    </div>
  );
}
