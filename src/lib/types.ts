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

export type CanvasLayer = {
  id: string;
  url: string;
  name: string;
};

export type AppState = {
  step: PipelineStep;
  sessionId: string | null;
  inputType: InputType;
  originalPreview: string | null;
  extractedImage: string | null;
  seamlessTile: string | null;
  seamlessPreview: string | null;
  variations: string[];
  selectedVariation: number | null;
  addAllVariationsToCanvas: boolean;
  canvasLayers: CanvasLayer[];
  exportDpi: number;
  prompt: string;
  error: string | null;
  loading: boolean;
  loadingMessage: string;
  provider: string | null;
};

export const INPUT_TYPE_OPTIONS: { value: InputType; label: string; hint: string }[] = [
  { value: "garment", label: "Garment / on person", hint: "Extract fabric from clothing" },
  { value: "flat_design", label: "Flat fabric design", hint: "Already flat textile artwork" },
  { value: "swatch", label: "Swatch photo", hint: "Close-up fabric swatch" },
  { value: "paper_scan", label: "Paper design scan", hint: "Scanned or photographed paper" },
  { value: "reference", label: "Reference / Pinterest", hint: "Moodboard or reference image" },
  { value: "multi_swatch", label: "Multiple swatches", hint: "Several swatches in one photo" },
];

export const initialState: AppState = {
  step: "upload",
  sessionId: null,
  inputType: "garment",
  originalPreview: null,
  extractedImage: null,
  seamlessTile: null,
  seamlessPreview: null,
  variations: [],
  selectedVariation: null,
  addAllVariationsToCanvas: false,
  canvasLayers: [],
  exportDpi: 300,
  prompt: "luxury woven textile, intricate pattern, fashion fabric",
  error: null,
  loading: false,
  loadingMessage: "",
  provider: null,
};

export function buildPipelineLayers(state: AppState): CanvasLayer[] {
  const layers: CanvasLayer[] = [];
  if (state.seamlessTile) {
    layers.push({ id: "seamless", url: state.seamlessTile, name: "Seamless tile" });
  }
  if (state.extractedImage) {
    layers.push({ id: "extracted", url: state.extractedImage, name: "Extracted fabric" });
  }
  if (state.addAllVariationsToCanvas) {
    state.variations.forEach((url, i) => {
      layers.push({ id: `var-${i}`, url, name: `AI Variation ${i + 1}` });
    });
  } else if (
    state.selectedVariation !== null &&
    state.variations[state.selectedVariation]
  ) {
    layers.unshift({
      id: `var-${state.selectedVariation}`,
      url: state.variations[state.selectedVariation],
      name: `AI Variation ${state.selectedVariation + 1}`,
    });
  }
  return layers;
}
