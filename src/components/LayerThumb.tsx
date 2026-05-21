import { useEffect, useState } from "react";
import { recolorLayerImage } from "@/lib/recolorLayer";
import type { CanvasLayer } from "@/lib/types";

type Props = {
  layer: CanvasLayer;
  className?: string;
};

export function LayerThumb({ layer, className }: Props) {
  const [src, setSrc] = useState(layer.url);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const base = layer.originalUrl ?? layer.url;
      try {
        if (layer.color) {
          const tinted = await recolorLayerImage(base, layer.color);
          if (!cancelled) setSrc(tinted);
        } else if (!cancelled) {
          setSrc(layer.url);
        }
      } catch {
        if (!cancelled) setSrc(layer.url);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [layer.url, layer.color, layer.originalUrl]);

  return (
    <img
      src={src}
      alt={layer.name}
      title={layer.name}
      className={className}
    />
  );
}
