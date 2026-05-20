import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { ImagePlus, Upload } from "lucide-react";

type Props = {
  onFile: (file: File) => void;
  preview?: string | null;
  disabled?: boolean;
};

export function UploadZone({ onFile, preview, disabled }: Props) {
  const onDrop = useCallback(
    (files: File[]) => {
      if (files[0]) onFile(files[0]);
    },
    [onFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
    disabled,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div
        {...getRootProps()}
        className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition ${
          isDragActive
            ? "border-violet-500 bg-violet-500/10"
            : "border-surface-border hover:border-violet-500/50 hover:bg-violet-500/5"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="relative aspect-[4/3] w-full">
            <img
              src={preview}
              alt="Upload preview"
              className="h-full w-full object-contain bg-[var(--surface-elevated)]"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition hover:opacity-100">
              <span className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white backdrop-blur">
                <Upload className="h-4 w-4" />
                Replace image
              </span>
            </div>
          </div>
        ) : (
          <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 p-8">
            <div className="rounded-2xl bg-violet-500/10 p-4">
              <ImagePlus className="h-12 w-12 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">
                {isDragActive ? "Drop your garment image" : "Drag & drop garment / fabric photo"}
              </p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                PNG, JPG, WEBP — clothing, upholstery, or swatch
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
