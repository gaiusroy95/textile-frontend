function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  requestAnimationFrame(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  if (!data) throw new Error("Invalid image data for download");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Trigger a file download from a PNG data URL (works in Chrome, Safari, Firefox). */
export function downloadPng(dataUrl: string, filename: string): void {
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Invalid image data for download");
  }
  triggerBlobDownload(dataUrlToBlob(dataUrl), filename);
}

function loadImageForExport(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to prepare export image"));
    // crossOrigin breaks data: URLs in several browsers
    if (!dataUrl.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.src = dataUrl;
  });
}

/** Upscale export for print-oriented DPI (72 = screen baseline). */
export async function downloadPngAtDpi(
  dataUrl: string,
  filename: string,
  dpi: number
): Promise<void> {
  const img = await loadImageForExport(dataUrl);
  const scale = Math.max(1, dpi / 72);
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  // Avoid canvas sizes browsers refuse (often ~4096–8192 per side)
  const maxSide = 4096;
  const side = Math.max(w, h);
  const cap = side > maxSide ? maxSide / side : 1;
  const cw = Math.max(1, Math.round(w * cap));
  const ch = Math.max(1, Math.round(h * cap));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, cw, ch);

  let out: string;
  try {
    out = canvas.toDataURL("image/png");
  } catch {
    throw new Error("Export blocked — images may not have loaded with CORS");
  }

  downloadPng(out, filename);
}
