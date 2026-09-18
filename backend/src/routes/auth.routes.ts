import { Router, Request, Response } from 'express';
import * as authController from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { apiLimiter, authLimiter, looseLimiter } from '../middleware/rateLimit.middleware';
import { verifyUserEmail, buildVerificationLink, isMailConfigured } from '../services/auth.service';

const router = Router();

// --- Routes publiques ---

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// Vérification email (GET pour clic sur le lien du mail)
router.get('/verify-email', authLimiter, async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  if (!token) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="fr"><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:60px 20px;text-align:center;">
        <div style="background:#fff;border-radius:16px;padding:40px;max-width:420px;margin:0 auto;border:1px solid #e4e4e7;">
          <h1 style="color:#dc2626;">Lien invalide</h1>
          <p style="color:#71717a;">Le lien de vérification est invalide ou incomplet.</p>
        </div>
      </body></html>
    `);
    return;
  }
  try {
    await verifyUserEmail(token);
    res.send(`
      <!DOCTYPE html>
      <html lang="fr"><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:60px 20px;text-align:center;">
        <div style="background:#fff;border-radius:16px;padding:40px;max-width:420px;margin:0 auto;border:1px solid #e4e4e7;">
          <div style="font-size:48px;">✅</div>
          <h1 style="color:#18181b;">Email vérifié !</h1>
          <p style="color:#3f3f46;">Vous pouvez maintenant vous connecter à AMDA.</p>
          <div style="margin-top:20px;">
            <a href="/" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 32px;border-radius:10px;font-weight:bold;">Ouvrir AMDA</a>
          </div>
        </div>
      </body></html>
    `);
  } catch (error) {
    res.status(400).send(`
      <!DOCTYPE html>
      <html lang="fr"><body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:60px 20px;text-align:center;">
        <div style="background:#fff;border-radius:16px;padding:40px;max-width:420px;margin:0 auto;border:1px solid #e4e4e7;">
          <h1 style="color:#dc2626;">Erreur de vérification</h1>
          <p style="color:#71717a;">Le lien de vérification a expiré ou est invalide.<br/>Veuillez vous inscrire à nouveau ou demander un nouveau lien.</p>
        </div>
      </body></html>
    `);
  }
});

// Renvoi de l'email de vérification (POST, rate-limited)
router.post('/verify-email', authLimiter, authController.verifyEmail);
router.post('/resend-verification', authLimiter, authController.resendVerification);

// --- Routes protégées ---
router.get('/me', protect, looseLimiter, authController.getMe);
router.post('/logout', protect, looseLimiter, authController.logout);
router.post('/refresh', protect, apiLimiter, authController.refreshToken);

export default router;
