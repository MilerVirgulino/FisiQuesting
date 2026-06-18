export const avatarItems = {
  egg: {
    base: {
      folder: "base",
      defaultId: "egg_plain",
      items: {
        egg_plain: { label: "Ovo simples", source: "svg" },
        egg_spots: { label: "Pintinhas", source: "svg" },
        egg_stripes: { label: "Listras", source: "svg" },
        egg_shell: { label: "Casca quebrada", source: "svg" }
      }
    },
    eyes: {
      folder: "eyes",
      defaultId: "eyes_dot",
      items: {
        eyes_dot: { label: "Pontinhos", source: "svg" },
        eyes_happy: { label: "Felizes", source: "svg" },
        eyes_sleepy: { label: "Sonolentos", source: "svg" },
        eyes_star: { label: "Estrela", source: "svg" }
      }
    },
    mouth: {
      folder: "mouths",
      defaultId: "mouth_smile",
      items: {
        mouth_smile: { label: "Sorriso", source: "svg" },
        mouth_o: { label: "Surpreso", source: "svg" },
        mouth_calm: { label: "Calmo", source: "svg" },
        mouth_grin: { label: "Animado", source: "svg" }
      }
    },
    outfit: {
      folder: "outfits",
      defaultId: "outfit_scarf",
      items: {
        outfit_none: { label: "Nenhuma", source: "svg" },
        outfit_scarf: { label: "Cachecol", source: "svg" },
        outfit_shirt: { label: "Camiseta", source: "svg" },
        outfit_cape: { label: "Capa", source: "svg" },
        outfit_teste: { label: "teste", source: "png" },
        gravata_borboleta: { label: "Gravata Borboleta", source: "png" }
      }
    },
    hair: {
      folder: "hair",
      defaultId: "hair_sprout",
      items: {
        hair_none: { label: "Nenhum", source: "svg" },
        hair_sprout: { label: "Broto", source: "svg" },
        hair_curl: { label: "Topete", source: "svg" },
        hair_cap: { label: "Gorro", source: "svg" }
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
  kind: "egg",
  base: "egg_plain",
  eyes: "eyes_dot",
  mouth: "mouth_smile",
  outfit: "outfit_scarf",
  hair: "hair_sprout",
  accessories: "accessories_none",
  colors: {
    egg: "#fff2c7",
    accent: "#38bdf8",
    outfit: "#2563eb",
    hair: "#3b2416"
  }
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
