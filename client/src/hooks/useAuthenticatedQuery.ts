import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export function useAuthenticatedQuery<T>(
  queryKey: (string | number)[],
  queryFn: () => Promise<T>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  const { token, isAuthenticated, isLoading } = useAuth();

  // Memoize the actual query function to prevent recreation on every render
  const memoizedQueryFn = useMemo(() => {
    if (!token) return () => Promise.reject(new Error('No token'));

    return async () => {
      const response = await fetch(queryKey[0] as string, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    };
  }, [token, queryKey]);

  return useQuery({
    queryKey,
    queryFn: memoizedQueryFn,
    enabled: !isLoading && isAuthenticated && !!token,
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
    ...options,
  });
}

export async function authenticatedFetch(url: string, token: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}