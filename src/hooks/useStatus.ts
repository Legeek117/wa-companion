import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

export interface StatusConfig {
  enabled: boolean;
  actionType: 'view_only' | 'view_and_like';
  defaultEmoji: string;
  selectedContacts?: string[];
  isPremium?: boolean;
  contacts?: StatusContactConfig[];
}

export interface StatusContactConfig {
  id?: string;
  contact_id: string;
  contact_name: string;
  enabled: boolean;
  emoji: string;
  action_type?: 'view_only' | 'view_and_like';
  watch_only?: boolean;
}

export interface StatusLike {
  id: string;
  contact_id: string;
  contact_name: string;
  status_id: string;
  emoji_used: string;
  liked_at: string;
  created_at: string;
}

export interface StatusStats {
  likedToday: number;
  likedThisWeek: number;
  totalLiked: number;
}

/**
 * Hook for Status management
 */
export function useStatus() {
  const { user, isPremium } = useAuth();
  const queryClient = useQueryClient();

  // Get status config
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['status', 'config', user?.id],
    queryFn: async () => {
      const response = await api.status.getConfig();
      if (response.success && response.data) {
        return response.data as StatusConfig;
      }
      return { 
        enabled: false, 
        actionType: 'view_and_like' as const,
        defaultEmoji: '❤️',
        isPremium: false,
        contacts: []
      };
    },
    enabled: !!user,
    staleTime: 60 * 1000, // Consider data stale after 60 seconds (increased from 10s)
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes (increased from 30s) to detect premium changes
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount
  });

  // Get status likes history
  // Poll every 30 seconds to detect when statuses disappear or are deleted
  const { data: likes = [], isLoading: isLoadingLikes } = useQuery({
    queryKey: ['status', 'likes', user?.id],
    queryFn: async () => {
      const response = await api.status.list();
      if (response.success && response.data) {
        return response.data as StatusLike[];
      }
      return [];
    },
    enabled: !!user,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds to detect deleted/expired statuses
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount
    staleTime: 20 * 1000, // Consider data stale after 20 seconds
  });

  // Get status stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['status', 'stats', user?.id],
    queryFn: async () => {
      const response = await api.status.getStats();
      if (response.success && response.data) {
        return response.data as StatusStats;
      }
      return { likedToday: 0, likedThisWeek: 0, totalLiked: 0 };
    },
    enabled: !!user,
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<StatusConfig> & { contacts?: StatusContactConfig[] }) => {
      console.log('[Status] Updating config:', {
        enabled: newConfig.enabled,
        actionType: newConfig.actionType,
        defaultEmoji: newConfig.defaultEmoji,
        contactsCount: newConfig.contacts?.length || 0,
      });
      const response = await api.status.updateConfig(newConfig);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update config');
      }
      return response.data;
    },
    onSuccess: (data) => {
      // Update the cache optimistically with the new data immediately
      queryClient.setQueryData(['status', 'config', user?.id], data);
      // Invalidate to trigger a refetch and ensure backend cache is also updated
      queryClient.invalidateQueries({ queryKey: ['status', 'config', user?.id] });
      console.log('[Status] Config updated successfully, cache invalidated');
    },
    onError: (error) => {
      // On error, refetch to get the correct state
      console.error('[Status] Error updating config:', error);
      queryClient.invalidateQueries({ queryKey: ['status', 'config', user?.id] });
    },
  });

  // Wrapper function for updateConfig that uses the mutation
  const updateConfig = (
    newConfig: Partial<StatusConfig> & { contacts?: StatusContactConfig[] },
    options?: { onSuccess?: () => void; onError?: (error: Error) => void }
  ) => {
    updateConfigMutation.mutate(newConfig, {
      onSuccess: (data) => {
        if (options?.onSuccess) {
          options.onSuccess();
        }
      },
      onError: (error: Error) => {
        if (options?.onError) {
          options.onError(error);
        }
      },
    });
  };

  // Like status mutation
  const likeStatusMutation = useMutation({
    mutationFn: async ({ contactId, statusId, emoji }: { contactId: string; statusId: string; emoji?: string }) => {
      const response = await api.status.like(contactId, statusId, emoji);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to like status');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['status', 'likes', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['status', 'stats', user?.id] });
    },
  });

  return {
    config: config || { 
      enabled: false, 
      actionType: 'view_and_like' as const,
      defaultEmoji: '❤️',
      isPremium: false,
      contacts: []
    },
    likes,
    stats: stats || { likedToday: 0, likedThisWeek: 0, totalLiked: 0 },
    isLoading: isLoadingConfig || isLoadingLikes || isLoadingStats,
    updateConfig, // Use the wrapper function that accepts callbacks
    likeStatus: likeStatusMutation.mutate,
    isUpdating: updateConfigMutation.isPending,
    isLiking: likeStatusMutation.isPending,
  };
}

