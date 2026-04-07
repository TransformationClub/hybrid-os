import { Inngest } from "inngest";

/**
 * Shared Inngest client for background job processing.
 *
 * In development without an Inngest dev server running, functions will
 * still be registered but events will be logged rather than executed.
 */
export const inngest = new Inngest({ id: "hybrid-os" });
