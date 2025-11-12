import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { useQuota } from './useQuota';

export interface DeletedMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  message_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  sent_at: string;
  deleted_at: string;
  delay_seconds: number;
  created_at: string;
}

export interface DeletedMessagesStats {
  deletedToday: number;
  deletedThisMonth: number;
  totalDeleted: number;
}

/**
 * Hook for deleted messages
 */
export function useDeletedMessages() {
  const { user, isPremium } = useAuth();
  const { quota } = useQuota();

  // Get deleted messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['deleted-messages', user?.id],
    queryFn: async () => {
      const response = await api.deletedMessages.list(50);
      if (response.success && response.data) {
        return response.data as DeletedMessage[];
      }
      return [];
    },
    enabled: !!user,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 10 * 1000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the page
  });

  // Get stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['deleted-messages', 'stats', user?.id],
    queryFn: async () => {
      const response = await api.deletedMessages.getStats();
      if (response.success && response.data) {
        return response.data as DeletedMessagesStats;
      }
      return { deletedToday: 0, deletedThisMonth: 0, totalDeleted: 0 };
    },
    enabled: !!user,
    refetchOnWindowFocus: true, // Refetch when user returns to the page
  });

  return {
    messages,
    stats: stats || { deletedToday: 0, deletedThisMonth: 0, totalDeleted: 0 },
    isLoading: isLoading || isLoadingStats,
    quota: quota.deletedMessages,
    isPremium, // Use isPremium from useAuth for immediate detection
  };
}

