import { trpc } from "@/lib/trpc";

/**
 * Auth state derived from the current admin session.
 * `auth.me` returns the signed-in User, or null when not authenticated.
 */
export function useAuth() {
  const { data, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  });

  return {
    user: data ?? null,
    loading: isLoading,
    isAuthenticated: !!data,
    refetch,
  };
}
