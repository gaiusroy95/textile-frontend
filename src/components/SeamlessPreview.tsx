import { motion } from "framer-motion";
import { Grid3X3 } from "lucide-react";

type Props = {
  tileUrl: string | null;
  previewUrl: string | null;
};

export function SeamlessPreview({ tileUrl, previewUrl }: Props) {
  if (!tileUrl && !previewUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid gap-4 md:grid-cols-2"
    >
      {tileUrl && (
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-4">
          <p className="mb-2 text-sm font-medium text-[var(--text-muted)]">Single tile unit</p>
          <img src={tileUrl} alt="Seamless tile" className="mx-auto max-h-64 rounded-lg object-contain" />
        </div>
      )}
      {previewUrl && (
        <div className="rounded-xl border border-surface-border bg-surface-elevated p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
            <Grid3X3 className="h-4 w-4" />
            2×2 repeat preview
          </p>
          <img
            src={previewUrl}
            alt="Seamless repeat preview"
            className="w-full rounded-lg object-cover"
          />
        </div>
      )}
    </motion.div>
  );
}
