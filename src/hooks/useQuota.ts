import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

export interface Quota {
  plan: 'free' | 'premium';
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

  const { data: quota, isLoading } = useQuery({
    queryKey: ['quota', user?.id],
    queryFn: async () => {
      const response = await api.quota.get();
      if (response.success && response.data) {
        return {
          ...response.data,
          resetDate: new Date(response.data.resetDate),
        } as Quota;
      }
      // Return default quota if API fails, but use user's premium status from useAuth
      return {
        plan: (userIsPremium ? 'premium' : 'free') as 'free' | 'premium',
        viewOnce: { used: 0, limit: userIsPremium ? Infinity : 3, remaining: userIsPremium ? Infinity : 3 },
        deletedMessages: { used: 0, limit: userIsPremium ? Infinity : 3, remaining: userIsPremium ? Infinity : 3 },
        scheduledStatuses: { used: 0, limit: userIsPremium ? Infinity : 5, remaining: userIsPremium ? Infinity : 5 },
        statusReactions: { used: 0, limit: userIsPremium ? Infinity : 2, remaining: userIsPremium ? Infinity : 2 },
        resetDate: new Date(),
      };
    },
    enabled: !!user,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds to detect premium changes quickly
    staleTime: 10 * 1000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount
  });

  return {
    quota: quota || {
      plan: (userIsPremium ? 'premium' : 'free') as 'free' | 'premium',
      viewOnce: { used: 0, limit: userIsPremium ? Infinity : 3, remaining: userIsPremium ? Infinity : 3 },
      deletedMessages: { used: 0, limit: userIsPremium ? Infinity : 3, remaining: userIsPremium ? Infinity : 3 },
      scheduledStatuses: { used: 0, limit: userIsPremium ? Infinity : 5, remaining: userIsPremium ? Infinity : 5 },
      statusReactions: { used: 0, limit: userIsPremium ? Infinity : 2, remaining: userIsPremium ? Infinity : 2 },
      resetDate: new Date(),
    },
    isLoading,
  };
}



