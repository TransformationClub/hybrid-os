"use client";

import { useState, useCallback, useRef } from "react";
import type { WorkflowType, WorkflowEvent, WorkflowResult } from "@/lib/workflows";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WorkflowStatus = "idle" | "running" | "completed" | "failed";

export interface WorkflowProgress {
  currentStep: number;
  totalSteps: number;
  stepLabel: string;
  percentage: number;
}

interface RunWorkflowParams {
  workflowType: WorkflowType;
  initiativeId: string;
  inputs: Record<string, unknown>;
}

interface UseWorkflowReturn {
  runWorkflow: (params: RunWorkflowParams) => Promise<void>;
  status: WorkflowStatus;
  progress: WorkflowProgress | null;
  result: WorkflowResult | null;
  events: WorkflowEvent[];
  error: string | null;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkflow(): UseWorkflowReturn {
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [progress, setProgress] = useState<WorkflowProgress | null>(null);
  const [result, setResult] = useState<WorkflowResult | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setProgress(null);
    setResult(null);
    setEvents([]);
    setError(null);
  }, []);

  const runWorkflow = useCallback(
    async (params: RunWorkflowParams) => {
      // Reset state for new run
      setStatus("running");
      setProgress(null);
      setResult(null);
      setEvents([]);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/workflows/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowType: params.workflowType,
            initiativeId: params.initiativeId,
            inputs: params.inputs,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const msg =
            (errorBody as { error?: string }).error ??
            `Workflow request failed with status ${response.status}`;
          setError(msg);
          setStatus("failed");
          return;
        }

        if (!response.body) {
          setError("No response stream received");
          setStatus("failed");
          return;
        }

        // Read the SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(jsonStr) as {
                type: string;
                step?: number;
                totalSteps?: number;
                label?: string;
                data?: unknown;
              };

              // Handle final result event (sent outside WorkflowEvent union)
              if (parsed.type === "result") {
                setResult(parsed.data as WorkflowResult);
                setStatus("completed");
                continue;
              }

              const event = parsed as WorkflowEvent;

              // Track event
              setEvents((prev) => [...prev, event]);

              // Update progress based on step events
              if (
                event.type === "step_started" &&
                event.step != null &&
                event.totalSteps != null
              ) {
                setProgress({
                  currentStep: event.step,
                  totalSteps: event.totalSteps,
                  stepLabel: event.label ?? `Step ${event.step}`,
                  percentage: Math.round(
                    ((event.step - 1) / event.totalSteps) * 100,
                  ),
                });
              }

              if (
                event.type === "step_completed" &&
                event.step != null &&
                event.totalSteps != null
              ) {
                setProgress({
                  currentStep: event.step,
                  totalSteps: event.totalSteps,
                  stepLabel: event.label ?? `Step ${event.step}`,
                  percentage: Math.round(
                    (event.step / event.totalSteps) * 100,
                  ),
                });
              }

              if (event.type === "workflow_completed") {
                setStatus("completed");
              }

              if (event.type === "workflow_failed") {
                const failData = event.data as { error?: string } | undefined;
                setError(failData?.error ?? "Workflow failed");
                setStatus("failed");
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // If we exited the loop without explicit status, mark completed
        if (status === "running") {
          setStatus((prev) => (prev === "running" ? "completed" : prev));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User cancelled -- don't surface as error
          setStatus("idle");
          return;
        }

        const msg =
          err instanceof Error ? err.message : "Failed to run workflow";
        setError(msg);
        setStatus("failed");
      }
    },
    [status],
  );

  return {
    runWorkflow,
    status,
    progress,
    result,
    events,
    error,
    reset,
  };
}
