/**
 * Client-safe mock skill execution engine.
 *
 * This module has no server-side dependencies (no supabase, no next/headers)
 * so it can be safely imported in client components.
 */

import type { Skill, SkillStep } from "@/types";

// ---------------------------------------------------------------------------
// Public types (mirrored from runner.ts to avoid importing server code)
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
    | "approval_required";
  stepId?: string;
  stepLabel?: string;
  data?: unknown;
}

export type SkillRunEventHandler = (event: SkillRunEvent) => void;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toISOString();
}

function sortedSteps(workflow: SkillStep[]): SkillStep[] {
  return [...workflow].sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Mock execution (client-safe)
// ---------------------------------------------------------------------------

export async function executeSkillMock(
  skill: Skill,
  context: SkillRunContext,
  onEvent?: SkillRunEventHandler,
): Promise<SkillRunResult> {
  const startedAt = now();
  const stepResults: StepResult[] = [];
  const steps = sortedSteps(skill.workflow);

  for (const step of steps) {
    onEvent?.({
      type: "step_started",
      stepId: step.id,
      stepLabel: step.label,
    });

    const stepStart = Date.now();

    // Simulated delay between 500-1500ms
    const delay = 500 + Math.random() * 1000;
    await new Promise((r) => setTimeout(r, delay));

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

  const runResult: SkillRunResult = {
    skillId: skill.id,
    status: "completed",
    stepResults,
    totalDuration,
    startedAt,
    completedAt,
  };

  onEvent?.({ type: "run_completed", data: runResult });

  return runResult;
}
