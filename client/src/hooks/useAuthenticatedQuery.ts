
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export function useAuthenticatedQuery<T>(
  queryKey: (string | number)[],
  queryFn: (token: string) => Promise<T>,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  const { token, isAuthenticated } = useAuth();

  return useQuery({
    queryKey,
    queryFn: () => {
      if (!token) {
        throw new Error("No authentication token");
      }
      return queryFn(token);
    },
    enabled: isAuthenticated && !!token,
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
