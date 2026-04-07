import type { Approval } from "@/types";

// ============================================================
// Configuration
// ============================================================

const RESEND_API_BASE = "https://api.resend.com";

export const isEmailConfigured = !!process.env.RESEND_API_KEY;

// ============================================================
// Core send
// ============================================================

/**
 * Send a transactional email via Resend (or mock when not configured).
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<{ id?: string; error?: string }> {
  if (!isEmailConfigured) {
    const recipients = Array.isArray(to) ? to.join(", ") : to;
    console.log(
      `[email:mock] sendEmail to=${recipients} subject="${subject}" (${html.length} chars)`
    );
    return { id: `mock-email-${Date.now()}` };
  }

  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Hybrid OS <notifications@hybrid-os.app>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[email] send error:", res.status, text);
      return { error: `Email send failed: ${res.status}` };
    }

    const data = (await res.json()) as { id: string };
    return { id: data.id };
  } catch (err) {
    console.error("[email] sendEmail error:", err);
    return {
      error: err instanceof Error ? err.message : "Unknown email error.",
    };
  }
}

// ============================================================
// Templated senders
// ============================================================

/**
 * Send a formatted approval-request email.
 */
export async function sendApprovalRequestEmail(
  to: string | string[],
  approval: Approval
): Promise<{ id?: string; error?: string }> {
  const subject = `Approval needed: ${approval.title}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px;">
      <h2 style="margin-bottom: 4px;">Approval Required</h2>
      <p><strong>${approval.title}</strong></p>
      <p>${approval.description ?? "No description provided."}</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr>
          <td style="padding-right: 24px;"><strong>Category:</strong> ${approval.category}</td>
          <td><strong>Status:</strong> ${approval.status}</td>
        </tr>
      </table>
      <p>
        <a href="${process.env.NEXT_PUBLIC_SITE_URL}/approvals/${approval.id}"
           style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">
          Review Approval
        </a>
      </p>
    </div>
  `;

  return sendEmail(to, subject, html);
}

/**
 * Send a weekly digest summary email.
 */
export async function sendDigestEmail(
  to: string | string[],
  summary: {
    period: string;
    initiativesCompleted: number;
    approvalsResolved: number;
    agentRunsTotal: number;
    highlights?: string[];
  }
): Promise<{ id?: string; error?: string }> {
  const highlightsHtml =
    summary.highlights && summary.highlights.length > 0
      ? `<ul>${summary.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>`
      : "";

  const subject = `Weekly Digest: ${summary.period}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px;">
      <h2>Weekly Digest</h2>
      <p><strong>Period:</strong> ${summary.period}</p>
      <table style="margin: 16px 0; border-collapse: collapse;">
        <tr>
          <td style="padding-right: 24px;"><strong>Initiatives completed:</strong> ${summary.initiativesCompleted}</td>
          <td style="padding-right: 24px;"><strong>Approvals resolved:</strong> ${summary.approvalsResolved}</td>
          <td><strong>Agent runs:</strong> ${summary.agentRunsTotal}</td>
        </tr>
      </table>
      ${highlightsHtml ? `<h3>Highlights</h3>${highlightsHtml}` : ""}
    </div>
  `;

  return sendEmail(to, subject, html);
}

/**
 * Send an error-alert email.
 */
export async function sendErrorAlertEmail(
  to: string | string[],
  error: {
    title: string;
    message: string;
    initiativeId?: string;
    agentId?: string;
    timestamp?: string;
  }
): Promise<{ id?: string; error?: string }> {
  const subject = `[Alert] ${error.title}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px;">
      <h2 style="color: #dc2626;">Error Alert</h2>
      <p><strong>${error.title}</strong></p>
      <pre style="background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto;">${error.message}</pre>
      <table style="margin: 16px 0; border-collapse: collapse; font-size: 13px; color: #6b7280;">
        ${error.initiativeId ? `<tr><td style="padding-right: 16px;"><strong>Initiative:</strong></td><td>${error.initiativeId}</td></tr>` : ""}
        ${error.agentId ? `<tr><td style="padding-right: 16px;"><strong>Agent:</strong></td><td>${error.agentId}</td></tr>` : ""}
        <tr><td style="padding-right: 16px;"><strong>Time:</strong></td><td>${error.timestamp ?? new Date().toISOString()}</td></tr>
      </table>
    </div>
  `;

  return sendEmail(to, subject, html);
}
