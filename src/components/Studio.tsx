import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Grid3X3,
  Scan,
  Sparkles,
  Wand2,
  AlertCircle,
} from "lucide-react";
import {
  extractFabric,
  exportCanvas,
  generateSeamless,
  generateVariations,
  resolveImageSrc,
} from "@/lib/api";
import { prepareUploadFile } from "@/lib/prepareUpload";
import { initialState, type AppState } from "@/lib/types";
import { Header } from "./Header";
import { StepIndicator } from "./StepIndicator";
import { UploadZone } from "./UploadZone";
import { LoadingOverlay } from "./LoadingOverlay";
import { ResultGallery } from "./ResultGallery";
import { SeamlessPreview } from "./SeamlessPreview";
import { FabricCanvas } from "./FabricCanvas";

export function Studio() {
  const [state, setState] = useState<AppState>(initialState);
  const exportRef = useRef<(() => string) | null>(null);

  const set = useCallback((patch: Partial<AppState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const runPipeline = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    let prompt = initialState.prompt;

    setState((s) => {
      prompt = s.prompt;
      return {
        ...s,
        originalPreview: preview,
        loading: true,
        loadingMessage:
          "Removing background & extracting fabric… (first run on cloud may take 1–2 min)",
        error: null,
        step: "extract",
      };
    });

    try {
      const uploadFile = await prepareUploadFile(file);
      const extracted = await extractFabric(uploadFile);
      const extractedUrl = resolveImageSrc(
        extracted.image_url,
        extracted.image_base64
      );

      setState((s) => ({
        ...s,
        sessionId: extracted.session_id,
        extractedImage: extractedUrl,
        loadingMessage: "Generating seamless textile tile…",
        step: "seamless",
      }));

      const seamless = await generateSeamless(extracted.session_id);
      const tileUrl = resolveImageSrc(seamless.tile_url, seamless.tile_base64);
      const previewUrl = resolveImageSrc(
        seamless.preview_url,
        seamless.preview_base64
      );

      setState((s) => ({
        ...s,
        seamlessTile: tileUrl,
        seamlessPreview: previewUrl,
        loadingMessage: "Generating AI textile variations…",
        step: "variations",
      }));

      const vars = await generateVariations(seamless.session_id, prompt);
      const variationUrls = vars.variations.map((v) =>
        resolveImageSrc(v.url, v.image_base64)
      );

      setState((s) => ({
        ...s,
        variations: variationUrls,
        selectedVariation: 0,
        provider: vars.provider,
        loading: false,
        step: "edit",
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Pipeline failed",
        step: "upload",
      }));
    }
  }, []);

  const handleExport = async () => {
    const getB64 = exportRef.current;
    if (!getB64) {
      set({ error: "Canvas not ready" });
      return;
    }
    set({ loading: true, loadingMessage: "Exporting PNG…", step: "export" });
    try {
      const b64 = getB64();
      const blob = await exportCanvas(b64, state.sessionId || undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "textile-design.png";
      a.click();
      URL.revokeObjectURL(url);
      set({ loading: false, step: "export" });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Export failed",
      });
    }
  };

  const canvasLayers = buildCanvasLayers(state);

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <StepIndicator current={state.step} />
        </div>

        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {state.error}
          </motion.div>
        )}

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left panel — upload & controls */}
          <section className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-surface-border glass p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Scan className="h-5 w-5 text-violet-400" />
                Upload garment
              </h2>
              <UploadZone
                onFile={runPipeline}
                preview={state.originalPreview}
                disabled={state.loading}
              />
            </div>

            <div className="rounded-2xl border border-surface-border glass p-6">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Wand2 className="h-5 w-5 text-fuchsia-400" />
                AI prompt
              </h2>
              <textarea
                value={state.prompt}
                onChange={(e) => set({ prompt: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Describe your textile style…"
              />
              {state.provider && (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Provider: <span className="text-violet-400">{state.provider}</span>
                  {state.provider === "demo_procedural" && " (add HF_API_TOKEN for real SD)"}
                </p>
              )}
            </div>

            {state.extractedImage && (
              <div className="rounded-2xl border border-surface-border glass p-6">
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-muted)]">
                  Extracted fabric
                </h2>
                <img
                  src={state.extractedImage}
                  alt="Extracted"
                  className="w-full rounded-lg border border-surface-border object-contain"
                />
              </div>
            )}
          </section>

          {/* Right panel — results & canvas */}
          <section className="lg:col-span-7 space-y-6">
            {state.seamlessPreview && (
              <div className="rounded-2xl border border-surface-border glass p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Grid3X3 className="h-5 w-5 text-indigo-400" />
                  Seamless tile
                </h2>
                <SeamlessPreview
                  tileUrl={state.seamlessTile}
                  previewUrl={state.seamlessPreview}
                />
              </div>
            )}

            {state.variations.length > 0 && (
              <div className="rounded-2xl border border-surface-border glass p-6">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  AI variations
                </h2>
                <ResultGallery
                  images={state.variations}
                  labels={["Variation 1", "Variation 2", "Variation 3"]}
                  selected={state.selectedVariation}
                  onSelect={(i) => set({ selectedVariation: i })}
                />
              </div>
            )}

            <div className="rounded-2xl border border-surface-border glass p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Canvas editor</h2>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={state.loading || canvasLayers.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition hover:opacity-90 disabled:opacity-40"
                >
                  <Download className="h-4 w-4" />
                  Export PNG
                </button>
              </div>
              <FabricCanvas
                layers={canvasLayers}
                onExportReady={(fn) => {
                  exportRef.current = fn;
                }}
              />
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {state.loading && (
          <LoadingOverlay message={state.loadingMessage} progress={undefined} />
        )}
      </AnimatePresence>
    </div>
  );
}

function buildCanvasLayers(state: AppState): { url: string; name: string }[] {
  const layers: { url: string; name: string }[] = [];
  if (state.seamlessTile) layers.push({ url: state.seamlessTile, name: "Seamless tile" });
  if (state.extractedImage) layers.push({ url: state.extractedImage, name: "Extracted fabric" });
  if (state.selectedVariation !== null && state.variations[state.selectedVariation]) {
    layers.unshift({
      url: state.variations[state.selectedVariation],
      name: `AI Variation ${state.selectedVariation + 1}`,
    });
  }
  return layers;
}
