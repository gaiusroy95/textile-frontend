import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";
import { Studio } from "@/components/Studio";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function App() {
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth().then(setApiOk);
    const interval = setInterval(() => checkHealth().then(setApiOk), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider>
      {apiOk === false && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-center text-sm text-amber-600 dark:text-amber-400">
          Backend offline — start API at{" "}
          <code className="rounded bg-black/10 px-1">localhost:8000</code>
        </div>
      )}
      <Studio />
    </ThemeProvider>
  );
}
