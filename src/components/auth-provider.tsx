"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, setUser, setWorkspace, setMembership, setIsLoading, clear } =
    useAuthStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // If Supabase is not configured, skip auth and show the app with mock data
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // Initial load
    async function loadAuth() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const userId = session.user.id;

        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (!profile) {
          setIsLoading(false);
          return;
        }

        const { data: membership } = await supabase
          .from("workspace_memberships")
          .select("*")
          .eq("user_id", userId)
          .limit(1)
          .single();

        if (!membership) {
          setUser(profile);
          setIsLoading(false);
          return;
        }

        const { data: workspace } = await supabase
          .from("workspaces")
          .select("*")
          .eq("id", membership.workspace_id)
          .single();

        setUser(profile);
        setWorkspace(workspace ?? null);
        setMembership(membership ?? null);
      } catch {
        // Supabase not reachable - continue without auth
      }
      setIsLoading(false);
    }

    loadAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        clear();
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setWorkspace, setMembership, setIsLoading, clear]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
