import { useQuery } from '@tanstack/react-query';

interface AuthStatus {
  authenticated: boolean;
  userId: string | null;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthStatus>({
    queryKey: ['/api/auth/status'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    isAuthenticated: data?.authenticated ?? false,
    userId: data?.userId ?? null,
    isLoading,
    error,
  };
}
