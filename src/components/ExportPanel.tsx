import type { RefObject } from "react";
import { Download, FileImage, Layers, Printer } from "lucide-react";
import type { ExportFormat } from "@/lib/api";
import type { FabricCanvasHandle } from "./FabricCanvas";
import { downloadPng, downloadPngAtDpi } from "@/lib/download";
import { downloadExport } from "@/lib/api";

type Props = {
  sessionId: string | null;
  exportDpi: number;
  exportFormat: ExportFormat;
  layerFiles: string[];
  hasLayers: boolean;
  canvasRef: RefObject<FabricCanvasHandle | null>;
  onDpiChange: (dpi: number) => void;
  onFormatChange: (format: ExportFormat) => void;
  onError: (msg: string | null) => void;
  onExported: () => void;
};

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportPanel({
  sessionId,
  exportDpi,
  exportFormat,
  layerFiles,
  hasLayers,
  canvasRef,
  onDpiChange,
  onFormatChange,
  onError,
  onExported,
}: Props) {
  const handleExport = async () => {
    onError(null);

    try {
      if (exportFormat === "png") {
        const handle = canvasRef.current;
        if (!handle) throw new Error("Canvas not ready — wait for the editor to load");
        const dataUrl = handle.getPngDataUrl();
        if (!dataUrl || dataUrl.length < 200) {
          throw new Error(
            "Canvas export failed — ensure all layers finished loading, then try again"
          );
        }
        const filename = `textile-design-${exportDpi}dpi.png`;
        try {
          if (exportDpi > 72) {
            await downloadPngAtDpi(dataUrl, filename, exportDpi);
          } else {
            downloadPng(dataUrl, filename);
          }
        } catch {
          // Fallback: still download at canvas resolution if upscale fails
          downloadPng(dataUrl, filename.replace(`${exportDpi}dpi`, "export"));
        }
        onExported();
        return;
      }

      if (!sessionId) {
        throw new Error("Session required for TIFF/PSD — run the pipeline first");
      }

      const handle = canvasRef.current;
      let imageBase64: string | undefined;
      if (exportFormat === "tiff" && handle) {
        const dataUrl = handle.getPngDataUrl();
        imageBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      }

      const { blob, filename } = await downloadExport({
        sessionId,
        imageBase64,
        format: exportFormat,
        dpi: exportDpi,
        layerFiles: exportFormat === "psd" ? layerFiles : undefined,
      });
      triggerDownload(blob, filename);
      onExported();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        DPI
        <select
          value={exportDpi}
          onChange={(e) => onDpiChange(Number(e.target.value))}
          className="rounded border border-surface-border bg-surface-elevated px-2 py-1 text-sm"
        >
          <option value={72}>72 (screen)</option>
          <option value={150}>150</option>
          <option value={300}>300 (print)</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        Format
        <select
          value={exportFormat}
          onChange={(e) => onFormatChange(e.target.value as ExportFormat)}
          className="rounded border border-surface-border bg-surface-elevated px-2 py-1 text-sm"
        >
          <option value="png">PNG (canvas composite)</option>
          <option value="tiff">TIFF CMYK (print)</option>
          <option value="psd">PSD / layered ZIP</option>
        </select>
      </label>

      <button
        type="button"
        onClick={handleExport}
        disabled={!hasLayers && exportFormat === "png"}
        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition hover:opacity-90 disabled:opacity-40"
      >
        {exportFormat === "png" && <FileImage className="h-4 w-4" />}
        {exportFormat === "tiff" && <Printer className="h-4 w-4" />}
        {exportFormat === "psd" && <Layers className="h-4 w-4" />}
        <Download className="h-4 w-4" />
        Export {exportFormat.toUpperCase()}
      </button>
    </div>
  );
}
