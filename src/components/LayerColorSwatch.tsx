import { useEffect, useState } from "react";
import { resolveLayerPickerColor } from "@/lib/layerColor";
import type { CanvasLayer } from "@/lib/types";

type Props = {
  layer: CanvasLayer;
  className?: string;
};

/** Shows the true layer color (from rgb metadata or sampled from the layer image). */
export function LayerColorSwatch({ layer, className }: Props) {
  const [hex, setHex] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHex(null);
    resolveLayerPickerColor(layer).then((color) => {
      if (!cancelled) setHex(color);
    });
    return () => {
      cancelled = true;
    };
  }, [layer.id, layer.color, layer.rgb, layer.url, layer.originalUrl, layer.name]);

  return (
    <span
      className={
        className ??
        "h-5 w-5 shrink-0 rounded border border-white/25 shadow-inner"
      }
      style={{ backgroundColor: hex ?? "transparent" }}
      title={hex ?? "Loading color…"}
      aria-label={hex ? `Color ${hex}` : "Layer color"}
    />
  );
}
