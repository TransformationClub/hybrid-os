"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillEditor, type SkillFormData } from "@/components/skills/skill-editor";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Rocket,
  FileText,
  Target,
  Sparkles,
  RefreshCw,
  UserPlus,
  Play,
  Pencil,
} from "lucide-react";
import { CardGridSkeleton } from "@/components/skeletons/page-skeletons";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/auth/permission-gate";
import { type MockSkill, mockSkills } from "@/lib/mock-data";
import { getSkills, createSkill, updateSkill, logSkillFeedback } from "@/lib/skills/actions";
import { SkillRunnerDialog } from "@/components/skills/skill-runner-dialog";
import { executeSkillMock } from "@/lib/skills/mock-runner";
import type { Skill } from "@/types";

// ---------- Icon map ----------

const skillIconMap: Record<string, React.ElementType> = {
  Rocket,
  Target,
  FileText,
  RefreshCw,
  UserPlus,
  Sparkles,
};

// ---------- Transform server data to display shape ----------

/** Map a category from the Skill name to a display category */
function inferCategory(skill: Skill): MockSkill["category"] {
  const name = skill.name.toLowerCase();
  if (name.includes("campaign") || name.includes("abm") || name.includes("aeo")) return "campaign";
  if (name.includes("content") || name.includes("generation")) return "content";
  if (name.includes("retro") || name.includes("optim")) return "optimization";
  return "other";
}

/** Pick an icon name based on the skill name */
function inferIconName(skill: Skill): string {
  const name = skill.name.toLowerCase();
  if (name.includes("campaign") && !name.includes("abm") && !name.includes("aeo")) return "Rocket";
  if (name.includes("aeo") || name.includes("abm") || name.includes("target")) return "Target";
  if (name.includes("content") || name.includes("generation")) return "FileText";
  if (name.includes("retro") || name.includes("optim")) return "RefreshCw";
  if (name.includes("onboard")) return "UserPlus";
  return "Sparkles";
}

/** Pick an icon color based on the inferred category */
function inferIconColor(category: MockSkill["category"]): string {
  const colorMap: Record<string, string> = {
    campaign: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    content: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    optimization: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
    other: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return colorMap[category] ?? colorMap.other;
}

/** Agent name initials + color */
const agentColorMap: Record<string, string> = {
  OR: "bg-primary text-primary-foreground",
  CS: "bg-indigo-600 text-white",
  RE: "bg-amber-600 text-white",
  CW: "bg-rose-600 text-white",
  QA: "bg-emerald-600 text-white",
  OP: "bg-cyan-600 text-white",
};

function agentInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function skillToMockSkill(skill: Skill): MockSkill {
  const category = inferCategory(skill);
  return {
    id: skill.id,
    name: skill.name,
    purpose: skill.purpose,
    iconName: inferIconName(skill),
    iconColor: inferIconColor(category),
    category,
    stepCount: skill.workflow.length,
    agents: skill.agents.map((a) => {
      const initials = agentInitials(a);
      return {
        initials,
        color: agentColorMap[initials] ?? "bg-gray-600 text-white",
      };
    }),
    lastRun: "Never",
  };
}

type SkillWithIcon = MockSkill & { icon: React.ElementType };

function addIcon(s: MockSkill): SkillWithIcon {
  return { ...s, icon: skillIconMap[s.iconName] ?? Rocket };
}

const tabs = [
  { id: "all", label: "All" },
  { id: "campaign", label: "Campaign" },
  { id: "content", label: "Content" },
  { id: "optimization", label: "Optimization" },
];

// ---------- Page ----------

export default function SkillsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillWithIcon | null>(null);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [runningSkill, setRunningSkill] = useState<Skill | null>(null);
  const [skills, setSkills] = useState<SkillWithIcon[]>([]);
  const [skillMap, setSkillMap] = useState<Map<string, Skill>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchSkills = useCallback(async () => {
    try {
      const result = await getSkills("default");
      if (result.data && result.data.length > 0) {
        setSkills(result.data.map((s) => addIcon(skillToMockSkill(s))));
        const map = new Map<string, Skill>();
        for (const s of result.data) {
          map.set(s.id, s);
        }
        setSkillMap(map);
      } else {
        setSkills(mockSkills.map(addIcon));
        setSkillMap(new Map());
      }
    } catch {
      setSkills(mockSkills.map(addIcon));
      setSkillMap(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleRun = useCallback((skill: SkillWithIcon) => {
    // Look up original Skill from map; fallback to a synthetic Skill object
    const original = skillMap.get(skill.id);
    if (original) {
      setRunningSkill(original);
    } else {
      // Build a minimal Skill from the display data for mock execution
      setRunningSkill({
        id: skill.id,
        workspace_id: "default",
        name: skill.name,
        purpose: skill.purpose,
        workflow: Array.from({ length: skill.stepCount }, (_, i) => ({
          id: `step-${i}`,
          order: i + 1,
          label: `Step ${i + 1}`,
          agent_id: skill.agents[i % skill.agents.length]?.initials ?? "",
          action: `Execute step ${i + 1}`,
        })),
        agents: skill.agents.map((a) => a.initials),
        tools: [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    setRunnerOpen(true);
  }, [skillMap]);

  const handleCreate = useCallback(() => {
    setEditingSkill(null);
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback((skill: SkillWithIcon) => {
    setEditingSkill(skill);
    setEditorOpen(true);
  }, []);

  const handleSave = useCallback(async (data: SkillFormData) => {
    if (editingSkill) {
      await updateSkill({
        skillId: editingSkill.id,
        name: data.name,
        purpose: data.purpose,
        description: data.description || undefined,
        workflow: data.workflow.map((step) => ({
          id: step.id,
          order: step.order,
          label: step.label,
          agent_id: step.agentId,
          action: step.action,
        })),
        agents: data.agents,
        tools: data.tools,
        qualityBar: data.qualityBar || undefined,
        escalationRules: data.escalationRules || undefined,
        isActive: data.isActive,
      });
    } else {
      await createSkill({
        workspaceId: "default",
        name: data.name,
        purpose: data.purpose,
        description: data.description || undefined,
        workflow: data.workflow.map((step) => ({
          id: step.id,
          order: step.order,
          label: step.label,
          agent_id: step.agentId,
          action: step.action,
        })),
        agents: data.agents,
        tools: data.tools,
        qualityBar: data.qualityBar || undefined,
        escalationRules: data.escalationRules || undefined,
      });
    }
    setEditorOpen(false);
    await fetchSkills();
  }, [editingSkill, fetchSkills]);

  const filtered =
    activeTab === "all"
      ? skills
      : skills.filter((s) => s.category === activeTab);

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Skills</h1>
        <PermissionGate requires="manage_skills">
          <Button onClick={handleCreate}>
            <Plus className="size-4" data-icon="inline-start" />
            Create Skill
          </Button>
        </PermissionGate>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-6">
        {/* Filter tabs */}
        <div className="mb-6 flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Skills grid */}
        {loading ? (
          <CardGridSkeleton />
        ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((skill) => {
            const Icon = skill.icon;
            return (
              <Card key={skill.id} className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        skill.iconColor
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle>{skill.name}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-0.5">
                        {skill.purpose}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                  {/* Meta row */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">{skill.stepCount} steps</span>
                      <span>Last run {skill.lastRun}</span>
                    </div>
                  </div>

                  {/* Agent avatars */}
                  <div className="flex items-center gap-1.5">
                    <span className="mr-1 text-xs text-muted-foreground">Agents:</span>
                    <div className="flex -space-x-1.5">
                      {skill.agents.map((agent, i) => (
                        <Avatar key={i} size="sm">
                          <AvatarFallback
                            className={cn("text-[9px] font-semibold", agent.color)}
                          >
                            {agent.initials}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleRun(skill)}>
                    <Play className="size-3.5" data-icon="inline-start" />
                    Run Skill
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(skill)}>
                    <Pencil className="size-3.5" data-icon="inline-start" />
                    Edit
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        )}
      </div>

      <SkillEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
        skill={
          editingSkill
            ? {
                id: editingSkill.id,
                name: editingSkill.name,
                purpose: editingSkill.purpose,
                description: null,
                workflow: Array.from({ length: editingSkill.stepCount }, (_, i) => ({
                  id: `step-${i}`,
                  order: i + 1,
                  label: `Step ${i + 1}`,
                  agent_id: editingSkill.agents[i % editingSkill.agents.length]?.initials ?? "",
                  action: "",
                })),
                agents: editingSkill.agents.map((a) => a.initials),
                tools: [],
                quality_bar: null,
                escalation_rules: null,
                is_active: true,
              }
            : undefined
        }
      />

      <SkillRunnerDialog
        open={runnerOpen}
        onOpenChange={setRunnerOpen}
        skill={runningSkill}
        workspaceId="default"
        onExecute={async (skill, context, onEvent) => {
          return executeSkillMock(skill, context, onEvent);
        }}
        onSaveFeedback={logSkillFeedback}
      />
    </div>
  );
}
