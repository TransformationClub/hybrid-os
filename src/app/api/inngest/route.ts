import { serve } from "inngest/next";
import { inngest } from "@/lib/jobs/inngest";
import {
  processIngestion,
  sendEmailNotification,
  syncHubSpotData,
  generateDigest,
  refreshHubSpotTokens,
} from "@/lib/jobs/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processIngestion,
    sendEmailNotification,
    syncHubSpotData,
    generateDigest,
    refreshHubSpotTokens,
  ],
});
