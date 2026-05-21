import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Layers,
  RefreshCw,
  Scan,
  Sparkles,
  Wand2,
  AlertCircle,
  Droplets,
  Grid3X3,
} from "lucide-react";
import {
  autoSeparateLayers,
  generateSeamless,
  generateVariations,
  pollJob,
  removeWatermark,
  resolveImageSrc,
  startPipelineJob,
  type InputType,
  type PipelineResult,
} from "@/lib/api";
import { prepareUploadFile } from "@/lib/prepareUpload";
import {
  buildCanvasLayers,
  initialState,
  INPUT_TYPE_OPTIONS,
  layerFilesForPsdExport,
  type AppState,
  type CanvasLayer,
} from "@/lib/types";
import { Header } from "./Header";
import { StepIndicator } from "./StepIndicator";
import { UploadZone } from "./UploadZone";
import { LoadingOverlay } from "./LoadingOverlay";
import { ResultGallery } from "./ResultGallery";
import { SeamlessPreview } from "./SeamlessPreview";
import { FabricCanvas, type FabricCanvasHandle } from "./FabricCanvas";
import { ExportPanel } from "./ExportPanel";
import { LayerThumb } from "./LayerThumb";

function applyPipelineResult(result: PipelineResult, prompt: string): Partial<AppState> {
  const extractedUrl = result.extract.image_url;
  const tileUrl = result.seamless.tile_url;
  const previewUrl = result.seamless.preview_url;
  const variationUrls = result.variations.items.map((v) => v.url);
  const separated: CanvasLayer[] = result.layers.map((l, i) => ({
    id: `sep-${i}`,
    url: l.url,
    originalUrl: l.url,
    name: l.name,
    source: "separated" as const,
  }));

  const partial: Partial<AppState> = {
    sessionId: result.session_id,
    extractedImage: extractedUrl,
    seamlessTile: tileUrl,
    seamlessPreview: previewUrl,
    variations: variationUrls,
    separatedLayers: separated,
    selectedVariation: variationUrls.length ? 0 : null,
    provider: result.variations.provider,
    step: "edit",
    loading: false,
    progress: 100,
    loadingMessage: "",
  };

  const next = { ...initialState, ...partial, prompt } as AppState;
  return { ...partial, canvasLayers: buildCanvasLayers(next) };
}

export function Studio() {
  const [state, setState] = useState<AppState>(initialState);
  const canvasRef = useRef<FabricCanvasHandle | null>(null);

  const set = useCallback((patch: Partial<AppState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const refreshCanvas = useCallback((s: AppState) => {
    return buildCanvasLayers(s);
  }, []);

  const handleLayerColorChange = useCallback(
    (layerId: string, color: string | null) => {
      setState((s) => {
        const layerTintColors = { ...s.layerTintColors };
        if (color) layerTintColors[layerId] = color;
        else delete layerTintColors[layerId];

        const separatedLayers = s.separatedLayers.map((l) => {
          if (l.id !== layerId) return l;
          const base = { ...l, originalUrl: l.originalUrl ?? l.url };
          if (!color) return { ...base, color: undefined };
          return { ...base, color };
        });

        const next = { ...s, layerTintColors, separatedLayers };
        return { ...next, canvasLayers: buildCanvasLayers(next) };
      });
    },
    []
  );

  const runPipeline = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    let prompt = initialState.prompt;
    let inputType: InputType = initialState.inputType;
    let removeWatermark = false;
    let autoLayers = true;

    setState((s) => {
      prompt = s.prompt;
      inputType = s.inputType;
      removeWatermark = s.removeWatermark;
      autoLayers = s.autoLayers;
      return {
        ...s,
        originalPreview: preview,
        loading: true,
        loadingMessage: "Starting full pipeline…",
        progress: 0,
        error: null,
        step: "extract",
        sessionId: null,
        extractedImage: null,
        seamlessTile: null,
        seamlessPreview: null,
        variations: [],
        separatedLayers: [],
        layerTintColors: {},
        canvasLayers: [],
      };
    });

    try {
      const uploadFile = await prepareUploadFile(file);
      const { job_id } = await startPipelineJob(uploadFile, {
        inputType,
        prompt,
        removeWatermark,
        autoLayers,
      });

      const job = await pollJob(job_id, (j) => {
        setState((s) => ({
          ...s,
          loadingMessage: j.message || "Processing…",
          progress: j.progress,
          step:
            j.progress < 30
              ? "extract"
              : j.progress < 55
                ? "seamless"
                : j.progress < 80
                  ? "variations"
                  : "edit",
        }));
      });

      const result = job.result;
      if (!result) throw new Error("Pipeline completed without result");

      setState((s) => ({
        ...s,
        ...applyPipelineResult(result, prompt),
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        progress: 0,
        error: err instanceof Error ? err.message : "Pipeline failed",
        step: "upload",
      }));
    }
  }, []);

  const rerunSeamless = async () => {
    if (!state.sessionId) return;
    set({ loading: true, loadingMessage: "Regenerating seamless tile…", error: null });
    try {
      const seamless = await generateSeamless(state.sessionId);
      setState((s) => {
        const next = {
          ...s,
          seamlessTile: resolveImageSrc(seamless.tile_url, seamless.tile_base64),
          seamlessPreview: resolveImageSrc(
            seamless.preview_url,
            seamless.preview_base64
          ),
          loading: false,
        };
        return { ...next, canvasLayers: refreshCanvas(next) };
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Seamless failed",
      });
    }
  };

  const rerunVariations = async () => {
    if (!state.sessionId) return;
    set({ loading: true, loadingMessage: "Regenerating variations…", error: null });
    try {
      const vars = await generateVariations(state.sessionId, state.prompt);
      setState((s) => {
        const next = {
          ...s,
          variations: vars.variations.map((v) =>
            resolveImageSrc(v.url, v.image_base64)
          ),
          selectedVariation: 0,
          provider: vars.provider,
          loading: false,
        };
        return { ...next, canvasLayers: refreshCanvas(next) };
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Variations failed",
      });
    }
  };

  const runAutoSeparate = async () => {
    if (!state.sessionId) return;
    set({ loading: true, loadingMessage: "Separating color layers…", error: null });
    try {
      const res = await autoSeparateLayers(state.sessionId, state.inputType);
      const separated: CanvasLayer[] = res.layers.map((l, i) => {
        const url = resolveImageSrc(l.url, l.image_base64);
        return {
          id: `sep-${i}`,
          url,
          originalUrl: url,
          name: l.name,
          source: "separated" as const,
        };
      });
      setState((s) => {
        const next = { ...s, separatedLayers: separated, loading: false };
        return { ...next, canvasLayers: refreshCanvas(next) };
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Layer separation failed",
      });
    }
  };

  const runWatermarkRemoval = async () => {
    if (!state.sessionId) return;
    set({ loading: true, loadingMessage: "Reducing watermark…", error: null });
    try {
      const res = await removeWatermark(state.sessionId);
      set({
        extractedImage: res.image_url,
        loading: false,
        error: null,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Watermark removal failed",
      });
    }
  };

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
          <section className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-surface-border glass p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Scan className="h-5 w-5 text-violet-400" />
                Upload image
              </h2>
              <label className="mb-3 block text-sm font-medium text-[var(--text-muted)]">
                Input type
              </label>
              <select
                value={state.inputType}
                onChange={(e) =>
                  set({ inputType: e.target.value as InputType })
                }
                disabled={state.loading}
                className="mb-4 w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {INPUT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                {
                  INPUT_TYPE_OPTIONS.find((o) => o.value === state.inputType)
                    ?.hint
                }
              </p>

              <div className="mb-4 space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.autoLayers}
                    onChange={(e) => set({ autoLayers: e.target.checked })}
                    disabled={state.loading}
                    className="accent-violet-500"
                  />
                  Auto-separate color layers
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.removeWatermark}
                    onChange={(e) => set({ removeWatermark: e.target.checked })}
                    disabled={state.loading}
                    className="accent-violet-500"
                  />
                  Reduce corner watermark on upload
                </label>
              </div>

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
                  Provider:{" "}
                  <span className="text-violet-400">{state.provider}</span>
                </p>
              )}
            </div>

            {state.sessionId && (
              <div className="rounded-2xl border border-surface-border glass p-6 space-y-3">
                <h2 className="text-sm font-semibold text-[var(--text-muted)]">
                  Processing tools
                </h2>
                <button
                  type="button"
                  disabled={state.loading}
                  onClick={runAutoSeparate}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm hover:bg-violet-500/10 disabled:opacity-40"
                >
                  <Layers className="h-4 w-4" />
                  Auto-separate layers
                </button>
                <button
                  type="button"
                  disabled={state.loading}
                  onClick={runWatermarkRemoval}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm hover:bg-violet-500/10 disabled:opacity-40"
                >
                  <Droplets className="h-4 w-4" />
                  Remove watermark
                </button>
                <button
                  type="button"
                  disabled={state.loading}
                  onClick={rerunSeamless}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm hover:bg-violet-500/10 disabled:opacity-40"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate seamless tile
                </button>
                <button
                  type="button"
                  disabled={state.loading}
                  onClick={rerunVariations}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border px-3 py-2 text-sm hover:bg-violet-500/10 disabled:opacity-40"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate variations
                </button>
              </div>
            )}

            {state.separatedLayers.length > 0 && (
              <div className="rounded-2xl border border-surface-border glass p-6">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
                  <Layers className="h-4 w-4" />
                  Separated layers ({state.separatedLayers.length})
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {state.separatedLayers.map((l) => (
                    <div
                      key={l.id}
                      className="flex flex-col gap-1.5 rounded-lg border border-surface-border p-2"
                    >
                      <LayerThumb
                        layer={l}
                        className="aspect-square w-full rounded object-cover bg-slate-800"
                      />
                      <p className="truncate text-[10px] font-medium">{l.name}</p>
                      <input
                        type="color"
                        value={l.color ?? "#8b5cf6"}
                        onChange={(e) =>
                          handleLayerColorChange(l.id, e.target.value)
                        }
                        className="h-8 w-full cursor-pointer rounded border border-surface-border bg-transparent"
                        title={`Change color: ${l.name}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  labels={state.variations.map((_, i) => `Variation ${i + 1}`)}
                  selected={state.selectedVariation}
                  onSelect={(i) => {
                    setState((s) => {
                      const next = { ...s, selectedVariation: i };
                      return { ...next, canvasLayers: refreshCanvas(next) };
                    });
                  }}
                />
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.addAllVariationsToCanvas}
                    onChange={(e) => {
                      setState((s) => {
                        const next = {
                          ...s,
                          addAllVariationsToCanvas: e.target.checked,
                        };
                        return { ...next, canvasLayers: refreshCanvas(next) };
                      });
                    }}
                    className="accent-violet-500"
                  />
                  Add all variations as separate canvas layers
                </label>
              </div>
            )}

            <div className="rounded-2xl border border-surface-border glass p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Canvas editor</h2>
                <ExportPanel
                  sessionId={state.sessionId}
                  exportDpi={state.exportDpi}
                  exportFormat={state.exportFormat}
                  layerFiles={layerFilesForPsdExport(state)}
                  hasLayers={state.canvasLayers.length > 0}
                  canvasRef={canvasRef}
                  onDpiChange={(dpi) => set({ exportDpi: dpi })}
                  onFormatChange={(format) => set({ exportFormat: format })}
                  onError={(msg) => set({ error: msg })}
                  onExported={() => set({ step: "export", error: null })}
                />
              </div>
              <FabricCanvas
                ref={canvasRef}
                layers={state.canvasLayers}
                onLayerColorChange={handleLayerColorChange}
              />
            </div>
          </section>
        </div>
      </main>

      <AnimatePresence>
        {state.loading && (
          <LoadingOverlay
            message={state.loadingMessage}
            progress={state.progress > 0 ? state.progress : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
