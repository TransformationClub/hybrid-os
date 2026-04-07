import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Verify Slack request signature using the signing secret.
 *
 * Slack sends:
 * - X-Slack-Request-Timestamp: Unix timestamp
 * - X-Slack-Signature: v0=<hex HMAC SHA-256>
 *
 * The HMAC is computed over: "v0:{timestamp}:{body}"
 */
function verifySlackSignature(
  body: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret || !timestamp || !signature) {
    return false;
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const expected = `v0=${crypto
    .createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const timestamp = request.headers.get("x-slack-request-timestamp");
    const signature = request.headers.get("x-slack-signature");

    // Verify signature when Slack signing secret is configured
    if (process.env.SLACK_SIGNING_SECRET) {
      const isValid = verifySlackSignature(body, timestamp, signature);
      if (!isValid) {
        console.error("[webhook:slack] Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    // Slack sends URL-encoded payloads for interactive messages
    const params = new URLSearchParams(body);
    const payloadStr = params.get("payload");

    if (!payloadStr) {
      // Could be a URL verification challenge
      try {
        const json = JSON.parse(body);
        if (json.type === "url_verification") {
          return NextResponse.json({ challenge: json.challenge });
        }
      } catch {
        // Not JSON either, return OK
      }
      return NextResponse.json({ ok: true });
    }

    const payload = JSON.parse(payloadStr) as {
      type: string;
      actions?: Array<{
        action_id: string;
        value: string;
      }>;
      user?: {
        id: string;
        username: string;
      };
    };

    if (payload.type !== "block_actions" || !payload.actions) {
      return NextResponse.json({ ok: true });
    }

    for (const action of payload.actions) {
      const { action_id, value: approvalId } = action;

      // Parse action: approve_{id} or reject_{id}
      let status: "approved" | "rejected" | null = null;

      if (action_id.startsWith("approve_")) {
        status = "approved";
      } else if (action_id.startsWith("reject_")) {
        status = "rejected";
      }

      if (status && approvalId) {
        const { resolveApproval } = await import(
          "@/lib/approvals/actions"
        );

        const reviewedBy = payload.user?.username ?? "slack-user";

        await resolveApproval({
          approvalId,
          status,
          reviewedBy,
          feedback: `${status} via Slack by @${reviewedBy}`,
        });

        console.log(
          `[webhook:slack] Approval ${approvalId} ${status} by ${reviewedBy}`
        );
      }
    }

    // Slack expects 200 OK within 3 seconds
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook:slack] Error processing interaction:", err);
    // Still return 200 to Slack to prevent retries on our errors
    return NextResponse.json({ ok: true });
  }
}
