import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Download,
  Grid3X3,
  RefreshCw,
  Scan,
  Sparkles,
  Wand2,
  AlertCircle,
} from "lucide-react";
import {
  extractFabric,
  generateSeamless,
  generateVariations,
  resolveImageSrc,
  type InputType,
} from "@/lib/api";
import { downloadPngAtDpi } from "@/lib/download";
import { prepareUploadFile } from "@/lib/prepareUpload";
import {
  buildPipelineLayers,
  initialState,
  INPUT_TYPE_OPTIONS,
  type AppState,
} from "@/lib/types";
import { Header } from "./Header";
import { StepIndicator } from "./StepIndicator";
import { UploadZone } from "./UploadZone";
import { LoadingOverlay } from "./LoadingOverlay";
import { ResultGallery } from "./ResultGallery";
import { SeamlessPreview } from "./SeamlessPreview";
import { FabricCanvas, type FabricCanvasHandle } from "./FabricCanvas";

export function Studio() {
  const [state, setState] = useState<AppState>(initialState);
  const canvasRef = useRef<FabricCanvasHandle | null>(null);

  const set = useCallback((patch: Partial<AppState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const refreshCanvasLayers = useCallback((s: AppState) => {
    return buildPipelineLayers(s);
  }, []);

  const runPipeline = useCallback(async (file: File) => {
    const preview = URL.createObjectURL(file);
    let prompt = initialState.prompt;
    let inputType: InputType = initialState.inputType;

    setState((s) => {
      prompt = s.prompt;
      inputType = s.inputType;
      return {
        ...s,
        originalPreview: preview,
        loading: true,
        loadingMessage: "Extracting fabric pattern…",
        error: null,
        step: "extract",
        sessionId: null,
        extractedImage: null,
        seamlessTile: null,
        seamlessPreview: null,
        variations: [],
      };
    });

    try {
      const uploadFile = await prepareUploadFile(file);
      const extracted = await extractFabric(uploadFile, inputType);
      const extractedUrl = resolveImageSrc(
        extracted.image_url,
        extracted.image_base64
      );

      setState((s) => {
        const next = {
          ...s,
          sessionId: extracted.session_id,
          extractedImage: extractedUrl,
          loadingMessage: "Generating seamless tile…",
          step: "seamless" as const,
        };
        return { ...next, canvasLayers: refreshCanvasLayers(next) };
      });

      const seamless = await generateSeamless(extracted.session_id);
      const tileUrl = resolveImageSrc(seamless.tile_url, seamless.tile_base64);
      const previewUrl = resolveImageSrc(
        seamless.preview_url,
        seamless.preview_base64
      );

      setState((s) => {
        const next = {
          ...s,
          seamlessTile: tileUrl,
          seamlessPreview: previewUrl,
          loadingMessage: "Generating AI variations…",
          step: "variations" as const,
        };
        return { ...next, canvasLayers: refreshCanvasLayers(next) };
      });

      const vars = await generateVariations(extracted.session_id, prompt);
      const variationUrls = vars.variations.map((v) =>
        resolveImageSrc(v.url, v.image_base64)
      );

      setState((s) => {
        const next = {
          ...s,
          variations: variationUrls,
          selectedVariation: 0,
          provider: vars.provider,
          loading: false,
          step: "edit" as const,
        };
        return { ...next, canvasLayers: refreshCanvasLayers(next) };
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Pipeline failed",
        step: "upload",
      }));
    }
  }, [refreshCanvasLayers]);

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
        return { ...next, canvasLayers: refreshCanvasLayers(next) };
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
        return { ...next, canvasLayers: refreshCanvasLayers(next) };
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Variations failed",
      });
    }
  };

  const handleExport = async () => {
    const handle = canvasRef.current;
    if (!handle) {
      set({ error: "Canvas not ready — wait for layers to load" });
      return;
    }
    try {
      const dataUrl = handle.getPngDataUrl(state.exportDpi);
      if (!dataUrl || dataUrl.length < 200) {
        throw new Error("Canvas export failed — check layers loaded correctly");
      }
      await downloadPngAtDpi(
        dataUrl,
        `textile-design-${state.exportDpi}dpi.png`,
        state.exportDpi
      );
      set({ error: null, step: "export" });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Export failed",
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
                  Re-run steps
                </h2>
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
                  labels={["Variation 1", "Variation 2", "Variation 3"]}
                  selected={state.selectedVariation}
                  onSelect={(i) => {
                    setState((s) => {
                      const next = { ...s, selectedVariation: i };
                      return {
                        ...next,
                        canvasLayers: refreshCanvasLayers(next),
                      };
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
                        return {
                          ...next,
                          canvasLayers: refreshCanvasLayers(next),
                        };
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
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    Export DPI
                    <select
                      value={state.exportDpi}
                      onChange={(e) =>
                        set({ exportDpi: Number(e.target.value) })
                      }
                      className="rounded border border-surface-border bg-surface-elevated px-2 py-1 text-sm"
                    >
                      <option value={72}>72</option>
                      <option value={150}>150</option>
                      <option value={300}>300</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={state.loading || state.canvasLayers.length === 0}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition hover:opacity-90 disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" />
                    Export PNG
                  </button>
                </div>
              </div>
              <FabricCanvas ref={canvasRef} layers={state.canvasLayers} />
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
