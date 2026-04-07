/**
 * Token Budget Enforcement
 *
 * Tracks LLM token usage per workspace per day with configurable limits.
 * Stored in-memory for now (can be moved to Redis/DB later).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BudgetStatus {
  remaining: number;
  limit: number;
  exceeded: boolean;
  usedToday: number;
  resetsAt: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_DAILY_LIMIT = 100_000;

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

interface UsageEntry {
  tokens: number;
  date: string; // YYYY-MM-DD in UTC
}

/** Map of workspaceId -> usage entry for the current day */
const usageStore = new Map<string, UsageEntry>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

function getOrCreateEntry(workspaceId: string): UsageEntry {
  const today = todayKey();
  const existing = usageStore.get(workspaceId);

  if (existing && existing.date === today) {
    return existing;
  }

  // New day or first access -- reset
  const entry: UsageEntry = { tokens: 0, date: today };
  usageStore.set(workspaceId, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// TokenBudget class
// ---------------------------------------------------------------------------

export class TokenBudget {
  private dailyLimit: number;

  constructor(dailyLimit: number = DEFAULT_DAILY_LIMIT) {
    this.dailyLimit = dailyLimit;
  }

  /**
   * Check the current budget status for a workspace.
   */
  checkBudget(workspaceId: string): BudgetStatus {
    const entry = getOrCreateEntry(workspaceId);
    const remaining = Math.max(0, this.dailyLimit - entry.tokens);

    return {
      remaining,
      limit: this.dailyLimit,
      exceeded: entry.tokens >= this.dailyLimit,
      usedToday: entry.tokens,
      resetsAt: getResetTime(),
    };
  }

  /**
   * Record token usage for a workspace.
   */
  recordUsage(workspaceId: string, tokens: number): void {
    const entry = getOrCreateEntry(workspaceId);
    entry.tokens += tokens;
  }

  /**
   * Get the friendly message shown when the budget is exceeded.
   */
  getExceededMessage(workspaceId: string): string {
    const status = this.checkBudget(workspaceId);
    const resetTime = new Date(status.resetsAt).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

    return (
      `You've reached your daily token limit of ${status.limit.toLocaleString()} tokens. ` +
      `${status.usedToday.toLocaleString()} tokens used today. ` +
      `Your budget resets at ${resetTime} UTC. ` +
      `You can still browse the dashboard, review approvals, and manage work items in the meantime.`
    );
  }

  /**
   * Update the daily limit (e.g. from workspace settings).
   */
  setDailyLimit(limit: number): void {
    this.dailyLimit = limit;
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------

export const tokenBudget = new TokenBudget();
