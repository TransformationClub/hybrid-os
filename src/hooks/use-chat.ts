"use client";

import { useChat as useAIChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import { useState, useCallback, useMemo, type FormEvent } from "react";

interface UseOrchestratorChatOptions {
  initiativeId?: string;
  workspaceId?: string;
  initialMessages?: UIMessage[];
}

/**
 * Custom hook for the orchestrator chat interface.
 *
 * Wraps the Vercel AI SDK `useChat` hook with the correct endpoint and
 * passes initiative/workspace context as body params on every request.
 *
 * Provides a convenience API with input state management and form submission
 * on top of the SDK's sendMessage-based API.
 */
export function useOrchestratorChat(options: UseOrchestratorChatOptions = {}) {
  const { initiativeId, workspaceId, initialMessages } = options;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          initiativeId,
          workspaceId,
        },
      }),
    [initiativeId, workspaceId]
  );

  const chat = useAIChat({
    transport,
    ...(initialMessages && initialMessages.length > 0
      ? { messages: initialMessages }
      : {}),
  });

  // Manage input state locally since v6 useChat uses sendMessage
  const [input, setInput] = useState("");

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault?.();
      const trimmed = input.trim();
      if (!trimmed) return;
      chat.sendMessage({ text: trimmed });
      setInput("");
    },
    [input, chat]
  );

  const isLoading =
    chat.status === "streaming" || chat.status === "submitted";

  return {
    chatId: chat.id,
    messages: chat.messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    sendMessage: chat.sendMessage,
    status: chat.status,
    isLoading,
    error: chat.error,
    setMessages: chat.setMessages,
    stop: chat.stop,
  };
}
