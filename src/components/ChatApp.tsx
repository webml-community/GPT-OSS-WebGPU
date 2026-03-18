import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, Plus, ChevronDown, Lightbulb } from "lucide-react";

import { useLLM } from "../hooks/useLLM";
import { MessageBubble } from "./MessageBubble";
import { StatusBar } from "./StatusBar";
import type { ReasoningEffort } from "../hooks/LLMContext";

const EXAMPLE_PROMPTS = [
  {
    label: "Solve x² + x - 12 = 0",
    prompt: "Solve x^2 + x - 12 = 0",
  },
  {
    label: "Explain quantum computing",
    prompt:
      "Explain quantum computing in simple terms. What makes it different from classical computing, and what are some real-world applications?",
  },
  {
    label: "Write a Python quicksort",
    prompt:
      "Write a clean, well-commented Python implementation of the quicksort algorithm. Include an example of how to use it.",
  },
  {
    label: "Haiku about the ocean",
    prompt: "Write a haiku about the ocean.",
  },
] as const;

const REASONING_OPTIONS: { value: ReasoningEffort; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export function ChatApp() {
  const {
    messages,
    isGenerating,
    send,
    stop,
    status,
    clearChat,
    reasoningEffort,
    setReasoningEffort,
  } = useLLM();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showReasoningMenu, setShowReasoningMenu] = useState(false);
  const reasoningMenuRef = useRef<HTMLDivElement>(null);

  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const thinkingStartRef = useRef<number | null>(null);

  const isReady = status.state === "ready";
  const hasMessages = messages.length > 0;

  const hasCompletedRef = useRef(false);
  useEffect(() => {
    if (hasMessages && !isGenerating) {
      hasCompletedRef.current = true;
    }
    if (!hasMessages) {
      hasCompletedRef.current = false;
    }
  }, [hasMessages, isGenerating]);
  const showNewChat =
    isReady && hasMessages && !isGenerating && hasCompletedRef.current;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        reasoningMenuRef.current &&
        !reasoningMenuRef.current.contains(e.target as Node)
      ) {
        setShowReasoningMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const prevIsGeneratingRef = useRef(false);
  useEffect(() => {
    if (prevIsGeneratingRef.current && !isGenerating) {
      const finalSeconds = thinkingSeconds;
      if (finalSeconds > 0) {
        const lastMsg = messages.at(-1);
        if (lastMsg?.role === "assistant" && lastMsg.reasoning) {
          lastMsg.thinkingSeconds = finalSeconds;
        }
      }
    }
    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating) {
      thinkingStartRef.current = null;
      return;
    }

    thinkingStartRef.current = Date.now();
    setThinkingSeconds(0);

    const interval = setInterval(() => {
      if (thinkingStartRef.current) {
        setThinkingSeconds(
          Math.round((Date.now() - thinkingStartRef.current) / 1000),
        );
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isGenerating]);

  const lastAssistant = messages.at(-1);
  useEffect(() => {
    if (
      isGenerating &&
      lastAssistant?.role === "assistant" &&
      lastAssistant.content
    ) {
      thinkingStartRef.current = null;
    }
  }, [isGenerating, lastAssistant?.role, lastAssistant?.content]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const text = input.trim();
      if (!text || !isReady || isGenerating) return;
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "7.5rem";
      }
      send(text);
    },
    [input, isReady, isGenerating, send],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const renderInputArea = (showDisclaimer: boolean) => (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-3 pb-11 text-[15px] text-[#fafafa] placeholder-[#a1a1aa] focus:border-[#3f3f46] focus:outline-none focus:ring-1 focus:ring-[#3f3f46] disabled:opacity-50 resize-none max-h-40"
            style={{ minHeight: "7.5rem", height: "7.5rem" }}
            placeholder={isReady ? "Type a message…" : "Loading model…"}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "7.5rem";
              e.target.style.height =
                Math.max(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={handleInputKeyDown}
            disabled={!isReady}
            autoFocus
          />

          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pb-3 px-2">
            <div ref={reasoningMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setShowReasoningMenu((v) => !v)}
                className="flex items-center gap-1 rounded-lg text-xs text-[#52525b] hover:text-[#a1a1aa] transition-colors cursor-pointer"
                title="Reasoning effort"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span className="capitalize">{reasoningEffort}</span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {showReasoningMenu && (
                <div className="absolute bottom-full left-0 mb-1 min-w-[100px] rounded-lg border border-[#27272a] bg-[#18181b] py-1 shadow-xl z-50">
                  {REASONING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setReasoningEffort(opt.value);
                        setShowReasoningMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                        reasoningEffort === opt.value
                          ? "text-[#fafafa] bg-[#27272a]"
                          : "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a]/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isGenerating ? (
              <button
                type="button"
                onClick={stop}
                className="flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-[#fafafa] transition-colors cursor-pointer"
                title="Stop generating"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!isReady || !input.trim()}
                className="flex items-center justify-center rounded-lg text-[#a1a1aa] hover:text-[#fafafa] disabled:opacity-30 transition-colors cursor-pointer"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>

      {showDisclaimer && (
        <p className="mx-auto max-w-3xl mt-1 text-center text-xs text-[#3f3f46]">
          No chats are sent to a server. Everything runs locally in your
          browser. AI can make mistakes. Check important info.
        </p>
      )}
    </div>
  );

  if (isReady && !hasMessages) {
    return (
      <div className="flex h-full flex-col bg-[#09090b] text-[#fafafa]">
        <header className="flex items-center justify-between border-b border-[#27272a] px-6 py-3 h-14">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[#fafafa]">
              GPT-OSS-20B
            </h1>
            <span className="text-base font-semibold text-[#52525b]">
              WebGPU
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center px-4">
          <div className="mb-8 text-center">
            <p className="text-3xl font-medium text-[#fafafa]">
              What can I help you with?
            </p>
          </div>

          {renderInputArea(false)}

          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-3xl">
            {EXAMPLE_PROMPTS.map(({ label, prompt }) => (
              <button
                key={label}
                onClick={() => send(prompt)}
                className="rounded-lg border border-[#27272a] bg-[#18181b] px-3 py-2 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:border-[#3f3f46] transition-colors cursor-pointer"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#09090b] text-[#fafafa]">
      <header className="flex-none flex items-center justify-between border-b border-[#27272a] px-6 py-3 h-14">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-[#fafafa]">
            GPT-OSS-20B
          </h1>
          <span className="text-base font-semibold text-[#52525b]">WebGPU</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={clearChat}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-opacity duration-300 cursor-pointer ${
              showNewChat ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            title="New chat"
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </button>
        </div>
      </header>

      <main
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 animate-fade-in"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {!isReady && <StatusBar />}

          {messages.map((msg, i) => {
            const isLast =
              i === messages.length - 1 && msg.role === "assistant";
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                index={i}
                isStreaming={isGenerating && isLast}
                thinkingSeconds={isLast ? thinkingSeconds : undefined}
                isGenerating={isGenerating}
              />
            );
          })}

          {isReady && <StatusBar />}
        </div>
      </main>

      <footer className="flex-none px-4 py-3 animate-fade-in">
        {renderInputArea(true)}
      </footer>
    </div>
  );
}
