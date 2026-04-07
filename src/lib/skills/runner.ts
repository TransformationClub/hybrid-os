/**
 * Skill Execution Engine
 *
 * Runs multi-step skill workflows by iterating through SkillSteps,
 * dispatching each to the appropriate agent via the runtime adapter,
 * and threading outputs between steps.
 */

import type { Skill, SkillStep } from "@/types";
import type {
  AgentRuntimeAdapter,
  RunStatus,
} from "@/lib/runtime/types";
import { vercelAIRuntime } from "@/lib/runtime/vercel-ai-adapter";
import { logEvent } from "@/lib/events/logger";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SkillRunContext {
  skillId: string;
  workspaceId: string;
  initiativeId?: string;
  inputs: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  status: "completed" | "failed" | "skipped";
  output: unknown;
  error?: string;
  duration: number;
}

export interface SkillRunResult {
  skillId: string;
  status: "completed" | "failed" | "cancelled";
  stepResults: StepResult[];
  totalDuration: number;
  startedAt: string;
  completedAt: string;
}

export interface SkillRunEvent {
  type:
    | "step_started"
    | "step_completed"
    | "step_failed"
    | "run_completed"
    | "run_failed"
    | "run_cancelled"
    | "run_paused"
    | "run_resumed"
    | "approval_required";
  stepId?: string;
  stepLabel?: string;
  data?: unknown;
}

export type SkillRunEventHandler = (event: SkillRunEvent) => void;

/**
 * Controller handle returned by executeSkill that allows callers to
 * pause, resume, or cancel a running skill execution.
 */
export interface SkillRunController {
  /** Cancel the running skill. Current step will finish, remaining skipped. */
  cancel: () => void;
  /** Pause between steps. The current step will complete first. */
  pause: () => void;
  /** Resume after a pause. */
  resume: () => void;
  /** Promise that resolves with the final result. */
  result: Promise<SkillRunResult>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

function isApiKeyConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Sort steps by their declared order. */
function sortedSteps(workflow: SkillStep[]): SkillStep[] {
  return [...workflow].sort((a, b) => a.order - b.order);
}

/**
 * Build a prompt for a step that includes the step action, original inputs,
 * and any outputs accumulated from prior steps.
 */
function buildStepPrompt(
  step: SkillStep,
  inputs: Record<string, unknown>,
  priorOutputs: Record<string, unknown>,
): string {
  const parts: string[] = [];

  parts.push(`## Task\n${step.action}`);

  if (Object.keys(inputs).length > 0) {
    parts.push(`## Inputs\n${JSON.stringify(inputs, null, 2)}`);
  }

  if (step.inputs && Object.keys(step.inputs).length > 0) {
    parts.push(`## Step Inputs\n${JSON.stringify(step.inputs, null, 2)}`);
  }

  if (Object.keys(priorOutputs).length > 0) {
    parts.push(
      `## Context from Previous Steps\n${JSON.stringify(priorOutputs, null, 2)}`,
    );
  }

  return parts.join("\n\n");
}

const TERMINAL_STATUSES: RunStatus[] = ["completed", "failed", "cancelled"];

/**
 * Poll a run until it reaches a terminal state. Returns the final status.
 */
async function waitForRun(
  runtime: AgentRuntimeAdapter,
  runId: string,
  maxWaitMs = 120_000,
): Promise<RunStatus> {
  const start = Date.now();
  let status: RunStatus = "queued";

  while (Date.now() - start < maxWaitMs) {
    status = await runtime.getRunStatus(runId);
    if (TERMINAL_STATUSES.includes(status)) return status;
    if (status === "waiting_approval") return status;
    await new Promise((r) => setTimeout(r, 200));
  }

  // Timed out -- cancel the run and report failure
  await runtime.cancelRun(runId).catch(() => {});
  return "failed";
}

// ---------------------------------------------------------------------------
// Mock execution
// ---------------------------------------------------------------------------

async function executeSkillMock(
  skill: Skill,
  context: SkillRunContext,
  onEvent?: SkillRunEventHandler,
  signal?: AbortSignal,
  pauseCheck?: () => Promise<void>,
): Promise<SkillRunResult> {
  const startedAt = now();
  const stepResults: StepResult[] = [];
  const steps = sortedSteps(skill.workflow);

  for (const step of steps) {
    // Check cancellation between steps
    if (signal?.aborted) {
      stepResults.push({
        stepId: step.id,
        status: "skipped",
        output: null,
        duration: 0,
      });
      continue;
    }

    // Check for pause between steps
    if (pauseCheck) {
      await pauseCheck();
    }

    onEvent?.({
      type: "step_started",
      stepId: step.id,
      stepLabel: step.label,
    });

    const stepStart = Date.now();

    // Simulated delay between 500-1500ms
    const delay = 500 + Math.random() * 1000;
    await new Promise((r) => setTimeout(r, delay));

    if (signal?.aborted) {
      stepResults.push({
        stepId: step.id,
        status: "skipped",
        output: null,
        duration: Date.now() - stepStart,
      });
      continue;
    }

    const mockOutput = {
      message: `[Mock] Step "${step.label}" completed successfully.`,
      action: step.action,
      agent: step.agent_id ?? "unassigned",
      timestamp: now(),
    };

    const result: StepResult = {
      stepId: step.id,
      status: "completed",
      output: mockOutput,
      duration: Date.now() - stepStart,
    };

    stepResults.push(result);

    onEvent?.({
      type: "step_completed",
      stepId: step.id,
      stepLabel: step.label,
      data: mockOutput,
    });
  }

  const completedAt = now();
  const totalDuration =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();

  const wasCancelled = signal?.aborted ?? false;
  const hasSkipped = stepResults.some((r) => r.status === "skipped");

  const runResult: SkillRunResult = {
    skillId: skill.id,
    status: wasCancelled || hasSkipped ? "cancelled" : "completed",
    stepResults,
    totalDuration,
    startedAt,
    completedAt,
  };

  onEvent?.({
    type: wasCancelled ? "run_cancelled" : "run_completed",
    data: runResult,
  });

  return runResult;
}

// ---------------------------------------------------------------------------
// Real execution
// ---------------------------------------------------------------------------

async function executeSkillReal(
  skill: Skill,
  context: SkillRunContext,
  runtime: AgentRuntimeAdapter,
  onEvent?: SkillRunEventHandler,
  signal?: AbortSignal,
  pauseCheck?: () => Promise<void>,
): Promise<SkillRunResult> {
  const startedAt = now();
  const stepResults: StepResult[] = [];
  const steps = sortedSteps(skill.workflow);
  const priorOutputs: Record<string, unknown> = {};
  let failed = false;

  for (const step of steps) {
    // Check cancellation between steps
    if (signal?.aborted) {
      stepResults.push({
        stepId: step.id,
        status: "skipped",
        output: null,
        duration: 0,
      });
      continue;
    }

    // Check for pause between steps
    if (pauseCheck) {
      await pauseCheck();
      // Re-check cancellation after potential pause
      if (signal?.aborted) {
        stepResults.push({
          stepId: step.id,
          status: "skipped",
          output: null,
          duration: 0,
        });
        continue;
      }
    }

    if (failed) {
      // If a previous step failed, skip remaining steps
      stepResults.push({
        stepId: step.id,
        status: "skipped",
        output: null,
        duration: 0,
      });
      continue;
    }

    onEvent?.({
      type: "step_started",
      stepId: step.id,
      stepLabel: step.label,
    });

    const stepStart = Date.now();

    try {
      const agentId = step.agent_id ?? skill.agents[0] ?? "default";
      const userMessage = buildStepPrompt(step, context.inputs, priorOutputs);

      const { runId } = await runtime.createRun({
        agentId,
        initiativeId: context.initiativeId,
        systemPrompt: `You are an AI agent executing step "${step.label}" of the skill "${skill.name}". ${skill.purpose}`,
        userMessage,
        context: {
          additionalContext: {
            skillId: skill.id,
            stepId: step.id,
            stepOrder: step.order,
          },
        },
      });

      const finalStatus = await waitForRun(runtime, runId);

      // Handle approval-required pause
      if (finalStatus === "waiting_approval") {
        onEvent?.({
          type: "approval_required",
          stepId: step.id,
          stepLabel: step.label,
          data: { runId },
        });

        // For now, treat approval-required as a blocking failure.
        // A future version could suspend and resume the workflow.
        stepResults.push({
          stepId: step.id,
          status: "failed",
          output: null,
          error: "Step requires approval. Workflow paused.",
          duration: Date.now() - stepStart,
        });
        failed = true;
        continue;
      }

      if (finalStatus === "completed") {
        const output = await runtime.getRunOutput(runId);
        const lastAssistantMsg = output.messages
          .filter((m) => m.role === "assistant")
          .at(-1);

        const stepOutput = lastAssistantMsg?.content ?? null;
        priorOutputs[step.id] = stepOutput;

        stepResults.push({
          stepId: step.id,
          status: "completed",
          output: stepOutput,
          duration: Date.now() - stepStart,
        });

        onEvent?.({
          type: "step_completed",
          stepId: step.id,
          stepLabel: step.label,
          data: stepOutput,
        });
      } else {
        // Step failed -- attempt one retry
        const retryResult = await attemptRetry(
          runtime,
          skill,
          step,
          context,
          priorOutputs,
        );

        if (retryResult.status === "completed") {
          priorOutputs[step.id] = retryResult.output;
          stepResults.push({
            stepId: step.id,
            ...retryResult,
            duration: Date.now() - stepStart,
          });

          onEvent?.({
            type: "step_completed",
            stepId: step.id,
            stepLabel: step.label,
            data: retryResult.output,
          });
        } else {
          stepResults.push({
            stepId: step.id,
            status: "failed",
            output: null,
            error: retryResult.error ?? "Step failed after retry.",
            duration: Date.now() - stepStart,
          });

          onEvent?.({
            type: "step_failed",
            stepId: step.id,
            stepLabel: step.label,
            data: { error: retryResult.error },
          });

          // Check escalation rules -- if none defined, halt the workflow
          if (!skill.escalation_rules) {
            failed = true;
          }
          // If escalation_rules exist, we continue to next step (best-effort)
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown step error";

      stepResults.push({
        stepId: step.id,
        status: "failed",
        output: null,
        error: errorMsg,
        duration: Date.now() - stepStart,
      });

      onEvent?.({
        type: "step_failed",
        stepId: step.id,
        stepLabel: step.label,
        data: { error: errorMsg },
      });

      failed = true;
    }
  }

  const completedAt = now();
  const totalDuration =
    new Date(completedAt).getTime() - new Date(startedAt).getTime();

  const wasCancelled = signal?.aborted ?? false;
  const hasFailures = stepResults.some((r) => r.status === "failed");

  const finalStatus = wasCancelled
    ? "cancelled"
    : hasFailures
      ? "failed"
      : "completed";

  const runResult: SkillRunResult = {
    skillId: skill.id,
    status: finalStatus,
    stepResults,
    totalDuration,
    startedAt,
    completedAt,
  };

  const eventType = wasCancelled
    ? "run_cancelled"
    : hasFailures
      ? "run_failed"
      : "run_completed";

  onEvent?.({
    type: eventType,
    data: runResult,
  });

  // Log the skill execution event
  await logEvent({
    workspaceId: context.workspaceId,
    type: "skill.executed",
    actorType: "system",
    actorId: "skill-runner",
    entityType: "skill",
    entityId: skill.id,
    metadata: {
      status: runResult.status,
      stepCount: stepResults.length,
      totalDuration,
      initiativeId: context.initiativeId,
    },
  }).catch(() => {
    // Best-effort logging -- don't fail the run
  });

  return runResult;
}

// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------

async function attemptRetry(
  runtime: AgentRuntimeAdapter,
  skill: Skill,
  step: SkillStep,
  context: SkillRunContext,
  priorOutputs: Record<string, unknown>,
): Promise<Pick<StepResult, "status" | "output" | "error">> {
  try {
    const agentId = step.agent_id ?? skill.agents[0] ?? "default";
    const userMessage = buildStepPrompt(step, context.inputs, priorOutputs);

    const { runId } = await runtime.createRun({
      agentId,
      initiativeId: context.initiativeId,
      systemPrompt: `You are an AI agent retrying step "${step.label}" of the skill "${skill.name}". The previous attempt failed. ${skill.purpose}`,
      userMessage,
      context: {
        additionalContext: {
          skillId: skill.id,
          stepId: step.id,
          isRetry: true,
        },
      },
    });

    const finalStatus = await waitForRun(runtime, runId);

    if (finalStatus === "completed") {
      const output = await runtime.getRunOutput(runId);
      const lastMsg = output.messages
        .filter((m) => m.role === "assistant")
        .at(-1);
      return { status: "completed", output: lastMsg?.content ?? null };
    }

    return {
      status: "failed",
      output: null,
      error: `Retry failed with status: ${finalStatus}`,
    };
  } catch (err) {
    return {
      status: "failed",
      output: null,
      error: err instanceof Error ? err.message : "Retry error",
    };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute a skill workflow. Automatically selects mock or real execution
 * based on whether ANTHROPIC_API_KEY is configured.
 *
 * Returns a SkillRunController that allows the caller to pause, resume,
 * or cancel the running execution.
 *
 * @param skill       The skill definition with its workflow steps
 * @param context     Execution context (workspace, initiative, inputs)
 * @param onEvent     Optional callback for real-time progress events
 * @param runtime     Optional runtime adapter override (defaults to vercelAIRuntime)
 */
export function executeSkill(
  skill: Skill,
  context: SkillRunContext,
  onEvent?: SkillRunEventHandler,
  runtime: AgentRuntimeAdapter = vercelAIRuntime,
): SkillRunController {
  const abortController = new AbortController();
  let pauseResolve: (() => void) | null = null;
  let isPaused = false;

  const pauseCheck = async (): Promise<void> => {
    if (!isPaused) return;
    onEvent?.({ type: "run_paused" });
    await new Promise<void>((resolve) => {
      pauseResolve = resolve;
    });
    onEvent?.({ type: "run_resumed" });
  };

  const resultPromise = (async (): Promise<SkillRunResult> => {
    if (!isApiKeyConfigured()) {
      return executeSkillMock(
        skill,
        context,
        onEvent,
        abortController.signal,
        pauseCheck,
      );
    }

    return executeSkillReal(
      skill,
      context,
      runtime,
      onEvent,
      abortController.signal,
      pauseCheck,
    );
  })();

  return {
    cancel: () => {
      abortController.abort();
      // Release pause if paused
      if (pauseResolve) {
        pauseResolve();
        pauseResolve = null;
      }
    },
    pause: () => {
      isPaused = true;
    },
    resume: () => {
      isPaused = false;
      if (pauseResolve) {
        pauseResolve();
        pauseResolve = null;
      }
    },
    result: resultPromise,
  };
}

/**
 * Execute a skill and await the result directly (convenience wrapper).
 * Does not expose pause/cancel controls.
 */
export async function executeSkillAndWait(
  skill: Skill,
  context: SkillRunContext,
  onEvent?: SkillRunEventHandler,
  runtime: AgentRuntimeAdapter = vercelAIRuntime,
): Promise<SkillRunResult> {
  const controller = executeSkill(skill, context, onEvent, runtime);
  return controller.result;
}

// Re-export the mock runner for direct use in tests or preview mode
export { executeSkillMock };
