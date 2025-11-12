import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { useQuota } from './useQuota';

export interface ViewOnceCapture {
  id: string;
  sender_id: string;
  sender_name: string;
  media_url: string;
  media_type: 'image' | 'video';
  captured_at: string;
  created_at: string;
}

export interface ViewOnceStats {
  capturedToday: number;
  capturedThisMonth: number;
  totalCaptured: number;
}

/**
 * Hook for View Once captures
 */
export function useViewOnce() {
  const { user, isPremium } = useAuth();
  const { quota } = useQuota();

  // Get captures
  const { data: captures = [], isLoading } = useQuery({
    queryKey: ['view-once', user?.id],
    queryFn: async () => {
      const response = await api.viewOnce.list(50);
      if (response.success && response.data) {
        return response.data as ViewOnceCapture[];
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
    queryKey: ['view-once', 'stats', user?.id],
    queryFn: async () => {
      const response = await api.viewOnce.getStats();
      if (response.success && response.data) {
        return response.data as ViewOnceStats;
      }
      return { capturedToday: 0, capturedThisMonth: 0, totalCaptured: 0 };
    },
    enabled: !!user,
    refetchOnWindowFocus: true, // Refetch when user returns to the page
  });

  return {
    captures,
    stats: stats || { capturedToday: 0, capturedThisMonth: 0, totalCaptured: 0 },
    isLoading: isLoading || isLoadingStats,
    quota: quota.viewOnce,
    isPremium, // Use isPremium from useAuth for immediate detection
  };
}

