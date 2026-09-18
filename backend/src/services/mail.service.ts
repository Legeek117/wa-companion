import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Mail service — envoi de mails transactionnels via l'API Brevo (ex-Sendinblue).
 *
 * Nécessite la variable d'env BREVO_API_KEY. Si elle est absente, l'envoi
 * est simplement journalisé (mode dev / dry-run) sans erreur fatale.
 */

const BREVO_API_URL = env.BREVO_API_URL;

interface BrevoSendEmailInput {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  replyTo?: { email: string; name?: string };
}

interface BrevoSendEmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export const isMailConfigured = (): boolean => {
  return !!env.BREVO_API_KEY;
};

/**
 * Envoie un email transactionnel via l'API Brevo (endpoint /smtp/email).
 */
export const sendEmail = async (input: BrevoSendEmailInput): Promise<BrevoSendEmailResult> => {
  if (!env.BREVO_API_KEY) {
    logger.warn('[Mail] BREVO_API_KEY non configurée — email non envoyé (dry-run): %s | to=%s', input.subject, input.to.map((t) => t.email).join(','));
    return { ok: false, error: 'Brevo API key not configured' };
  }

  try {
    const res = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { email: env.MAIL_FROM },
        to: input.to,
        subject: input.subject,
        htmlContent: input.htmlContent,
        replyTo: input.replyTo || { email: env.MAIL_FROM },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error('[Mail] Brevo echec %s: %s', res.status, body.slice(0, 300));
      return { ok: false, error: `Brevo HTTP ${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    logger.info('[Mail] Email envoyé via Brevo: %s → %s', input.subject, input.to.map((t) => t.email).join(','));
    return { ok: true, messageId: data.messageId };
  } catch (error) {
    logger.error('[Mail] Erreur réseau Brevo:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Email de vérification d'adresse pour la création de compte.
 * Le lien contient un token one-time à usage unique.
 */
export const sendVerificationEmail = async (toEmail: string, verificationLink: string): Promise<BrevoSendEmailResult> => {
  const subject = 'Vérifiez votre adresse email — AMDA';
  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
      <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e4e4e7;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:22px;font-weight:bold;color:#18181b;">AMDA</div>
          <div style="font-size:13px;color:#71717a;">Vérification de compte</div>
        </div>
        <h1 style="font-size:18px;color:#18181b;margin:0 0 12px;">Confirmez votre adresse email</h1>
        <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 24px;">
          Bonjour,<br/>
          Merci de vous être inscrit sur AMDA. Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.
        </p>
        <div style="text-align:center;margin-bottom:24px;">
          <a href="${verificationLink}"
             style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:14px 32px;border-radius:10px;">
            Vérifier mon email
          </a>
        </div>
        <p style="font-size:12px;line-height:1.5;color:#a1a1aa;margin:0;">
          Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte AMDA, vous pouvez ignorer cet email.
        </p>
      </div>
    </div>
  </body>
</html>`;

  return sendEmail({ to: [{ email: toEmail }], subject, htmlContent });
};

export const mailService = {
  sendEmail,
  sendVerificationEmail,
  isMailConfigured,
};

export default mailService;