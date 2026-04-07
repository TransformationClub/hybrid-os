"use client";

import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { Badge } from "@/components/ui/badge";
import { ApprovalCard, WorkItemCard, ContentCard } from "./inline-cards";

// ---------------------------------------------------------------------------
// Helper: extract tool name and state from any tool part
//
// In Vercel AI SDK v6, static tool parts have `type: "tool-<name>"` and
// dynamic tool parts have `type: "dynamic-tool"` with a `toolName` field.
// Both share the same state / output shape.
// ---------------------------------------------------------------------------

interface ToolPartLike {
  type: string;
  toolName?: string;
  toolCallId?: string;
  state?: string;
  output?: unknown;
  input?: unknown;
}

function getPartToolName(part: ToolPartLike): string | null {
  // Dynamic tool
  if (part.type === "dynamic-tool" && part.toolName) {
    return part.toolName;
  }
  // Static tool: type is "tool-<name>"
  if (part.type.startsWith("tool-")) {
    return part.type.slice(5); // strip "tool-" prefix
  }
  return null;
}

function isToolPart(part: { type: string }): part is ToolPartLike {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

// ---------------------------------------------------------------------------
// ToolPartRenderer
// ---------------------------------------------------------------------------

export function ToolPartRenderer({
  part,
  onAction,
}: {
  part: UIMessagePart<UIDataTypes, UITools>;
  onAction?: (action: string, id: string) => void;
}) {
  if (!isToolPart(part)) return null;

  const toolName = getPartToolName(part);
  if (!toolName) return null;

  // Only render rich cards once we have the output (state === "output-available")
  const hasOutput = part.state === "output-available";

  if (!hasOutput) {
    // Still executing or streaming input -- show a subtle loading indicator
    if (
      part.state === "input-streaming" ||
      part.state === "input-available" ||
      part.state === "approval-requested"
    ) {
      return (
        <Badge variant="secondary" className="text-[9px] animate-pulse">
          {toolName.replace(/([A-Z])/g, " $1").trim()}...
        </Badge>
      );
    }

    // Error state
    if (part.state === "output-error") {
      return (
        <Badge variant="destructive" className="text-[9px]">
          {toolName} failed
        </Badge>
      );
    }

    return null;
  }

  // We have output -- render the appropriate card
  const output = part.output as Record<string, unknown> | undefined;
  if (!output) return null;

  // requestApproval
  if (toolName === "requestApproval" && output.approval) {
    return (
      <ApprovalCard
        approval={output.approval as Parameters<typeof ApprovalCard>[0]["approval"]}
        onAction={onAction as Parameters<typeof ApprovalCard>[0]["onAction"]}
      />
    );
  }

  // createWorkItem
  if (toolName === "createWorkItem" && output.workItem) {
    return (
      <WorkItemCard
        workItem={output.workItem as Parameters<typeof WorkItemCard>[0]["workItem"]}
        onAction={onAction as Parameters<typeof WorkItemCard>[0]["onAction"]}
      />
    );
  }

  // generateContent
  if (toolName === "generateContent" && output.deliverable) {
    return (
      <ContentCard
        deliverable={
          output.deliverable as Parameters<typeof ContentCard>[0]["deliverable"]
        }
        onAction={onAction as Parameters<typeof ContentCard>[0]["onAction"]}
      />
    );
  }

  // Fallback: generic badge for any other tool
  return (
    <Badge variant="outline" className="text-[9px]">
      Tool: {toolName}
    </Badge>
  );
}
