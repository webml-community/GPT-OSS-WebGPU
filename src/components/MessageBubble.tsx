import { useState, useRef, useEffect, useCallback } from "react";
import { Streamdown } from "streamdown";
import { math } from "@streamdown/math";
import {
  Pencil,
  X,
  Check,
  RotateCcw,
  Copy,
  ClipboardCheck,
} from "lucide-react";

import { useLLM } from "../hooks/useLLM";
import { ReasoningBlock } from "./ReasoningBlock";
import type { ChatMessage } from "../hooks/LLMContext";

interface MessageBubbleProps {
  msg: ChatMessage;
  index: number;
  isStreaming?: boolean;
  thinkingSeconds?: number;
  isGenerating: boolean;
}

function prepareForMathDisplay(content: string): string {
  return content
    .replace(/(?<!\\)\\\[/g, "$$$$")
    .replace(/\\\]/g, "$$$$")
    .replace(/(?<!\\)\\\(/g, "$$$$")
    .replace(/\\\)/g, "$$$$");
}

export function MessageBubble({
  msg,
  index,
  isStreaming,
  thinkingSeconds,
  isGenerating,
}: MessageBubbleProps) {
  const { editMessage, retryMessage } = useLLM();
  const isUser = msg.role === "user";
  const isThinking = !!isStreaming && !msg.content;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [msg.content]);

  const handleRetry = useCallback(() => {
    retryMessage(index);
  }, [retryMessage, index]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  const handleEdit = useCallback(() => {
    setEditValue(msg.content);
    setIsEditing(true);
  }, [msg.content]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(msg.content);
  }, [msg.content]);

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setIsEditing(false);
    editMessage(index, trimmed);
  }, [editValue, editMessage, index]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleCancel, handleSave],
  );

  if (isEditing) {
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-[80%] flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = e.target.scrollHeight + "px";
            }}
            onKeyDown={handleKeyDown}
            className="w-full rounded-xl border border-[#27272a] bg-[#18181b] px-4 py-3 text-sm text-[#fafafa] placeholder-[#a1a1aa] focus:border-[#3f3f46] focus:outline-none focus:ring-1 focus:ring-[#3f3f46] resize-none"
            rows={1}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a] hover:bg-[#27272a] transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editValue.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#09090b] hover:bg-[#e4e4e7] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Check className="h-3 w-3" />
              Update
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {isUser && !isGenerating && (
        <button
          onClick={handleEdit}
          className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#a1a1aa] hover:text-[#fafafa] cursor-pointer"
          title="Edit message"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#27272a] text-[#fafafa] rounded-br-md whitespace-pre-wrap"
            : "bg-[#18181b] text-[#fafafa] rounded-bl-md"
        }`}
      >
        {!isUser && msg.reasoning && (
          <ReasoningBlock
            reasoning={msg.reasoning}
            isThinking={isThinking}
            thinkingSeconds={msg.thinkingSeconds ?? thinkingSeconds ?? 0}
          />
        )}

        {msg.content ? (
          isUser ? (
            msg.content
          ) : (
            <Streamdown
              plugins={{ math }}
              parseIncompleteMarkdown={false}
              isAnimating={isStreaming}
            >
              {prepareForMathDisplay(msg.content)}
            </Streamdown>
          )
        ) : !isUser && !isStreaming ? (
          <p className="italic text-[#52525b]">No response</p>
        ) : null}
      </div>

      {!isUser && !isStreaming && !isGenerating && (
        <div className="mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {msg.content && (
            <button
              onClick={handleCopy}
              className="rounded-md p-1 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer"
              title="Copy response"
            >
              {copied ? (
                <ClipboardCheck className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <button
            onClick={handleRetry}
            className="rounded-md p-1 text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer"
            title="Retry"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
