"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { brand } from "@/config/brand";
import {
  Settings as SettingsIcon,
  Users,
  Puzzle,
  Bot,
  SlidersHorizontal,
  Bell,
  Trash2,
  MoreHorizontal,
  Check,
  X,
  Plus,
  Mail,
  Key,
  RefreshCw,
  Unplug,
  UserMinus,
  UserPlus,
  Clock,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PermissionGate } from "@/components/auth/permission-gate";

// ---------- Types ----------

import {
  type TeamMember,
  mockTeamMembers as initialTeamMembers,
  type IntegrationItem,
  mockIntegrations as integrations,
} from "@/lib/mock-data";

type SettingsTab = "general" | "team" | "integrations" | "agents" | "preferences" | "notifications";

// ---------- Settings tabs ----------

const settingsTabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "team", label: "Team", icon: Users },
  { id: "integrations", label: "Integrations", icon: Puzzle },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", icon: Bell },
];

// ---------- Tab content components ----------

function GeneralTab() {
  const [workspaceName, setWorkspaceName] = useState<string>(brand.name);
  const [workspaceSlug, setWorkspaceSlug] = useState("hybrid-os");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Workspace Details</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Manage your workspace identity and configuration.
        </p>
      </div>

      <div className="grid max-w-lg gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Workspace Name</label>
          <Input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            This is the display name for your workspace.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Workspace URL</label>
          <div className="flex items-center gap-0">
            <span className="flex h-8 items-center rounded-l-lg border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
              app.hybridos.ai/
            </span>
            <Input
              value={workspaceSlug}
              onChange={(e) => setWorkspaceSlug(e.target.value)}
              className="rounded-l-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Brand</label>
          <Input value={brand.name} disabled />
          <p className="text-xs text-muted-foreground">
            Configured in brand settings. Used across agents and content.
          </p>
        </div>

        <Button className="w-fit">Save Changes</Button>
      </div>

      <Separator />

      {/* Danger zone */}
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Permanently delete this workspace and all associated data. This action cannot be undone.
        </p>
        <Button variant="destructive" size="sm" className="mt-3">
          <Trash2 className="size-3.5" data-icon="inline-start" />
          Delete Workspace
        </Button>
      </div>
    </div>
  );
}

// ---------- Invite dialog types ----------

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

function TeamTab() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");
  const [isPending, startTransition] = useTransition();
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Team members with deactivation support
  const [teamMembers, setTeamMembers] = useState(() =>
    initialTeamMembers.map((m) => ({ ...m, deactivated: false }))
  );

  // Pending invitations (mock data to start)
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([
    { id: "inv-001", email: "alex@example.com", role: "operator", created_at: "Apr 4, 2026" },
  ]);

  // Confirm deactivation state
  const [deactivateTarget, setDeactivateTarget] = useState<string | null>(null);

  function handleSendInvite() {
    if (!inviteEmail) return;
    setInviteError(null);
    setInviteSuccess(null);

    startTransition(async () => {
      const { inviteTeamMember } = await import("@/lib/workspace/invite-actions");
      const result = await inviteTeamMember("ws-001", inviteEmail, inviteRole);

      if (result.error) {
        setInviteError(result.error);
        return;
      }

      setPendingInvites((prev) => [
        { id: result.data!.id, email: inviteEmail, role: inviteRole, created_at: "Just now" },
        ...prev,
      ]);
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("operator");
    });
  }

  function handleRevokeInvite(inviteId: string) {
    startTransition(async () => {
      const { revokeInvitation } = await import("@/lib/workspace/invite-actions");
      await revokeInvitation(inviteId);
      setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
    });
  }

  function handleDeactivate(memberId: string) {
    startTransition(async () => {
      const { deactivateUser } = await import("@/lib/auth/actions");
      await deactivateUser(memberId, "ws-001");
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, deactivated: true } : m))
      );
      setDeactivateTarget(null);
    });
  }

  function handleReactivate(memberId: string) {
    startTransition(async () => {
      const { reactivateUser } = await import("@/lib/auth/actions");
      await reactivateUser(memberId, "ws-001");
      setTeamMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, deactivated: false } : m))
      );
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage who has access to this workspace.
          </p>
        </div>
        <PermissionGate requires="manage_members">
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger
              render={
                <Button size="sm">
                  <Plus className="size-3.5" data-icon="inline-start" />
                  Invite Member
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation email to add someone to this workspace.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2">
                {inviteError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {inviteError}
                  </div>
                )}
                {inviteSuccess && (
                  <div className="rounded-lg border border-emerald-300/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400">
                    {inviteSuccess}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => v && setInviteRole(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="strategist">Strategist</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="reviewer">Reviewer</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancel
                </DialogClose>
                <Button onClick={handleSendInvite} disabled={isPending || !inviteEmail}>
                  <Mail className="size-3.5" data-icon="inline-start" />
                  {isPending ? "Sending..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {/* Active members table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Member
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                Joined
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr
                key={member.id}
                className={cn(
                  "border-b last:border-b-0 transition-colors",
                  member.deactivated
                    ? "opacity-50 bg-muted/20"
                    : "hover:bg-muted/30"
                )}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {member.name}
                        {member.deactivated && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">(Deactivated)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={member.deactivated ? "outline" : "secondary"}>
                    {member.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{member.joinedAt}</td>
                <td className="px-4 py-3 text-right">
                  <PermissionGate requires="manage_members">
                    {member.deactivated ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReactivate(member.id)}
                        disabled={isPending}
                      >
                        <UserPlus className="size-3.5" data-icon="inline-start" />
                        Reactivate
                      </Button>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setDeactivateTarget(member.id)}
                          >
                            <UserMinus className="size-4" />
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </PermissionGate>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Deactivation confirmation dialog */}
      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Member</DialogTitle>
            <DialogDescription>
              This will remove the member&apos;s access to this workspace. You can reactivate them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deactivateTarget && handleDeactivate(deactivateTarget)}
              disabled={isPending}
            >
              <UserMinus className="size-3.5" data-icon="inline-start" />
              {isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-foreground">Pending Invitations</h3>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Sent
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{invite.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{invite.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{invite.created_at}</td>
                    <td className="px-4 py-3 text-right">
                      <PermissionGate requires="manage_members">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={isPending}
                        >
                          <X className="size-3.5" data-icon="inline-start" />
                          Revoke
                        </Button>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Credential rotation metadata ----------

interface CredentialInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  connectedDate?: string;
  lastUsed?: string;
}

const credentialsMock: CredentialInfo[] = [
  { id: "c-hs", name: "HubSpot", icon: "HS", color: "bg-orange-500 text-white", connected: true, connectedDate: "Jan 20, 2026", lastUsed: "2 hours ago" },
  { id: "c-gd", name: "Google Drive", icon: "GD", color: "bg-blue-500 text-white", connected: false },
  { id: "c-sl", name: "Slack", icon: "SL", color: "bg-purple-500 text-white", connected: false },
];

function IntegrationsTab() {
  const [credentials, setCredentials] = useState(credentialsMock);

  function handleDisconnect(credId: string) {
    setCredentials((prev) =>
      prev.map((c) =>
        c.id === credId ? { ...c, connected: false, connectedDate: undefined, lastUsed: undefined } : c
      )
    );
  }

  function handleConnect(credId: string) {
    setCredentials((prev) =>
      prev.map((c) =>
        c.id === credId
          ? { ...c, connected: true, connectedDate: "Just now", lastUsed: "Never" }
          : c
      )
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Standard integrations */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Integrations</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Connect external tools to power your agents and workflows.
          </p>
        </div>

        <div className="grid gap-4 max-w-2xl">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    integration.color
                  )}
                >
                  {integration.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {integration.name}
                    </h3>
                    {integration.connected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Check className="size-3" />
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                    {integration.description}
                  </p>
                </div>
                <Button
                  variant={integration.connected ? "outline" : "default"}
                  size="sm"
                  className="shrink-0"
                >
                  {integration.connected ? "Disconnect" : "Connect"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* API Keys & Credentials (admin only) */}
      <PermissionGate requires="manage_integrations">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">API Keys & Credentials</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Manage connected service credentials. Rotate or disconnect integrations.
              </p>
            </div>
          </div>

          <div className="grid gap-3 max-w-2xl">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                    cred.color
                  )}
                >
                  {cred.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{cred.name}</h3>
                    {cred.connected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <Shield className="size-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Not Connected
                      </span>
                    )}
                  </div>
                  {cred.connected && (
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Connected: {cred.connectedDate}
                      </span>
                      <span>Last used: {cred.lastUsed}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {cred.connected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(cred.id)}
                      >
                        <RefreshCw className="size-3.5" data-icon="inline-start" />
                        Rotate
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDisconnect(cred.id)}
                      >
                        <Unplug className="size-3.5" data-icon="inline-start" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => handleConnect(cred.id)}>
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PermissionGate>
    </div>
  );
}

function AgentsTab() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Agent Defaults</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Global configuration applied to all agents unless overridden individually.
        </p>
      </div>

      <div className="grid max-w-lg gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Default Risk Tolerance</label>
          <div className="flex gap-2">
            {["Low", "Medium", "High"].map((level) => (
              <button
                key={level}
                className={cn(
                  "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
                  level === "Medium"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-muted"
                )}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Controls how much autonomy agents have before requiring approval.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Default Model</label>
          <Input value="Claude Opus 4.6" disabled />
          <p className="text-xs text-muted-foreground">
            The LLM model used by agents for reasoning and generation.
          </p>
        </div>

        <Button className="w-fit">Save Defaults</Button>
      </div>
    </div>
  );
}

function PreferencesTab() {
  const [tone, setTone] = useState("collaborative");
  const [autonomy, setAutonomy] = useState(1); // 0=low, 1=medium, 2=high
  const [notifications, setNotifications] = useState({
    approvals: true,
    agentRuns: true,
    weeklyDigest: false,
    errors: true,
  });

  const toneOptions = [
    { id: "coach", label: "Coach", description: "Supportive and guiding" },
    { id: "direct", label: "Direct", description: "Concise and action-oriented" },
    { id: "collaborative", label: "Collaborative", description: "Partnership-focused" },
  ];

  const autonomyLevels = ["Low", "Medium", "High"];

  return (
    <div className="flex flex-col gap-8">
      {/* Orchestrator tone */}
      <div>
        <h2 className="text-sm font-semibold text-foreground">Orchestrator Tone</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          How the orchestrator communicates with you during campaigns and approvals.
        </p>
        <div className="mt-3 flex gap-3">
          {toneOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setTone(option.id)}
              className={cn(
                "flex flex-col items-start rounded-lg border p-3 text-left transition-colors min-w-[140px]",
                tone === option.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-input hover:bg-muted"
              )}
            >
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <span className="mt-0.5 text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Autonomy level */}
      <div>
        <h2 className="text-sm font-semibold text-foreground">Autonomy Level</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Controls how independently agents operate before requesting your input.
        </p>
        <div className="mt-3 max-w-sm">
          <input
            type="range"
            min={0}
            max={2}
            value={autonomy}
            onChange={(e) => setAutonomy(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            {autonomyLevels.map((label, i) => (
              <span
                key={label}
                className={cn(autonomy === i && "font-semibold text-foreground")}
              >
                {label}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {autonomy === 0 &&
              "All agent actions require human approval before execution."}
            {autonomy === 1 &&
              "Low-risk actions execute automatically. Medium and high-risk require approval."}
            {autonomy === 2 &&
              "Only high-risk actions require approval. Most work proceeds autonomously."}
          </p>
        </div>
      </div>

      <Separator />

      {/* Notifications */}
      <div>
        <h2 className="text-sm font-semibold text-foreground">Notification Preferences</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose what you want to be notified about.
        </p>
        <div className="mt-3 flex flex-col gap-3 max-w-sm">
          {[
            { key: "approvals" as const, label: "Approval Requests", desc: "When an agent needs your approval to proceed" },
            { key: "agentRuns" as const, label: "Agent Run Completions", desc: "When an agent finishes a task or skill" },
            { key: "weeklyDigest" as const, label: "Weekly Digest", desc: "Summary of activity and performance" },
            { key: "errors" as const, label: "Errors & Failures", desc: "When something goes wrong" },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-start gap-3 rounded-lg border border-input p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={notifications[item.key]}
                onChange={(e) =>
                  setNotifications({ ...notifications, [item.key]: e.target.checked })
                }
                className="mt-0.5 size-4 rounded border-input accent-primary"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Button className="w-fit">Save Preferences</Button>
    </div>
  );
}

// ---------- Notification toggle items ----------

interface NotificationToggleItem {
  key: string;
  label: string;
  description: string;
}

const emailNotificationItems: NotificationToggleItem[] = [
  { key: "email_approvals", label: "Approval Requests", description: "Email when an agent needs your approval" },
  { key: "email_agent_failures", label: "Agent Failures", description: "Email when an agent run fails" },
  { key: "email_initiative_updates", label: "Initiative Updates", description: "Email on initiative status changes" },
  { key: "email_weekly_digest", label: "Weekly Digest", description: "Weekly summary of activity and performance" },
];

const inAppNotificationItems: NotificationToggleItem[] = [
  { key: "in_app_approvals", label: "Approval Requests", description: "In-app notification for pending approvals" },
  { key: "in_app_agent_activity", label: "Agent Activity", description: "In-app notification for agent runs and completions" },
  { key: "in_app_mentions", label: "Mentions", description: "In-app notification when you are mentioned" },
];

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    email_approvals: true,
    email_agent_failures: true,
    email_initiative_updates: true,
    email_weekly_digest: true,
    in_app_approvals: true,
    in_app_agent_activity: true,
    in_app_mentions: true,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Dynamic import to avoid pulling server action into the client bundle at module scope
    const { updateNotificationPreferences } = await import(
      "@/lib/notifications/preferences"
    );
    await updateNotificationPreferences(prefs);
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Email notifications */}
      <div>
        <h2 className="text-sm font-semibold text-foreground">Email Notifications</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Control which events trigger an email notification.
        </p>
        <div className="mt-3 flex flex-col gap-3 max-w-lg">
          {emailNotificationItems.map((item) => {
            const active = prefs[item.key as keyof typeof prefs];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggle(item.key)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted/50"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {active ? "Active" : "Inactive"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* In-app notifications */}
      <div>
        <h2 className="text-sm font-semibold text-foreground">In-App Notifications</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Control which events show an in-app notification.
        </p>
        <div className="mt-3 flex flex-col gap-3 max-w-lg">
          {inAppNotificationItems.map((item) => {
            const active = prefs[item.key as keyof typeof prefs];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggle(item.key)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted/50"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {active ? "Active" : "Inactive"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Button className="w-fit" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Notification Preferences"}
      </Button>
    </div>
  );
}

// ---------- Tab content map ----------

const tabContent: Record<SettingsTab, React.ComponentType> = {
  general: GeneralTab,
  team: TeamTab,
  integrations: IntegrationsTab,
  agents: AgentsTab,
  preferences: PreferencesTab,
  notifications: NotificationsTab,
};

// ---------- Page ----------

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const ActiveContent = tabContent[activeTab];

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="flex items-center border-b px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Vertical tab nav */}
        <aside className="w-[220px] shrink-0 border-r bg-muted/30">
          <nav className="flex flex-col gap-0.5 p-3">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors text-left",
                    activeTab === tab.id
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Tab content */}
        <main className="flex-1 overflow-auto p-6">
          <ActiveContent />
        </main>
      </div>
    </div>
  );
}
