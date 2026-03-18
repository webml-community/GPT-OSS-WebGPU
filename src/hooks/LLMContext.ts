import { createContext } from "react";

let nextMessageId = 0;

/** Generate a unique, stable ID for each chat message. */
export function createMessageId(): number {
  return nextMessageId++;
}

export interface ChatMessage {
  /** Stable identity for React keys & lookups. */
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  /** Only present on assistant messages while/after streaming. */
  reasoning?: string;
  /** Seconds spent in the thinking/reasoning phase. */
  thinkingSeconds?: number;
}

export type LoadingStatus =
  | { state: "idle" }
  | { state: "loading"; progress?: number; message?: string }
  | { state: "ready" }
  | { state: "error"; error: string };

export type ReasoningEffort = "low" | "medium" | "high";

export interface LLMContextValue {
  status: LoadingStatus;
  messages: ChatMessage[];
  isGenerating: boolean;
  tps: number;
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (effort: ReasoningEffort) => void;
  send: (text: string) => void;
  stop: () => void;
  clearChat: () => void;
  editMessage: (index: number, newContent: string) => void;
  retryMessage: (index: number) => void;
}

export const LLMContext = createContext<LLMContextValue | null>(null);
