import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { formatLayerDisplayName } from "@/lib/layerColor";
import type { CanvasLayer } from "@/lib/types";
import { LayerColorSwatch } from "./LayerColorSwatch";
import { LayerThumb } from "./LayerThumb";

type Props = {
  layer: CanvasLayer;
  selected: boolean;
  visible: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
};

export function LayerListRow({
  layer,
  selected,
  visible,
  onSelect,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDuplicate,
  onRemove,
}: Props) {
  const displayName = formatLayerDisplayName(layer.name);

  return (
    <li
      className={`rounded-lg border ${
        selected
          ? "border-violet-500 bg-violet-500/10"
          : "border-surface-border"
      }`}
    >
      <div className="flex items-center gap-1.5 p-1.5">
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          title={displayName}
        >
          <LayerThumb
            layer={layer}
            className="h-9 w-9 shrink-0 rounded border border-surface-border bg-slate-800 object-cover"
          />
          <span className="min-w-0 flex-1 truncate text-xs font-medium leading-tight">
            {displayName}
          </span>
          <LayerColorSwatch layer={layer} />
        </button>
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            className="rounded p-0.5 hover:bg-violet-500/10"
            aria-label="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            className="rounded p-0.5 hover:bg-violet-500/10"
            aria-label="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button
            type="button"
            onClick={onToggleVisibility}
            className="rounded p-1 hover:bg-violet-500/10"
            aria-label={visible ? "Hide layer" : "Show layer"}
          >
            {visible ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5 opacity-50" />
            )}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded p-1 hover:bg-violet-500/10"
            aria-label="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded p-1 hover:bg-red-500/10 text-red-400"
            aria-label="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}
