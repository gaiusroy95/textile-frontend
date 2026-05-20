export type PipelineStep =
  | "upload"
  | "extract"
  | "seamless"
  | "variations"
  | "edit"
  | "export";

export type AppState = {
  step: PipelineStep;
  sessionId: string | null;
  originalPreview: string | null;
  extractedImage: string | null;
  seamlessTile: string | null;
  seamlessPreview: string | null;
  variations: string[];
  selectedVariation: number | null;
  prompt: string;
  error: string | null;
  loading: boolean;
  loadingMessage: string;
  provider: string | null;
};

export const initialState: AppState = {
  step: "upload",
  sessionId: null,
  originalPreview: null,
  extractedImage: null,
  seamlessTile: null,
  seamlessPreview: null,
  variations: [],
  selectedVariation: null,
  prompt: "luxury woven textile, intricate pattern, fashion fabric",
  error: null,
  loading: false,
  loadingMessage: "",
  provider: null,
};
