import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import { useWhatsApp } from './useWhatsApp';
import { useQuota } from './useQuota';

export interface DashboardStats {
  statusLiked: number;
  viewOnceCount: number;
  viewOnceLimit: number;
  deletedMessagesCount: number;
  deletedMessagesLimit: number;
  autoReplies: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  contact: string;
  time: string;
  type: 'status' | 'view_once' | 'deleted_message' | 'autoresponder';
}

/**
 * Hook for Dashboard data
 */
export function useDashboard() {
  const { user, isPremium } = useAuth();
  const { status: whatsappStatus, isConnected } = useWhatsApp();
  const { quota, isLoading: isLoadingQuota } = useQuota();

  // Get status stats
  const { data: statusStats } = useQuery({
    queryKey: ['status', 'stats', user?.id],
    queryFn: async () => {
      const response = await api.status.getStats();
      if (response.success && response.data) {
        return response.data;
      }
      return { likedToday: 0, likedThisWeek: 0, totalLiked: 0 };
    },
    enabled: !!user,
  });

  // Get stats
  const stats: DashboardStats = {
    statusLiked: statusStats?.likedToday || 0,
    viewOnceCount: quota.viewOnce.used,
    viewOnceLimit: quota.viewOnce.limit,
    deletedMessagesCount: quota.deletedMessages.used,
    deletedMessagesLimit: quota.deletedMessages.limit,
    autoReplies: 0, // TODO: Get from autoresponder stats API
  };

  // Get recent activity from multiple sources
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['dashboard', 'activity', user?.id],
    queryFn: async () => {
      const activities: RecentActivity[] = [];

      // Get recent status likes
      const statusResponse = await api.status.list();
      if (statusResponse.success && statusResponse.data) {
        const statusLikes = (statusResponse.data as any[]).slice(0, 5);
        statusLikes.forEach((like: any) => {
          activities.push({
            id: like.id,
            action: `Liked status from ${like.contact_name}`,
            contact: like.contact_name,
            time: like.liked_at,
            type: 'status',
          });
        });
      }

      // Get recent view once captures
      const viewOnceResponse = await api.viewOnce.list(5);
      if (viewOnceResponse.success && viewOnceResponse.data) {
        const captures = viewOnceResponse.data as any[];
        captures.forEach((capture: any) => {
          activities.push({
            id: capture.id,
            action: `Captured view once from ${capture.sender_name}`,
            contact: capture.sender_name,
            time: capture.captured_at,
            type: 'view_once',
          });
        });
      }

      // Get recent deleted messages
      const deletedResponse = await api.deletedMessages.list(5);
      if (deletedResponse.success && deletedResponse.data) {
        const messages = deletedResponse.data as any[];
        messages.forEach((msg: any) => {
          activities.push({
            id: msg.id,
            action: `Captured deleted message from ${msg.sender_name}`,
            contact: msg.sender_name,
            time: msg.deleted_at,
            type: 'deleted_message',
          });
        });
      }

      // Sort by time (most recent first)
      return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);
    },
    enabled: !!user,
  });

  return {
    user,
    isPremium,
    whatsappStatus,
    isConnected,
    stats,
    recentActivity,
    quota,
    isLoading: isLoadingQuota,
  };
}



















