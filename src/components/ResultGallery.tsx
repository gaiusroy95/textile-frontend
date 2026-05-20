import { motion } from "framer-motion";
import { Check } from "lucide-react";

type Props = {
  images: string[];
  labels?: string[];
  selected?: number | null;
  onSelect?: (index: number) => void;
};

export function ResultGallery({ images, labels, selected, onSelect }: Props) {
  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {images.map((src, i) => (
        <motion.button
          key={src.slice(0, 32) + i}
          type="button"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          onClick={() => onSelect?.(i)}
          className={`group relative overflow-hidden rounded-xl border-2 transition ${
            selected === i
              ? "border-violet-500 ring-2 ring-violet-500/30"
              : "border-surface-border hover:border-violet-500/50"
          }`}
        >
          <img
            src={src}
            alt={labels?.[i] || `Result ${i + 1}`}
            className="aspect-square w-full object-cover"
          />
          {labels?.[i] && (
            <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
              {labels[i]}
            </span>
          )}
          {selected === i && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600">
              <Check className="h-4 w-4 text-white" />
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}
