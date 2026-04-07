import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";

const MOCK_RESPONSES: Record<string, string> = {
  campaign: `Great, let's build a campaign plan. Here's how I'd approach this:

**1. Define the objective.** What's the primary goal -- awareness, pipeline, conversion? This shapes everything downstream.

**2. Identify the audience.** Who are we targeting? If you have ICPs or ABM lists in the second brain, I can pull those in.

**3. Map the channels.** Based on the audience, I'll recommend the right mix of content, paid, email, and events.

**4. Build the execution board.** I'll create work items for each phase so we can track progress on the kanban.

**5. Set success criteria.** We need clear metrics before launch so we know what winning looks like.

Want me to start by pulling in your existing audience data and creating a draft plan?`,

  aeo: `AEO (Answer Engine Optimization) is one of the highest-leverage plays right now. Here's the framework I'd recommend:

**The AEO Playbook:**

- **Audit your current content** for question-answer density. AI models favor content that directly answers specific questions.
- **Map the question landscape.** What are your ICPs asking? I can help build a question taxonomy from your existing customer data.
- **Structure for extraction.** Use clear headings, concise definitions, and structured data. Think: "What would an AI quote from this page?"
- **Create authoritative source content.** Original research, expert POVs, and proprietary data are hard for AI to ignore.
- **Monitor AI citations.** Track where and how AI models reference your brand.

I can create a full AEO initiative with work items for each phase. Want me to set that up?`,

  content: `Let's talk content strategy. Here's my read on what moves the needle:

**The core question:** Are we creating content that earns attention, or just filling a calendar?

I'd recommend we focus on three tiers:

1. **Flagship content** -- 1-2 deep pieces per month that establish authority. Think original research, frameworks, or contrarian takes.
2. **Distribution content** -- Repurpose flagships into social posts, email series, and short-form pieces that drive back to the core.
3. **Response content** -- Quick-turn pieces that answer trending questions in your space. This is where AEO shines.

I can pull your existing content inventory from the second brain and map gaps. Should I start there?`,

  abm: `Account-Based Marketing done right is a growth engine. Here's the approach I'd take:

**Phase 1: Account Selection & Tiering**
- Pull your current target account list (I'll check the second brain)
- Tier accounts by fit score and intent signals
- Align sales and marketing on the top 20-50

**Phase 2: Intelligence Gathering**
- Map buying committees for Tier 1 accounts
- Identify active pain points and initiatives
- Build personalized messaging by account cluster

**Phase 3: Multi-Channel Orchestration**
- Personalized content experiences per tier
- Targeted ads to buying committee members
- SDR sequences aligned with marketing touches

**Phase 4: Measurement**
- Account engagement scoring
- Pipeline influenced by ABM touches
- Revenue attribution by account tier

Want me to create an ABM initiative and start building out the work items?`,

  default: `I'm your strategic AI partner inside Hybrid OS. Here's what I can help you with:

**Plan campaigns.** Tell me your goal and I'll build a structured plan with work items, timelines, and success metrics.

**Search the second brain.** I have access to your team's knowledge base -- strategy docs, brand guidelines, playbooks, and more. Ask me anything.

**Create content.** I can draft blog posts, emails, social copy, and more. Everything goes through your approval before publishing.

**Manage work.** I can create and update work items on your initiative board to keep execution on track.

**Think strategically.** Bounce ideas off me. I'll challenge assumptions, suggest alternatives, and help you think through the angles.

What would you like to work on?`,
};

/**
 * Selects a mock response based on keywords in the user's message.
 */
function selectMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("campaign")) return MOCK_RESPONSES.campaign;
  if (lower.includes("aeo") || lower.includes("answer engine"))
    return MOCK_RESPONSES.aeo;
  if (lower.includes("abm") || lower.includes("account-based") || lower.includes("account based"))
    return MOCK_RESPONSES.abm;
  if (lower.includes("content") || lower.includes("blog") || lower.includes("article"))
    return MOCK_RESPONSES.content;

  return MOCK_RESPONSES.default;
}

/**
 * Creates a mock streaming response that simulates the orchestrator.
 *
 * Uses the Vercel AI SDK's UIMessageStream format so the client-side
 * `useChat` hook can consume it identically to a real response.
 */
export function createMockStreamResponse(userMessage: string): Response {
  const text = selectMockResponse(userMessage);

  // Split into small chunks to simulate realistic token streaming
  const chunks = splitIntoChunks(text, 3); // ~3 words per chunk

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start" });
        writer.write({ type: "start-step" });
        writer.write({
          type: "text-start",
          id: `text_mock_${Date.now()}`,
        });

        for (const chunk of chunks) {
          writer.write({
            type: "text-delta",
            delta: chunk,
            id: `text_mock_${Date.now()}`,
          });
          // Simulate streaming delay
          await sleep(randomBetween(25, 50));
        }

        writer.write({
          type: "text-end",
          id: `text_mock_${Date.now()}`,
        });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish", finishReason: "stop" });
      },
    }),
  });
}

/**
 * Split text into chunks of approximately `wordsPerChunk` words.
 */
function splitIntoChunks(text: string, wordsPerChunk: number): string[] {
  const words = text.split(/(\s+)/); // preserve whitespace
  const chunks: string[] = [];
  let current = "";
  let wordCount = 0;

  for (const word of words) {
    current += word;
    if (word.trim().length > 0) {
      wordCount++;
    }
    if (wordCount >= wordsPerChunk) {
      chunks.push(current);
      current = "";
      wordCount = 0;
    }
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
