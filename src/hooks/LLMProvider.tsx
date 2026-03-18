import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  pipeline,
  TextStreamer,
  InterruptableStoppingCriteria,
  type TextGenerationPipeline,
} from "@huggingface/transformers";
import { HarmonyStreamParser, type HarmonyMessage } from "../utils/harmony";
import {
  LLMContext,
  createMessageId,
  type ChatMessage,
  type LoadingStatus,
  type ReasoningEffort,
} from "./LLMContext";

const MODEL_ID = "onnx-community/gpt-oss-20b-ONNX";

const TOTAL_FILE_SIZE = 12651938001;

export function LLMProvider({ children }: { children: ReactNode }) {
  const generatorRef = useRef<Promise<TextGenerationPipeline> | null>(null);
  const stoppingCriteria = useRef(new InterruptableStoppingCriteria());

  const [status, setStatus] = useState<LoadingStatus>({ state: "idle" });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [tps, setTps] = useState(0);
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffort>("medium");
  const reasoningEffortRef = useRef<ReasoningEffort>("medium");

  useEffect(() => {
    reasoningEffortRef.current = reasoningEffort;
  }, [reasoningEffort]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  useEffect(() => {
    if (generatorRef.current) return; // already loading / loaded

    generatorRef.current = (async () => {
      setStatus({ state: "loading", message: "Downloading model…" });
      try {
        const fileProgress = new Map<string, number>();

        const gen = await pipeline("text-generation", MODEL_ID, {
          dtype: "q4f16",
          device: "webgpu",
          progress_callback: (p: Record<string, unknown>) => {
            if (p.status === "progress" && typeof p.loaded === "number") {
              fileProgress.set(p.file as string, p.loaded as number);
              const loaded = Array.from(fileProgress.values()).reduce(
                (a, b) => a + b,
                0,
              );
              const progress = (loaded / TOTAL_FILE_SIZE) * 100;
              setStatus({
                state: "loading",
                progress,
                message: `Downloading model… ${Math.round(progress)}%`,
              });
            }
          },
        });
        setStatus({ state: "ready" });
        return gen;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus({ state: "error", error: msg });
        generatorRef.current = null;
        throw err;
      }
    })();
  }, []);

  const runGeneration = useCallback(async (chatHistory: ChatMessage[]) => {
    const generator = await generatorRef.current!;
    setIsGenerating(true);
    setTps(0);
    stoppingCriteria.current.reset();

    const parser = new HarmonyStreamParser();
    let tokenCount = 0;
    let firstTokenTime = 0;

    const assistantIdx = chatHistory.length;
    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), role: "assistant", content: "", reasoning: "" },
    ]);

    const streamer = new TextStreamer(generator.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: false,
      callback_function: (output: string) => {
        const delta = parser.push(output);
        if (!delta || delta.type !== "content") return;

        const msg = parser.messages[delta.messageIndex];
        const channel = msg?.channel ?? "";

        setMessages((prev) => {
          const updated = [...prev];
          const assistant = { ...updated[assistantIdx] };
          if (channel === "analysis") {
            assistant.reasoning = (assistant.reasoning ?? "") + delta.textDelta;
          } else {
            assistant.content += delta.textDelta;
          }
          updated[assistantIdx] = assistant;
          return updated;
        });
      },
      token_callback_function: () => {
        tokenCount++;
        if (tokenCount === 1) {
          firstTokenTime = performance.now();
        } else {
          const elapsed = (performance.now() - firstTokenTime) / 1000;
          if (elapsed > 0) {
            setTps(Math.round(((tokenCount - 1) / elapsed) * 10) / 10);
          }
        }
      },
    });

    const apiMessages = [
      { role: "system" as const, content: "You are a helpful assistant." },
      ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
    ];

    try {
      await generator(apiMessages, {
        max_new_tokens: 2048,
        do_sample: true,
        streamer,
        stopping_criteria: stoppingCriteria.current,
        tokenizer_encode_kwargs: {
          reasoning_effort: reasoningEffortRef.current,
        },
      });
    } catch (err) {
      console.error("Generation error:", err);
    }

    const finalMsg = parser.messages
      .filter((m: HarmonyMessage) => m.channel !== "analysis")
      .at(-1);
    const reasoningMsg = parser.messages.find(
      (m: HarmonyMessage) => m.channel === "analysis",
    );

    setMessages((prev) => {
      const updated = [...prev];
      updated[assistantIdx] = {
        ...updated[assistantIdx],
        content: finalMsg?.content.trim() ?? prev[assistantIdx].content,
        reasoning: reasoningMsg?.content.trim() ?? prev[assistantIdx].reasoning,
      };
      return updated;
    });

    setIsGenerating(false);
  }, []);

  const send = useCallback(
    (text: string) => {
      if (!generatorRef.current || isGeneratingRef.current) return;

      const userMsg: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: text,
      };

      setMessages((prev) => [...prev, userMsg]);
      runGeneration([...messagesRef.current, userMsg]);
    },
    [runGeneration],
  );

  const stop = useCallback(() => {
    stoppingCriteria.current.interrupt();
  }, []);

  const clearChat = useCallback(() => {
    if (isGeneratingRef.current) return;
    setMessages([]);
  }, []);

  const editMessage = useCallback(
    (index: number, newContent: string) => {
      if (isGeneratingRef.current) return;

      setMessages((prev) => {
        const updated = prev.slice(0, index);
        updated.push({ ...prev[index], content: newContent });
        return updated;
      });

      const updatedHistory = messagesRef.current.slice(0, index);
      updatedHistory.push({
        ...messagesRef.current[index],
        content: newContent,
      });

      if (messagesRef.current[index]?.role === "user") {
        setTimeout(() => runGeneration(updatedHistory), 0);
      }
    },
    [runGeneration],
  );

  const retryMessage = useCallback(
    (index: number) => {
      if (isGeneratingRef.current) return;

      const history = messagesRef.current.slice(0, index);
      setMessages(history);
      setTimeout(() => runGeneration(history), 0);
    },
    [runGeneration],
  );

  return (
    <LLMContext.Provider
      value={{
        status,
        messages,
        isGenerating,
        tps,
        reasoningEffort,
        setReasoningEffort,
        send,
        stop,
        clearChat,
        editMessage,
        retryMessage,
      }}
    >
      {children}
    </LLMContext.Provider>
  );
}
