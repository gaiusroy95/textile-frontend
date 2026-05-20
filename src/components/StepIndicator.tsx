import { Check } from "lucide-react";
import type { PipelineStep } from "@/lib/types";

const STEPS: { id: PipelineStep; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "extract", label: "Extract" },
  { id: "seamless", label: "Seamless" },
  { id: "variations", label: "AI Variations" },
  { id: "edit", label: "Edit" },
  { id: "export", label: "Export" },
];

const ORDER: PipelineStep[] = STEPS.map((s) => s.id);

export function StepIndicator({ current }: { current: PipelineStep }) {
  const currentIdx = ORDER.indexOf(current);

  return (
    <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${
                done
                  ? "bg-violet-600 text-white"
                  : active
                    ? "bg-violet-500/20 text-violet-400 ring-2 ring-violet-500"
                    : "bg-surface-elevated text-[var(--text-muted)] border border-surface-border"
              }`}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                active ? "font-medium text-violet-400" : "text-[var(--text-muted)]"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 hidden h-px w-6 sm:block md:w-10 ${
                  done ? "bg-violet-500" : "bg-surface-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
