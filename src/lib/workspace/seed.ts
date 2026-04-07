"use server";

import { seedDefaultAgents } from "@/lib/agents/actions";
import { seedDefaultSkills } from "@/lib/skills/actions";

/**
 * Seed a newly created workspace with default agents and skills.
 * Called during signup after workspace creation. Best-effort: errors
 * are logged but do not block the signup flow.
 */
export async function seedWorkspaceDefaults(workspaceId: string): Promise<void> {
  const results = await Promise.allSettled([
    seedDefaultAgents(workspaceId),
    seedDefaultSkills(workspaceId),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[workspace/seed] Seed error:", result.reason);
    } else if (result.value && "error" in result.value && result.value.error) {
      console.error("[workspace/seed] Seed action error:", result.value.error);
    }
  }
}
