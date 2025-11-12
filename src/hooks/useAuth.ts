import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, apiClient } from '@/lib/api';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  plan: 'free' | 'premium';
  subscription_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Hook for authentication
 */
export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get current user
  const token = apiClient.getToken();
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.auth.me();
      if (response.success && response.data) {
        // Token is automatically updated by apiClient when response includes a new token
        // This happens every time /api/auth/me is called, refreshing the token
        return response.data as User;
      }
      // If 401, token is invalid - clear it
      if (response.error?.statusCode === 401) {
        apiClient.setToken(null);
      }
      throw new Error(response.error?.message || 'Failed to get user');
    },
    retry: false,
    enabled: !!token,
    // Refetch every 30 seconds to quickly detect premium status changes
    // This ensures premium status is detected immediately after upgrade
    refetchInterval: 30 * 1000, // 30 seconds - fast detection of premium changes
    staleTime: 10 * 1000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount to get latest status
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await api.auth.register(email, password);
      if (response.success && response.data) {
        const authData = response.data as AuthResponse;
        apiClient.setToken(authData.token);
        return authData;
      }
      throw new Error(response.error?.message || 'Registration failed');
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      toast.success('Compte créé avec succès ! Bienvenue 🎉');
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'inscription');
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await api.auth.login(email, password);
      if (response.success && response.data) {
        const authData = response.data as AuthResponse;
        apiClient.setToken(authData.token);
        return authData;
      }
      throw new Error(response.error?.message || 'Login failed');
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['auth', 'me'], data.user);
      toast.success('Connexion réussie !');
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la connexion');
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await api.auth.logout();
      if (!response.success) {
        throw new Error(response.error?.message || 'Logout failed');
      }
    },
    onSuccess: () => {
      apiClient.setToken(null);
      queryClient.clear();
      toast.success('Déconnexion réussie');
      navigate('/auth');
    },
    onError: (error: Error) => {
      // Even if logout fails, clear local state
      apiClient.setToken(null);
      queryClient.clear();
      toast.error(error.message || 'Erreur lors de la déconnexion');
      navigate('/auth');
    },
  });

  const isAuthenticated = !!apiClient.getToken() && !!user;
  const isPremium = user?.plan === 'premium';

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    isPremium,
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}

