/**
 * API client for Textile AI backend
 */

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TIMEOUT = {
  extract: 5 * 60 * 1000,
  seamless: 3 * 60 * 1000,
  variations: 4 * 60 * 1000,
  default: 2 * 60 * 1000,
} as const;

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

export type VariationItem = {
  index: number;
  url: string;
  image_base64?: string;
};

export type VariationsResponse = {
  session_id: string;
  provider: string;
  prompt_used: string | null;
  variations: VariationItem[];
};

function imageUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export function base64ToDataUrl(b64: string, mime = "image/png"): string {
  return `data:${mime};base64,${b64}`;
}

function resolveImageSrc(url: string, base64?: string): string {
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
      throw new Error(
        "Request timed out. On free hosting the first run can take 1–2 minutes — try again, or use a smaller image."
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export type InputType =
  | "garment"
  | "flat_design"
  | "swatch"
  | "paper_scan"
  | "reference"
  | "multi_swatch";

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Fabric extraction failed");
  }
  const data = (await res.json()) as ExtractResponse;
  return { ...data, image_url: imageUrl(data.image_url) };
}

export async function generateSeamless(
  sessionId: string,
  imageBase64?: string
): Promise<SeamlessResponse> {
  const form = new FormData();
  form.append("session_id", sessionId);
  if (imageBase64) form.append("image_base64", imageBase64);

  const res = await fetchWithTimeout(
    `${API_URL}/generate-seamless`,
    { method: "POST", body: form },
    TIMEOUT.seamless
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Seamless generation failed");
  }
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || "Variation generation failed");
  }
  const data = (await res.json()) as VariationsResponse;
  return {
    ...data,
    variations: data.variations.map((v) => ({
      ...v,
      url: imageUrl(v.url),
    })),
  };
}

export { resolveImageSrc };

export async function exportCanvas(imageBase64: string, sessionId?: string): Promise<Blob> {
  const form = new FormData();
  form.append("image_base64", imageBase64);
  form.append("download", "true");
  if (sessionId) form.append("session_id", sessionId);

  const res = await fetchWithTimeout(
    `${API_URL}/export`,
    { method: "POST", body: form },
    TIMEOUT.default
  );
  if (!res.ok) throw new Error("Export failed");
  return res.blob();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${API_URL}/health`, { cache: "no-store" }, 15000);
    return res.ok;
  } catch {
    return false;
  }
}
