/**
 * Execution Controller
 *
 * Manages the lifecycle of a multi-step workflow execution with
 * start, pause, resume, and cancel capabilities. Emits status events
 * that the UI can subscribe to for real-time progress tracking.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExecutionStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

export interface ExecutionStep {
  id: string;
  label: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionState {
  status: ExecutionStatus;
  currentStepIndex: number;
  steps: ExecutionStep[];
  startedAt: string | null;
  elapsedMs: number;
  partialOutputs: Record<string, unknown>;
}

export type ExecutionEventType =
  | "status_changed"
  | "step_started"
  | "step_completed"
  | "step_failed"
  | "paused"
  | "resumed"
  | "cancelled"
  | "completed"
  | "failed";

export interface ExecutionEvent {
  type: ExecutionEventType;
  state: ExecutionState;
  stepId?: string;
}

export type ExecutionEventHandler = (event: ExecutionEvent) => void;

export type StepExecutor = (
  step: ExecutionStep,
  signal: AbortSignal,
) => Promise<unknown>;

// ---------------------------------------------------------------------------
// ExecutionController
// ---------------------------------------------------------------------------

export class ExecutionController {
  private state: ExecutionState;
  private listeners: Set<ExecutionEventHandler> = new Set();
  private abortController: AbortController | null = null;
  private pauseResolve: (() => void) | null = null;
  private isPaused = false;
  private timerStart: number | null = null;
  private accumulatedMs = 0;

  constructor(steps: Array<{ id: string; label: string }>) {
    this.state = {
      status: "idle",
      currentStepIndex: -1,
      steps: steps.map((s) => ({
        id: s.id,
        label: s.label,
        status: "pending",
      })),
      startedAt: null,
      elapsedMs: 0,
      partialOutputs: {},
    };
  }

  // ---- Event subscription ----

  on(handler: ExecutionEventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private emit(type: ExecutionEventType, stepId?: string): void {
    this.updateElapsed();
    const event: ExecutionEvent = {
      type,
      state: { ...this.state, steps: [...this.state.steps] },
      stepId,
    };
    for (const handler of this.listeners) {
      try {
        handler(event);
      } catch {
        // Listener errors should not break execution
      }
    }
  }

  // ---- Public API ----

  getState(): Readonly<ExecutionState> {
    this.updateElapsed();
    return { ...this.state, steps: [...this.state.steps] };
  }

  /**
   * Start executing steps sequentially. The provided `executor` function
   * is called for each step with an AbortSignal. It should throw if
   * the signal is aborted.
   */
  async start(executor: StepExecutor): Promise<ExecutionState> {
    if (this.state.status === "running") {
      return this.getState();
    }

    this.abortController = new AbortController();
    this.state.status = "running";
    this.state.startedAt = new Date().toISOString();
    this.timerStart = Date.now();
    this.accumulatedMs = 0;
    this.emit("status_changed");

    const signal = this.abortController.signal;

    for (let i = 0; i < this.state.steps.length; i++) {
      // Check for cancellation between steps
      if (signal.aborted) {
        this.markRemainingSkipped(i);
        break;
      }

      // Check for pause between steps
      if (this.isPaused) {
        await this.waitForResume();
        if (signal.aborted) {
          this.markRemainingSkipped(i);
          break;
        }
      }

      const step = this.state.steps[i];
      this.state.currentStepIndex = i;
      step.status = "running";
      step.startedAt = new Date().toISOString();
      this.emit("step_started", step.id);

      try {
        const output = await executor(step, signal);
        step.status = "completed";
        step.output = output;
        step.completedAt = new Date().toISOString();
        this.state.partialOutputs[step.id] = output;
        this.emit("step_completed", step.id);
      } catch (err) {
        if (signal.aborted) {
          step.status = "skipped";
          this.markRemainingSkipped(i + 1);
          break;
        }

        step.status = "failed";
        step.error = err instanceof Error ? err.message : "Step failed";
        step.completedAt = new Date().toISOString();
        this.emit("step_failed", step.id);

        // Halt on failure
        this.markRemainingSkipped(i + 1);
        this.state.status = "failed";
        this.updateElapsed();
        this.emit("failed");
        return this.getState();
      }
    }

    // Determine final status
    if (signal.aborted) {
      this.state.status = "cancelled";
      this.updateElapsed();
      this.emit("cancelled");
    } else {
      this.state.status = "completed";
      this.updateElapsed();
      this.emit("completed");
    }

    return this.getState();
  }

  /**
   * Pause execution between steps. The current step will finish, but
   * the next step will not start until `resume()` is called.
   */
  pause(): void {
    if (this.state.status !== "running") return;
    this.isPaused = true;
    this.state.status = "paused";
    // Accumulate elapsed time up to this point
    if (this.timerStart !== null) {
      this.accumulatedMs += Date.now() - this.timerStart;
      this.timerStart = null;
    }
    this.emit("paused");
  }

  /**
   * Resume execution after a pause.
   */
  resume(): void {
    if (this.state.status !== "paused") return;
    this.isPaused = false;
    this.state.status = "running";
    this.timerStart = Date.now();
    this.emit("resumed");

    // Release the pause promise
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
    }
  }

  /**
   * Cancel the execution. The current step will be aborted via
   * AbortSignal and remaining steps will be skipped.
   */
  cancel(): void {
    if (
      this.state.status !== "running" &&
      this.state.status !== "paused"
    ) {
      return;
    }

    this.abortController?.abort();
    this.state.status = "cancelled";
    this.updateElapsed();
    this.emit("cancelled");

    // If paused, release the pause promise so start() can exit
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
    }
  }

  // ---- Private helpers ----

  private waitForResume(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.pauseResolve = resolve;
    });
  }

  private markRemainingSkipped(fromIndex: number): void {
    for (let j = fromIndex; j < this.state.steps.length; j++) {
      if (this.state.steps[j].status === "pending") {
        this.state.steps[j].status = "skipped";
      }
    }
  }

  private updateElapsed(): void {
    if (this.timerStart !== null) {
      this.state.elapsedMs = this.accumulatedMs + (Date.now() - this.timerStart);
    } else {
      this.state.elapsedMs = this.accumulatedMs;
    }
  }
}
