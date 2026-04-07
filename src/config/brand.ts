/**
 * Brand configuration - single source of truth for product identity.
 * Change the product name here and it updates everywhere.
 */
export const brand = {
  name: "Hybrid OS",
  shortName: "Hybrid",
  tagline: "The operating system for agentic companies",
  description:
    "Plan and execute campaigns with a hybrid team of humans and agents — in one operating system.",
  url: "https://hybridos.ai",
  support: "support@hybridos.ai",
} as const;

export type Brand = typeof brand;
