export const avatarItems = {
  egg: {
    base: {
      folder: "base",
      defaultId: "chibi_body",
      items: {
        chibi_body: { label: "Chibi cabecao" }
      }
    },
    eyes: {
      folder: "eyes",
      defaultId: "eyes_none",
      items: {
        eyes_none: { label: "Nenhum", source: "svg" },
        eyes1_commum: { label: "Comum 1", source: "png" },
        eyes2_commum: { label: "Comum 2", source: "png" },
        eyes3_commum: { label: "Comum 3", source: "png" },
        
      }
    },
    mouth: {
      folder: "mouths",
      defaultId: "mouth_none",
      items: {
        mouth_none: { label: "Nenhum", source: "svg" }
      }
    },
    outfit: {
      folder: "outfits",
      defaultId: "outfit_none",
      items: {
        outfit_none: { label: "Nenhuma", source: "svg" }
      }
    },
    hair: {
      folder: "hair",
      defaultId: "hair_none",
      items: {
        hair_none: { label: "Nenhum", source: "svg" }
      }
    },
    accessories: {
      folder: "accessories",
      defaultId: "accessories_none",
      items: {
        accessories_none: { label: "Nenhum", source: "svg" }
      }
    }
  }
};

export const avatarCategories = [
  { key: "base", label: "Formato" },
  { key: "eyes", label: "Olhos" },
  { key: "mouth", label: "Boca" },
  { key: "outfit", label: "Roupa" },
  { key: "hair", label: "Cabelo" },
  { key: "accessories", label: "Acessorio" }
];

export const defaultAvatar = {
  kind: "chibi",
  base: "chibi_body",
  eyes: "eyes_none",
  mouth: "mouth_none",
  outfit: "outfit_none",
  hair: "hair_none",
  accessories: "accessories_none"
};

export function getAvatarOptions(category) {
  const categoryData = avatarItems.egg[category.key];

  if (!categoryData) {
    return [];
  }

  return Object.entries(categoryData.items).map(([id, item]) => ({
    id,
    ...item,
    src: getEggSpriteSrc(category.key, id)
  }));
}

export function getAvatarOption(categoryKey, itemId) {
  const categoryData = avatarItems.egg[categoryKey];
  const item = categoryData?.items?.[itemId];

  if (!categoryData || !item) {
    return null;
  }

  return {
    id: itemId,
    ...item,
    src: getEggSpriteSrc(categoryKey, itemId)
  };
}

export function getEggSpriteSrc(categoryKey, itemId) {
  const folder = avatarItems.egg[categoryKey]?.folder;

  if (!folder || !itemId) {
    return "";
  }

  return `/assets/egg-sprites/${folder}/${itemId}.png`;
}

export function usesPngSprite(categoryKey, itemId) {
  const option = getAvatarOption(categoryKey, itemId);

  return Boolean(option && option.source !== "svg");
}
