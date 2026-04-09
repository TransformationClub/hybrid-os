"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { UIMessage } from "ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollaborateSession {
  id: string;
  title: string;
  createdAt: Date;
  initiativeId?: string;
  initiativeTitle?: string;
  messages: UIMessage[];
  pendingText?: string; // first message to auto-send when session opens
}

interface CollaborateContextValue {
  sessions: CollaborateSession[];
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
  createSession: (opts?: {
    initiativeId?: string;
    initiativeTitle?: string;
    pendingText?: string;
  }) => CollaborateSession;
  deleteSession: (id: string) => void;
  updateSession: (id: string, patch: Partial<CollaborateSession>) => void;
  syncMessages: (id: string, messages: UIMessage[]) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CollaborateContext = createContext<CollaborateContextValue | null>(null);

export function useCollaborate() {
  const ctx = useContext(CollaborateContext);
  if (!ctx) {
    throw new Error("useCollaborate must be used within CollaborateProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const MAX_SESSIONS = 10;

export function CollaborateProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<CollaborateSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const createSession = useCallback(
    (opts?: { initiativeId?: string; initiativeTitle?: string; pendingText?: string }) => {
      let targetSessions = sessions;

      // If at capacity, evict the oldest session with no messages
      if (targetSessions.length >= MAX_SESSIONS) {
        const emptyIdx = targetSessions.findIndex((s) => s.messages.length === 0);
        if (emptyIdx !== -1) {
          targetSessions = [
            ...targetSessions.slice(0, emptyIdx),
            ...targetSessions.slice(emptyIdx + 1),
          ];
        } else {
          // All sessions have messages — return a synthetic error marker
          // Caller should check sessions.length >= MAX_SESSIONS before calling
          const fake: CollaborateSession = {
            id: "__at_capacity__",
            title: "",
            createdAt: new Date(),
            messages: [],
          };
          return fake;
        }
      }

      const session: CollaborateSession = {
        id: crypto.randomUUID(),
        title: "New session",
        createdAt: new Date(),
        initiativeId: opts?.initiativeId,
        initiativeTitle: opts?.initiativeTitle,
        messages: [],
        pendingText: opts?.pendingText,
      };

      setSessions([session, ...targetSessions]);
      setActiveSessionId(session.id);
      return session;
    },
    [sessions]
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setActiveSessionId((prev) => (prev === id ? null : prev));
  }, []);

  const updateSession = useCallback(
    (id: string, patch: Partial<CollaborateSession>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      );
    },
    []
  );

  const syncMessages = useCallback((id: string, messages: UIMessage[]) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        // Auto-title from first user message
        const firstUser = messages.find((m) => m.role === "user");
        const autoTitle =
          firstUser && s.title === "New session"
            ? (() => {
                const text = firstUser.parts
                  .filter(
                    (p): p is { type: "text"; text: string } => p.type === "text"
                  )
                  .map((p) => p.text)
                  .join("")
                  .trim();
                return text.length > 40 ? text.slice(0, 40) + "…" : text || "New session";
              })()
            : s.title;
        return { ...s, messages, title: autoTitle };
      })
    );
  }, []);

  return (
    <CollaborateContext.Provider
      value={{
        sessions,
        activeSessionId,
        setActiveSessionId,
        createSession,
        deleteSession,
        updateSession,
        syncMessages,
      }}
    >
      {children}
    </CollaborateContext.Provider>
  );
}
