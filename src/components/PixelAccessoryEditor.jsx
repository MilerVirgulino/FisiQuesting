import React, { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Eraser, Hand, Minus, PaintBucket, Pencil, Pipette, Square, Trash2 } from "lucide-react";

const DEFAULT_GRID_SIZE = 128;
const RESOLUTION_OPTIONS = [32, 64, 128];
const EXPORT_SIZE = 256;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;
const EMPTY_PIXEL = "";
const PALETTE = [
  "#111827",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#92400e",
  "#94a3b8"
];

function pixelsToDataUrl(pixels, gridSize) {
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_SIZE;
  canvas.height = EXPORT_SIZE;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const pixelSize = EXPORT_SIZE / gridSize;

  context.clearRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);
  pixels.forEach((color, index) => {
    if (!color) return;
    const x = index % gridSize;
    const y = Math.floor(index / gridSize);
    context.fillStyle = color;
    context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
  });

  return canvas.toDataURL("image/png");
}

function fillPixels(pixels, startIndex, replacementColor, gridSize) {
  const targetColor = pixels[startIndex] || EMPTY_PIXEL;
  if (targetColor === replacementColor) return pixels;

  const nextPixels = [...pixels];
  const stack = [startIndex];
  const visited = new Set();

  while (stack.length) {
    const index = stack.pop();
    if (visited.has(index)) continue;
    visited.add(index);
    if ((nextPixels[index] || EMPTY_PIXEL) !== targetColor) continue;

    nextPixels[index] = replacementColor;
    const x = index % gridSize;
    const y = Math.floor(index / gridSize);

    if (x > 0) stack.push(index - 1);
    if (x < gridSize - 1) stack.push(index + 1);
    if (y > 0) stack.push(index - gridSize);
    if (y < gridSize - 1) stack.push(index + gridSize);
  }

  return nextPixels;
}

function indexToPoint(index, gridSize) {
  return {
    x: index % gridSize,
    y: Math.floor(index / gridSize)
  };
}

function pointToIndex(x, y, gridSize) {
  return y * gridSize + x;
}

function getLineIndexes(startIndex, endIndex, gridSize) {
  const start = indexToPoint(startIndex, gridSize);
  const end = indexToPoint(endIndex, gridSize);
  const indexes = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let error = dx - dy;

  while (true) {
    indexes.push(pointToIndex(x, y, gridSize));
    if (x === end.x && y === end.y) break;
    const doubleError = error * 2;
    if (doubleError > -dy) {
      error -= dy;
      x += sx;
    }
    if (doubleError < dx) {
      error += dx;
      y += sy;
    }
  }

  return indexes;
}

function getRectangleIndexes(startIndex, endIndex, gridSize) {
  const start = indexToPoint(startIndex, gridSize);
  const end = indexToPoint(endIndex, gridSize);
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const indexes = new Set();

  for (let x = minX; x <= maxX; x += 1) {
    indexes.add(pointToIndex(x, minY, gridSize));
    indexes.add(pointToIndex(x, maxY, gridSize));
  }

  for (let y = minY; y <= maxY; y += 1) {
    indexes.add(pointToIndex(minX, y, gridSize));
    indexes.add(pointToIndex(maxX, y, gridSize));
  }

  return Array.from(indexes);
}

function getCircleIndexes(startIndex, endIndex, gridSize) {
  const start = indexToPoint(startIndex, gridSize);
  const end = indexToPoint(endIndex, gridSize);
  const centerX = Math.round((start.x + end.x) / 2);
  const centerY = Math.round((start.y + end.y) / 2);
  const radiusX = Math.max(1, Math.abs(end.x - start.x) / 2);
  const radiusY = Math.max(1, Math.abs(end.y - start.y) / 2);
  const steps = Math.max(16, Math.ceil(Math.max(radiusX, radiusY) * 8));
  const indexes = new Set();

  for (let step = 0; step < steps; step += 1) {
    const angle = (Math.PI * 2 * step) / steps;
    const x = Math.round(centerX + Math.cos(angle) * radiusX);
    const y = Math.round(centerY + Math.sin(angle) * radiusY);
    if (x >= 0 && y >= 0 && x < gridSize && y < gridSize) {
      indexes.add(pointToIndex(x, y, gridSize));
    }
  }

  return Array.from(indexes);
}

function getShapeIndexes(tool, startIndex, endIndex, gridSize) {
  if (tool === "line") return getLineIndexes(startIndex, endIndex, gridSize);
  if (tool === "rectangle") return getRectangleIndexes(startIndex, endIndex, gridSize);
  if (tool === "circle") return getCircleIndexes(startIndex, endIndex, gridSize);
  return [];
}

function applyIndexes(basePixels, indexes, activeTool, activeColor) {
  const nextPixels = [...basePixels];
  indexes.forEach((index) => {
    if (index < 0 || index >= nextPixels.length) return;
    nextPixels[index] = activeTool === "eraser" ? EMPTY_PIXEL : activeColor;
  });
  return nextPixels;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

function readPixelDraft(storageKey) {
  if (!storageKey || !canUseLocalStorage()) return null;

  try {
    const draft = JSON.parse(window.localStorage.getItem(storageKey) || "null");
    if (!draft?.pixels || !draft?.gridSize) return null;
    if (draft.pixels.length !== draft.gridSize * draft.gridSize) return null;
    return draft;
  } catch {
    return null;
  }
}

function writePixelDraft(storageKey, gridSize, pixels) {
  if (!storageKey || !canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify({ gridSize, pixels, savedAt: Date.now() }));
  } catch {
    // Local draft is a convenience. If storage is full, drawing still works.
  }
}

function clearPixelDraft(storageKey) {
  if (storageKey && canUseLocalStorage()) {
    window.localStorage.removeItem(storageKey);
  }
}

export default function PixelAccessoryEditor({ onChange, storageKey, clearDraftToken = 0, showGuide = true }) {
  const restoredDraft = readPixelDraft(storageKey);
  const initialGridSize = restoredDraft?.gridSize || DEFAULT_GRID_SIZE;
  const initialPixels = restoredDraft?.pixels || Array(initialGridSize * initialGridSize).fill(EMPTY_PIXEL);
  const [gridSize, setGridSize] = useState(initialGridSize);
  const [pixels, setPixels] = useState(() => initialPixels);
  const [previewPixels, setPreviewPixels] = useState(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [tool, setTool] = useState("pencil");
  const [drawing, setDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);
  const pixelsRef = useRef(pixels);
  const lastPaintedIndexRef = useRef(null);
  const shapeStartIndexRef = useRef(null);
  const panStartRef = useRef(null);
  const paintedCount = useMemo(() => pixels.filter(Boolean).length, [pixels]);
  const displayPixels = previewPixels || pixels;
  const shapeTools = ["line", "rectangle", "circle"];
  const isShapeTool = shapeTools.includes(tool);

  useEffect(() => {
    if (restoredDraft?.pixels?.some(Boolean)) {
      onChange?.(pixelsToDataUrl(restoredDraft.pixels, restoredDraft.gridSize));
    }
    // The draft should be restored only on the first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!clearDraftToken) return;
    const emptyPixels = Array(DEFAULT_GRID_SIZE * DEFAULT_GRID_SIZE).fill(EMPTY_PIXEL);
    clearPixelDraft(storageKey);
    setGridSize(DEFAULT_GRID_SIZE);
    pixelsRef.current = emptyPixels;
    setPixels(emptyPixels);
    setPreviewPixels(null);
    shapeStartIndexRef.current = null;
    onChange?.(null);
  }, [clearDraftToken, onChange, storageKey]);

  function updatePixels(nextPixels, activeGridSize = gridSize) {
    pixelsRef.current = nextPixels;
    setPixels(nextPixels);
    writePixelDraft(storageKey, activeGridSize, nextPixels);
    onChange?.(pixelsToDataUrl(nextPixels, activeGridSize));
  }

  function paint(index) {
    if (index < 0 || index >= pixelsRef.current.length) return;

    if (tool === "eyedropper") {
      const pickedColor = pixelsRef.current[index];
      if (pickedColor) setColor(pickedColor);
      setTool("pencil");
      return;
    }

    if (tool === "fill") {
      updatePixels(fillPixels(pixelsRef.current, index, color, gridSize));
      return;
    }

    const nextPixels = [...pixelsRef.current];
    nextPixels[index] = tool === "eraser" ? EMPTY_PIXEL : color;
    updatePixels(nextPixels);
  }

  function getPointerIndex(event) {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return -1;

    const x = Math.floor(((event.clientX - bounds.left) / bounds.width) * gridSize);
    const y = Math.floor(((event.clientY - bounds.top) / bounds.height) * gridSize);
    if (x < 0 || y < 0 || x >= gridSize || y >= gridSize) return -1;

    return y * gridSize + x;
  }

  function paintFromPointer(event) {
    const index = getPointerIndex(event);
    if (index === -1 || lastPaintedIndexRef.current === index) return;
    const lastIndex = lastPaintedIndexRef.current;
    lastPaintedIndexRef.current = index;

    if (tool === "pencil" || tool === "eraser") {
      const indexes = lastIndex === null ? [index] : getLineIndexes(lastIndex, index, gridSize);
      updatePixels(applyIndexes(pixelsRef.current, indexes, tool, color));
      return;
    }

    paint(index);
  }

  function paintPointerPath(event) {
    const events = event.getCoalescedEvents?.() || [event];
    events.forEach((pointerEvent) => paintFromPointer(pointerEvent));
  }

  function updateShapePreview(event) {
    const endIndex = getPointerIndex(event);
    const startIndex = shapeStartIndexRef.current;
    if (startIndex === null || endIndex === -1) return;
    setPreviewPixels(applyIndexes(pixelsRef.current, getShapeIndexes(tool, startIndex, endIndex, gridSize), tool, color));
  }

  function commitShape(event) {
    const endIndex = getPointerIndex(event);
    const startIndex = shapeStartIndexRef.current;
    if (startIndex !== null && endIndex !== -1) {
      updatePixels(applyIndexes(pixelsRef.current, getShapeIndexes(tool, startIndex, endIndex, gridSize), tool, color));
    }
    shapeStartIndexRef.current = null;
    setPreviewPixels(null);
  }

  function clearPixels() {
    setPreviewPixels(null);
    shapeStartIndexRef.current = null;
    updatePixels(Array(gridSize * gridSize).fill(EMPTY_PIXEL));
  }

  function changeZoom(nextZoom) {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)));
  }

  function changeResolution(nextGridSize) {
    if (nextGridSize === gridSize) return;
    const emptyPixels = Array(nextGridSize * nextGridSize).fill(EMPTY_PIXEL);
    setGridSize(nextGridSize);
    setPreviewPixels(null);
    shapeStartIndexRef.current = null;
    pixelsRef.current = emptyPixels;
    setPixels(emptyPixels);
    writePixelDraft(storageKey, nextGridSize, emptyPixels);
    onChange?.(null);
  }

  function startPan(event) {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: scrollElement.scrollLeft,
      scrollTop: scrollElement.scrollTop
    };
  }

  function movePan(event) {
    const scrollElement = scrollRef.current;
    const panStart = panStartRef.current;
    if (!scrollElement || !panStart) return;

    scrollElement.scrollLeft = panStart.scrollLeft - (event.clientX - panStart.x);
    scrollElement.scrollTop = panStart.scrollTop - (event.clientY - panStart.y);
  }

  function stopPan() {
    panStartRef.current = null;
  }

  return (
    <div className="pixel-editor">
      <div className="pixel-zoom-controls" aria-label="Controles de zoom do editor">
        <button type="button" onClick={() => changeZoom(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM} aria-label="Diminuir zoom">
          -
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => changeZoom(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM} aria-label="Aumentar zoom">
          +
        </button>
      </div>

      <div className="pixel-resolution-row" role="group" aria-label="Resolucao da malha de pixels">
        <span>Malha</span>
        {RESOLUTION_OPTIONS.map((item) => (
          <button
            type="button"
            key={item}
            className={gridSize === item ? "active" : ""}
            onClick={() => changeResolution(item)}
          >
            {item}x{item}
          </button>
        ))}
      </div>

      <div className="pixel-color-row">
        <label className="pixel-color-picker">
          <span>Cor livre</span>
          <input
            type="color"
            value={color}
            onChange={(event) => {
              setColor(event.target.value);
              setTool("pencil");
            }}
            aria-label="Selecionar cor livre"
          />
        </label>

        <div className="pixel-palette" aria-label="Paleta de cores">
          {PALETTE.map((item) => (
            <button
              type="button"
              className={color.toLowerCase() === item ? "active" : ""}
              key={item}
              onClick={() => {
                setColor(item);
                setTool("pencil");
              }}
              style={{ "--swatch-color": item }}
              aria-label={`Cor ${item}`}
            />
          ))}
        </div>
      </div>

      <div className="pixel-workbench">
        <div className="pixel-layer-note">
          <strong>Camada de desenho</strong>
          <span>{showGuide ? "O corpo aparece por baixo so como guia." : "Desenho livre, sem guia por baixo."}</span>
        </div>

        <div className="pixel-workspace">
          <div className="pixel-editor-toolbar" aria-label="Ferramentas do editor">
            <div className="pixel-tool-group" role="group" aria-label="Ferramentas de pixelart">
              <button type="button" className={tool === "pencil" ? "active" : ""} onClick={() => setTool("pencil")} aria-label="Pincel" title="Pincel"><Pencil size={18} /></button>
              <button type="button" className={tool === "fill" ? "active" : ""} onClick={() => setTool("fill")} aria-label="Balde" title="Balde"><PaintBucket size={18} /></button>
              <button type="button" className={tool === "eyedropper" ? "active" : ""} onClick={() => setTool("eyedropper")} aria-label="Conta-gotas" title="Conta-gotas"><Pipette size={18} /></button>
              <button type="button" className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")} aria-label="Borracha" title="Borracha"><Eraser size={18} /></button>
              <button type="button" className={tool === "pan" ? "active" : ""} onClick={() => setTool("pan")} aria-label="Mao" title="Mao"><Hand size={18} /></button>
              <button type="button" className={tool === "line" ? "active" : ""} onClick={() => setTool("line")} aria-label="Reta" title="Reta"><Minus size={18} /></button>
              <button type="button" className={tool === "rectangle" ? "active" : ""} onClick={() => setTool("rectangle")} aria-label="Retangulo" title="Retangulo"><Square size={18} /></button>
              <button type="button" className={tool === "circle" ? "active" : ""} onClick={() => setTool("circle")} aria-label="Circulo" title="Circulo"><Circle size={18} /></button>
            </div>
            <button type="button" className="secondary pixel-clear-tool" onClick={clearPixels} aria-label="Limpar" title="Limpar"><Trash2 size={18} /></button>
          </div>

          <div className="pixel-canvas-scroll" ref={scrollRef}>
            <div
              ref={canvasRef}
              className={`pixel-canvas-wrap pixel-tool-${tool}`}
              style={{
                "--pixel-zoom": zoom
              }}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture?.(event.pointerId);
                if (tool === "pan") {
                  setDrawing(true);
                  startPan(event);
                  return;
                }
                setDrawing(true);
                lastPaintedIndexRef.current = null;
                if (isShapeTool) {
                  shapeStartIndexRef.current = getPointerIndex(event);
                  updateShapePreview(event);
                  return;
                }
                paintPointerPath(event);
              }}
              onPointerMove={(event) => {
                if (drawing && tool === "pan") {
                  movePan(event);
                  return;
                }
                if (!drawing || tool === "fill" || tool === "eyedropper") return;
                if (isShapeTool) {
                  updateShapePreview(event);
                  return;
                }
                paintPointerPath(event);
              }}
              onPointerLeave={() => {
                setDrawing(false);
                stopPan();
                lastPaintedIndexRef.current = null;
                if (isShapeTool) {
                  shapeStartIndexRef.current = null;
                  setPreviewPixels(null);
                }
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture?.(event.pointerId);
                if (tool === "pan") {
                  stopPan();
                }
                if (isShapeTool) {
                  commitShape(event);
                }
                setDrawing(false);
                lastPaintedIndexRef.current = null;
              }}
            >
              {showGuide && <img className="pixel-reference-layer" src="/assets/egg-sprites/base/chibi_body.png" alt="" />}
              <div
                className="pixel-grid"
                style={{
                  "--pixel-grid-size": gridSize,
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`
                }}
                aria-hidden="true"
              >
                {displayPixels.map((pixelColor, index) => (
                  <span key={index} style={{ backgroundColor: pixelColor || "transparent" }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <small>{paintedCount} pixels desenhados. A camada enviada sera apenas o acessorio, com fundo transparente.</small>
    </div>
  );
}
