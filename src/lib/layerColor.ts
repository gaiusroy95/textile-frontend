/** Resolve display / picker color for a canvas layer. */

import type { CanvasLayer } from "@/lib/types";

export function rgbTupleToHex(rgb: [number, number, number]): string {
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Strip legacy "(RGB r,g,b)" suffix for display. */
export function formatLayerDisplayName(name: string): string {
  return name.replace(/\s*\(RGB\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)\s*$/i, "").trim();
}

/** Parse "Color layer 2 (RGB 230,198,148)" from auto-separation. */
export function parseLayerColorFromName(name: string): string | null {
  const m = name.match(/\(RGB\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/i);
  if (!m) return null;
  return rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load layer image"));
    img.src = src;
  });
}

/** Average visible pixels (for variations / layers without RGB in name). */
export async function sampleLayerDominantColor(imageSrc: string): Promise<string> {
  try {
    const img = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    const w = Math.min(img.naturalWidth, 64);
    const h = Math.min(img.naturalHeight, 64);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "#8b5cf6";

    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 32) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (n === 0) return "#8b5cf6";
    return rgbToHex(Math.round(r / n), Math.round(g / n), Math.round(b / n));
  } catch {
    return "#8b5cf6";
  }
}

function rgbFromLayer(layer: CanvasLayer): string | null {
  if (layer.rgb?.length === 3) return rgbTupleToHex(layer.rgb);
  return parseLayerColorFromName(layer.name);
}

/** Color shown in the picker: custom tint > rgb metadata > name RGB > sampled from image. */
export async function resolveLayerPickerColor(layer: CanvasLayer): Promise<string> {
  if (layer.color) return layer.color;
  const known = rgbFromLayer(layer);
  if (known) return known;
  return sampleLayerDominantColor(layer.originalUrl ?? layer.url);
}

export function resolveLayerPickerColorSync(layer: CanvasLayer): string | null {
  if (layer.color) return layer.color;
  return rgbFromLayer(layer);
}
