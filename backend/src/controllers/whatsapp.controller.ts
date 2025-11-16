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

    const { pairingCode, sessionId } = await whatsappService.connectWhatsAppWithPairingCode(req.userId, phoneNumber);

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
