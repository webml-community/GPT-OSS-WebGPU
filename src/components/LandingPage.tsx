import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { LoadingStatus } from "../hooks/LLMContext";

interface LandingPageProps {
  onStart: () => void;
  status: LoadingStatus;
  isLoading: boolean;
}

export function LandingPage({ onStart, status, isLoading }: LandingPageProps) {
  const [fading, setFading] = useState(false);

  const handleStart = () => {
    setFading(true);
    setTimeout(() => onStart(), 400);
  };

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[#09090b] text-[#fafafa]">
      <div className="landing-grid absolute inset-0" />

      <div
        className={`relative z-10 flex max-w-3xl flex-col items-center px-6 text-center transition-all duration-500 ${
          fading || isLoading
            ? "opacity-0 translate-y-4 pointer-events-none"
            : "opacity-100"
        }`}
      >
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-[#fafafa]">GPT-OSS</span>{" "}
          <span className="text-[#52525b]">WebGPU</span>
        </h1>

        <p className="mt-5 text-lg text-[#a1a1aa]">
          Run{" "}
          <a
            href="https://huggingface.co/onnx-community/gpt-oss-20b-ONNX"
            target="_blank"
            className="underline decoration-[#3f3f46] hover:text-[#fafafa] transition-colors"
          >
            GPT-OSS-20B
          </a>{" "}
          locally in your browser, powered by{" "}
          <a
            href="https://github.com/huggingface/transformers.js"
            target="_blank"
            className="underline decoration-[#3f3f46] hover:text-[#fafafa] transition-colors"
          >
            Transformers.js
          </a>
        </p>

        <div className="max-w-xl mt-12 flex flex-col gap-6 text-left">
          <div className="flex items-start gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#27272a] text-sm font-medium text-[#71717a]">
              1
            </span>
            <div>
              <p className="text-base font-medium text-[#e4e4e7]">
                20B parameter LLM in your browser
              </p>
              <p className="mt-1 text-sm text-[#52525b]">
                You are about to load GPT-OSS-20B, a 20 billion parameter LLM
                optimized for in-browser inference (~12.6 GB download).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#27272a] text-sm font-medium text-[#71717a]">
              2
            </span>
            <div>
              <p className="text-base font-medium text-[#e4e4e7]">
                Completely private &amp; offline-capable
              </p>
              <p className="mt-1 text-sm text-[#52525b]">
                Everything runs entirely in your browser with 🤗 Transformers.js
                and ONNX Runtime Web — no data is ever sent to a server. Once
                loaded, it works offline.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#27272a] text-sm font-medium text-[#71717a]">
              3
            </span>
            <div>
              <p className="text-base font-medium text-[#e4e4e7]">
                Experimental — WebGPU required
              </p>
              <p className="mt-1 text-sm text-[#52525b]">
                This is experimental and requires a browser with WebGPU support
                and enough VRAM to run the model.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="mt-10 rounded-xl border border-[#27272a] bg-[#fafafa] px-8 py-3 text-base font-semibold text-[#09090b] hover:bg-[#e4e4e7] transition-colors duration-200 cursor-pointer"
        >
          Load Model &amp; Start Chatting
        </button>

        <p className="mt-3 text-xs text-[#3f3f46]">
          ~12.6 GB will be downloaded and cached in your browser.
        </p>
      </div>

      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center transition-opacity duration-500 ${
          isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Loader2 className="h-10 w-10 animate-spin text-[#a1a1aa]" />
        <p className="mt-4 text-base text-[#a1a1aa]">
          {status.state === "loading"
            ? (status.message ?? "Loading model…")
            : status.state === "error"
              ? "Error"
              : "Initializing…"}
        </p>
        <div className="mt-3 w-72 h-1.5 bg-[#18181b] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#a1a1aa] rounded-full transition-[width] duration-300 ease-out"
            style={{
              width: `${status.state === "ready" ? 100 : status.state === "loading" && status.progress != null ? status.progress : 0}%`,
            }}
          />
        </div>
        {status.state === "error" && (
          <p className="mt-2 text-sm text-red-400">{status.error}</p>
        )}
      </div>
    </div>
  );
}
