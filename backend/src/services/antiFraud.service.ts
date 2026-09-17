import prisma from '../config/database';
import { logger } from '../config/logger';
import { AuthorizationError } from '../utils/errors';

/**
 * Normalise un JID WhatsApp vers la forme "xxx@s.whatsapp.net".
 * Un JID d'utilisateur peut être "xxxx@s.whatsapp.net" ou la partie numérique.
 */
export function normalizeJid(value: string): string {
  const v = (value || '').trim().toLowerCase();
  if (!v) return '';
  if (v.includes('@')) return v;
  return `${v}@s.whatsapp.net`;
}

function isBanError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/**
 * Enregistre le lien WhatsApp -> compte sur la session.
 */
export async function registerWhatsappBinding(
  userId: string,
  sessionId: string,
  jid: string,
  phoneNumber?: string
): Promise<void> {
  try {
    await prisma.whatsappSession.update({
      where: { sessionId },
      data: {
        whatsappJid: normalizeJid(jid),
        phoneNumber: phoneNumber || null,
      },
    });
  } catch (error) {
    logger.error('[AntiFraud] registerWhatsappBinding failed:', error);
  }
}

/**
 * Cherche un compte existant (non banni) déjà lié au même numéro/JID.
 */
async function findExistingBinding(
  userId: string,
  jid: string,
  phoneNumber?: string
): Promise<string | null> {
  const matches = await prisma.whatsappSession.findFirst({
    where: {
      userId: { not: userId },
      OR: [{ whatsappJid: normalizeJid(jid) }, { phoneNumber: phoneNumber || '' }],
    },
    select: { userId: true, whatsappJid: true, phoneNumber: true },
  });

  if (!matches) return null;

  const holder = await prisma.user.findUnique({
    where: { id: matches.userId },
    select: { id: true, banned: true },
  });

  if (!holder || holder.banned) return null;
  return matches.userId;
}

/**
 * Vérifie si le numéro/JID est blacklisté.
 */
async function checkBlacklist(userId: string, jid: string, phoneNumber?: string): Promise<void> {
  const bl = await prisma.whatsappBlacklist.findFirst({
    where: {
      OR: [{ jid: normalizeJid(jid) }, { phoneNumber: phoneNumber || '' }],
    },
  });

  if (bl) {
    const reason = `Numéro WhatsApp blacklisté pour fraude : ${bl.reason || 'réutilisation interdite'}`;
    await banAccount(userId, reason, bl.jid, bl.phoneNumber || phoneNumber, 'auto');
    throw new AuthorizationError(reason);
  }
}

/**
 * Bannit un compte + journalise l'événement.
 */
export async function banAccount(
  userId: string,
  reason: string,
  jid?: string,
  phoneNumber?: string,
  actor = 'system',
  relatedUserId?: string
): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { banned: true, bannedAt: new Date(), banReason: reason.slice(0, 1000) },
    });
    await prisma.banEvent.create({
      data: {
        action: 'ban',
        targetUserId: userId,
        relatedUserId: relatedUserId || null,
        jid: jid || null,
        phoneNumber: phoneNumber || null,
        reason,
        createdById: actor,
      },
    });
    logger.warn(`[AntiFraud] Compte banni: ${userId} (${reason})`);
  } catch (error) {
    logger.error('[AntiFraud] banAccount failed:', error);
  }
}

/**
 * Point de contrôle anti-fraude exécuté dès qu'un numéro JID est connu
 * (pairing code ou connexion). Règle : 1 WhatsApp = 1 compte.
 * Si le numéro est déjà lié à un autre compte actif, bannit le nouveau
 * compte + l'ancien, et blackliste le numéro/JID.
 */
export async function enforceWhatsappUniqueness(
  userId: string,
  sessionId: string,
  jid: string,
  phoneNumber?: string
): Promise<void> {
  const normalized = normalizeJid(jid);
  if (!normalized) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, banned: true },
  });
  if (!user) {
    throw new AuthorizationError('User not found');
  }

  // Un compte banni ne peut pas (ré)activer une session.
  if (user.banned) {
    throw new AuthorizationError('Account banned');
  }

  // Enregistre d'abord le lien (cela marque le JID comme utilisé).
  await registerWhatsappBinding(userId, sessionId, normalized, phoneNumber);

  // 1) Blacklist : réutilisation interdite d'un numéro déjà puni.
  await checkBlacklist(userId, normalized, phoneNumber);

  // 2) Unicité : le même WhatsApp sur deux comptes actifs.
  const otherUserId = await findExistingBinding(userId, normalized, phoneNumber);
  if (otherUserId) {
    const reason = 'Fraude détectée : le même numéro WhatsApp est lié à plusieurs comptes';
    await banAccount(otherUserId, reason, normalized, phoneNumber, 'system', userId);
    await banAccount(userId, reason, normalized, phoneNumber, 'system', otherUserId);

    try {
      await prisma.whatsappBlacklist.create({
        data: {
          jid: normalized,
          phoneNumber: phoneNumber || null,
          reason: 'Numéro lié à plusieurs comptes (ban)',
        },
      });
    } catch (error) {
      if (!isBanError(error)) {
        logger.warn('[AntiFraud] blacklist create (probably duplicate):', String(error));
      }
    }

    throw new AuthorizationError(reason);
  }
}

/**
 * Vérifie qu'un utilisateur n'est pas banni (pour connexions/résumés).
 */
export async function assertNotBanned(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { banned: true, banReason: true },
  });
  if (user?.banned) {
    throw new AuthorizationError(user.banReason || 'Account banned');
  }
}