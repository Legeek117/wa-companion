import { Response, Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import { env } from '../config/env';
import prisma from '../config/database';
import * as whatsappService from '../services/whatsapp.service';
import * as messageService from '../services/message.service';
import * as adminSettingsService from '../services/adminSettings.service';
import { listAllSupabaseFiles, migrateFile } from '../services/migration.service';

interface AdminRequest extends Request {
  adminToken?: string;
}

/**
 * Middleware to verify admin token
 */
export const verifyAdminToken = (req: AdminRequest, res: Response, next: () => void): void => {
  const authHeader = req.headers.authorization;
  const adminToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : (req.headers['x-admin-token'] || req.query.token);
  
  if (!adminToken) {
    res.status(401).json({
      success: false,
      error: { message: 'Unauthorized. Admin token required.', statusCode: 401 },
    });
    return;
  }

  const expectedStaticToken = process.env.ADMIN_MIGRATION_TOKEN || 'change-me-in-production';
  if (adminToken === expectedStaticToken) {
    req.adminToken = adminToken as string;
    return next();
  }

  try {
    const decoded = jwt.verify(adminToken as string, env.JWT_SECRET) as { adminId: string; email: string; role: string };
    if (decoded.role !== 'admin') {
      throw new Error('Not an admin token');
    }
    req.adminToken = adminToken as string;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { message: 'Unauthorized. Invalid admin token.', statusCode: 401 },
    });
  }
};

export const adminLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!admin) {
      res.status(401).json({ success: false, error: { message: 'Email ou mot de passe incorrect' } });
      return;
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: { message: 'Email ou mot de passe incorrect' } });
      return;
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      data: {
        admin: { id: admin.id, email: admin.email },
        token,
      },
    });
  } catch (error: any) {
    logger.error('[Admin] Login error:', error);
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la connexion' } });
  }
};

export const getLiveLogsStream = (req: Request, res: Response): void => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  res.flushHeaders();

  const { liveLogService } = require('../services/liveLog.service');
  liveLogService.addClient(res);
};

export const adminRegister = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password || password.length < 8) {
      res.status(400).json({ success: false, error: { message: 'Email et mot de passe (8 char min) requis' } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const admin = await prisma.admin.create({
        data: { email: email.toLowerCase(), passwordHash },
        select: { id: true, email: true }
      });
      res.status(201).json({
        success: true,
        data: admin,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        res.status(409).json({ success: false, error: { message: 'Cet email est déjà utilisé' } });
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    logger.error('[Admin] Register error:', error);
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la création du compte' } });
  }
};

export const startMigration = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    logger.info('[Admin] Migration request received');

    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Cloudinary not configured. Please set CLOUDINARY_* variables.',
          statusCode: 400,
        },
      });
      return;
    }

    migrateAllFiles().catch((error) => {
      logger.error('[Admin] Migration error:', error);
    });

    res.status(202).json({
      success: true,
      message: 'Migration started. Check logs for progress.',
      data: {
        status: 'started',
        note: 'Migration is running in background. Check server logs for progress.',
      },
    });
  } catch (error) {
    logger.error('[Admin] Error starting migration:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to start migration',
        statusCode: 500,
      },
    });
  }
};

export const getMigrationStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Check server logs for migration status',
        note: 'Migration status is logged in server logs',
      },
    });
  } catch (error) {
    logger.error('[Admin] Error getting migration status:', error);
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to get migration status',
        statusCode: 500,
      },
    });
  }
};

async function migrateAllFiles(): Promise<void> {
  try {
    logger.info('[Migration] ========================================');
    logger.info('[Migration] Starting Supabase → Cloudinary migration');
    logger.info('[Migration] ========================================');

    logger.info('[Migration] Listing all files from Supabase...');
    const files = await listAllSupabaseFiles();
    logger.info(`[Migration] Found ${files.length} files to migrate`);

    if (files.length === 0) {
      logger.info('[Migration] ✅ No files to migrate');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      logger.info(`[Migration] [${i + 1}/${files.length}] Processing: ${file.path}`);

      const success = await migrateFile(file);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    logger.info('[Migration] ========================================');
    logger.info(`[Migration] ✅ Migration Complete!`);
    logger.info(`[Migration] Success: ${successCount}`);
    logger.info(`[Migration] Failed: ${failCount}`);
    logger.info('[Migration] ========================================');
  } catch (error) {
    logger.error('[Migration] ❌ Fatal error:', error);
    throw error;
  }
}

export const getAllUsers = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, plan: true, logMessages: true, createdAt: true }
    });

    const sessions = await prisma.whatsappSession.findMany({
      select: { userId: true, status: true, lastSeen: true }
    });

    const usersWithStatus = users.map((user: any) => {
      const session = sessions?.find((s: any) => s.userId === user.id);
      return {
        id: user.id,
        email: user.email,
        plan: user.plan,
        log_messages: user.logMessages,
        created_at: user.createdAt,
        whatsapp_status: session?.status || 'disconnected',
        last_seen: session?.lastSeen || null,
      };
    });

    res.status(200).json({
      success: true,
      data: usersWithStatus,
    });
  } catch (error) {
    logger.error('[Admin] Fatal error in getAllUsers:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Erreur interne du serveur' },
    });
  }
};

export const toggleUserLogging = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({
        success: false,
        error: { message: 'enabled field must be a boolean' },
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { logMessages: enabled }
    });

    whatsappService.updateMessageLoggingCache(userId, enabled);

    res.status(200).json({
      success: true,
      data: { enabled },
    });
  } catch (error) {
    logger.error('[Admin] Error toggling user logging:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to toggle logging' },
    });
  }
};

export const syncUserContacts = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    logger.info(`[Admin] Force sync requested for user ${userId}`);
    const syncedContacts = await whatsappService.getAllContactsFromSocket(userId);

    res.status(200).json({
      success: true,
      data: syncedContacts,
      count: syncedContacts.length
    });
  } catch (error) {
    logger.error('[Admin] Error syncing user contacts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to sync contacts' },
    });
  }
};

export const getUserContacts = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    
    try {
      await whatsappService.getAllContactsFromSocket(userId);
    } catch (syncError) {
      logger.warn(`[Admin] Could not sync contacts from socket for user ${userId}:`, syncError);
    }

    const contacts = await messageService.getContacts(userId);

    res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    logger.error('[Admin] Error getting user contacts:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get contacts' },
    });
  }
};

export const getUserMessages = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId, contactId } = req.params;
    
    const decodedContactId = contactId;
    logger.info(`[Admin] getUserMessages REQUEST RAW: userId=${userId}, contactId(raw)=${contactId}, decoded=${decodedContactId}, length=${decodedContactId.length}`);
    
    let messages = await messageService.getMessages(userId, decodedContactId);
    logger.info(`[Admin] getUserMessages test1 (decoded raw Express)= ${messages.length}`);
    
    const altContact = decodeURIComponent(contactId);
    if (messages.length === 0) {
      logger.info(`[Admin] getUserMessages test2: altContact=${altContact}`);
      if (altContact !== decodedContactId) {
        messages = await messageService.getMessages(userId, altContact);
        logger.info(`[Admin] getUserMessages test2 (decodeURIComponent)= ${messages.length}`);
      }
    }
    
    if (messages.length === 0) {
      logger.info(`[Admin] getUserMessages: 0 résultats, essayons diagnostic DB direct...`);
      
      const count = await prisma.whatsappMessage.count({ where: { userId } });
      logger.info(`[Admin] getUserMessages DIAGNOSTIC: user ${userId} a ${count} messages TOTAL dans whatsapp_messages`);
      
      const sampleContacts = await prisma.whatsappMessage.findMany({
        where: { userId },
        select: { contactId: true },
        take: 5
      });
      logger.info(`[Admin] getUserMessages DIAGNOSTIC: 5 contact_ids samples: ${JSON.stringify(sampleContacts)}`);
      
      const suffixVariants = [
        decodedContactId,
        altContact,
        decodedContactId.replace('@lid', '@s.whatsapp.net'),
        decodedContactId.replace('@s.whatsapp.net', '@lid'),
        decodedContactId + '',
      ];
      for (const variant of suffixVariants) {
        if (!variant) continue;
        const tryCount = await prisma.whatsappMessage.count({
          where: { userId, contactId: variant }
        });
        if (tryCount > 0) {
          logger.info(`[Admin] getUserMessages ✅ Found ${tryCount} messages with variant: contact_id="${variant}"`);
          const msgs = await messageService.getMessages(userId, variant);
          if (msgs.length > 0) {
            messages = msgs;
            logger.info(`[Admin] getUserMessages: Retourne ${msgs.length} messages via variant "${variant}"`);
            break;
          }
        } else {
          logger.info(`[Admin] getUserMessages: 0 pour variant="${variant}"`);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    logger.error('[Admin] Error getting user messages:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get messages' },
    });
  }
};

export const sendMessageAsUser = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { to, message } = req.body;

    if (!to || !message) {
      res.status(400).json({
        success: false,
        error: { message: 'Recipient and message are required' },
      });
      return;
    }

    await whatsappService.sendMessage(userId, to, message);

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    logger.error('[Admin] Error sending message as user:', error);
    res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to send message' },
    });
  }
};

export const getAdminSettings = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const settings = await adminSettingsService.getAllSettings();
    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('[Admin] Error getting admin settings:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve settings' },
    });
  }
};

export const updateAdminSetting = async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { key, value } = req.body;

    if (typeof key !== 'string' || typeof value !== 'boolean') {
      res.status(400).json({
        success: false,
        error: { message: 'key (string) and value (boolean) are required' },
      });
      return;
    }

    const decoded = (req as any).adminId ? (req as any) : null;
    const updatedBy = decoded?.adminId || null;

    const result = await adminSettingsService.updateSetting(key, value, updatedBy);

    res.status(200).json({
      success: true,
      data: { [key]: result },
      message: `Paramètre ${key} mis à jour: ${result ? 'activé' : 'désactivé'}`,
    });
  } catch (error) {
    logger.error('[Admin] Error updating admin setting:', error);
    res.status(500).json({
      success: false,
      error: { message: error instanceof Error ? error.message : 'Failed to update setting' },
    });
  }
};
