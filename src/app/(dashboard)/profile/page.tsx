"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getProfile, updateProfile } from "@/lib/profile/actions";
import { logout } from "@/lib/auth/actions";
import {
  LogOut,
  Save,
  User,
  Clock,
  CheckCircle,
  FileText,
  Zap,
} from "lucide-react";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

// ------------------------------------------------------------
// Mock activity data
// ------------------------------------------------------------

const mockActivity = [
  {
    id: "1",
    icon: FileText,
    description: 'Created initiative "Q2 Product Launch"',
    time: "2 hours ago",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    id: "2",
    icon: CheckCircle,
    description: 'Approved "Homepage Redesign Copy"',
    time: "5 hours ago",
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  {
    id: "3",
    icon: Zap,
    description: 'Triggered agent run for "SEO Content Audit"',
    time: "1 day ago",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  {
    id: "4",
    icon: FileText,
    description: 'Created initiative "ABM Pilot - Enterprise"',
    time: "2 days ago",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    id: "5",
    icon: CheckCircle,
    description: 'Approved "Brand Guidelines v2"',
    time: "3 days ago",
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getUserInitials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  strategist: "secondary",
  operator: "secondary",
  reviewer: "outline",
  viewer: "outline",
};

// ------------------------------------------------------------
// Page
// ------------------------------------------------------------

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const result = await getProfile();
      if (result.data) {
        setProfile(result.data);
        setFullName(result.data.full_name);
        setAvatarUrl(result.data.avatar_url ?? "");
      }
    }
    load();
  }, []);

  const handleSave = useCallback(() => {
    setSaveMessage(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", fullName);
      formData.set("avatarUrl", avatarUrl);
      const result = await updateProfile(formData);
      if (result.error) {
        setSaveMessage(result.error);
      } else {
        setSaveMessage("Profile updated.");
        setProfile((prev) =>
          prev
            ? { ...prev, full_name: fullName, avatar_url: avatarUrl || undefined }
            : prev
        );
      }
    });
  }, [fullName, avatarUrl]);

  const handleLogout = useCallback(() => {
    startTransition(async () => {
      await logout();
    });
  }, []);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 pb-12 max-w-3xl mx-auto">
      {/* ---- Page Header ---- */}
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Profile
        </h1>
        <p className="text-muted-foreground mt-0.5">
          Manage your account details
        </p>
      </div>

      {/* ---- Profile Header Card ---- */}
      <Card>
        <CardContent className="flex items-center gap-5">
          <Avatar size="lg" className="!size-16">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            ) : null}
            <AvatarFallback className="text-lg">
              {getUserInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-semibold truncate">
                {profile.full_name}
              </h2>
              <Badge variant={roleBadgeVariant[profile.role] ?? "outline"}>
                {profile.role}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {profile.email}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ---- Edit Profile ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your name and avatar. Email is managed through your auth
            provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email}
              readOnly
              disabled
              className="opacity-60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={isPending}>
              <Save className="h-4 w-4" data-icon="inline-start" />
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
            {saveMessage && (
              <p
                className={`text-sm ${saveMessage.startsWith("Profile") ? "text-success" : "text-destructive"}`}
              >
                {saveMessage}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- Recent Activity ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest actions across the platform</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {mockActivity.map((event) => {
              const Icon = event.icon;
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${event.iconBg}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${event.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm leading-snug">{event.description}</p>
                  </div>
                  <span className="shrink-0 pt-0.5 text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {event.time}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ---- Danger Zone ---- */}
      <Separator />
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Actions here cannot be easily undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout} disabled={isPending}>
            <LogOut className="h-4 w-4" data-icon="inline-start" />
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
