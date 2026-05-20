import { useEffect, useRef, useState } from "react";
import { Canvas, FabricImage } from "fabric";
import { Eye, EyeOff, Layers, Trash2 } from "lucide-react";

export type LayerInfo = {
  id: string;
  name: string;
  visible: boolean;
};

type Props = {
  layers: { url: string; name: string }[];
  onExportReady?: (getPngBase64: () => string) => void;
};

export function FabricCanvas({ layers, onExportReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [layerList, setLayerList] = useState<LayerInfo[]>([]);

  const exportCbRef = useRef(onExportReady);
  exportCbRef.current = onExportReady;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 640,
      height: 640,
      backgroundColor: "#1e293b",
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    exportCbRef.current?.(() => {
      const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
      return dataUrl.split(",")[1] || "";
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || layers.length === 0) return;

    canvas.clear();
    canvas.backgroundColor = "#1e293b";

    const loadAll = async () => {
      const infos: LayerInfo[] = [];

      for (let i = 0; i < layers.length; i++) {
        const layer = layers[i];
        try {
          const img = await FabricImage.fromURL(layer.url, {
            crossOrigin: "anonymous",
          });
          const scale = Math.min(
            (canvas.width! * 0.85) / (img.width || 1),
            (canvas.height! * 0.85) / (img.height || 1)
          );
          img.set({
            scaleX: scale,
            scaleY: scale,
            left: canvas.width! / 2,
            top: canvas.height! / 2,
            originX: "center",
            originY: "center",
            selectable: true,
            name: layer.name,
          });
          canvas.add(img);
          infos.push({ id: String(i), name: layer.name, visible: true });
        } catch (e) {
          console.error("Failed to load layer", layer.name, e);
        }
      }
      canvas.renderAll();
      setLayerList(infos);
    };

    loadAll();
  }, [layers]);

  const toggleVisibility = (index: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getObjects()[index];
    if (!obj) return;
    obj.visible = !obj.visible;
    canvas.renderAll();
    setLayerList((prev) =>
      prev.map((l, i) => (i === index ? { ...l, visible: obj.visible ?? true } : l))
    );
  };

  const removeLayer = (index: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = canvas.getObjects()[index];
    if (obj) canvas.remove(obj);
    setLayerList((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="flex-1 overflow-hidden rounded-xl border border-surface-border bg-surface-elevated p-2 shadow-inner">
        <canvas ref={canvasRef} className="mx-auto max-w-full" />
        <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
          Drag layers to reposition · Resize with handles
        </p>
      </div>

      <div className="w-full rounded-xl border border-surface-border bg-surface-elevated p-4 lg:w-56">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Layers className="h-4 w-4 text-violet-400" />
          Layers
        </h3>
        <ul className="space-y-2">
          {layerList.map((layer, i) => (
            <li
              key={layer.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-surface-border px-2 py-1.5 text-sm"
            >
              <span className="truncate">{layer.name}</span>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => toggleVisibility(i)}
                  className="rounded p-1 hover:bg-violet-500/10"
                  aria-label={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {layer.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4 opacity-50" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removeLayer(i)}
                  className="rounded p-1 hover:bg-red-500/10 text-red-400"
                  aria-label="Remove layer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {layerList.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">Layers appear after pipeline completes</p>
        )}
      </div>
    </div>
  );
}
