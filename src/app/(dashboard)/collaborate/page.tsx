"use client";

import { useCollaborate } from "@/components/collaborate/collaborate-provider";
import { SessionSidebar } from "@/components/collaborate/session-sidebar";
import { ChatSession } from "@/components/collaborate/chat-session";
import { CollaborateEmptyState } from "@/components/collaborate/empty-state";

export default function CollaboratePage() {
  const { sessions, activeSessionId, setActiveSessionId, createSession, deleteSession, updateSession, syncMessages } =
    useCollaborate();

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <SessionSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={() => createSession()}
        onDeleteSession={deleteSession}
      />

      {/* Right panel */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeSession ? (
          <ChatSession
            key={activeSession.id}
            session={activeSession}
            onUpdate={(patch) => updateSession(activeSession.id, patch)}
            onSyncMessages={(msgs) => syncMessages(activeSession.id, msgs)}
            onClose={() => setActiveSessionId(null)}
          />
        ) : (
          <CollaborateEmptyState
            sessions={sessions}
            onStart={(opts) => createSession(opts)}
            onSelectSession={setActiveSessionId}
          />
        )}
      </div>
    </div>
  );
}
