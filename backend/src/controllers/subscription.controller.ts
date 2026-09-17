import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createFedaPayCheckout,
  getFedaPayTransaction,
  constructFedaPayEvent,
  isFedaPayTransactionPaid,
} from '../services/fedapay.service';
import { FEDAPAY_PLAN_CONFIG } from '../config/fedapay';
import { AppError, NotFoundError, ValidationError } from '../utils/errors';
import { logger } from '../config/logger';

type PlanKey = 'monthly' | 'yearly';

function isPlanKey(value: unknown): value is PlanKey {
  return value === 'monthly' || value === 'yearly';
}

/**
 * POST /api/subscription/create-checkout
 * Protected. Creates a FedaPay transaction + token and returns the payment URL.
 */
export const createCheckout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new AppError('User not authenticated', 401);

    const { plan } = req.body || {};
    if (!isPlanKey(plan)) {
      throw new ValidationError('Invalid plan. Use "monthly" or "yearly"');
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new NotFoundError('User not found');

    const planConfig = FEDAPAY_PLAN_CONFIG[plan];
    const { checkoutUrl, transaction } = await createFedaPayCheckout({
      plan,
      email: user.email,
    });

    // Track the pending transaction for this user
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodStart.getMonth() + planConfig.intervalMonths);

    const existing = await prisma.subscription.findFirst({
      where: { userId: req.userId },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          provider: 'fedapay',
          providerTransactionId: String(transaction.id),
          plan: 'premium',
          status: 'incomplete',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          canceledAt: null,
          cancelAtPeriodEnd: false,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          userId: req.userId,
          provider: 'fedapay',
          providerTransactionId: String(transaction.id),
          plan: 'premium',
          status: 'incomplete',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        checkoutUrl,
        transactionId: transaction.id,
        amountXof: planConfig.amountXof,
        plan,
      },
      message: 'Checkout session created',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subscription/webhook
 * Public. Receives FedaPay events (signed with X-FEDAPAY-SIGNATURE).
 */
export const webhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-fedapay-signature'] as string | undefined;

    let event: any;
    try {
      const rawBody = (req as any).rawBody as Buffer | string | undefined;
      event = constructFedaPayEvent(
        rawBody || JSON.stringify(req.body),
        signature,
        env.FEDAPAY_WEBHOOK_SECRET
      );
    } catch (error) {
      const err = error as AppError;
      logger.warn('[FedaPay] Webhook signature verification failed', {
        message: err.message,
      });
      res.status(400).json({ received: false, error: err.message });
      return;
    }

    // FedaPay events expose the event type as `type` (and historically `name`)
    const eventType = event.type || event.name || '';

    logger.info(`[FedaPay] Webhook event: ${eventType}`);

    if (eventType === 'transaction.approved' || eventType === 'transaction.paid') {
      const transactionId = Number(event.object_id || event.data?.object?.id || event.transaction?.id);
      if (transactionId) {
        await activateSubscriptionForTransaction(transactionId);
      } else {
        logger.warn('[FedaPay] Approved event without a transaction id', { event });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

async function activateSubscriptionForTransaction(transactionId: number): Promise<boolean> {
  // Never trust the webhook alone - fetch the real status from the API
  const transaction = await getFedaPayTransaction(transactionId);
  if (!transaction) {
    logger.warn(`[FedaPay] Transaction ${transactionId} not found on API`);
    return false;
  }

  if (!isFedaPayTransactionPaid(transaction)) {
    logger.info(`[FedaPay] Transaction ${transactionId} not paid (status=${transaction.status})`);
    return false;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { providerTransactionId: String(transactionId) },
  });
  if (!subscription) {
    logger.warn(`[FedaPay] No tracked subscription for transaction ${transactionId}`);
    return false;
  }

  // Intervalle réel déduit du montant payé (mensuel vs annuel)
  const intervalMonths =
    transaction.amount === FEDAPAY_PLAN_CONFIG.yearly.amountXof
      ? FEDAPAY_PLAN_CONFIG.yearly.intervalMonths
      : FEDAPAY_PLAN_CONFIG.monthly.intervalMonths;

  const now = new Date();
  let periodStart = now;
  let periodEnd: Date;

  // Garder la période stockée par createCheckout si elle est encore dans le futur,
  // sinon (activation tardive / renouvellement) l'étendre d'un intervalle à partir de maintenant.
  if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
    periodEnd = new Date(subscription.currentPeriodEnd);
  } else {
    periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + intervalMonths);
  }

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        plan: 'premium',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
        cancelAtPeriodEnd: false,
      },
    }),
    prisma.user.update({
      where: { id: subscription.userId },
      data: { plan: 'premium', subscriptionId: subscription.id },
    }),
  ]);

  logger.info(
    `[FedaPay] Subscription activated for user ${subscription.userId} (tx ${transactionId}, until ${periodEnd.toISOString()})`
  );
  return true;
}

/**
 * GET /api/subscription/callback
 * Public. Redirect target after a FedaPay payment (mobile/system browser).
 * Re-checks the real transaction status from the API before showing a
 * success / canceled / pending page - never assume the payment succeeded.
 */
const CALLBACK_PAGES: Record<string, string> = {
  success: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Paiement reçu - AMDA</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); padding: 32px 24px; max-width: 360px; text-align: center; }
    .icon { font-size: 56px; }
    h1 { font-size: 20px; color: #0f172a; margin: 12px 0 8px; }
    p { color: #64748b; font-size: 14px; line-height: 1.5; margin: 0; }
    .btn { display: inline-block; margin-top: 20px; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9989;</div>
    <h1>Paiement re&#231;u</h1>
    <p>Merci ! Votre abonnement Premium AMDA va &#234;tre activ&#233; automatiquement. Revenez sur l'application pour profiter de toutes les fonctionnalit&#233;s.</p>
    <a class="btn" href="#" onclick="window.close();">Fermer</a>
  </div>
</body>
</html>`,
  canceled: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Paiement annul&#233; - AMDA</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); padding: 32px 24px; max-width: 360px; text-align: center; }
    .icon { font-size: 56px; }
    h1 { font-size: 20px; color: #0f172a; margin: 12px 0 8px; }
    p { color: #64748b; font-size: 14px; line-height: 1.5; margin: 0; }
    .btn { display: inline-block; margin-top: 20px; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10060;</div>
    <h1>Paiement annul&#233;</h1>
    <p>Vous avez annul&#233; le paiement. Aucun montant n'a &#233;t&#233; d&#233;bit&#233;. Vous pouvez r&#233;essayer depuis l'application AMDA.</p>
    <a class="btn" href="#" onclick="window.close();">Fermer</a>
  </div>
</body>
</html>`,
  pending: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Paiement en attente - AMDA</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); padding: 32px 24px; max-width: 360px; text-align: center; }
    .icon { font-size: 56px; }
    h1 { font-size: 20px; color: #0f172a; margin: 12px 0 8px; }
    p { color: #64748b; font-size: 14px; line-height: 1.5; margin: 0; }
    .btn { display: inline-block; margin-top: 20px; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9203;</div>
    <h1>Paiement en attente</h1>
    <p>Votre paiement est en cours de traitement. Revenez sur l'application AMDA pour v&#233;rifier votre abonnement dans quelques instants.</p>
    <a class="btn" href="#" onclick="window.close();">Fermer</a>
  </div>
</body>
</html>`,
  unknown: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Statut inconnu - AMDA</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: #fff; border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); padding: 32px 24px; max-width: 360px; text-align: center; }
    .icon { font-size: 56px; }
    h1 { font-size: 20px; color: #0f172a; margin: 12px 0 8px; }
    p { color: #64748b; font-size: 14px; line-height: 1.5; margin: 0; }
    .btn { display: inline-block; margin-top: 20px; background: #7c3aed; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10067;</div>
    <h1>Paiement introuvable</h1>
    <p>Nous n'avons pas pu retrouver le statut de votre paiement. Revenez sur l'application AMDA et utilisez &laquo; J'ai pay&#233; - V&#233;rifier mon abonnement &raquo;.</p>
    <a class="btn" href="#" onclick="window.close();">Fermer</a>
  </div>
</body>
</html>`,
};

export const callback = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const transactionIdParam = req.query.id || req.query.transaction_id || req.query.tid;
  const statusParam = typeof req.query.status === 'string' ? req.query.status.toLowerCase() : '';
  const transactionId = Number(transactionIdParam);

  let outcome: keyof typeof CALLBACK_PAGES = 'unknown';

  if (transactionIdParam && !Number.isNaN(transactionId)) {
    try {
      const transaction = await getFedaPayTransaction(transactionId);
      if (transaction) {
        // Ne jamais se fier au redirect seul : statut réel depuis l'API FedaPay
        if (isFedaPayTransactionPaid(transaction)) {
          outcome = 'success';
          // Double filet : active l'abonnement même si le webhook est en retard/perdu
          await activateSubscriptionForTransaction(transactionId);
        } else if (['canceled', 'declined'].includes(transaction.status || '')) {
          outcome = 'canceled';
        } else {
          outcome = 'pending';
        }
      } else if (['approved', 'success', 'paid'].includes(statusParam)) {
        outcome = 'success';
      } else if (['canceled', 'declined'].includes(statusParam)) {
        outcome = 'canceled';
      } else if (['pending', 'initiated'].includes(statusParam)) {
        outcome = 'pending';
      }
    } catch (error) {
      logger.warn('[FedaPay] Callback: transaction status check failed', {
        message: (error as Error).message,
        transactionId,
      });
    }
  } else if (['approved', 'success', 'paid'].includes(statusParam)) {
    outcome = 'success';
  } else if (['canceled', 'declined'].includes(statusParam)) {
    outcome = 'canceled';
  } else if (['pending', 'initiated'].includes(statusParam)) {
    outcome = 'pending';
  }

  res.status(200).send(CALLBACK_PAGES[outcome]);
};

/**
 * GET /api/subscription/status
 * Protected. Returns the current plan + subscription.
 */
export const getStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new AppError('User not authenticated', 401);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new NotFoundError('User not found');

    // Conciliation : si une transaction est en attente, on revérifie le statut réel
    // auprès de FedaPay avant de répondre (utile si le webhook n'est jamais arrivé).
    const pending = await prisma.subscription.findFirst({
      where: { userId: req.userId, status: 'incomplete' },
    });
    if (pending && pending.providerTransactionId) {
      try {
        await activateSubscriptionForTransaction(Number(pending.providerTransactionId));
      } catch (error) {
        logger.warn('[FedaPay] Reconcile failed while checking status', {
          message: (error as Error).message,
          userId: req.userId,
        });
      }
    }

    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.userId },
    });

    res.status(200).json({
      success: true,
      data: {
        plan: user.plan,
        subscription: subscription
          ? {
              id: subscription.id,
              provider: subscription.provider,
              plan: subscription.plan,
              status: subscription.status,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subscription/cancel
 * Protected. Cancels the subscription (does not refund).
 */
export const cancel = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.userId) throw new AppError('User not authenticated', 401);

    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.userId },
    });

    if (!subscription || subscription.status !== 'active') {
      throw new ValidationError('No active subscription to cancel');
    }

    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'canceled',
          cancelAtPeriodEnd: false,
          canceledAt: new Date(),
        },
      }),
      prisma.user.update({
        where: { id: req.userId },
        data: { plan: 'free' },
      }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Subscription canceled',
    });
  } catch (error) {
    next(error);
  }
};