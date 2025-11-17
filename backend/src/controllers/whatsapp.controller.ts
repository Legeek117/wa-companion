import { Response, NextFunction } from 'express';
import * as whatsappService from '../services/whatsapp.service';
import { getSocket } from '../services/whatsapp.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errors';

/**
 * Generate QR code for WhatsApp connection
 * GET /api/whatsapp/qr
 */
export const getQRCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ValidationError('User not authenticated');
    }

    const { qrCode, sessionId } = await whatsappService.connectWhatsApp(req.userId);

    // Log QR code status for debugging
    console.log(`[WhatsApp] QR Code request for user ${req.userId}:`, {
      hasQRCode: !!qrCode,
      qrCodeLength: qrCode?.length || 0,
      sessionId,
    });

    res.status(200).json({
      success: true,
      data: {
        qrCode: qrCode || '',
        sessionId,
      },
    });
  } catch (error) {
    console.error('[WhatsApp] Error generating QR code:', error);
    next(error);
  }
};

/**
 * Generate pairing code for WhatsApp connection
 * POST /api/whatsapp/pairing-code
 * Body: { phoneNumber: string }
 */
export const getPairingCode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ValidationError('User not authenticated');
    }

    // Get phone number from request body or query
    const phoneNumber = req.body?.phoneNumber || req.query?.phoneNumber as string | undefined;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Numéro de téléphone requis pour générer le code de couplage',
          statusCode: 400,
        },
      });
    }

    // Use queue system for pairing code generation
    const { addPairingCodeJob, getPairingCodeJobStatus } = await import('../services/pairingQueue.service');
    const { acquireSessionLock, releaseSessionLock, hasSessionLock } = await import('../services/sessionLock.service');
    const { getRedisClient } = await import('../config/redis');
    
    // Check if Redis is available
    const redisClient = await getRedisClient();
    const redisAvailable = redisClient !== null;
    
    // Try to acquire lock only if Redis is available
    let lockAcquired = false;
    if (redisAvailable) {
      lockAcquired = await acquireSessionLock(req.userId);
      if (!lockAcquired) {
        // Check if there's an active job (only if queue is available)
        try {
          const jobStatus = await getPairingCodeJobStatus(req.userId);
          if (jobStatus.status === 'active' || jobStatus.status === 'waiting') {
            return res.status(429).json({
              success: false,
              error: {
                message: 'Une demande de code de couplage est déjà en cours. Veuillez patienter.',
                statusCode: 429,
              },
            });
          }
        } catch (error) {
          // If queue check fails, continue without queue check
          console.warn(`[WhatsApp] Could not check job status for user ${req.userId}, continuing:`, error);
        }
        // If no active job but lock exists, wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryLock = await acquireSessionLock(req.userId);
        if (!retryLock) {
          // Check if lock still exists (might have expired)
          const lockExists = await hasSessionLock(req.userId);
          if (lockExists) {
            return res.status(429).json({
              success: false,
              error: {
                message: 'Une opération est déjà en cours pour votre compte. Veuillez réessayer dans quelques instants.',
                statusCode: 429,
              },
            });
          }
          // Lock doesn't exist, try one more time
          lockAcquired = await acquireSessionLock(req.userId);
          if (!lockAcquired) {
            // If still can't acquire, allow operation without lock (fallback)
            console.warn(`[WhatsApp] Could not acquire lock for user ${req.userId}, proceeding without lock (Redis available but lock failed)`);
          }
        } else {
          lockAcquired = true;
        }
      }
    } else {
      // Redis not available - allow operation without lock (fallback mode)
      console.warn(`[WhatsApp] Redis not available, proceeding without lock for user ${req.userId}`);
    }
    
    try {
      // Add job to queue (only if Redis is available)
      // If Redis is not available, we'll process directly without queue
      if (redisAvailable) {
        const jobId = await addPairingCodeJob(req.userId, phoneNumber);
        if (!jobId) {
          // If queue is not available, proceed without queue (fallback mode)
          console.warn(`[WhatsApp] Queue not available for user ${req.userId}, proceeding without queue`);
        }
      } else {
        console.warn(`[WhatsApp] Redis not available, processing pairing code directly without queue for user ${req.userId}`);
      }
      
      // Process the pairing code request
      // If queue is available, this would normally be handled by a worker
      // For now, we process it directly
      const { pairingCode, sessionId } = await whatsappService.connectWhatsAppWithPairingCode(req.userId, phoneNumber);
      
      // Release lock after successful generation (only if we acquired it)
      if (lockAcquired && redisAvailable) {
        await releaseSessionLock(req.userId).catch((err) => {
          console.warn(`[WhatsApp] Error releasing lock for user ${req.userId}:`, err);
        });
      }

      // Log pairing code status for debugging
      console.log(`[WhatsApp] Pairing Code request for user ${req.userId}:`, {
        hasPairingCode: !!pairingCode,
        pairingCodeLength: pairingCode?.length || 0,
        pairingCode: pairingCode || null,
        sessionId,
      });

      return res.status(200).json({
        success: true,
        data: {
          pairingCode: pairingCode || '',
          sessionId,
        },
      });
    } catch (error) {
      // Release lock on error (only if we acquired it)
      if (lockAcquired && redisAvailable) {
        await releaseSessionLock(req.userId).catch(() => {
          // Ignore errors when releasing lock
        });
      }
      
      console.error('[WhatsApp] Error generating pairing code:', error);
      
      // Format error response properly
      if (error instanceof Error) {
        // Check if it's a validation error
        if (error.message.includes('déjà connecté') || 
            error.message.includes('déconnecter') ||
            error.message.includes('invalide') ||
            error.message.includes('Session replaced')) {
          return res.status(400).json({
            success: false,
            error: {
              message: error.message,
              statusCode: 400,
            },
          });
        }
        
        // For other errors, return 500 with user-friendly message
        return res.status(500).json({
          success: false,
          error: {
            message: error.message || 'Erreur lors de la génération du code de couplage',
            statusCode: 500,
          },
        });
      }
      
      // Fallback for unknown errors
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erreur interne lors de la génération du code de couplage',
          statusCode: 500,
        },
      });
    }
  } catch (error) {
    // Outer catch for any errors in lock acquisition or queue setup
    console.error('[WhatsApp] Unexpected error in pairing code generation:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Erreur interne lors de la génération du code de couplage',
        statusCode: 500,
      },
    });
  }
};

/**
 * Get WhatsApp connection status
 * GET /api/whatsapp/status
 */
export const getStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ValidationError('User not authenticated');
    }

    const status = await whatsappService.getWhatsAppStatus(req.userId);
    
    // Log status for debugging
    console.log(`[WhatsApp] Status request for user ${req.userId}:`, {
      status: status.status,
      hasSocket: !!getSocket(req.userId),
      connectedAt: status.connectedAt,
      lastSeen: status.lastSeen,
    });

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disconnect WhatsApp
 * POST /api/whatsapp/disconnect
 */
export const disconnect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw new ValidationError('User not authenticated');
    }

    await whatsappService.disconnectWhatsApp(req.userId);

    res.status(200).json({
      success: true,
      message: 'WhatsApp disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
};
