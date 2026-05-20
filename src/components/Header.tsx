import { Layers, Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function Header() {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-surface-border glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-violet-500/25">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              Textile<span className="gradient-text">AI</span>
            </h1>
            <p className="text-xs text-[var(--text-muted)]">Design Generation Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400 sm:flex">
            <Sparkles className="h-3 w-3" />
            MVP Demo
          </span>
          <button
            type="button"
            onClick={toggle}
            className="rounded-lg border border-surface-border p-2 transition hover:bg-violet-500/10"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-violet-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
