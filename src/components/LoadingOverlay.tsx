import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export function LoadingOverlay({
  message,
  progress,
}: {
  message: string;
  progress?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-surface-border glass p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-violet-400" />
          <p className="text-lg font-medium">{message}</p>
          {progress !== undefined && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-border">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}
          <p className="text-sm text-[var(--text-muted)]">
            AI & computer vision pipeline running…
          </p>
        </div>
      </div>
    </motion.div>
  );
}
