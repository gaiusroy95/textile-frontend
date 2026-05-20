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
