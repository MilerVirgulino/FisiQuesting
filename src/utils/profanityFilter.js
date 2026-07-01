const blockedWords = [
  "arrombado",
  "bosta",
  "burro",
  "caralho",
  "cu",
  "fdp",
  "foda",
  "idiota",
  "merda",
  "otario",
  "porra",
  "puta",
  "retardado",
  "viado"
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[@4]/g, "a")
    .replace(/[!1]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[$5]/g, "s");
}

export function findBlockedWord(text) {
  const normalized = normalizeText(text);
  return blockedWords.find((word) => new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`, "i").test(normalized)) || "";
}

export function hasProfanity(text) {
  return Boolean(findBlockedWord(text));
}
