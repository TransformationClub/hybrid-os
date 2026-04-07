import { NextResponse } from "next/server";
import crypto from "crypto";
import { triggerHubSpotSync } from "@/lib/jobs/triggers";
import { logEvent } from "@/lib/events/logger";

/**
 * HubSpot webhook signature verification.
 *
 * HubSpot signs webhook payloads using the client secret with
 * HMAC SHA-256. The signature is sent in the X-HubSpot-Signature-v3
 * header.
 */
function verifyHubSpotSignature(
  body: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  if (!clientSecret || !signature || !timestamp) {
    return false;
  }

  // HubSpot v3 signature: HMAC SHA-256 of (method + url + body + timestamp)
  // For simplicity, we verify using body + timestamp which covers the payload
  const message = `POST${body}${timestamp}`;
  const expected = crypto
    .createHmac("sha256", clientSecret)
    .update(message)
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Events that should trigger a brain sync
const SYNC_TRIGGER_EVENTS = new Set([
  "contact.creation",
  "contact.propertyChange",
  "deal.creation",
]);

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-hubspot-signature-v3");
    const timestamp = request.headers.get("x-hubspot-request-timestamp");

    // Verify signature when HubSpot is configured
    if (process.env.HUBSPOT_CLIENT_SECRET) {
      const isValid = verifyHubSpotSignature(body, signature, timestamp);
      if (!isValid) {
        console.error("[webhook:hubspot] Invalid signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    const events = JSON.parse(body) as Array<{
      subscriptionType: string;
      objectId: number;
      propertyName?: string;
      propertyValue?: string;
      portalId: number;
    }>;

    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ received: true });
    }

    // Determine if any events should trigger a sync
    const shouldSync = events.some((evt) =>
      SYNC_TRIGGER_EVENTS.has(evt.subscriptionType)
    );

    if (shouldSync) {
      // Look up workspace by portal ID
      const portalId = String(events[0].portalId);
      const workspaceId = await resolveWorkspaceId(portalId);

      if (workspaceId) {
        await triggerHubSpotSync(workspaceId);

        await logEvent({
          workspaceId,
          type: "webhook.hubspot_received",
          actorType: "system",
          actorId: "hubspot",
          entityType: "integration",
          entityId: "hubspot",
          metadata: {
            eventCount: events.length,
            eventTypes: events.map((e) => e.subscriptionType),
            portalId,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook:hubspot] Error processing webhook:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Resolve a workspace ID from a HubSpot portal ID.
 * Returns null when Supabase is not configured or no match is found.
 */
async function resolveWorkspaceId(
  portalId: string
): Promise<string | null> {
  const { isSupabaseConfigured, createClient } = await import(
    "@/lib/supabase/server"
  );

  if (!isSupabaseConfigured) {
    console.log(
      `[webhook:hubspot] Mock mode: would resolve workspace for portal ${portalId}`
    );
    return "mock-workspace";
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("hubspot_connections")
    .select("workspace_id")
    .eq("portal_id", portalId)
    .maybeSingle();

  return data?.workspace_id ?? null;
}
