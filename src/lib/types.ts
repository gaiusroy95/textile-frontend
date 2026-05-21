export type PipelineStep =
  | "upload"
  | "extract"
  | "seamless"
  | "variations"
  | "edit"
  | "export";

export type InputType =
  | "garment"
  | "flat_design"
  | "swatch"
  | "paper_scan"
  | "reference"
  | "multi_swatch";

export type ExportFormat = "png" | "tiff" | "psd";

export type CanvasLayer = {
  id: string;
  url: string;
  name: string;
  source?: "pipeline" | "separated" | "custom";
};

export type AppState = {
  step: PipelineStep;
  sessionId: string | null;
  inputType: InputType;
  removeWatermark: boolean;
  autoLayers: boolean;
  originalPreview: string | null;
  extractedImage: string | null;
  seamlessTile: string | null;
  seamlessPreview: string | null;
  variations: string[];
  separatedLayers: CanvasLayer[];
  selectedVariation: number | null;
  addAllVariationsToCanvas: boolean;
  canvasLayers: CanvasLayer[];
  exportDpi: number;
  exportFormat: ExportFormat;
  prompt: string;
  error: string | null;
  loading: boolean;
  loadingMessage: string;
  progress: number;
  provider: string | null;
};

export const INPUT_TYPE_OPTIONS: { value: InputType; label: string; hint: string }[] = [
  { value: "garment", label: "Garment / on person", hint: "Extract fabric from clothing" },
  { value: "flat_design", label: "Flat fabric design", hint: "Flat textile artwork" },
  { value: "swatch", label: "Swatch photo", hint: "Close-up swatch" },
  { value: "paper_scan", label: "Paper design scan", hint: "Scanned paper design" },
  { value: "reference", label: "Reference / Pinterest", hint: "Reference moodboard image" },
  { value: "multi_swatch", label: "Multiple swatches", hint: "Several swatches in one photo" },
];

export const initialState: AppState = {
  step: "upload",
  sessionId: null,
  inputType: "garment",
  removeWatermark: false,
  autoLayers: true,
  originalPreview: null,
  extractedImage: null,
  seamlessTile: null,
  seamlessPreview: null,
  variations: [],
  separatedLayers: [],
  selectedVariation: null,
  addAllVariationsToCanvas: false,
  canvasLayers: [],
  exportDpi: 300,
  exportFormat: "png",
  prompt: "luxury woven textile, intricate pattern, fashion fabric",
  error: null,
  loading: false,
  loadingMessage: "",
  progress: 0,
  provider: null,
};

export function buildCanvasLayers(state: AppState): CanvasLayer[] {
  const layers: CanvasLayer[] = [];

  state.separatedLayers.forEach((l) => layers.push(l));

  if (state.seamlessTile) {
    layers.push({ id: "seamless", url: state.seamlessTile, name: "Seamless tile", source: "pipeline" });
  }
  if (state.extractedImage) {
    layers.push({ id: "extracted", url: state.extractedImage, name: "Extracted fabric", source: "pipeline" });
  }

  if (state.addAllVariationsToCanvas) {
    state.variations.forEach((url, i) => {
      layers.unshift({
        id: `var-${i}`,
        url,
        name: `AI Variation ${i + 1}`,
        source: "pipeline",
      });
    });
  } else if (
    state.selectedVariation !== null &&
    state.variations[state.selectedVariation]
  ) {
    layers.unshift({
      id: `var-${state.selectedVariation}`,
      url: state.variations[state.selectedVariation],
      name: `AI Variation ${state.selectedVariation + 1}`,
      source: "pipeline",
    });
  }

  return layers;
}

/** @deprecated use buildCanvasLayers */
export const buildPipelineLayers = buildCanvasLayers;

export function layerFilesForPsdExport(state: AppState): string[] {
  const files = new Set<string>();
  state.separatedLayers.forEach((_, i) => files.add(`layer_${i + 1}.png`));
  if (state.extractedImage) files.add("extracted.png");
  if (state.seamlessTile) files.add("seamless_tile.png");
  state.variations.forEach((_, i) => files.add(`variation_${i + 1}.png`));
  return Array.from(files);
}
