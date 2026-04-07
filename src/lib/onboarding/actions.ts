"use server";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { KnowledgeObject } from "@/types";

// ============================================================
// Types
// ============================================================

export interface OnboardingAnswers {
  customers: string;
  product: string;
  goal: string;
}

// ============================================================
// Save onboarding answers
// ============================================================

export async function saveOnboardingAnswers(
  workspaceId: string,
  answers: OnboardingAnswers
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    // Mock: just return success
    console.log("[mock] Saved onboarding answers for workspace:", workspaceId);
    return { success: true };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("workspace_metadata")
    .upsert({
      workspace_id: workspaceId,
      key: "onboarding_answers",
      value: answers,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================================
// Generate Second Brain knowledge objects
// ============================================================

function makeKnowledgeObject(
  workspaceId: string,
  title: string,
  type: KnowledgeObject["type"],
  path: string,
  content: string
): Omit<KnowledgeObject, "id" | "created_at" | "updated_at"> {
  return {
    workspace_id: workspaceId,
    title,
    type,
    path,
    content,
    source: "system",
  };
}

export async function generateSecondBrain(
  workspaceId: string,
  answers: OnboardingAnswers
): Promise<{ success: boolean; objects: string[]; error?: string }> {
  const objects = [
    makeKnowledgeObject(
      workspaceId,
      "Company Profile",
      "company",
      "/company/profile",
      `# Company Profile\n\n## Core Product or Service\n${answers.product}\n\n## Target Customers\n${answers.customers}\n\n## Primary Marketing Goal\n${answers.goal}`
    ),
    makeKnowledgeObject(
      workspaceId,
      "Product Summary",
      "product",
      "/product/summary",
      `# Product Summary\n\n${answers.product}\n\nThis product serves the following customer segments:\n${answers.customers}`
    ),
    makeKnowledgeObject(
      workspaceId,
      "Customer Personas",
      "customer",
      "/customers/personas",
      `# Customer Personas\n\n## Overview\n${answers.customers}\n\n## Key Characteristics\nDerived from onboarding interview. Refine these personas as you learn more about your audience.`
    ),
    makeKnowledgeObject(
      workspaceId,
      "Marketing Goals",
      "strategy",
      "/strategy/goals",
      `# Marketing Goals\n\n## Primary Goal\n${answers.goal}\n\n## Context\nProduct: ${answers.product}\nTarget Audience: ${answers.customers}`
    ),
    makeKnowledgeObject(
      workspaceId,
      "Brand Voice",
      "brand",
      "/brand/voice",
      `# Brand Voice\n\nGenerated from onboarding context. Update this as your brand identity evolves.\n\n## Audience\n${answers.customers}\n\n## Product Context\n${answers.product}\n\n## Tone Guidelines\n- Clear and direct\n- Confident but approachable\n- Focused on outcomes\n\nRefine this document to capture your unique voice and messaging style.`
    ),
  ];

  const objectTitles = objects.map((o) => o.title);

  if (!isSupabaseConfigured) {
    console.log(
      "[mock] Generated second brain objects:",
      objectTitles.join(", ")
    );
    return { success: true, objects: objectTitles };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("knowledge_objects").insert(objects);

  if (error) {
    return { success: false, objects: [], error: error.message };
  }

  return { success: true, objects: objectTitles };
}

// ============================================================
// Mark onboarding complete
// ============================================================

export async function markOnboardingComplete(
  workspaceId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    console.log("[mock] Marked onboarding complete for workspace:", workspaceId);
    return { success: true };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("workspace_metadata")
    .upsert({
      workspace_id: workspaceId,
      key: "onboarding_complete",
      value: true,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
