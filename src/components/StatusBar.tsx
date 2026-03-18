import { Loader2 } from "lucide-react";
import { useLLM } from "../hooks/useLLM";

export function StatusBar() {
  const { status, tps, isGenerating } = useLLM();

  if (status.state === "loading") {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-[#a1a1aa]">
        <Loader2 className="h-8 w-8 animate-spin text-[#a1a1aa]" />
        <p className="text-sm">{status.message ?? "Loading model…"}</p>
        {status.progress != null && (
          <div className="w-64 h-2 bg-[#27272a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#a1a1aa]"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (status.state === "error") {
    return (
      <div className="py-12 text-center text-sm text-red-500">
        Error loading model: {status.error}
      </div>
    );
  }

  if (isGenerating && tps > 0) {
    return (
      <div className="text-center text-xs text-[#a1a1aa] py-1">
        {tps} tokens/s
      </div>
    );
  }

  return null;
}
