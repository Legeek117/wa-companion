import { Response, NextFunction } from 'express';
import * as whatsappService from '../services/whatsapp.service';
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

    res.status(200).json({
      success: true,
      data: {
        qrCode,
        sessionId,
      },
    });
  } catch (error) {
    next(error);
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
