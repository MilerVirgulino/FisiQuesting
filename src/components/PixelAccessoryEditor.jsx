import React, { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Eraser, Hand, Minus, PaintBucket, Pencil, Pipette, RotateCcw, SlidersHorizontal, Square, Trash2, X } from "lucide-react";
import { colorsToPixelData, pixelDataToColors } from "../utils/pixelArt";

const DEFAULT_GRID_SIZE = 128;
const RESOLUTION_OPTIONS = [32, 64, 128];
const BRUSH_SIZE_OPTIONS = [1, 4, 9, 16];
const MAX_HISTORY_STEPS = 25;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;
const OUTPUT_DEBOUNCE_MS = 120;
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

function getBrushIndexes(centerIndex, gridSize, brushSize) {
  const center = indexToPoint(centerIndex, gridSize);
  const pixelCount = Math.max(1, Number(brushSize || 1));
  const size = Math.max(1, Math.round(Math.sqrt(pixelCount)));
  const offsetStart = -Math.floor((size - 1) / 2);
  const offsetEnd = Math.ceil((size - 1) / 2);
  const indexes = [];

  for (let y = center.y + offsetStart; y <= center.y + offsetEnd; y += 1) {
    for (let x = center.x + offsetStart; x <= center.x + offsetEnd; x += 1) {
      if (x >= 0 && y >= 0 && x < gridSize && y < gridSize) {
        indexes.push(pointToIndex(x, y, gridSize));
      }
    }
  }

  return indexes;
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

function expandIndexesForBrush(indexes, gridSize, brushSize) {
  if (Number(brushSize || 1) <= 1) return indexes;
  const expanded = new Set();
  indexes.forEach((index) => {
    getBrushIndexes(index, gridSize, brushSize).forEach((brushIndex) => expanded.add(brushIndex));
  });
  return Array.from(expanded);
}

function applyIndexes(basePixels, indexes, activeTool, activeColor, gridSize, brushSize = 1) {
  const nextPixels = [...basePixels];
  const paintedIndexes = expandIndexesForBrush(indexes, gridSize, brushSize);
  paintedIndexes.forEach((index) => {
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

function buildEditorOutput(pixels, gridSize) {
  if (!pixels.some(Boolean)) {
    return null;
  }

  return colorsToPixelData(pixels, gridSize, gridSize);
}

function drawPixelsOnCanvas(canvas, pixels, gridSize) {
  const context = canvas?.getContext("2d");
  if (!context) return;

  const canvasSize = 512;
  if (canvas.width !== canvasSize) canvas.width = canvasSize;
  if (canvas.height !== canvasSize) canvas.height = canvasSize;

  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, canvasSize, canvasSize);

  const pixelSize = canvasSize / gridSize;
  pixels.forEach((pixelColor, index) => {
    if (!pixelColor) return;
    const x = index % gridSize;
    const y = Math.floor(index / gridSize);
    context.fillStyle = pixelColor;
    context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
  });
}

function getInitialDraft({ storageKey, initialPixelData }) {
  const restoredDraft = readPixelDraft(storageKey);
  if (restoredDraft) return restoredDraft;

  if (initialPixelData) {
    try {
      return {
        gridSize: initialPixelData.width,
        pixels: pixelDataToColors(initialPixelData),
        savedAt: Date.now()
      };
    } catch {
      return null;
    }
  }

  return null;
}

export default function PixelAccessoryEditor({ onPixelDataChange, storageKey, clearDraftToken = 0, showGuide = true, guideSrc = "", initialPixelData = null, initialPixelDataToken = "" }) {
  const restoredDraft = getInitialDraft({ storageKey, initialPixelData });
  const initialGridSize = restoredDraft?.gridSize || DEFAULT_GRID_SIZE;
  const initialPixels = restoredDraft?.pixels || Array(initialGridSize * initialGridSize).fill(EMPTY_PIXEL);
  const [gridSize, setGridSize] = useState(initialGridSize);
  const [pixels, setPixels] = useState(() => initialPixels);
  const [previewPixels, setPreviewPixels] = useState(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [tool, setTool] = useState("pencil");
  const [brushSize, setBrushSize] = useState(1);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const canvasWrapRef = useRef(null);
  const pixelCanvasRef = useRef(null);
  const scrollRef = useRef(null);
  const pixelsRef = useRef(pixels);
  const lastPaintedIndexRef = useRef(null);
  const shapeStartIndexRef = useRef(null);
  const panStartRef = useRef(null);
  const outputTimeoutRef = useRef(null);
  const historyRef = useRef([]);
  const paintedCount = useMemo(() => pixels.filter(Boolean).length, [pixels]);
  const displayPixels = previewPixels || pixels;
  const shapeTools = ["line", "rectangle", "circle"];
  const isShapeTool = shapeTools.includes(tool);

  useEffect(() => {
    if (restoredDraft?.pixels?.some(Boolean)) {
      scheduleEditorOutput(restoredDraft.pixels, restoredDraft.gridSize);
    }
    // The draft should be restored only on the first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (outputTimeoutRef.current) {
        window.clearTimeout(outputTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    drawPixelsOnCanvas(pixelCanvasRef.current, displayPixels, gridSize);
  }, [displayPixels, gridSize]);

  useEffect(() => {
    if (!clearDraftToken) return;
    const emptyPixels = Array(DEFAULT_GRID_SIZE * DEFAULT_GRID_SIZE).fill(EMPTY_PIXEL);
    clearPixelDraft(storageKey);
    setGridSize(DEFAULT_GRID_SIZE);
    pixelsRef.current = emptyPixels;
    setPixels(emptyPixels);
    setPreviewPixels(null);
    shapeStartIndexRef.current = null;
    historyRef.current = [];
    clearScheduledOutput();
    onPixelDataChange?.(null);
  }, [clearDraftToken, onPixelDataChange, storageKey]);

  useEffect(() => {
    if (!initialPixelDataToken || !initialPixelData) return;

    try {
      const nextPixels = pixelDataToColors(initialPixelData);
      const nextGridSize = initialPixelData.width;
      setGridSize(nextGridSize);
      pixelsRef.current = nextPixels;
      setPixels(nextPixels);
      setPreviewPixels(null);
      shapeStartIndexRef.current = null;
      historyRef.current = [];
      writePixelDraft(storageKey, nextGridSize, nextPixels);
      scheduleEditorOutput(nextPixels, nextGridSize);
    } catch {
      // Invalid imported art should not break the editor.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPixelDataToken]);

  function clearScheduledOutput() {
    if (outputTimeoutRef.current) {
      window.clearTimeout(outputTimeoutRef.current);
      outputTimeoutRef.current = null;
    }
  }

  function scheduleEditorOutput(nextPixels, activeGridSize = gridSize) {
    clearScheduledOutput();
    outputTimeoutRef.current = window.setTimeout(() => {
      onPixelDataChange?.(buildEditorOutput(nextPixels, activeGridSize));
      outputTimeoutRef.current = null;
    }, OUTPUT_DEBOUNCE_MS);
  }

  function updatePixels(nextPixels, activeGridSize = gridSize) {
    pixelsRef.current = nextPixels;
    setPixels(nextPixels);
    writePixelDraft(storageKey, activeGridSize, nextPixels);
    scheduleEditorOutput(nextPixels, activeGridSize);
  }

  function pushHistorySnapshot() {
    historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY_STEPS - 1)), pixelsRef.current];
  }

  function undoLastChange() {
    const previousPixels = historyRef.current.pop();
    if (!previousPixels) return;
    setPreviewPixels(null);
    shapeStartIndexRef.current = null;
    updatePixels(previousPixels);
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
      pushHistorySnapshot();
      updatePixels(fillPixels(pixelsRef.current, index, color, gridSize));
      return;
    }

    updatePixels(applyIndexes(pixelsRef.current, [index], tool, color, gridSize, brushSize));
  }

  function getPointerIndex(event) {
    const bounds = canvasWrapRef.current?.getBoundingClientRect();
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
      updatePixels(applyIndexes(pixelsRef.current, indexes, tool, color, gridSize, brushSize));
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
    setPreviewPixels(applyIndexes(pixelsRef.current, getShapeIndexes(tool, startIndex, endIndex, gridSize), tool, color, gridSize, brushSize));
  }

  function commitShape(event) {
    const endIndex = getPointerIndex(event);
    const startIndex = shapeStartIndexRef.current;
    if (startIndex !== null && endIndex !== -1) {
      updatePixels(applyIndexes(pixelsRef.current, getShapeIndexes(tool, startIndex, endIndex, gridSize), tool, color, gridSize, brushSize));
    }
    shapeStartIndexRef.current = null;
    setPreviewPixels(null);
  }

  function clearPixels() {
    setPreviewPixels(null);
    shapeStartIndexRef.current = null;
    pushHistorySnapshot();
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
    historyRef.current = [];
    pixelsRef.current = emptyPixels;
    setPixels(emptyPixels);
    writePixelDraft(storageKey, nextGridSize, emptyPixels);
    clearScheduledOutput();
    onPixelDataChange?.(null);
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
          <span>{showGuide && guideSrc ? "O corpo aparece por baixo so como guia." : "Desenho livre, sem guia por baixo."}</span>
        </div>

        <div className="pixel-workspace">
          {controlsOpen ? (
            <div className="pixel-editor-toolbar" aria-label="Ferramentas do editor">
              <div className="pixel-floating-toolbar-header">
                <span>Ferramentas</span>
                <button type="button" onClick={() => setControlsOpen(false)} aria-label="Esconder ferramentas" title="Esconder ferramentas">
                  <X size={16} />
                </button>
              </div>
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
              <div className="pixel-brush-control">
                <span>{brushSize} px</span>
                <div className="pixel-brush-buttons" role="group" aria-label="Area do pincel">
                  {BRUSH_SIZE_OPTIONS.map((size) => (
                    <button
                      type="button"
                      key={size}
                      className={brushSize === size ? "active" : ""}
                      onClick={() => setBrushSize(size)}
                      aria-label={`Pincel com ${size} pixels`}
                      title={`${size} pixels`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pixel-tool-actions">
                <button type="button" className="secondary pixel-clear-tool" onClick={undoLastChange} disabled={!historyRef.current.length} aria-label="Desfazer" title="Desfazer"><RotateCcw size={18} /></button>
                <button type="button" className="secondary pixel-clear-tool" onClick={clearPixels} aria-label="Limpar" title="Limpar"><Trash2 size={18} /></button>
              </div>
            </div>
          ) : (
            <button type="button" className="pixel-tool-fab" onClick={() => setControlsOpen(true)} aria-label="Mostrar ferramentas" title="Mostrar ferramentas">
              <SlidersHorizontal size={20} />
            </button>
          )}

          <div className="pixel-canvas-scroll" ref={scrollRef}>
            <div
              ref={canvasWrapRef}
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
                  pushHistorySnapshot();
                  shapeStartIndexRef.current = getPointerIndex(event);
                  updateShapePreview(event);
                  return;
                }
                if (tool === "pencil" || tool === "eraser") {
                  pushHistorySnapshot();
                }
                paintFromPointer(event);
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
              {showGuide && guideSrc ? <img className="pixel-reference-layer" src={guideSrc} alt="" /> : null}
              <canvas
                ref={pixelCanvasRef}
                className="pixel-canvas-layer"
                aria-hidden="true"
              />
              <div
                className="pixel-grid-overlay"
                style={{
                  "--pixel-grid-size": gridSize
                }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </div>

      <small>{paintedCount} pixels desenhados. A camada enviada sera apenas o acessorio, com fundo transparente.</small>
    </div>
  );
}
