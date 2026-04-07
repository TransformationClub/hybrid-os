import { NextResponse } from "next/server";
import { connectSlack } from "@/lib/integrations/slack/actions";

/**
 * Slack OAuth callback handler.
 *
 * Slack redirects here after the user authorizes the app.
 * Query params: code, state (JSON-encoded { workspaceId })
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");

  if (!code || !stateRaw) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=missing_params", request.url)
    );
  }

  let workspaceId: string;
  try {
    const state = JSON.parse(stateRaw) as { workspaceId: string };
    workspaceId = state.workspaceId;
  } catch {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=invalid_state", request.url)
    );
  }

  const result = await connectSlack(code, workspaceId);

  if (result.error) {
    const errorUrl = new URL("/settings/integrations", request.url);
    errorUrl.searchParams.set("error", result.error);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(
    new URL("/settings/integrations?slack=connected", request.url)
  );
}
