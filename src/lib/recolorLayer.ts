/** Recolor a layer image while preserving alpha (for separated color layers). */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for recolor"));
    img.src = src;
  });
}

/**
 * Replace visible pixels with the target color, keeping alpha.
 * Luminance is preserved so texture/shading on the layer remains visible.
 */
export async function recolorLayerImage(
  imageSrc: string,
  hexColor: string
): Promise<string> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const [tr, tg, tb] = hexToRgb(hexColor);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 8) continue;
    const lum =
      (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    const factor = 0.35 + 0.65 * lum;
    data[i] = Math.min(255, Math.round(tr * factor));
    data[i + 1] = Math.min(255, Math.round(tg * factor));
    data[i + 2] = Math.min(255, Math.round(tb * factor));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}
