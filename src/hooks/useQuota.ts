import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

export interface Quota {
  plan: 'free' | 'premium' | 'vip';
  viewOnce: {
    used: number;
    limit: number;
    remaining: number;
  };
  deletedMessages: {
    used: number;
    limit: number;
    remaining: number;
  };
  scheduledStatuses: {
    used: number;
    limit: number;
    remaining: number;
  };
  statusReactions: {
    used: number;
    limit: number;
    remaining: number;
  };
  resetDate: Date;
}

/**
 * Hook for user quota
 */
export function useQuota() {
  const { user, isPremium: userIsPremium } = useAuth();

  const defaultQuota = (): Quota => ({
    plan: (userIsPremium ? 'premium' : 'free') as 'free' | 'premium' | 'vip',
    viewOnce: { used: 0, limit: userIsPremium ? 3 : 0, remaining: userIsPremium ? 3 : 0 },
    deletedMessages: { used: 0, limit: userIsPremium ? Infinity : 10, remaining: userIsPremium ? Infinity : 10 },
    scheduledStatuses: { used: 0, limit: userIsPremium ? Infinity : 5, remaining: userIsPremium ? Infinity : 5 },
    statusReactions: { used: 0, limit: userIsPremium ? Infinity : 2, remaining: userIsPremium ? Infinity : 2 },
    resetDate: new Date(),
  });

  const { data: quota, isLoading } = useQuery({
    queryKey: ['quota', user?.id],
    queryFn: async () => {
      const response = await api.quota.get();
      if (response.success && response.data) {
        const data = response.data as Partial<Record<string, unknown>> & {
          resetDate?: string | Date;
          plan?: Quota['plan'];
        };
        return {
          ...(response.data as unknown as Quota),
          resetDate: new Date((data.resetDate ?? new Date()) as string | Date),
        } as Quota;
      }
      // Return default quota if API fails, but use user's premium status from useAuth
      return defaultQuota();
    },
    enabled: !!user,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds to detect premium changes quickly
    staleTime: 10 * 1000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount
  });

  return {
    quota: quota || defaultQuota(),
    isLoading,
  };
}