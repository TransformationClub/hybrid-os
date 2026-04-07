"use client";

import * as React from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface PresenceIndicatorProps {
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  maxVisible?: number;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export function PresenceIndicator({
  users,
  maxVisible = 4,
}: PresenceIndicatorProps) {
  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;

  const allNames = users.map((u) => u.name).join(", ");

  return (
    <div className="flex items-center gap-2" title={allNames}>
      <AvatarGroup>
        {visible.map((user) => (
          <Avatar key={user.id} size="sm" title={user.name}>
            {user.avatar ? (
              <AvatarImage src={user.avatar} alt={user.name} />
            ) : null}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        ))}
        {overflow > 0 && (
          <AvatarGroupCount>+{overflow}</AvatarGroupCount>
        )}
      </AvatarGroup>
      <span className="text-xs text-muted-foreground">
        {users.length === 1
          ? `${users[0].name} is viewing`
          : `${users.length} people viewing`}
      </span>
    </div>
  );
}
