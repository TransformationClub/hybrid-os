"use client";

import * as React from "react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  useMentionableMembers,
  extractMentions,
  resolveMentionIds,
  type MentionableMember,
} from "@/hooks/use-workspace-members";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export interface CommentMentionMetadata {
  mentionedUserIds: string[];
  mentionedUsernames: string[];
}

interface CommentThreadProps {
  entityType: "work_item" | "knowledge_object" | "initiative";
  entityId: string;
  comments: Array<{
    id: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    createdAt: string;
    mentions?: CommentMentionMetadata;
  }>;
  onAddComment?: (content: string, mentions?: CommentMentionMetadata) => void;
  onDeleteComment?: (id: string) => void;
  currentUserId?: string;
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

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateString).toLocaleDateString();
}

/** Render comment content with @mentions highlighted */
function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="font-semibold text-blue-600 dark:text-blue-400">
          {part}
        </span>
      );
    }
    return part;
  });
}

// ------------------------------------------------------------
// Mention Dropdown
// ------------------------------------------------------------

function MentionDropdown({
  members,
  query,
  onSelect,
  position,
}: {
  members: MentionableMember[];
  query: string;
  onSelect: (member: MentionableMember) => void;
  position: { top: number; left: number };
}) {
  const filtered = React.useMemo(() => {
    const q = query.toLowerCase();
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        m.fullName.toLowerCase().includes(q)
    );
  }, [members, query]);

  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute z-50 w-64 rounded-md border border-border bg-popover shadow-md py-1 max-h-48 overflow-y-auto"
      style={{ bottom: position.top, left: position.left }}
    >
      {filtered.slice(0, 8).map((member, idx) => (
        <button
          key={member.id}
          type="button"
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors ${
            idx === selectedIndex ? "bg-accent" : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(member);
          }}
          onMouseEnter={() => setSelectedIndex(idx)}
        >
          <Avatar size="sm">
            {member.avatar ? (
              <AvatarImage src={member.avatar} alt={member.fullName} />
            ) : null}
            <AvatarFallback className="text-[8px]">
              {getInitials(member.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{member.fullName}</p>
            <p className="text-xs text-muted-foreground truncate">
              @{member.username}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export function CommentThread({
  entityType: _entityType,
  entityId: _entityId,
  comments,
  onAddComment,
  onDeleteComment,
  currentUserId: _currentUserId,
}: CommentThreadProps) {
  const [newComment, setNewComment] = React.useState("");
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Mention state
  const { members } = useMentionableMembers();
  const [mentionActive, setMentionActive] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState("");
  const [mentionStartIndex, setMentionStartIndex] = React.useState(-1);

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart ?? value.length;
    setNewComment(value);

    // Check if we're in an @mention context
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only activate if @ is at start or preceded by whitespace, and no space after @
      const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : " ";
      if ((charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0) && !textAfterAt.includes(" ")) {
        setMentionActive(true);
        setMentionQuery(textAfterAt);
        setMentionStartIndex(lastAtIndex);
        return;
      }
    }

    setMentionActive(false);
    setMentionQuery("");
    setMentionStartIndex(-1);
  }

  function handleMentionSelect(member: MentionableMember) {
    const before = newComment.slice(0, mentionStartIndex);
    const after = newComment.slice(
      mentionStartIndex + 1 + mentionQuery.length
    );
    const updated = `${before}@${member.username} ${after}`;
    setNewComment(updated);
    setMentionActive(false);
    setMentionQuery("");
    setMentionStartIndex(-1);

    // Refocus the textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = mentionStartIndex + member.username.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || !onAddComment) return;

    // Extract mentions and build metadata
    const mentionedUsernames = extractMentions(trimmed);
    const mentionedUserIds = resolveMentionIds(mentionedUsernames, members);

    const mentionMeta: CommentMentionMetadata | undefined =
      mentionedUsernames.length > 0
        ? { mentionedUserIds, mentionedUsernames }
        : undefined;

    onAddComment(trimmed, mentionMeta);
    setNewComment("");
    setMentionActive(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
      return;
    }
    if (e.key === "Escape" && mentionActive) {
      setMentionActive(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Empty state */}
      {comments.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No comments yet. Start the conversation.
        </p>
      )}

      {/* Comment list */}
      <div className="flex flex-col gap-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="group relative flex gap-3"
            onMouseEnter={() => setHoveredId(comment.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <Avatar size="sm" className="mt-0.5">
              {comment.authorAvatar ? (
                <AvatarImage
                  src={comment.authorAvatar}
                  alt={comment.authorName}
                />
              ) : null}
              <AvatarFallback>
                {getInitials(comment.authorName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {comment.authorName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(comment.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-foreground/90 whitespace-pre-wrap break-words">
                {renderContent(comment.content)}
              </p>
            </div>

            {/* Delete button (visible on hover) */}
            {onDeleteComment && hoveredId === comment.id && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => onDeleteComment(comment.id)}
                aria-label="Delete comment"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* New comment form */}
      {onAddComment && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              placeholder="Add a comment... Use @ to mention someone"
              value={newComment}
              onChange={handleTextChange}
              className="min-h-[60px] resize-none"
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Delay to allow dropdown click to register
                setTimeout(() => setMentionActive(false), 200);
              }}
            />
            {mentionActive && (
              <MentionDropdown
                members={members}
                query={mentionQuery}
                onSelect={handleMentionSelect}
                position={{ top: 4, left: 8 }}
              />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {mentionActive ? "Type to filter members" : "Cmd+Enter to submit"}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim()}
            >
              Comment
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
