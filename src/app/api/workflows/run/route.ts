import {
  getWorkflow,
  type WorkflowEvent,
  type WorkflowType,
} from "@/lib/workflows";
import { captureError } from "@/lib/monitoring/sentry";

// ---------------------------------------------------------------------------
// POST /api/workflows/run
//
// Triggers a workflow and streams progress events back via ReadableStream.
// Body: { workflowType, initiativeId, inputs }
// ---------------------------------------------------------------------------

interface RequestBody {
  workflowType: WorkflowType;
  initiativeId: string;
  inputs: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { workflowType, initiativeId, inputs } = body;

    // --- Validate ---
    if (!workflowType) {
      return Response.json(
        { error: "Missing required field: workflowType" },
        { status: 400 },
      );
    }

    if (!initiativeId) {
      return Response.json(
        { error: "Missing required field: initiativeId" },
        { status: 400 },
      );
    }

    const workflow = getWorkflow(workflowType);
    if (!workflow) {
      return Response.json(
        { error: `Unknown workflow type: ${workflowType}` },
        { status: 400 },
      );
    }

    // --- Build workflow input from generic inputs map ---
    const workflowInput = {
      ...inputs,
      initiativeId,
      workspaceId: (inputs.workspaceId as string) ?? "default",
    };

    // --- Stream progress events ---
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const onEvent = (event: WorkflowEvent) => {
          const line = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(line));
        };

        // Run the workflow asynchronously, piping events to the stream
        workflow
          .runner(workflowInput as never, onEvent)
          .then((result) => {
            // Send final result as a special event
            const finalLine = `data: ${JSON.stringify({ type: "result", data: result })}\n\n`;
            controller.enqueue(encoder.encode(finalLine));
            controller.close();
          })
          .catch((err) => {
            const errorMsg =
              err instanceof Error ? err.message : "Workflow execution failed";
            captureError(err, { workflowType, initiativeId });
            const errorLine = `data: ${JSON.stringify({ type: "workflow_failed", data: { error: errorMsg } })}\n\n`;
            controller.enqueue(encoder.encode(errorLine));
            controller.close();
          });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Workflow API error:", error);
    captureError(error, { route: "/api/workflows/run" });
    return Response.json(
      { error: "An error occurred while processing your request." },
      { status: 500 },
    );
  }
}
