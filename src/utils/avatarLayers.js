export const adjustableAvatarLayerCategories = ["shirts", "pants", "shoes", "accessories", "pets"];

export function normalizeAvatarLayerOrder(order) {
  const received = Array.isArray(order) ? order : [];
  const cleanOrder = received.filter((categoryKey, index) => (
    adjustableAvatarLayerCategories.includes(categoryKey) && received.indexOf(categoryKey) === index
  ));

  return [
    ...cleanOrder,
    ...adjustableAvatarLayerCategories.filter((categoryKey) => !cleanOrder.includes(categoryKey))
  ];
}

export function moveAvatarLayer(order, categoryKey, direction) {
  const normalized = normalizeAvatarLayerOrder(order);
  const currentIndex = normalized.indexOf(categoryKey);
  if (currentIndex < 0) return normalized;

  const nextIndex = direction === "up" ? currentIndex + 1 : currentIndex - 1;
  if (nextIndex < 0 || nextIndex >= normalized.length) return normalized;

  const nextOrder = [...normalized];
  [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
  return nextOrder;
}
