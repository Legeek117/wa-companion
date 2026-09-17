import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { FEDAPAY_PLAN_CONFIG } from '../config/fedapay';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';

/**
 * Montant payé pour un abonnement, déduit de la durée de sa période active.
 * Mensuel/annuel selon la durée stockée dans currentPeriodStart -> currentPeriodEnd.
 */
function subscriptionAmountXof(
  start: Date | null | undefined,
  end: Date | null | undefined
): number {
  if (!start || !end) return 0;
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days >= 300) return FEDAPAY_PLAN_CONFIG.yearly.amountXof;
  if (days >= 20) return FEDAPAY_PLAN_CONFIG.monthly.amountXof;
  return 0;
}

/**
 * GET /api/admin/dashboard
 * Tableau de bord de lecture seule (CRM) : users, revenus, abonnements, sessions.
 */
export const getAdminDashboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new AppError('User not authenticated', 401);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth(), 1);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);

    const [usersCount, usersToday, usersByPlanRaw, sessions, subscriptions, subsThisMonth, recentUsers, recentSubs, blacklistCount, banCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
        prisma.user.groupBy({ by: ['plan'], _count: true }),
        prisma.whatsappSession.groupBy({ by: ['status'], _count: true }),
        prisma.subscription.findMany({ select: { id: true, plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, createdAt: true } }),
        prisma.subscription.findMany({ where: { createdAt: { gte: startOfMonth } }, select: { id: true, plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true, createdAt: true } }),
        prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, email: true, plan: true, createdAt: true } }),
        prisma.subscription.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { userId: true, provider: true, plan: true, status: true, currentPeriodEnd: true, createdAt: true } }),
        prisma.whatsappBlacklist.count().catch(() => 0),
        prisma.banEvent.count().catch(() => 0),
      ]);

    const usersByPlan: Record<string, number> = { free: 0, premium: 0, vip: 0 };
    for (const g of usersByPlanRaw) usersByPlan[g.plan] = g._count;

    const sumAmount = (list: typeof subscriptions): number =>
      list.reduce((sum, s) => sum + subscriptionAmountXof(s.currentPeriodStart, s.currentPeriodEnd), 0);

    const totalRevenue = sumAmount(subscriptions);
    const thisMonthRevenue = sumAmount(subsThisMonth);

    const subsStatus: Record<string, number> = {};
    for (const s of subscriptions) subsStatus[s.status] = (subsStatus[s.status] || 0) + 1;

    const sessionStatus: Record<string, number> = {};
    for (const s of sessions) sessionStatus[s.status] = s._count;

    // Revenus par mois (12 derniers mois)
    const revenueByMonth: { month: string; totalXof: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (10 - i), 1);
      const monthSubs = subscriptions.filter(
        (s) => s.createdAt >= monthStart && s.createdAt < monthEnd
      );
      revenueByMonth.push({
        month: monthStart.toISOString().slice(0, 7),
        totalXof: sumAmount(monthSubs),
      });
    }

    res.json({
      success: true,
      data: {
        generatedAt: now.toISOString(),
        users: {
          total: usersCount,
          registeredToday: usersToday,
          byPlan: usersByPlan,
        },
        revenue: {
          totalXof: totalRevenue,
          thisMonthXof: thisMonthRevenue,
          byMonth: revenueByMonth,
        },
        subscriptions: {
          byStatus: subsStatus,
          active: subsStatus['active'] || 0,
        },
        sessions: {
          byStatus: sessionStatus,
          connected: sessionStatus['connected'] || 0,
        },
        security: {
          blacklistedJids: blacklistCount,
          banEvents: banCount,
        },
        recentUsers: recentUsers.map((u) => ({
          id: u.id,
          email: u.email,
          plan: u.plan,
          createdAt: u.createdAt.toISOString(),
        })),
        recentSubscriptions: recentSubs.map((s) => ({
          userId: s.userId,
          provider: s.provider,
          plan: s.plan,
          status: s.status,
          periodEnd: s.currentPeriodEnd?.toISOString() ?? null,
          createdAt: s.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error('[Admin] Failed to build dashboard:', error);
    next(error);
  }
};