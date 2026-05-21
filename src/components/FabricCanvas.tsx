import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  Canvas,
  FabricImage,
  PencilBrush,
  Rect,
  type FabricObject,
} from "fabric";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Crop,
  Eye,
  EyeOff,
  Layers,
  Merge,
  MousePointer2,
  Paintbrush,
  Square,
  Trash2,
} from "lucide-react";

export type LayerInfo = {
  id: string;
  name: string;
  visible: boolean;
};

export type FabricCanvasHandle = {
  getPngDataUrl: (dpi?: number) => string;
};

type CanvasLayer = { id: string; url: string; name: string };

type Props = {
  layers: CanvasLayer[];
};

async function resolveLayerUrl(url: string): Promise<string> {
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error(`Could not load layer image (${res.status})`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export const FabricCanvas = forwardRef<FabricCanvasHandle, Props>(function FabricCanvas(
  { layers },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const regionRectRef = useRef<Rect | null>(null);
  const [layerList, setLayerList] = useState<LayerInfo[]>([]);
  const [tool, setTool] = useState<"move" | "region" | "brush">("move");
  const [brushSize, setBrushSize] = useState(12);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [opacity, setOpacity] = useState(100);
  const [hasRegion, setHasRegion] = useState(false);

  const syncLayerList = useCallback((canvas: Canvas) => {
    const objs = canvas.getObjects().filter((o) => (o as FabricObject & { name?: string }).name !== "__region__");
    setLayerList(
      objs.map((o, i) => ({
        id: String(i),
        name: ((o as FabricObject & { name?: string }).name as string) || `Layer ${i + 1}`,
        visible: o.visible !== false,
      }))
    );
  }, []);

  const getExportMultiplier = (dpi: number) => Math.max(1, Math.round((dpi / 72) * 2));

  useImperativeHandle(ref, () => ({
    getPngDataUrl: (dpi = 150) => {
      const canvas = fabricRef.current;
      if (!canvas) return "";
      if (regionRectRef.current) {
        canvas.remove(regionRectRef.current);
        regionRectRef.current = null;
      }
      canvas.renderAll();
      return canvas.toDataURL({
        format: "png",
        multiplier: getExportMultiplier(dpi),
      });
    },
  }));

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: 640,
      height: 640,
      backgroundColor: "#1e293b",
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    canvas.on("selection:created", (e) => {
      const target = (e as { selected?: FabricObject[] }).selected?.[0];
      if (!target || (target as FabricObject & { name?: string }).name === "__region__") return;
      const idx = canvas.getObjects().indexOf(target);
      if (idx >= 0) setSelectedIndex(idx);
    });
    canvas.on("selection:updated", (e) => {
      const target = (e as { selected?: FabricObject[] }).selected?.[0];
      if (!target) return;
      const idx = canvas.getObjects().indexOf(target);
      if (idx >= 0) setSelectedIndex(idx);
    });
    canvas.on("selection:cleared", () => setSelectedIndex(null));

    return () => {
      canvas.dispose();
      fabricRef.current = null;
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    let cancelled = false;

    const loadAll = async () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
      regionRectRef.current = null;
      setHasRegion(false);

      canvas.clear();
      canvas.backgroundColor = "#1e293b";

      if (layers.length === 0) {
        setLayerList([]);
        return;
      }

      for (const layer of layers) {
        if (cancelled) return;
        try {
          const src = await resolveLayerUrl(layer.url);
          if (src.startsWith("blob:")) blobUrlsRef.current.push(src);

          const img = await FabricImage.fromURL(src);
          if (cancelled) return;

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
        } catch (e) {
          console.error("Failed to load layer", layer.name, e);
        }
      }

      canvas.renderAll();
      syncLayerList(canvas);
    };

    loadAll();
    return () => {
      cancelled = true;
    };
  }, [layers, syncLayerList]);

  const getObjects = () => {
    const canvas = fabricRef.current;
    if (!canvas) return [];
    return canvas.getObjects().filter((o) => (o as FabricObject & { name?: string }).name !== "__region__");
  };

  const toggleVisibility = (index: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = getObjects();
    const obj = objs[index];
    if (!obj) return;
    obj.visible = !obj.visible;
    canvas.renderAll();
    syncLayerList(canvas);
  };

  const removeLayer = (index: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = getObjects()[index];
    if (obj) canvas.remove(obj);
    canvas.renderAll();
    syncLayerList(canvas);
    setSelectedIndex(null);
  };

  const moveLayer = (index: number, dir: -1 | 1) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objs = getObjects();
    const target = objs[index];
    if (!target) return;
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= objs.length) return;
    canvas.moveObjectTo(target, newIndex);
    canvas.renderAll();
    syncLayerList(canvas);
    setSelectedIndex(newIndex);
  };

  const duplicateLayer = async (index: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const obj = getObjects()[index];
    if (!obj || !(obj instanceof FabricImage)) return;
    const clone = await obj.clone();
    clone.set({
      left: (obj.left ?? 0) + 24,
      top: (obj.top ?? 0) + 24,
      name: `${(obj as FabricObject & { name?: string }).name || "Layer"} copy`,
    });
    canvas.add(clone);
    canvas.setActiveObject(clone);
    canvas.renderAll();
    syncLayerList(canvas);
  };

  const applyOpacity = (value: number) => {
    setOpacity(value);
    const canvas = fabricRef.current;
    if (!canvas || selectedIndex === null) return;
    const obj = getObjects()[selectedIndex];
    if (!obj) return;
    obj.set("opacity", value / 100);
    canvas.renderAll();
  };

  const mergeVisibleLayers = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (regionRectRef.current) {
      canvas.remove(regionRectRef.current);
      regionRectRef.current = null;
    }
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
    canvas.clear();
    canvas.backgroundColor = "#1e293b";
    const img = await FabricImage.fromURL(dataUrl);
    img.set({
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      originX: "center",
      originY: "center",
      name: "Merged layer",
    });
    const scale = Math.min(
      (canvas.width! * 0.9) / (img.width || 1),
      (canvas.height! * 0.9) / (img.height || 1)
    );
    img.set({ scaleX: scale, scaleY: scale });
    canvas.add(img);
    canvas.renderAll();
    syncLayerList(canvas);
    setSelectedIndex(0);
  };

  const enableBrush = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setTool("brush");
    canvas.selection = true;
    canvas.defaultCursor = "crosshair";
    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush = new PencilBrush(canvas);
    }
    const brush = canvas.freeDrawingBrush as PencilBrush;
    brush.color = "rgba(167, 139, 250, 0.85)";
    brush.width = brushSize;
    canvas.isDrawingMode = true;
  };

  const disableDrawing = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.isDrawingMode = false;
    canvas.defaultCursor = "default";
    setTool("move");
  };

  const startRegionDraw = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    setTool("region");
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = "crosshair";

    if (regionRectRef.current) {
      canvas.remove(regionRectRef.current);
      regionRectRef.current = null;
    }

    let startX = 0;
    let startY = 0;
    let rect: Rect | null = null;

    const onDown = (opt: { e?: Event }) => {
      const ev = opt.e as MouseEvent | undefined;
      if (!ev) return;
      const pointer = canvas.getScenePoint(ev);
      startX = pointer.x;
      startY = pointer.y;
      rect = new Rect({
        left: startX,
        top: startY,
        width: 1,
        height: 1,
        fill: "rgba(139,92,246,0.15)",
        stroke: "#a78bfa",
        strokeWidth: 2,
        selectable: false,
        evented: false,
        name: "__region__",
      });
      canvas.add(rect);
      regionRectRef.current = rect;
    };

    const onMove = (opt: { e?: Event }) => {
      if (!rect) return;
      const ev = opt.e as MouseEvent | undefined;
      if (!ev) return;
      const pointer = canvas.getScenePoint(ev);
      const w = Math.abs(pointer.x - startX);
      const h = Math.abs(pointer.y - startY);
      rect.set({
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y),
        width: w,
        height: h,
      });
      canvas.renderAll();
    };

    const onUp = () => {
      canvas.off("mouse:down", onDown);
      canvas.off("mouse:move", onMove);
      canvas.off("mouse:up", onUp);
      canvas.selection = true;
      canvas.defaultCursor = "default";
      setTool("move");
      setHasRegion(!!regionRectRef.current);
    };

    canvas.on("mouse:down", onDown);
    canvas.on("mouse:move", onMove);
    canvas.on("mouse:up", onUp);
  };

  const extractRegionToLayer = async () => {
    const canvas = fabricRef.current;
    const rect = regionRectRef.current;
    if (!canvas || !rect) return;

    const left = rect.left ?? 0;
    const top = rect.top ?? 0;
    const width = (rect.width ?? 0) * (rect.scaleX ?? 1);
    const height = (rect.height ?? 0) * (rect.scaleY ?? 1);

    if (width < 8 || height < 8) {
      canvas.remove(rect);
      regionRectRef.current = null;
      canvas.renderAll();
      return;
    }

    const dataUrl = canvas.toDataURL({
      format: "png",
      left,
      top,
      width,
      height,
      multiplier: 1,
    });

    canvas.remove(rect);
    regionRectRef.current = null;
    setHasRegion(false);

    const img = await FabricImage.fromURL(dataUrl);
    img.set({
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      originX: "center",
      originY: "center",
      name: `Region ${getObjects().length + 1}`,
    });
    const scale = Math.min(
      (canvas.width! * 0.5) / (img.width || 1),
      (canvas.height! * 0.5) / (img.height || 1)
    );
    img.set({ scaleX: scale, scaleY: scale });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    syncLayerList(canvas);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={disableDrawing}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            tool === "move"
              ? "border-violet-500 bg-violet-500/20 text-violet-300"
              : "border-surface-border hover:bg-violet-500/10"
          }`}
        >
          <MousePointer2 className="h-3.5 w-3.5" />
          Move
        </button>
        <button
          type="button"
          onClick={enableBrush}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            tool === "brush"
              ? "border-violet-500 bg-violet-500/20 text-violet-300"
              : "border-surface-border hover:bg-violet-500/10"
          }`}
        >
          <Paintbrush className="h-3.5 w-3.5" />
          Brush
        </button>
        {tool === "brush" && (
          <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            Size
            <input
              type="range"
              min={2}
              max={48}
              value={brushSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                setBrushSize(v);
                const canvas = fabricRef.current;
                if (canvas?.freeDrawingBrush) {
                  canvas.freeDrawingBrush.width = v;
                }
              }}
              className="w-20 accent-violet-500"
            />
          </label>
        )}
        <button
          type="button"
          onClick={startRegionDraw}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium hover:bg-violet-500/10"
        >
          <Square className="h-3.5 w-3.5" />
          Select region
        </button>
        <button
          type="button"
          onClick={extractRegionToLayer}
          disabled={!hasRegion}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium hover:bg-violet-500/10 disabled:opacity-40"
        >
          <Crop className="h-3.5 w-3.5" />
          Region → layer
        </button>
        <button
          type="button"
          onClick={mergeVisibleLayers}
          disabled={layerList.length < 2}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-1.5 text-xs font-medium hover:bg-violet-500/10 disabled:opacity-40"
        >
          <Merge className="h-3.5 w-3.5" />
          Merge visible
        </button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 overflow-hidden rounded-xl border border-surface-border bg-surface-elevated p-2 shadow-inner">
          <canvas ref={canvasRef} className="mx-auto max-w-full" />
          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
            Move · brush · region select · merge layers
          </p>
        </div>

        <div className="w-full rounded-xl border border-surface-border bg-surface-elevated p-4 lg:w-64">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4 text-violet-400" />
            Layers
          </h3>
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {layerList.map((layer, i) => (
              <li
                key={`${layer.id}-${i}`}
                className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-sm ${
                  selectedIndex === i
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-surface-border"
                }`}
              >
                <button
                  type="button"
                  className="truncate text-left flex-1"
                  onClick={() => {
                    const canvas = fabricRef.current;
                    const obj = getObjects()[i];
                    if (canvas && obj) {
                      canvas.setActiveObject(obj);
                      canvas.renderAll();
                      setSelectedIndex(i);
                    }
                  }}
                >
                  {layer.name}
                </button>
                <div className="flex shrink-0 gap-0.5">
                  <button type="button" onClick={() => moveLayer(i, 1)} className="rounded p-1 hover:bg-violet-500/10" aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => moveLayer(i, -1)} className="rounded p-1 hover:bg-violet-500/10" aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => toggleVisibility(i)} className="rounded p-1 hover:bg-violet-500/10">
                    {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-50" />}
                  </button>
                  <button type="button" onClick={() => duplicateLayer(i)} className="rounded p-1 hover:bg-violet-500/10">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => removeLayer(i)} className="rounded p-1 hover:bg-red-500/10 text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {selectedIndex !== null && (
            <div className="mt-4">
              <label className="text-xs text-[var(--text-muted)]">
                Opacity: {opacity}%
              </label>
              <input
                type="range"
                min={10}
                max={100}
                value={opacity}
                onChange={(e) => applyOpacity(Number(e.target.value))}
                className="mt-1 w-full accent-violet-500"
              />
            </div>
          )}
          {layerList.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">Layers appear after pipeline completes</p>
          )}
        </div>
      </div>
    </div>
  );
});
