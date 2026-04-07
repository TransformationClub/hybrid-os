import { create } from "zustand";
import type { User, Workspace, WorkspaceMembership } from "@/types";

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  membership: WorkspaceMembership | null;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setMembership: (membership: WorkspaceMembership | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  workspace: null,
  membership: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setWorkspace: (workspace) => set({ workspace }),
  setMembership: (membership) => set({ membership }),
  setIsLoading: (isLoading) => set({ isLoading }),
  clear: () =>
    set({
      user: null,
      workspace: null,
      membership: null,
    }),
}));

/** Computed selector: true when the current member has the admin role. */
export function useIsAdmin(): boolean {
  return useAuthStore((s) => s.membership?.role === "admin");
}
