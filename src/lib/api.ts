/**
 * Textile AI — Full API client
 */

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TIMEOUT = {
  extract: 5 * 60 * 1000,
  seamless: 3 * 60 * 1000,
  variations: 4 * 60 * 1000,
  layers: 3 * 60 * 1000,
  default: 2 * 60 * 1000,
} as const;

export type InputType =
  | "garment"
  | "flat_design"
  | "swatch"
  | "paper_scan"
  | "reference"
  | "multi_swatch";

export type ExportFormat = "png" | "tiff" | "psd";

export type LayerItem = {
  index?: number;
  name: string;
  url: string;
  image_base64?: string;
  rgb?: [number, number, number];
};

export type JobRecord = {
  job_id: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  session_id?: string;
  progress: number;
  message: string;
  result?: PipelineResult;
  error?: string;
};

export type PipelineResult = {
  session_id: string;
  extract: { image_url: string; metadata: Record<string, unknown> };
  seamless: {
    tile_url: string;
    preview_url: string;
    metadata: Record<string, unknown>;
  };
  variations: {
    provider: string;
    items: { index: number; url: string; image_base64?: string }[];
  };
  layers: LayerItem[];
};

export type ExtractResponse = {
  session_id: string;
  image_url: string;
  image_base64?: string;
  metadata: Record<string, unknown>;
};

export type SeamlessResponse = {
  session_id: string;
  tile_url: string;
  preview_url: string;
  tile_base64?: string;
  preview_base64?: string;
  metadata: Record<string, unknown>;
};

export type VariationsResponse = {
  session_id: string;
  provider: string;
  prompt_used: string | null;
  variations: { index: number; url: string; image_base64?: string }[];
};

function imageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export function base64ToDataUrl(b64: string, mime = "image/png"): string {
  return `data:${mime};base64,${b64}`;
}

export function resolveImageSrc(url: string, base64?: string): string {
  if (base64) return base64ToDataUrl(base64);
  return url;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out — try again or use a smaller image.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const err = await res.json().catch(() => ({}));
  throw new Error((err as { detail?: string }).detail || fallback);
}

export async function extractFabric(
  file: File,
  inputType: InputType = "garment"
): Promise<ExtractResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("input_type", inputType);
  const res = await fetchWithTimeout(
    `${API_URL}/extract-fabric`,
    { method: "POST", body: form },
    TIMEOUT.extract
  );
  if (!res.ok) await parseError(res, "Fabric extraction failed");
  const data = (await res.json()) as ExtractResponse;
  return { ...data, image_url: imageUrl(data.image_url) };
}

export async function generateSeamless(sessionId: string): Promise<SeamlessResponse> {
  const form = new FormData();
  form.append("session_id", sessionId);
  const res = await fetchWithTimeout(
    `${API_URL}/generate-seamless`,
    { method: "POST", body: form },
    TIMEOUT.seamless
  );
  if (!res.ok) await parseError(res, "Seamless generation failed");
  const data = (await res.json()) as SeamlessResponse;
  return {
    ...data,
    tile_url: imageUrl(data.tile_url),
    preview_url: imageUrl(data.preview_url),
  };
}

export async function generateVariations(
  sessionId: string,
  prompt?: string
): Promise<VariationsResponse> {
  const form = new FormData();
  form.append("session_id", sessionId);
  if (prompt) form.append("prompt", prompt);
  form.append("count", "3");
  const res = await fetchWithTimeout(
    `${API_URL}/generate-variations`,
    { method: "POST", body: form },
    TIMEOUT.variations
  );
  if (!res.ok) await parseError(res, "Variation generation failed");
  const data = (await res.json()) as VariationsResponse;
  return {
    ...data,
    variations: data.variations.map((v) => ({ ...v, url: imageUrl(v.url) })),
  };
}

export async function startPipelineJob(
  file: File,
  opts: {
    inputType: InputType;
    prompt?: string;
    removeWatermark: boolean;
    autoLayers: boolean;
  }
): Promise<{ job_id: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("input_type", opts.inputType);
  if (opts.prompt) form.append("prompt", opts.prompt);
  form.append("remove_watermark", String(opts.removeWatermark));
  form.append("auto_layers", String(opts.autoLayers));
  form.append("variation_count", "3");
  const res = await fetchWithTimeout(
    `${API_URL}/jobs/pipeline`,
    { method: "POST", body: form },
    TIMEOUT.extract
  );
  if (!res.ok) await parseError(res, "Failed to start pipeline");
  return res.json();
}

export async function getJob(jobId: string): Promise<JobRecord> {
  const res = await fetch(`${API_URL}/jobs/${jobId}`, { cache: "no-store" });
  if (!res.ok) await parseError(res, "Job not found");
  const job = (await res.json()) as JobRecord;
  if (job.result) {
    job.result.extract.image_url = imageUrl(job.result.extract.image_url);
    job.result.seamless.tile_url = imageUrl(job.result.seamless.tile_url);
    job.result.seamless.preview_url = imageUrl(job.result.seamless.preview_url);
    job.result.variations.items = job.result.variations.items.map((v) => ({
      ...v,
      url: imageUrl(v.url),
    }));
    job.result.layers = job.result.layers.map((l) => ({
      ...l,
      url: imageUrl(l.url),
    }));
  }
  return job;
}

export async function pollJob(
  jobId: string,
  onProgress: (job: JobRecord) => void,
  intervalMs = 2000,
  maxWaitMs = 600000
): Promise<JobRecord> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const job = await getJob(jobId);
    onProgress(job);
    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(job.error || "Pipeline failed");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Pipeline timed out");
}

export async function autoSeparateLayers(
  sessionId: string,
  inputType: InputType = "garment"
): Promise<{ session_id: string; layers: LayerItem[] }> {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("input_type", inputType);
  const res = await fetchWithTimeout(
    `${API_URL}/layers/auto-separate`,
    { method: "POST", body: form },
    TIMEOUT.layers
  );
  if (!res.ok) await parseError(res, "Layer separation failed");
  const data = await res.json();
  return {
    session_id: data.session_id,
    layers: data.layers.map((l: LayerItem) => ({ ...l, url: imageUrl(l.url) })),
  };
}

export async function removeWatermark(
  sessionId: string
): Promise<{ session_id: string; image_url: string }> {
  const form = new FormData();
  form.append("session_id", sessionId);
  const res = await fetchWithTimeout(
    `${API_URL}/process/remove-watermark`,
    { method: "POST", body: form },
    TIMEOUT.default
  );
  if (!res.ok) await parseError(res, "Watermark removal failed");
  const data = await res.json();
  return { ...data, image_url: imageUrl(data.image_url) };
}

export async function downloadExport(
  opts: {
    sessionId?: string;
    imageBase64?: string;
    format: ExportFormat;
    dpi: number;
    layerFiles?: string[];
  }
): Promise<{ blob: Blob; filename: string }> {
  const form = new FormData();
  form.append("download", "true");
  form.append("format", opts.format);
  form.append("dpi", String(opts.dpi));
  if (opts.sessionId) form.append("session_id", opts.sessionId);
  if (opts.imageBase64) form.append("image_base64", opts.imageBase64);
  if (opts.layerFiles?.length) {
    form.append("layer_names", JSON.stringify(opts.layerFiles));
  }

  const res = await fetchWithTimeout(
    `${API_URL}/export`,
    { method: "POST", body: form },
    TIMEOUT.default
  );
  if (!res.ok) await parseError(res, "Export failed");

  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename =
    match?.[1] ||
    (opts.format === "tiff"
      ? "textile-design.tif"
      : opts.format === "psd"
        ? "textile-design.psd"
        : "textile-design.png");

  return { blob: await res.blob(), filename };
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/health`, { cache: "no-store" }, 15000);
    return res.ok;
  } catch {
    return false;
  }
}
