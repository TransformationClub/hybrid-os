import { useAuthStore, useIsAdmin } from "@/stores/auth-store";

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const workspace = useAuthStore((s) => s.workspace);
  const membership = useAuthStore((s) => s.membership);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAdmin = useIsAdmin();

  return { user, workspace, membership, isLoading, isAdmin };
}
