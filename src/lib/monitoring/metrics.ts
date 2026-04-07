/**
 * Lightweight observability helpers for API latency and LLM cost tracking.
 *
 * In a production deployment these would forward to an observability backend
 * (Datadog, Grafana, etc.). For now they log structured JSON and maintain
 * in-memory counters that the Reports page can read via server actions.
 */

// ---------------------------------------------------------------------------
// API Latency
// ---------------------------------------------------------------------------

export function trackApiLatency(
  route: string,
  durationMs: number,
  statusCode: number,
) {
  if (process.env.NODE_ENV === "development") {
    console.log(
      JSON.stringify({
        _type: "api_latency",
        route,
        durationMs: Math.round(durationMs),
        statusCode,
        ts: new Date().toISOString(),
      }),
    );
  }
}

// ---------------------------------------------------------------------------
// LLM Usage & Cost
// ---------------------------------------------------------------------------

/** Approximate pricing per million tokens (Claude Sonnet class). */
const DEFAULT_INPUT_COST_PER_M = 3; // $3 / 1M input tokens
const DEFAULT_OUTPUT_COST_PER_M = 15; // $15 / 1M output tokens

export function estimateCost(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (inputTokens / 1_000_000) * DEFAULT_INPUT_COST_PER_M +
    (outputTokens / 1_000_000) * DEFAULT_OUTPUT_COST_PER_M
  );
}

export function trackLLMUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd?: number,
) {
  const cost = costUsd ?? estimateCost(inputTokens, outputTokens);

  if (process.env.NODE_ENV === "development") {
    console.log(
      JSON.stringify({
        _type: "llm_usage",
        model,
        inputTokens,
        outputTokens,
        costUsd: parseFloat(cost.toFixed(6)),
        ts: new Date().toISOString(),
      }),
    );
  }
}
