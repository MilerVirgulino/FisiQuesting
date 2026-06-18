import avatarCatalog from "./avatarItems.json";

export const avatarItems = {
  egg: Object.fromEntries(
    avatarCatalog.categories.map((category) => [
      category.key,
      {
        folder: category.folder,
        defaultId: category.defaultId,
        items: category.items
      }
    ])
  )
};

export const avatarCategories = avatarCatalog.categories
  .filter((category) => category.visible !== false)
  .map(({ key, label }) => ({ key, label }));

export const defaultAvatar = avatarCatalog.defaultAvatar;

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

export function getAvatarItemPrice(categoryKey, itemId) {
  const option = getAvatarOption(categoryKey, itemId);

  return Number(option?.price || 0);
}

export function isFreeAvatarItem(categoryKey, itemId) {
  return getAvatarItemPrice(categoryKey, itemId) <= 0;
}
