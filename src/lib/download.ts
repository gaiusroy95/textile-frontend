/** Trigger a file download from a PNG data URL (works in Chrome, Safari, Firefox). */
export function downloadPng(dataUrl: string, filename: string): void {
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Invalid image data for download");
  }

  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();

  requestAnimationFrame(() => {
    document.body.removeChild(anchor);
  });
}

/** Upscale export for print-oriented DPI (72 = screen baseline). */
export function downloadPngAtDpi(
  dataUrl: string,
  filename: string,
  dpi: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.max(1, dpi / 72);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      downloadPng(canvas.toDataURL("image/png"), filename);
      resolve();
    };
    img.onerror = () => reject(new Error("Failed to prepare export image"));
    img.src = dataUrl;
  });
}
