import { isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * A utility hook that tries to use real data from a React Query result,
 * falling back to mock data when Supabase is not configured or the query
 * returns empty/undefined.
 *
 * Usage:
 *   const { data } = useMockFallback(useInitiatives(), mockInitiatives);
 */
export function useMockFallback<T>(
  queryResult: {
    data: T | undefined;
    isLoading: boolean;
    error: Error | null;
  },
  mockData: T
): { data: T; isLoading: boolean; error: Error | null } {
  // If Supabase is not configured, immediately return mock data
  if (!isSupabaseConfigured) {
    return { data: mockData, isLoading: false, error: null };
  }

  // If the query is still loading, return the loading state
  if (queryResult.isLoading) {
    return { data: mockData, isLoading: true, error: null };
  }

  // If the query errored, return the error with mock data as fallback
  if (queryResult.error) {
    return { data: mockData, isLoading: false, error: queryResult.error };
  }

  // If the query returned data, use it; otherwise fall back to mock data
  const data = queryResult.data ?? mockData;

  // For arrays, fall back to mock if the result is empty
  if (Array.isArray(data) && data.length === 0 && Array.isArray(mockData) && (mockData as unknown[]).length > 0) {
    return { data: mockData, isLoading: false, error: null };
  }

  return { data, isLoading: false, error: null };
}
