import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';

export interface AnalyticsOverview {
  overview: {
    statusLikes: {
      total: number;
      recent: number;
      trend: number;
    };
    viewOnce: {
      total: number;
      recent: number;
      trend: number;
    };
    deletedMessages: {
      total: number;
      recent: number;
      trend: number;
    };
    autoresponder: {
      active: number;
    };
  };
}

export interface StatusAnalytics {
  dailyData: Array<{
    date: string;
    count: number;
    emojis: Record<string, number>;
  }>;
  topContacts: Array<{
    contact_id: string;
    contact_name: string;
    count: number;
  }>;
  total: number;
}

export interface ViewOnceAnalytics {
  dailyData: Array<{
    date: string;
    total: number;
    images: number;
    videos: number;
  }>;
  mediaTypeCounts: Record<string, number>;
  topSenders: Array<{
    sender_id: string;
    sender_name: string;
    count: number;
  }>;
  total: number;
}

export interface DeletedMessagesAnalytics {
  dailyData: Array<{
    date: string;
    total: number;
    text: number;
    media: number;
  }>;
  messageTypeCounts: Record<string, number>;
  topSenders: Array<{
    sender_id: string;
    sender_name: string;
    count: number;
  }>;
  total: number;
}

/**
 * Hook for Analytics
 */
export function useAnalytics() {
  const { user, isPremium } = useAuth();

  // Get overview
  const { data: overview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['analytics', 'overview', user?.id],
    queryFn: async () => {
      const response = await api.analytics.getOverview();
      if (response.success && response.data) {
        return response.data as AnalyticsOverview;
      }
      throw new Error(response.error?.message || 'Failed to get analytics overview');
    },
    enabled: !!user && isPremium,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchOnWindowFocus: true, // Refetch when user returns to the page
    refetchOnMount: true, // Always refetch on mount
  });

  // Get status analytics
  const { data: statusAnalytics, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['analytics', 'status', user?.id],
    queryFn: async () => {
      const response = await api.analytics.getStatusStats();
      if (response.success && response.data) {
        return response.data as StatusAnalytics;
      }
      throw new Error(response.error?.message || 'Failed to get status analytics');
    },
    enabled: !!user && isPremium,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get view once analytics
  const { data: viewOnceAnalytics, isLoading: isLoadingViewOnce } = useQuery({
    queryKey: ['analytics', 'view-once', user?.id],
    queryFn: async () => {
      const response = await api.analytics.getViewOnceStats();
      if (response.success && response.data) {
        return response.data as ViewOnceAnalytics;
      }
      throw new Error(response.error?.message || 'Failed to get view once analytics');
    },
    enabled: !!user && isPremium,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Get deleted messages analytics
  const { data: deletedMessagesAnalytics, isLoading: isLoadingDeletedMessages } = useQuery({
    queryKey: ['analytics', 'deleted-messages', user?.id],
    queryFn: async () => {
      const response = await api.analytics.getDeletedMessagesStats();
      if (response.success && response.data) {
        return response.data as DeletedMessagesAnalytics;
      }
      throw new Error(response.error?.message || 'Failed to get deleted messages analytics');
    },
    enabled: !!user && isPremium,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    overview,
    statusAnalytics,
    viewOnceAnalytics,
    deletedMessagesAnalytics,
    isLoading: isLoadingOverview || isLoadingStatus || isLoadingViewOnce || isLoadingDeletedMessages,
    isPremium,
  };
}


















