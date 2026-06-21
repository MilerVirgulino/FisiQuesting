export const PIXELART_TYPE = "pixelart";
export const TRANSPARENT_COLOR = "transparent";
export const DEFAULT_PIXELART_EXPORT_SIZE = 256;

export function validatePixelData(pixelData) {
  const errors = [];

  if (!pixelData || typeof pixelData !== "object") {
    return { valid: false, errors: ["Pixel art ausente ou invalida."] };
  }

  const width = Number(pixelData.width);
  const height = Number(pixelData.height);

  if (pixelData.type !== PIXELART_TYPE) {
    errors.push("Tipo de pixel art invalido.");
  }

  if (!Number.isInteger(width) || width <= 0) {
    errors.push("Largura invalida.");
  }

  if (!Number.isInteger(height) || height <= 0) {
    errors.push("Altura invalida.");
  }

  if (!Array.isArray(pixelData.palette) || pixelData.palette.length === 0) {
    errors.push("Paleta ausente ou vazia.");
  } else if (pixelData.palette[0] !== TRANSPARENT_COLOR) {
    errors.push("A primeira cor da paleta deve ser transparent.");
  }

  if (!Array.isArray(pixelData.pixels)) {
    errors.push("Array de pixels ausente.");
  } else if (Number.isInteger(width) && Number.isInteger(height) && pixelData.pixels.length !== width * height) {
    errors.push("Quantidade de pixels nao corresponde a width * height.");
  }

  if (Array.isArray(pixelData.palette) && Array.isArray(pixelData.pixels)) {
    const paletteLimit = pixelData.palette.length - 1;
    const invalidPixel = pixelData.pixels.find((item) => !Number.isInteger(item) || item < 0 || item > paletteLimit);
    if (invalidPixel !== undefined) {
      errors.push("Pixels contem indices fora da paleta.");
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function colorsToPixelData(colors, width, height = width) {
  const normalizedWidth = Number(width);
  const normalizedHeight = Number(height);

  if (!Array.isArray(colors)) {
    throw new Error("colors precisa ser um array.");
  }

  if (!Number.isInteger(normalizedWidth) || !Number.isInteger(normalizedHeight) || normalizedWidth <= 0 || normalizedHeight <= 0) {
    throw new Error("Dimensoes invalidas.");
  }

  if (colors.length !== normalizedWidth * normalizedHeight) {
    throw new Error("colors.length precisa ser igual a width * height.");
  }

  const palette = [TRANSPARENT_COLOR];
  const paletteIndexes = new Map([[TRANSPARENT_COLOR, 0]]);

  const pixels = colors.map((color) => {
    const normalizedColor = normalizePixelColor(color);
    if (!paletteIndexes.has(normalizedColor)) {
      paletteIndexes.set(normalizedColor, palette.length);
      palette.push(normalizedColor);
    }
    return paletteIndexes.get(normalizedColor);
  });

  return {
    type: PIXELART_TYPE,
    width: normalizedWidth,
    height: normalizedHeight,
    palette,
    pixels
  };
}

export function pixelDataToColors(pixelData) {
  const validation = validatePixelData(pixelData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  return pixelData.pixels.map((paletteIndex) => {
    const color = pixelData.palette[paletteIndex];
    return color === TRANSPARENT_COLOR ? "" : color;
  });
}

export function renderPixelDataToCanvas(pixelData, canvas, options = {}) {
  const validation = validatePixelData(pixelData);
  if (!validation.valid) {
    throw new Error(validation.errors.join(" "));
  }

  if (!canvas) {
    throw new Error("Canvas ausente.");
  }

  const exportWidth = Number(options.width || DEFAULT_PIXELART_EXPORT_SIZE);
  const exportHeight = Number(options.height || DEFAULT_PIXELART_EXPORT_SIZE);
  const context = canvas.getContext("2d");

  canvas.width = exportWidth;
  canvas.height = exportHeight;
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, exportWidth, exportHeight);

  const pixelWidth = exportWidth / pixelData.width;
  const pixelHeight = exportHeight / pixelData.height;

  pixelData.pixels.forEach((paletteIndex, index) => {
    const color = pixelData.palette[paletteIndex];
    if (!color || color === TRANSPARENT_COLOR) return;

    const x = index % pixelData.width;
    const y = Math.floor(index / pixelData.width);
    context.fillStyle = color;
    context.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight);
  });

  return canvas;
}

export function pixelDataToDataUrl(pixelData, options = {}) {
  if (typeof document === "undefined") {
    return "";
  }

  const canvas = document.createElement("canvas");
  renderPixelDataToCanvas(pixelData, canvas, options);
  return canvas.toDataURL(options.mimeType || "image/png");
}

export function getRenderablePixelArtSrc({ pixelData, imageDataUrl, src } = {}, options = {}) {
  if (pixelData) {
    const validation = validatePixelData(pixelData);
    if (validation.valid) {
      return pixelDataToDataUrl(pixelData, options);
    }
  }

  return imageDataUrl || src || "";
}

export function isLegacyBase64Image(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

function normalizePixelColor(color) {
  if (!color || color === TRANSPARENT_COLOR) return TRANSPARENT_COLOR;
  return String(color).trim();
}
