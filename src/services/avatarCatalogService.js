import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase-init";
import { colorsToPixelData, getRenderablePixelArtSrc } from "../utils/pixelArt";

const CACHE_KEY = "fisioquest.avatarCatalog.v4";
const CACHE_TTL_MS = 1000 * 60 * 10;

const categoryDefinitions = [
  { key: "base", label: "Base", folder: "base", defaultId: "" },
  { key: "hair", label: "Cabelo", folder: "hair", defaultId: "hair_none" },
  { key: "shirts", label: "Camisa", folder: "shirts", defaultId: "shirt_none" },
  { key: "eyes", label: "Olhos", folder: "eyes", defaultId: "eyes_none" },
  { key: "mouths", label: "Bocas", folder: "mouths", defaultId: "mouth_none" },
  { key: "accessories", label: "Acessorios", folder: "accessories", defaultId: "accessories_none" },
  { key: "pants", label: "Calcas", folder: "pants", defaultId: "pants_none" },
  { key: "shoes", label: "Sapatos", folder: "shoes", defaultId: "shoes_none" },
  { key: "pets", label: "Pets", folder: "pets", defaultId: "pets_none" },
  { key: "emojis", label: "Emojis", folder: "emojis", defaultId: "emojis_none", visible: false, shopVisible: true }
];

function makeFotonizePixelData() {
  const size = 32;
  const pixels = Array(size * size).fill("");

  function paintRect(x, y, width, height, color) {
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) {
        if (row >= 0 && row < size && col >= 0 && col < size) {
          pixels[row * size + col] = color;
        }
      }
    }
  }

  function paintPoints(points, color) {
    points.forEach(([x, y]) => {
      if (y >= 0 && y < size && x >= 0 && x < size) {
        pixels[y * size + x] = color;
      }
    });
  }

  const outline = "#3b2a16";
  const skin = "#ffd36b";
  const shadow = "#f3a43a";
  const shine = "#fff1a8";
  const spark = "#fff35c";
  const sparkShadow = "#f59e0b";

  paintRect(8, 14, 5, 11, outline);
  paintRect(9, 15, 3, 9, skin);
  paintRect(6, 15, 4, 10, outline);
  paintRect(7, 16, 2, 8, "#47c5ff");
  paintRect(9, 23, 3, 2, shadow);

  paintRect(12, 13, 11, 11, outline);
  paintRect(13, 14, 9, 9, skin);
  paintRect(14, 21, 8, 2, shadow);
  paintRect(14, 15, 6, 2, shine);

  paintRect(15, 9, 7, 6, outline);
  paintRect(16, 8, 5, 6, outline);
  paintRect(17, 7, 3, 7, outline);
  paintRect(17, 9, 4, 5, skin);
  paintRect(18, 8, 2, 2, shine);

  paintRect(22, 14, 4, 3, outline);
  paintRect(22, 18, 4, 3, outline);
  paintRect(22, 22, 3, 3, outline);
  paintRect(22, 15, 3, 1, skin);
  paintRect(22, 19, 3, 1, skin);
  paintRect(22, 23, 2, 1, skin);

  paintPoints([[5, 7], [5, 9], [4, 8], [6, 8]], spark);
  paintPoints([[26, 6], [26, 8], [25, 7], [27, 7]], spark);
  paintPoints([[27, 25], [27, 27], [26, 26], [28, 26]], spark);
  paintPoints([[4, 8], [25, 7], [26, 26]], sparkShadow);

  return colorsToPixelData(pixels, size, size);
}

const defaultItems = [
  { id: "hair_none", categoryKey: "hair", label: "Nenhum", source: "svg", price: 0, defaultItem: true, active: true },
  { id: "shirt_none", categoryKey: "shirts", label: "Nenhuma", source: "svg", price: 0, defaultItem: true, active: true },
  { id: "eyes_none", categoryKey: "eyes", label: "Nenhum", source: "svg", price: 0, defaultItem: true, active: true },
  { id: "mouth_none", categoryKey: "mouths", label: "Nenhuma", source: "svg", price: 0, defaultItem: true, active: true },
  { id: "accessories_none", categoryKey: "accessories", label: "Nenhum", source: "svg", price: 0, defaultItem: true, active: true },
  { id: "pants_none", categoryKey: "pants", label: "Nenhuma", source: "svg", price: 0, defaultItem: true, active: true },
  { id: "shoes_none", categoryKey: "shoes", label: "Nenhum", source: "svg", price: 0, defaultItem: true, active: true },
  { id: "pets_none", categoryKey: "pets", label: "Nenhum", source: "svg", price: 0, defaultItem: true, active: true },
  { id: "emojis_none", categoryKey: "emojis", label: "Nenhum", source: "svg", price: 0, defaultItem: true, active: true },
  {
    id: "emojis_fotonizar_placeholder",
    categoryKey: "emojis",
    label: "Joinha brilhante",
    source: "png",
    price: 0,
    defaultItem: true,
    active: true,
    pixelData: makeFotonizePixelData()
  }
];

let memoryCatalog = null;
let loadingCatalog = null;

export const defaultAvatar = Object.fromEntries(categoryDefinitions.map((category) => [category.key, category.defaultId]));
defaultAvatar.kind = "chibi";

function canUseLocalStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

function readCachedCatalog() {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached?.catalog || Date.now() - Number(cached.cachedAt || 0) > CACHE_TTL_MS) return null;
    return cached.catalog;
  } catch {
    return null;
  }
}

function writeCachedCatalog(catalog) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), catalog }));
  } catch {
    // Cache is an optimization. If storage is full or unavailable, the app still works.
  }
}

export function clearAvatarCatalogCache() {
  memoryCatalog = null;
  loadingCatalog = null;
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(CACHE_KEY);
  }
}

function normalizeItem(docId, data) {
  const category = categoryDefinitions.find((item) => item.key === data.categoryKey);
  const id = data.itemId || data.id || docId;
  const source = data.source || (data.src ? "png" : "svg");

  return {
    id,
    itemId: id,
    categoryKey: data.categoryKey,
    categoryLabel: data.categoryLabel || category?.label || data.categoryKey,
    folder: data.folder || category?.folder || data.categoryKey,
    label: data.label || id,
    source,
    src: data.src || "",
    imageDataUrl: data.imageDataUrl || "",
    pixelData: data.pixelData || null,
    price: Number(data.price || 0),
    active: data.active !== false,
    defaultItem: Boolean(data.defaultItem),
    createdFromRequestId: data.createdFromRequestId || "",
    creatorId: data.creatorId || data.authorId || data.userId || "",
    creatorName: data.creatorName || data.authorName || data.userName || data.ownerNickname || ""
  };
}

function buildCatalog(items) {
  const byCategory = Object.fromEntries(
    categoryDefinitions.map((category) => [
      category.key,
      {
        ...category,
        items: {}
      }
    ])
  );

  [...defaultItems, ...items].forEach((item) => {
    if (!item.active) return;
    const category = byCategory[item.categoryKey];
    if (!category) return;

    category.items[item.id] = {
      ...item,
      src: getItemSrc(item)
    };
  });

  return {
    defaultAvatar,
    categories: categoryDefinitions,
    byCategory
  };
}

export function getItemSrc(item) {
  if (!item || item.source === "svg") return "";
  if (item.pixelData || item.imageDataUrl || item.src) {
    return getRenderablePixelArtSrc(item);
  }
  return "";
}

export async function loadAvatarCatalog({ force = false } = {}) {
  if (!force && memoryCatalog) return memoryCatalog;

  if (!force) {
    const cached = readCachedCatalog();
    if (cached) {
      memoryCatalog = cached;
      return cached;
    }
  }

  if (!force && loadingCatalog) return loadingCatalog;

  loadingCatalog = Promise.allSettled([
    getDocs(collection(db, "avatarItems")),
    getDocs(query(collection(db, "customAccessoryRequests"), where("status", "==", "listed")))
  ])
    .then((results) => {
      const [avatarItemsResult, requestsResult] = results;
      const firebaseItems = avatarItemsResult.status === "fulfilled"
        ? avatarItemsResult.value.docs.map((item) => normalizeItem(item.id, item.data()))
        : [];
      const listedRequests = requestsResult.status === "fulfilled"
        ? requestsResult.value.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => item.status === "listed")
          .map((item) => normalizeItem(item.id, {
            itemId: item.shopItemId,
            categoryKey: item.shopCategoryKey || "accessories",
            categoryLabel: item.shopCategoryLabel,
            folder: item.shopFolder,
            label: item.title,
            description: item.description,
            source: "png",
            imageDataUrl: item.imageDataUrl,
            pixelData: item.pixelData || null,
            price: item.shopPrice,
            active: true,
            createdFromRequestId: item.id,
            userId: item.userId,
            userName: item.userName
          }))
        : [];
      const allItems = [...firebaseItems, ...listedRequests]
        .sort((a, b) => a.categoryKey.localeCompare(b.categoryKey) || a.label.localeCompare(b.label));
      const catalog = buildCatalog(allItems);
      memoryCatalog = catalog;
      writeCachedCatalog(catalog);
      return catalog;
    })
    .finally(() => {
      loadingCatalog = null;
    });

  return loadingCatalog;
}

export function getAvatarCategories(catalog) {
  return (catalog?.categories || categoryDefinitions)
    .filter((category) => category.visible !== false)
    .map(({ key, label }) => ({ key, label }));
}

export function getAvatarShopCategories(catalog) {
  return (catalog?.categories || categoryDefinitions)
    .filter((category) => category.shopVisible !== false)
    .map(({ key, label }) => ({ key, label }));
}

export function getAvatarOptions(catalog, category) {
  const categoryData = catalog?.byCategory?.[category.key || category];
  if (!categoryData) return [];
  return Object.values(categoryData.items || {});
}

export function getAvatarOption(catalog, categoryKey, itemId) {
  return catalog?.byCategory?.[categoryKey]?.items?.[itemId] || null;
}

export function usesPngSprite(catalog, categoryKey, itemId) {
  const option = getAvatarOption(catalog, categoryKey, itemId);
  return Boolean(option && option.source !== "svg");
}

export function getAvatarItemPrice(catalog, categoryKey, itemId) {
  const option = getAvatarOption(catalog, categoryKey, itemId);
  return Number(option?.price || 0);
}

export function isFreeAvatarItem(catalog, categoryKey, itemId) {
  const option = getAvatarOption(catalog, categoryKey, itemId);
  return Boolean(option) && Number(option.price || 0) <= 0;
}

export function buildAvatarItemFromRequest(request, { price, categoryKey = "accessories" }) {
  const category = categoryDefinitions.find((item) => item.key === categoryKey) || categoryDefinitions.find((item) => item.key === "accessories");
  const itemId = String(request.title || request.fileName || category?.key || "item")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || `acessorio_${Date.now()}`;
  return {
    itemId,
    shopCategoryKey: category.key,
    shopCategoryLabel: category.label,
    shopFolder: category.folder,
    price: category.key === "base" ? 0 : Number(price || 0),
  };
}
