import makeWASocket, {
  WASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import { join } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { env } from '../config/env';
import { getSupabaseClient } from '../config/database';
import { logger } from '../config/logger';
import { WhatsAppSession } from '../types/whatsapp.types';
import { handleStatusUpdate } from './status.service';
import {
  deleteLocalSessionDirectory,
  ensureSessionFromSupabase,
  removeSessionFromSupabase,
  syncSessionToSupabase,
} from './sessionStorage.service';
// ⚠️ DÉSACTIVÉ : handleViewOnceMessage ne fonctionne plus depuis 2024
// Les View Once ne sont plus accessibles directement, uniquement via quoted messages
// import { handleViewOnceMessage } from './viewOnce.service';
import { storeMessage, handleMessageDeletion } from './deletedMessages.service';
import { handleIncomingMessage } from './autoresponder.service';

/**
 * Create a filtered logger for Baileys that suppresses non-critical decryption errors
 * These errors are normal when reconnecting and trying to decrypt already-processed messages
 */
const createBaileysLogger = () => {
  const baseLogger = logger.child({ component: 'Baileys' });
  
  return {
    level: 'info',
    trace: () => {},
    debug: (msg: any, ...args: any[]) => {
      // Only log debug in development mode
      if (env.NODE_ENV === 'development') {
        baseLogger.debug(msg, ...args);
      }
    },
    info: (msg: any, ...args: any[]) => {
      baseLogger.info(msg, ...args);
    },
    warn: (msg: any, ...args: any[]) => {
      // Filter out MessageCounterError warnings - these are normal and non-critical
      const messageStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      if (messageStr.includes('MessageCounterError') || 
          messageStr.includes('Key used already') ||
          messageStr.includes('failed to decrypt message')) {
        // Only log in debug mode
        if (env.LOG_LEVEL === 'debug') {
          baseLogger.debug(`[Filtered] ${msg}`, ...args);
        }
        return;
      }
      baseLogger.warn(msg, ...args);
    },
    error: (msg: any, ...args: any[]) => {
      // Filter out MessageCounterError errors - these are normal and non-critical
      const messageStr = typeof msg === 'string' ? msg : JSON.stringify(msg);
      const argsStr = args.length > 0 ? JSON.stringify(args) : '';
      const fullMessage = messageStr + argsStr;
      
      if (fullMessage.includes('MessageCounterError') || 
          fullMessage.includes('Key used already') ||
          fullMessage.includes('failed to decrypt message')) {
        // Only log in debug mode
        if (env.LOG_LEVEL === 'debug') {
          baseLogger.debug(`[Filtered] ${msg}`, ...args);
        }
        return;
      }
      baseLogger.error(msg, ...args);
    },
    fatal: (msg: any, ...args: any[]) => {
      baseLogger.fatal(msg, ...args);
    },
    child: (_bindings: any) => createBaileysLogger(),
  };
};

const supabase = getSupabaseClient();

// Store active WhatsApp sockets by userId
const activeSockets = new Map<string, WASocket>();

// Store keep-alive intervals by userId
const keepAliveIntervals = new Map<string, NodeJS.Timeout>();

// Store statuses by userId (in-memory cache)
const statusCache = new Map<string, Array<{
  id: string;
  contactId: string;
  contactName: string;
  timestamp: number;
  type: 'image' | 'video' | 'text';
  url?: string;
  caption?: string;
}>>();

/**
 * Get all active sockets (for user identification)
 */
export const getActiveSockets = (): Map<string, WASocket> => {
  return activeSockets;
};

// Store QR codes by userId (temporary, cleared after connection)
const qrCodes = new Map<string, string>();

// Store pairing codes by userId (separate from QR codes)
const pairingCodes = new Map<string, string>();

// Track reconnection attempts to prevent infinite loops
const reconnectionAttempts = new Map<string, { count: number; lastAttempt: number }>();

// Track sessions with conflicts to prevent reconnection
const conflictedSessions = new Set<string>();

// Track reconnection timers to prevent multiple simultaneous reconnection attempts
const reconnectionTimers = new Map<string, NodeJS.Timeout>();

// Track connection health monitoring intervals
const connectionHealthMonitors = new Map<string, NodeJS.Timeout>();

// Maximum reconnection attempts before giving up (increased from 3 to 10)
const MAX_RECONNECTION_ATTEMPTS = 10;
const RECONNECTION_COOLDOWN = 30 * 1000; // 30 seconds (reduced from 60s for faster recovery)
const INITIAL_RECONNECTION_DELAY = 5 * 1000; // 5 seconds initial delay
const MAX_RECONNECTION_DELAY = 5 * 60 * 1000; // 5 minutes max delay
const CONNECTION_HEALTH_CHECK_INTERVAL = 30 * 1000; // Check connection health every 30 seconds

/**
 * Get session directory path for a user
 */
const getSessionPath = (userId: string): string => {
  const sessionsDir = join(process.cwd(), env.WHATSAPP_SESSION_PATH, userId);
  if (!existsSync(sessionsDir)) {
    mkdirSync(sessionsDir, { recursive: true });
  }
  return sessionsDir;
};

/**
 * Get or create WhatsApp session in database
 */
const getOrCreateSession = async (userId: string): Promise<WhatsAppSession> => {
  const sessionId = `session_${userId}_${Date.now()}`;

  // Try to get existing session
  const { data: existingSession, error: findError } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existingSession && !findError) {
    return {
      userId: existingSession.user_id,
      sessionId: existingSession.session_id,
      qrCode: existingSession.qr_code || undefined,
      pairingCode: existingSession.pairing_code || undefined,
      status: existingSession.status as 'disconnected' | 'connecting' | 'connected',
      connectedAt: existingSession.connected_at ? new Date(existingSession.connected_at) : undefined,
      lastSeen: existingSession.last_seen ? new Date(existingSession.last_seen) : undefined,
    };
  }

  // Create new session
  const { data: newSession, error: createError } = await supabase
    .from('whatsapp_sessions')
    .insert({
      user_id: userId,
      session_id: sessionId,
      status: 'disconnected',
    })
    .select()
    .single();

  if (createError || !newSession) {
    logger.error('Error creating WhatsApp session:', createError);
    throw new Error('Failed to create WhatsApp session');
  }

  return {
    userId: newSession.user_id,
    sessionId: newSession.session_id,
    status: newSession.status as 'disconnected' | 'connecting' | 'connected',
  };
};

/**
 * Update session status in database
 */
const updateSessionStatus = async (
  userId: string,
  updates: {
    status?: 'disconnected' | 'connecting' | 'connected';
    qrCode?: string | null;
    pairingCode?: string | null;
    connectedAt?: Date;
    lastSeen?: Date;
    sessionData?: any;
  }
): Promise<void> => {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status) updateData.status = updates.status;
  if (updates.qrCode !== undefined) updateData.qr_code = updates.qrCode;
  if (updates.pairingCode !== undefined) updateData.pairing_code = updates.pairingCode;
  if (updates.connectedAt) updateData.connected_at = updates.connectedAt.toISOString();
  if (updates.lastSeen) updateData.last_seen = updates.lastSeen.toISOString();
  if (updates.sessionData) updateData.session_data = updates.sessionData;

  const { error } = await supabase
    .from('whatsapp_sessions')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    logger.error('Error updating WhatsApp session:', error);
    throw new Error('Failed to update WhatsApp session');
  }
};

/**
 * Connect WhatsApp and generate QR code
 */
export const connectWhatsApp = async (userId: string): Promise<{ qrCode: string; sessionId: string }> => {
  try {
    // Clear conflict status when user manually tries to connect
    conflictedSessions.delete(userId);
    reconnectionAttempts.delete(userId);
    
    // Get or create session
    const session = await getOrCreateSession(userId);

    // If already connected, return existing session
    if (session.status === 'connected' && activeSockets.has(userId)) {
      const socket = activeSockets.get(userId);
      if (socket?.user) {
        logger.info(`[WhatsApp] User ${userId} already connected, returning empty QR code`);
        return {
          qrCode: '',
          sessionId: session.sessionId,
        };
      }
    }

    // If already connecting and has QR code, return it
    // But only if it's recent (less than 5 minutes old)
    if (session.status === 'connecting' && session.qrCode) {
      const sessionAge = Date.now() - (session.connectedAt?.getTime() || 0);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (sessionAge < fiveMinutes) {
      logger.info(`[WhatsApp] User ${userId} already connecting with QR code, returning existing QR code`);
      return {
        qrCode: session.qrCode,
        sessionId: session.sessionId,
      };
      } else {
        // QR code is too old, clean up and regenerate
        logger.info(`[WhatsApp] Existing QR code is too old for user ${userId}, will regenerate`);
        await updateSessionStatus(userId, { status: 'disconnected', qrCode: null, pairingCode: null });
      }
    }

    // Disconnect any existing socket first (to avoid conflicts)
    if (activeSockets.has(userId)) {
      const existingSocket = activeSockets.get(userId);
      if (existingSocket) {
        logger.info(`[WhatsApp] Disconnecting existing socket for QR code, user: ${userId}`);
        try {
          await existingSocket.end(undefined);
        } catch (error) {
          logger.warn(`[WhatsApp] Error disconnecting existing socket: ${error}`);
        }
        activeSockets.delete(userId);
        qrCodes.delete(userId);
        pairingCodes.delete(userId);
      }
    }

    // Get session path
    const sessionPath = getSessionPath(userId);

    // FORCE CLEAN: Always clean session files when generating QR code to ensure fresh connection
    // This ensures Baileys will always generate a new QR code
    // This prevents issues with corrupted sessions and forces a clean authentication flow
    try {
      const fs = require('fs');
      const path = require('path');
      // Check if session directory exists and has files
      if (existsSync(sessionPath)) {
        const files = fs.readdirSync(sessionPath);
        if (files.length > 0) {
          logger.info(`[WhatsApp] Cleaning ${files.length} session file(s) for user ${userId} to force QR code generation`);
          // Remove all session files to force fresh connection
          for (const file of files) {
            const filePath = path.join(sessionPath, file);
            try {
              fs.unlinkSync(filePath);
              logger.info(`[WhatsApp] Removed session file: ${file} for user ${userId}`);
            } catch (err) {
              logger.warn(`[WhatsApp] Error removing session file ${file}: ${err}`);
            }
          }
          logger.info(`[WhatsApp] ✅ Cleaned up all session files for user ${userId}, will create fresh session for QR code`);
        } else {
          logger.info(`[WhatsApp] Session directory is empty for user ${userId}, will create fresh session`);
        }
      } else {
        logger.info(`[WhatsApp] Session directory does not exist for user ${userId}, will create it`);
      }
    } catch (error) {
      logger.error(`[WhatsApp] Error cleaning session files for user ${userId}: ${error}`);
      // Continue anyway - useMultiFileAuthState will create a fresh session
    }

    // Ensure any remote backup is also cleared so we start from a clean state
    await removeSessionFromSupabase(userId);

    // Update status to connecting
    await updateSessionStatus(userId, { status: 'connecting', qrCode: null, pairingCode: null });

    // Load auth state (will create fresh since we cleaned it)
    logger.info(`[WhatsApp] Loading fresh auth state for user ${userId} from path: ${sessionPath}`);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const persistCreds = async () => {
      try {
        await saveCreds();
        await syncSessionToSupabase(userId, sessionPath);
      } catch (error) {
        logger.warn(`[WhatsApp] Error persisting credentials for user ${userId}:`, error);
      }
    };
    
    // Check if auth state has credentials (should be empty after cleanup)
    const hasCredentials = state.creds && state.creds.me;
    logger.info(`[WhatsApp] Auth state check for user ${userId}:`, {
      hasCredentials: !!hasCredentials,
      hasMe: !!state.creds?.me,
      credsKeys: state.creds ? Object.keys(state.creds) : [],
      expectedEmpty: true, // Should be empty after cleanup
    });
    
    // After cleanup, auth state should be empty, so Baileys will generate QR code
    // If it's not empty, log a warning but continue anyway
    if (hasCredentials) {
      logger.warn(`[WhatsApp] ⚠️ Auth state still has credentials after cleanup for user ${userId}, but will continue`);
    } else {
      logger.info(`[WhatsApp] ✅ Auth state is empty for user ${userId}, Baileys will generate QR code`);
    }

    // Create a promise to wait for QR code
    let qrCodeResolve: ((value: string) => void) | null = null;
    let qrCodeReject: ((error: Error) => void) | null = null;
    const qrCodePromise = new Promise<string>((resolve, reject) => {
      qrCodeResolve = resolve;
      qrCodeReject = reject;
    });

    // Fetch latest Baileys version (like in reference implementation)
    let baileysVersion: [number, number, number] | null = null;
    try {
      logger.info(`[WhatsApp] Fetching latest Baileys version for user ${userId}...`);
      const { version } = await fetchLatestBaileysVersion();
      baileysVersion = version;
      logger.info(`[WhatsApp] 📦 Baileys version: ${version.join('.')} for user ${userId}`);
    } catch (error) {
      logger.error(`[WhatsApp] Error fetching Baileys version for user ${userId}:`, error);
      // Continue without version - Baileys will use default
      logger.warn(`[WhatsApp] Continuing without explicit version for user ${userId}`);
    }

    // Create an event handler BEFORE creating the socket
    // This ensures we don't miss any events emitted immediately
    let qrCodeHandler: ((update: any) => void) | null = null;

    // Create socket for QR code ONLY
    let socket: WASocket;
    try {
      logger.info(`[WhatsApp] Creating socket for user ${userId}...`);
      const socketConfig: any = {
      auth: state,
        logger: createBaileysLogger(), // Use filtered logger to suppress non-critical decryption errors
      getMessage: async (_key: any) => {
          // Return undefined properly as a Promise
        return undefined;
      },
        // printQRInTerminal removed - deprecated, we handle QR code via connection.update event
        // Additional options to prevent connection errors
        connectTimeoutMs: 60000, // 60 seconds timeout
        defaultQueryTimeoutMs: 60000, // 60 seconds for queries
        keepAliveIntervalMs: 10000, // Keep alive every 10 seconds
        retryRequestDelayMs: 250, // Retry delay
        browser: ['Ubuntu', 'Chrome', '22.04.4'], // Browser info
      };
      
      // Add version if available (like in reference implementation)
      if (baileysVersion) {
        socketConfig.version = baileysVersion;
        logger.info(`[WhatsApp] Using explicit Baileys version ${baileysVersion.join('.')} for user ${userId}`);
      }
      
      socket = makeWASocket(socketConfig);
      logger.info(`[WhatsApp] Socket created successfully for user ${userId}`);
    } catch (error) {
      logger.error(`[WhatsApp] Error creating socket for user ${userId}:`, error);
      await updateSessionStatus(userId, { status: 'disconnected' });
      throw new Error(`Failed to create WhatsApp socket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Store socket immediately
    activeSockets.set(userId, socket);
    logger.info(`[WhatsApp] Socket stored for user ${userId}, activeSockets size: ${activeSockets.size}`);

    // Handle connection updates (QR code ONLY) - Set IMMEDIATELY after socket creation
    // Simplified logic like in reference implementation
    qrCodeHandler = async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      // Log connection updates for debugging
      if (qr || connection === 'close' || connection === 'open' || connection === 'connecting') {
        logger.info(`[WhatsApp] Connection update for user ${userId}:`, {
        connection,
        hasQR: !!qr,
        qrLength: qr?.length || 0,
          statusCode: lastDisconnect?.error?.output?.statusCode,
          error: lastDisconnect?.error?.message,
        });
      }

      // Handle QR code (like in reference implementation - simple and direct)
      if (qr) {
        try {
          logger.info(`[WhatsApp] ⭐ QR CODE RECEIVED for user: ${userId}, QR string length: ${qr.length}`);
          logger.info(`[WhatsApp] QR code string preview: ${qr.substring(0, 100)}...`);
          
          // Generate QR code image immediately
          logger.info(`[WhatsApp] Generating QR code image for user ${userId}...`);
          const qrCodeImage = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 1,
          });
          logger.info(`[WhatsApp] ✅ QR code image generated successfully, length: ${qrCodeImage.length}`);
          
          // Store in memory FIRST (before database save)
          qrCodes.set(userId, qrCodeImage);
          logger.info(`[WhatsApp] QR code stored in memory for user ${userId}`);
          
          // Save to database (non-blocking)
          updateSessionStatus(userId, {
            status: 'connecting',
            qrCode: qrCodeImage,
            pairingCode: null, // Clear pairing code when using QR code
          }).then(() => {
            logger.info(`[WhatsApp] ✅ QR code saved to database for user: ${userId}`);
          }).catch((err) => {
            logger.error(`[WhatsApp] ❌ Error saving QR code to database for user ${userId}:`, err);
            // Don't fail if database save fails, QR code is already in memory
          });
          
          // Resolve the promise with QR code IMMEDIATELY
          if (qrCodeResolve) {
            logger.info(`[WhatsApp] ✅ Resolving QR code promise for user: ${userId}`);
            qrCodeResolve(qrCodeImage);
            qrCodeResolve = null;
            qrCodeReject = null; // Clear reject to prevent double resolution
          } else {
            logger.warn(`[WhatsApp] ⚠️ QR code received but qrCodeResolve is null for user ${userId}`);
          }
        } catch (error) {
          logger.error('[WhatsApp] ❌ Error generating QR code:', error);
          if (qrCodeReject) {
            qrCodeReject(error instanceof Error ? error : new Error('Failed to generate QR code'));
            qrCodeReject = null;
            qrCodeResolve = null; // Clear resolve to prevent double rejection
          }
        }
      } else {
        // Log when QR is not present in update
        if (connection !== 'close' && connection !== 'open') {
          logger.info(`[WhatsApp] Connection update without QR code for user ${userId}:`, {
            connection,
            updateKeys: Object.keys(update),
          });
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
        const streamErrorCode = (lastDisconnect?.error as any)?.output?.statusCode || 
                                (lastDisconnect?.error as any)?.tag?.attrs?.code;
        
        // Check for conflict error (session replaced)
        const errorContent = (lastDisconnect?.error as any)?.output?.tag?.content;
        const isConflict = errorContent?.some?.((item: any) => item?.tag === 'conflict' && item?.attrs?.type === 'replaced') || 
                          errorMessage?.includes('conflict') || 
                          errorMessage?.includes('replaced');

        logger.warn(`[WhatsApp] QR code connection closed for user ${userId}:`, {
          statusCode,
          streamErrorCode,
          errorMessage,
          isConflict,
          error: lastDisconnect?.error,
        });

        // Handle conflict error (session replaced by another device)
        if (isConflict) {
          logger.warn(`[WhatsApp] ⚠️ Session conflict detected for user ${userId} - session was replaced by another device`);
          // Mark session as conflicted to prevent reconnection attempts
          conflictedSessions.add(userId);
          // Clear reconnection attempts
          reconnectionAttempts.delete(userId);
          
          try {
            // Clean up the current session
            if (socket) {
              try {
                await socket.end(undefined);
              } catch (e) {
                // Ignore errors when closing
              }
            }
            activeSockets.delete(userId);
            qrCodes.delete(userId);
            
            // Update status to disconnected
            await updateSessionStatus(userId, {
              status: 'disconnected',
              qrCode: null,
              pairingCode: null,
            }).catch((err) => {
              logger.error(`[WhatsApp] Error updating session status after conflict:`, err);
            });
            
            // Reject the promise to indicate connection failed
            if (qrCodeReject) {
              qrCodeReject(new Error('Session replaced by another device. Please disconnect the other device and try again.'));
              qrCodeReject = null;
              qrCodeResolve = null;
            }
          } catch (error) {
            logger.error(`[WhatsApp] Error handling conflict for user ${userId}:`, error);
          }
          return; // Exit early, don't try to restart
        }

        // Check if credentials were saved (pairing successful)
        const hasCredentials = state.creds && state.creds.me;
        
        // Handle stream error 515 (restart required after pairing)
        if (streamErrorCode === '515' || errorMessage?.includes('restart required') || errorMessage?.includes('Stream Errored')) {
          logger.info(`[WhatsApp] Stream error 515 detected for user ${userId} - restart required`);
          
          if (hasCredentials) {
            logger.info(`[WhatsApp] ✅ Pairing successful for user ${userId}, credentials saved. Restarting connection...`);
            // Pairing was successful, credentials are saved
            // The connection needs to be restarted with the new credentials
            // Close the current socket and restart the connection
            try {
              // Close the current socket
              if (socket) {
                await socket.end(undefined);
              }
              activeSockets.delete(userId);
              qrCodes.delete(userId);
              
              // Update status to indicate pairing was successful
              await updateSessionStatus(userId, {
                status: 'connecting', // Will be updated to 'connected' after restart
                qrCode: null,
              });
              
              // Restart the connection automatically after a short delay
              // This allows Baileys to use the saved credentials
              setTimeout(() => {
                (async () => {
                  logger.info(`[WhatsApp] 🔄 Restarting connection for user ${userId} after pairing...`);
                  try {
                  // Reconnect with saved credentials (will connect automatically)
                  // Check if credentials exist and connect directly without QR code
                  const sessionPath = getSessionPath(userId);
                  await ensureSessionFromSupabase(userId, sessionPath);
                  const { state: newState, saveCreds: newSaveCreds } = await useMultiFileAuthState(sessionPath);
                  const persistRestartCreds = async () => {
                    try {
                      await newSaveCreds();
                      await syncSessionToSupabase(userId, sessionPath);
                    } catch (error) {
                      logger.warn(`[WhatsApp] Error persisting credentials during restart for user ${userId}:`, error);
                    }
                  };
                  
                  if (newState.creds && newState.creds.me) {
                    logger.info(`[WhatsApp] ✅ Credentials found, connecting directly for user ${userId}...`);
                    
                    // Fetch latest Baileys version
                    let baileysVersion: [number, number, number] | null = null;
                    try {
                      const { version } = await fetchLatestBaileysVersion();
                      baileysVersion = version;
                    } catch (error) {
                      logger.warn(`[WhatsApp] Error fetching Baileys version for restart: ${error}`);
                    }
                    
                    // Create new socket with saved credentials
                    const socketConfig: any = {
                      auth: newState,
                      logger: createBaileysLogger(),
                      getMessage: async (_key: any) => undefined,
                      connectTimeoutMs: 60000,
                      defaultQueryTimeoutMs: 60000,
                      keepAliveIntervalMs: 10000,
                      retryRequestDelayMs: 250,
                      browser: ['Ubuntu', 'Chrome', '22.04.4'],
                    };
                    
                    if (baileysVersion) {
                      socketConfig.version = baileysVersion;
                    }
                    
                    const newSocket = makeWASocket(socketConfig);
                    activeSockets.set(userId, newSocket);
                    
                    // Save credentials when updated
                    newSocket.ev.on('creds.update', persistRestartCreds);
                    
                    // Handle connection updates
                    newSocket.ev.on('connection.update', async (update: any) => {
                      try {
                        const { connection } = update;
                        
                        if (connection === 'open') {
                          logger.info(`[WhatsApp] ✅ Successfully reconnected after pairing for user ${userId}`);
                          await updateSessionStatus(userId, {
                            status: 'connected',
                            qrCode: null,
                            connectedAt: new Date(),
                            lastSeen: new Date(),
                          }).catch((err) => {
                            logger.error(`[WhatsApp] Error updating session status after reconnect:`, err);
                          });
                          
                          // Setup message listeners for reconnected socket
                          setupMessageListeners(userId, newSocket);
                          
                          // Setup keep-alive
                          setupKeepAlive(userId, newSocket);
                          
                          // Start connection health monitoring
                          startConnectionHealthMonitor(userId, newSocket);
                          
                          // Cancel any scheduled reconnections
                          cancelScheduledReconnection(userId);
                        } else if (connection === 'close') {
                          const statusCode = (update.lastDisconnect?.error as any)?.output?.statusCode;
                          logger.warn(`[WhatsApp] Reconnection closed for user ${userId}:`, { statusCode });
                        }
                      } catch (error) {
                        logger.error(`[WhatsApp] Error in connection.update handler during restart for user ${userId}:`, error);
                      }
                    });
                  } else {
                    logger.warn(`[WhatsApp] No credentials found for restart, user ${userId}`);
                    await updateSessionStatus(userId, {
                      status: 'disconnected',
                      qrCode: null,
                    });
                  }
                } catch (error) {
                  logger.error(`[WhatsApp] Error restarting connection for user ${userId}:`, error);
                  await updateSessionStatus(userId, {
                    status: 'disconnected',
                    qrCode: null,
                  });
                }
                })().catch((error) => {
                  logger.error(`[WhatsApp] Unhandled error in restart timeout for user ${userId}:`, error);
                });
              }, 2000); // Wait 2 seconds before restarting
              
              // Resolve the promise since pairing was successful
              if (qrCodeResolve) {
                qrCodeResolve(''); // Empty string indicates pairing successful, connection will restart
                qrCodeResolve = null;
                qrCodeReject = null;
              }
            } catch (error) {
              logger.error(`[WhatsApp] Error handling restart for user ${userId}:`, error);
            }
            return; // Exit early, restart will happen automatically
          } else {
            logger.warn(`[WhatsApp] Stream error 515 but no credentials found for user ${userId}`);
          }
        }

        // Handle different disconnect reasons
        if (statusCode === DisconnectReason.loggedOut) {
          await updateSessionStatus(userId, {
            status: 'disconnected',
            qrCode: null,
          });
          await removeSessionFromSupabase(userId);
          await deleteLocalSessionDirectory(sessionPath);
          activeSockets.delete(userId);
          qrCodes.delete(userId);
          
          // Reject promise if QR code wasn't generated
          if (qrCodeReject) {
            qrCodeReject(new Error('Connection closed: Logged out'));
            qrCodeReject = null;
          }
        } else if (statusCode === DisconnectReason.restartRequired) {
          logger.info(`[WhatsApp] Restart required for user ${userId} - this is normal after pairing`);
          // Restart required is normal after pairing - don't treat as error
          if (hasCredentials) {
            logger.info(`[WhatsApp] ✅ Credentials present, restart will happen automatically for user ${userId}`);
            // Don't reject - the restart will happen
            return;
          }
        } else if (statusCode === DisconnectReason.connectionClosed || statusCode === 405) {
          // Connection closed or method not allowed - might be temporary
          logger.warn(`[WhatsApp] Connection closed with status ${statusCode}, will retry if needed`);
          
          // Stop health monitoring and keep-alive
          stopConnectionHealthMonitor(userId);
          stopKeepAlive(userId);
          
          // If QR code was already generated, don't reject - it's safe in memory
          if (qrCodes.has(userId)) {
            logger.info(`[WhatsApp] QR code already generated, ignoring connection close for user ${userId}`);
            // Don't delete the socket or QR code, keep them available
            return; // Don't process further, QR code is available
          }
          
          // If QR code wasn't generated yet, don't reject immediately
          // The QR code might still be generated even after disconnection
          // Wait for the timeout in the main function to handle this
          logger.info(`[WhatsApp] Connection closed but QR code not yet generated, will continue waiting for user ${userId}`);
          
          // Don't reject the promise here - let the timeout handle it
          // This allows the QR code to be generated even if connection closes
        } else {
          // Other disconnect reasons - schedule automatic reconnection if credentials exist
          logger.warn(`[WhatsApp] Connection closed for user ${userId} with status ${statusCode}, scheduling reconnection`);
          
          // Stop health monitoring and keep-alive
          stopConnectionHealthMonitor(userId);
          stopKeepAlive(userId);
          
          // Check if credentials exist - if so, schedule reconnection
          const sessionPath = getSessionPath(userId);
          try {
            await ensureSessionFromSupabase(userId, sessionPath);
            const { state } = await useMultiFileAuthState(sessionPath);
            if (state.creds && state.creds.me) {
              logger.info(`[WhatsApp] Credentials exist for user ${userId}, scheduling automatic reconnection`);
              scheduleReconnection(userId);
            }
          } catch (error) {
            logger.debug(`[WhatsApp] Could not check credentials for reconnection:`, error);
          }
          
          // Update status to disconnected
          await updateSessionStatus(userId, {
            status: 'disconnected',
            qrCode: null,
          }).catch((err) => {
            logger.error(`[WhatsApp] Error updating session status:`, err);
          });
          
          if (qrCodeReject) {
            qrCodeReject(new Error(`Connection closed: ${errorMessage} (${statusCode})`));
            qrCodeReject = null;
            qrCodeResolve = null;
          }
        }
      } else if (connection === 'open') {
        logger.info(`[WhatsApp] WhatsApp connected via QR code for user: ${userId}`);
        await updateSessionStatus(userId, {
          status: 'connected',
          qrCode: null,
          connectedAt: new Date(),
          lastSeen: new Date(),
        });
        activeSockets.set(userId, socket);
        qrCodes.delete(userId);
        
        // Setup message listeners for connected socket
        setupMessageListeners(userId, socket);
        
        // Setup keep-alive to maintain bot presence as "online"
        setupKeepAlive(userId, socket);
        
        // Start connection health monitoring
        startConnectionHealthMonitor(userId, socket);
        
        // Cancel any scheduled reconnections since we're now connected
        cancelScheduledReconnection(userId);
        
        // Resolve with empty string if connected without QR (already connected)
        if (qrCodeResolve) {
          qrCodeResolve('');
          qrCodeResolve = null;
        }
      }
    };
    
    // Attach handler IMMEDIATELY - use 'on' to catch all events
    logger.info(`[WhatsApp] Attaching connection.update handler for user ${userId}`);
    socket.ev.on('connection.update', qrCodeHandler);

    // Also listen for 'creds.update' to save credentials and detect pairing success
    socket.ev.on('creds.update', async () => {
      try {
        logger.info(`[WhatsApp] ✅ Credentials updated for user ${userId} - pairing successful`);
        await persistCreds();
        // Check if credentials were saved successfully
        const hasCredentials = state.creds && state.creds.me;
        if (hasCredentials) {
          logger.info(`[WhatsApp] ✅ Pairing successful for user ${userId}, credentials saved. Connection will restart automatically.`);
          // Update status to indicate pairing was successful
          await updateSessionStatus(userId, {
            status: 'connecting', // Will be updated to 'connected' after restart
            qrCode: null,
          }).catch((err) => {
            logger.error(`[WhatsApp] Error updating session status after creds.update:`, err);
          });
        }
      } catch (error) {
        logger.error(`[WhatsApp] Error in creds.update handler for user ${userId}:`, error);
      }
    });
    
    // Check if QR code was already emitted (can happen synchronously)
    // This is a safety check in case the event was emitted before the listener was attached
    logger.info(`[WhatsApp] Setting up safety check for QR code for user ${userId}`);
    setTimeout(() => {
      // Check if we already have a QR code in memory (from a synchronous event)
      const existingQrCode = qrCodes.get(userId);
      logger.info(`[WhatsApp] Safety check after 100ms for user ${userId}:`, {
        hasQRCode: !!existingQrCode,
        qrCodeLength: existingQrCode?.length || 0,
        hasResolve: !!qrCodeResolve,
      });
      if (existingQrCode && qrCodeResolve) {
        logger.info(`[WhatsApp] QR code found immediately after socket creation for user ${userId}`);
        qrCodeResolve(existingQrCode);
        qrCodeResolve = null;
        qrCodeReject = null;
      }
    }, 100); // Check after 100ms

    // Wait for QR code generation with timeout (60 seconds)
    // Give more time for QR code generation, especially if connection is unstable
    logger.info(`[WhatsApp] Waiting for QR code generation for user: ${userId}`);
    
    let finalQrCode = '';
    let qrCodeReceived = false;
    
    // Poll for QR code in memory and database while waiting
    const pollInterval = setInterval(() => {
      const storedQrCode = qrCodes.get(userId);
      if (storedQrCode && !qrCodeReceived) {
        logger.info(`[WhatsApp] QR code found in memory during polling for user ${userId}`);
        qrCodeReceived = true;
        if (qrCodeResolve) {
          qrCodeResolve(storedQrCode);
          qrCodeResolve = null;
          qrCodeReject = null;
        }
      }
    }, 1000); // Check every second
    
    try {
      // Wait for QR code with longer timeout (60 seconds)
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => {
          reject(new Error('QR code generation timeout'));
        }, 60000); // 60 seconds timeout - increased from 30
      });

      finalQrCode = await Promise.race([qrCodePromise, timeoutPromise]);
      qrCodeReceived = true;
      logger.info(`[WhatsApp] QR code received for user ${userId}, length: ${finalQrCode.length}`);
    } catch (error) {
      logger.warn(`[WhatsApp] QR code not generated within timeout for user ${userId}:`, error);
      
      // Check if QR code was already stored in memory or database
      const storedQrCode = qrCodes.get(userId);
      if (storedQrCode) {
        finalQrCode = storedQrCode;
        qrCodeReceived = true;
        logger.info(`[WhatsApp] Using stored QR code from memory for user ${userId}`);
      } else {
        // Check database as fallback
        const { data: sessionData } = await supabase
      .from('whatsapp_sessions')
      .select('qr_code, status')
      .eq('user_id', userId)
      .single();
    
        if (sessionData?.qr_code) {
          finalQrCode = sessionData.qr_code;
          qrCodeReceived = true;
          logger.info(`[WhatsApp] Using stored QR code from database for user ${userId}`);
        } else {
          logger.warn(`[WhatsApp] No QR code available for user ${userId}`);
          // Check if socket is still active - if not, there might be a connection issue
          if (!activeSockets.has(userId)) {
            logger.warn(`[WhatsApp] Socket is not active for user ${userId}, connection may have failed`);
          }
        }
      }
    } finally {
      // Clear polling interval
      clearInterval(pollInterval);
    }

    logger.info(`[WhatsApp] Final QR code for user ${userId}:`, {
      hasQRCode: !!finalQrCode,
      qrCodeLength: finalQrCode.length,
    });

    return {
      qrCode: finalQrCode,
      sessionId: session.sessionId,
    };
  } catch (error) {
    logger.error('Error connecting WhatsApp:', error);
    await updateSessionStatus(userId, { status: 'disconnected' });
    throw new Error('Failed to connect WhatsApp');
  }
};

/**
 * Connect WhatsApp and generate pairing code (alternative to QR code)
 * Note: Baileys doesn't directly support forcing pairing code generation.
 * This function waits for WhatsApp to generate a pairing code automatically
 * when QR code is not available or when certain conditions are met.
 */
export const connectWhatsAppWithPairingCode = async (userId: string, phoneNumber?: string): Promise<{ pairingCode: string; sessionId: string }> => {
  try {
    // Clear conflict status when user manually tries to connect
    conflictedSessions.delete(userId);
    reconnectionAttempts.delete(userId);
    
    // Get or create session
    const session = await getOrCreateSession(userId);

    // If already connected, refuse to generate pairing code to protect existing session
    if (session.status === 'connected' && activeSockets.has(userId)) {
      const socket = activeSockets.get(userId);
      if (socket?.user) {
        logger.warn(`[WhatsApp] User ${userId} already connected, cannot generate pairing code (would delete existing session)`);
        throw new Error('Vous êtes déjà connecté à WhatsApp. Veuillez vous déconnecter d\'abord si vous souhaitez vous reconnecter avec un code de couplage.');
      }
    }

    // If already connecting and has pairing code, return it
    if (session.status === 'connecting' && session.pairingCode) {
      logger.info(`[WhatsApp] User ${userId} already connecting with pairing code, returning existing pairing code`);
      return {
        pairingCode: session.pairingCode,
        sessionId: session.sessionId,
      };
    }

    // Disconnect any existing socket first
    if (activeSockets.has(userId)) {
      const existingSocket = activeSockets.get(userId);
      if (existingSocket) {
        logger.info(`[WhatsApp] Disconnecting existing socket for pairing code, user: ${userId}`);
        try {
          await existingSocket.end(undefined);
        } catch (error) {
          logger.warn(`[WhatsApp] Error disconnecting existing socket: ${error}`);
        }
        activeSockets.delete(userId);
        qrCodes.delete(userId);
        pairingCodes.delete(userId);
      }
    }

    // Update status to connecting
    await updateSessionStatus(userId, { status: 'connecting', qrCode: null, pairingCode: null });

    // Get session path
    const sessionPath = getSessionPath(userId);

    // Ensure we have the latest session files from Supabase if available
    await ensureSessionFromSupabase(userId, sessionPath);

    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const persistCreds = async () => {
      try {
        await saveCreds();
        await syncSessionToSupabase(userId, sessionPath);
      } catch (error) {
        logger.warn(`[WhatsApp] Error persisting credentials (pairing) for user ${userId}:`, error);
      }
    };

    // Fetch latest Baileys version (like in reference implementation)
    let baileysVersion: [number, number, number] | null = null;
    try {
      logger.info(`[WhatsApp] Fetching latest Baileys version for pairing code, user ${userId}...`);
      const { version } = await fetchLatestBaileysVersion();
      baileysVersion = version;
      logger.info(`[WhatsApp] 📦 Baileys version: ${version.join('.')} for pairing code, user ${userId}`);
    } catch (error) {
      logger.error(`[WhatsApp] Error fetching Baileys version for pairing code, user ${userId}:`, error);
      // Continue without version - Baileys will use default
      logger.warn(`[WhatsApp] Continuing without explicit version for pairing code, user ${userId}`);
    }

    // Create a promise to wait for pairing code
    let pairingCodeResolve: ((value: string) => void) | null = null;
    let pairingCodeReject: ((error: Error) => void) | null = null;
    const pairingCodePromise = new Promise<string>((resolve, reject) => {
      pairingCodeResolve = resolve;
      pairingCodeReject = reject;
    });

    // Create an event handler BEFORE creating the socket
    let pairingCodeHandler: ((update: any) => Promise<void>) | null = null;

    // Create socket - WhatsApp will generate pairing code automatically in certain conditions
    // We listen for pairing code in connection.update event
    // Inspired by reference code: Baileys generates pairing code automatically, we just need to detect it
    let socket: WASocket;
    try {
      const socketConfig: any = {
      auth: state,
        logger: createBaileysLogger(), // Use filtered logger to suppress non-critical decryption errors
      getMessage: async (_key: any) => {
          // Return undefined properly as a Promise
        return undefined;
      },
        // Additional options to prevent connection errors
        connectTimeoutMs: 60000, // 60 seconds timeout
        defaultQueryTimeoutMs: 60000, // 60 seconds for queries
        keepAliveIntervalMs: 10000, // Keep alive every 10 seconds
        retryRequestDelayMs: 250, // Retry delay
        browser: ['Ubuntu', 'Chrome', '22.04.4'], // Browser info
        // Options that might help with pairing code generation
        markOnlineOnConnect: false, // Don't mark online immediately
        syncFullHistory: false, // Don't sync full history
      };
      
      // Add version if available (like in reference implementation)
      if (baileysVersion) {
        socketConfig.version = baileysVersion;
        logger.info(`[WhatsApp] Using explicit Baileys version ${baileysVersion.join('.')} for pairing code, user ${userId}`);
      }
      
      logger.info(`[WhatsApp] Creating socket for pairing code generation, user ${userId}`);
      socket = makeWASocket(socketConfig);
      logger.info(`[WhatsApp] Socket created for pairing code, user ${userId}`);
    } catch (error) {
      logger.error(`[WhatsApp] Error creating socket for pairing code for user ${userId}:`, error);
      await updateSessionStatus(userId, { status: 'disconnected' });
      throw new Error(`Failed to create WhatsApp socket: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Store socket immediately
    activeSockets.set(userId, socket);

    // Check if already registered (inspired by reference code)
    const socketAny = socket as any;
    const isRegistered = socketAny.authState?.creds?.registered;
    
    if (isRegistered) {
      logger.warn(`[WhatsApp] Account already registered for user ${userId}, cannot generate pairing code`);
      await updateSessionStatus(userId, { status: 'disconnected' });
      activeSockets.delete(userId);
      throw new Error('Compte déjà connecté. Veuillez vous déconnecter d\'abord.');
    }

    // Define comprehensive connection handler BEFORE requesting pairing code
    // This ensures we catch all connection events, including errors
    pairingCodeHandler = async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle successful connection
      if (connection === 'open') {
        logger.info(`[WhatsApp] ✅ WhatsApp connected via pairing code for user: ${userId}`);
        await updateSessionStatus(userId, {
          status: 'connected',
          pairingCode: null,
          connectedAt: new Date(),
          lastSeen: new Date(),
        });
        activeSockets.set(userId, socket);
        pairingCodes.delete(userId);
        
        // Setup message listeners for connected socket
        setupMessageListeners(userId, socket);
        
        // Setup keep-alive to maintain bot presence as "online"
        setupKeepAlive(userId, socket);
        
        // Start connection health monitoring
        startConnectionHealthMonitor(userId, socket);
        
        // Cancel any scheduled reconnections
        cancelScheduledReconnection(userId);
        return;
      }

      // Handle connection errors
      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
        const streamErrorCode = (lastDisconnect?.error as any)?.output?.statusCode || 
                                (lastDisconnect?.error as any)?.tag?.attrs?.code;
        
        // Check for conflict error (session replaced)
        const errorContent = (lastDisconnect?.error as any)?.output?.tag?.content;
        const isConflict = errorContent?.some?.((item: any) => item?.tag === 'conflict' && item?.attrs?.type === 'replaced') || 
                          errorMessage?.includes('conflict') || 
                          errorMessage?.includes('replaced');
        
        logger.warn(`[WhatsApp] Pairing code connection closed for user ${userId}:`, {
          statusCode,
          streamErrorCode,
          errorMessage,
          isConflict,
        });

        // Handle conflict error (session replaced by another device)
        if (isConflict) {
          logger.warn(`[WhatsApp] ⚠️ Session conflict detected for pairing code, user ${userId} - session was replaced by another device`);
          conflictedSessions.add(userId);
          reconnectionAttempts.delete(userId);
          
          try {
            if (socket) {
              try {
                await socket.end(undefined);
              } catch (e) {
                // Ignore errors when closing
              }
            }
            activeSockets.delete(userId);
            pairingCodes.delete(userId);
            
            await updateSessionStatus(userId, {
              status: 'disconnected',
              qrCode: null,
              pairingCode: null,
            }).catch((err) => {
              logger.error(`[WhatsApp] Error updating session status after conflict (pairing code):`, err);
            });
            
            if (pairingCodeReject) {
              pairingCodeReject(new Error('Session replaced by another device. Please disconnect the other device and try again.'));
              pairingCodeReject = null;
              pairingCodeResolve = null;
            }
          } catch (error) {
            logger.error(`[WhatsApp] Error handling conflict (pairing code) for user ${userId}:`, error);
          }
          return;
        }

        // Check if credentials were saved (pairing successful)
        const hasCredentials = state.creds && state.creds.me;
        
        // Handle stream error 515 (restart required after pairing)
        if (streamErrorCode === '515' || errorMessage?.includes('restart required') || errorMessage?.includes('Stream Errored')) {
          logger.info(`[WhatsApp] Stream error 515 detected for pairing code, user ${userId} - restart required`);
          
          if (hasCredentials) {
            logger.info(`[WhatsApp] ✅ Pairing successful for user ${userId}, credentials saved. Restarting connection...`);
            await updateSessionStatus(userId, {
              status: 'connecting', // Will be updated to 'connected' after restart
              pairingCode: null, // Clear pairing code after successful pairing
            }).catch((err) => {
              logger.error(`[WhatsApp] Error updating session status after stream error 515 (pairing code):`, err);
            });
            return; // Exit early, let the restart logic handle it
          } else {
            logger.warn(`[WhatsApp] Stream error 515 but no credentials found for pairing code, user ${userId}`);
          }
        }

        // Handle different disconnect reasons
        if (statusCode === DisconnectReason.loggedOut) {
          logger.warn(`[WhatsApp] User ${userId} logged out during pairing`);
          await updateSessionStatus(userId, {
            status: 'disconnected',
            pairingCode: null,
          });
          await removeSessionFromSupabase(userId);
          await deleteLocalSessionDirectory(sessionPath);
          activeSockets.delete(userId);
          pairingCodes.delete(userId);
          
          if (pairingCodeReject) {
            pairingCodeReject(new Error('Connection closed: Logged out'));
            pairingCodeReject = null;
          }
        } else if (statusCode === DisconnectReason.restartRequired) {
          // Restart required is normal after pairing - credentials should be saved
          logger.info(`[WhatsApp] Restart required after pairing for user ${userId} - this is normal`);
          if (hasCredentials) {
            logger.info(`[WhatsApp] ✅ Credentials saved, connection will restart automatically for user ${userId}`);
            return; // Don't update status - let the restart handle it
          }
        } else if (statusCode === DisconnectReason.connectionClosed || statusCode === 405) {
          // Connection closed - might be temporary, but log it
          logger.warn(`[WhatsApp] Connection closed during pairing for user ${userId} (status: ${statusCode})`);
          // Don't update status immediately - might reconnect
        } else {
          // Other errors
          logger.error(`[WhatsApp] Connection error during pairing for user ${userId}: ${errorMessage} (${statusCode})`);
          await updateSessionStatus(userId, {
            status: 'disconnected',
            pairingCode: null,
          }).catch(() => {});
          
          if (pairingCodeReject) {
            pairingCodeReject(new Error(`Connection closed: ${errorMessage} (${statusCode})`));
            pairingCodeReject = null;
          }
        }
      }
    };

    // Attach handler IMMEDIATELY - before requesting pairing code
    // This ensures we catch all connection events
    logger.info(`[WhatsApp] Attaching connection handler BEFORE requesting pairing code, user ${userId}`);
    socket.ev.on('connection.update', pairingCodeHandler);

    // Also listen for credentials update to detect successful pairing
    socket.ev.on('creds.update', async () => {
      try {
        logger.info(`[WhatsApp] ✅ Credentials updated during pairing for user ${userId}`);
        await persistCreds();
      } catch (error) {
        logger.error(`[WhatsApp] Error in creds.update handler (pairing) for user ${userId}:`, error);
      }
    });

    // If phone number is provided, request pairing code directly (inspired by reference code)
    if (phoneNumber) {
      try {
        // Clean phone number: remove +, spaces, and other non-numeric characters
        const cleanPhoneNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        if (!cleanPhoneNumber || cleanPhoneNumber.length < 8) {
          throw new Error('Numéro de téléphone invalide. Format attendu: +XX XXXX XXXX ou XXXXXXXXXX');
        }

        logger.info(`[WhatsApp] Requesting pairing code for phone number: ${cleanPhoneNumber}, user: ${userId}`);
        
        // Request pairing code using Baileys method (improved in 6.7.21)
        // Wait a bit for socket to be ready (increased wait time for better reliability)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check socket readiness before requesting pairing code
        const socketAny = socket as any;
        if (socketAny.ws && socketAny.ws.readyState !== 1) {
          logger.info(`[WhatsApp] Waiting for socket to be ready, current state: ${socketAny.ws.readyState}, user: ${userId}`);
          // Wait additional time if socket is not ready
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const pairingCode = await socket.requestPairingCode(cleanPhoneNumber);
        
        logger.info(`[WhatsApp] ✅ Pairing code generated via requestPairingCode for user ${userId}, code: ${pairingCode}`);
        
        // Store pairing code immediately
        pairingCodes.set(userId, pairingCode);
        
        // Save to database
        await updateSessionStatus(userId, {
          status: 'connecting',
          pairingCode: pairingCode,
          qrCode: null,
        });
        
        // Resolve promise immediately
        if (pairingCodeResolve) {
          (pairingCodeResolve as (value: string) => void)(pairingCode);
          pairingCodeResolve = null;
        }
        
        // Return pairing code immediately
        // The connection handler is already attached and will handle the connection
        return {
          pairingCode: pairingCode,
          sessionId: session.sessionId,
        };
      } catch (error: any) {
        logger.error(`[WhatsApp] Error requesting pairing code for user ${userId}:`, error);
        
        // If error is about already registered, throw it
        if (error?.message?.includes('registered') || error?.message?.includes('déjà connecté')) {
          await updateSessionStatus(userId, { status: 'disconnected' });
          activeSockets.delete(userId);
          throw new Error('Compte déjà connecté. Veuillez vous déconnecter d\'abord.');
        }
        
        // If requestPairingCode fails, fall back to waiting for automatic generation
        logger.warn(`[WhatsApp] Falling back to automatic pairing code detection for user ${userId}`);
      }
    }

    // Handle connection updates for pairing code (fallback - only if phoneNumber not provided)
    // If phoneNumber was provided, handler is already defined and attached above
    if (!phoneNumber && !pairingCodeHandler) {
      pairingCodeHandler = async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      // DEBUG: Log all update keys to detect pairing code (inspired by reference code)
      const updateKeys = Object.keys(update);
      logger.info(`[WhatsApp] Pairing code connection update for user ${userId}:`, {
        connection,
        hasQR: !!qr,
        updateKeys: updateKeys.join(', '),
        updateKeysCount: updateKeys.length,
      });

      // Check for pairing code in multiple possible keys (inspired by reference code)
      const possiblePairCodeKeys = [
        'pairingCode',
        'pairingCodeNumber',
        'pairCode',
        'pair_code',
        'numericCode',
        'numeric_code',
        'devicePairingCode',
        'device_pairing_code',
        'pairing_code',
      ];

      let detectedPairingCode: string | null = null;
      let detectedKey: string | null = null;

      // First, check the standard pairingCode property
      if (update.pairingCode) {
        detectedPairingCode = update.pairingCode;
        detectedKey = 'pairingCode';
      } else {
        // Check all possible keys
        for (const key of possiblePairCodeKeys) {
          if (update[key]) {
            detectedPairingCode = update[key];
            detectedKey = key;
            logger.info(`[WhatsApp] 🔍 Pairing code found in key '${key}' for user ${userId}`);
            break;
          }
        }
      }

      // Also check nested objects
      if (!detectedPairingCode && update.pairing) {
        if (typeof update.pairing === 'object') {
          for (const key of possiblePairCodeKeys) {
            if (update.pairing[key]) {
              detectedPairingCode = update.pairing[key];
              detectedKey = `pairing.${key}`;
              logger.info(`[WhatsApp] 🔍 Pairing code found in nested 'pairing.${key}' for user ${userId}`);
              break;
            }
          }
        } else if (typeof update.pairing === 'string') {
          detectedPairingCode = update.pairing;
          detectedKey = 'pairing';
        }
      }

      // Handle pairing code if detected
      if (detectedPairingCode) {
        logger.info(`[WhatsApp] ✅ Pairing code detected for user: ${userId}, code: ${detectedPairingCode}, found in: ${detectedKey}`);
        try {
          pairingCodes.set(userId, detectedPairingCode);
          logger.info(`[WhatsApp] Pairing code stored in memory for user: ${userId}, code: ${detectedPairingCode}`);
          
          await updateSessionStatus(userId, {
            status: 'connecting',
            pairingCode: detectedPairingCode,
            qrCode: null, // Clear QR code when using pairing code
          });
          logger.info(`[WhatsApp] Pairing code saved to database for user: ${userId}, code: ${detectedPairingCode}`);
          
          // Resolve the promise with pairing code
          if (pairingCodeResolve) {
            pairingCodeResolve(detectedPairingCode);
            pairingCodeResolve = null;
          }
        } catch (error) {
          logger.error('[WhatsApp] Error processing pairing code:', error);
          if (pairingCodeReject) {
            pairingCodeReject(error instanceof Error ? error : new Error('Failed to process pairing code'));
            pairingCodeReject = null;
          }
        }
        return; // Exit early if pairing code found
      }

      // If QR code is received but we want pairing code, log debug info
      if (qr && !detectedPairingCode) {
        logger.info(`[WhatsApp] QR code received in pairing code mode for user: ${userId}`);
        logger.info(`[WhatsApp] 🔍 DEBUG: Checking all update fields for pairing code...`);
        logger.info(`[WhatsApp] 🔍 Update keys: ${updateKeys.join(', ')}`);
        
        // Log all non-standard fields that might contain pairing code
        updateKeys.forEach(key => {
          if (!['connection', 'lastDisconnect', 'qr', 'isNewLogin'].includes(key)) {
            const value = update[key];
            if (value !== undefined && value !== null) {
              if (typeof value === 'string' && value.length > 0 && value.length < 20) {
                logger.info(`[WhatsApp] 🔍 Potential pairing code in '${key}': ${value}`);
              } else if (typeof value === 'number' && value > 0 && value < 1000000) {
                logger.info(`[WhatsApp] 🔍 Potential pairing code (number) in '${key}': ${value}`);
              }
            }
          }
        });
        
        // Wait a bit, Baileys might generate pairing code after QR
        setTimeout(async () => {
          const storedPairingCode = pairingCodes.get(userId);
          if (!storedPairingCode) {
            logger.info(`[WhatsApp] No pairing code generated after QR for user ${userId}, checking database...`);
            const { data: sessionData } = await supabase
              .from('whatsapp_sessions')
              .select('pairing_code')
              .eq('user_id', userId)
              .single();
            
            if (sessionData?.pairing_code && pairingCodeResolve) {
              logger.info(`[WhatsApp] Found pairing code in database for user ${userId}`);
              pairingCodeResolve(sessionData.pairing_code);
              pairingCodeResolve = null;
            }
          }
        }, 5000); // Wait 5 seconds after QR to check for pairing code
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
        const streamErrorCode = (lastDisconnect?.error as any)?.output?.statusCode || 
                                (lastDisconnect?.error as any)?.tag?.attrs?.code;
        
        // Check for conflict error (session replaced)
        const errorContent = (lastDisconnect?.error as any)?.output?.tag?.content;
        const isConflict = errorContent?.some?.((item: any) => item?.tag === 'conflict' && item?.attrs?.type === 'replaced') || 
                          errorMessage?.includes('conflict') || 
                          errorMessage?.includes('replaced');

        logger.warn(`[WhatsApp] Pairing code connection closed for user ${userId}:`, {
          statusCode,
          streamErrorCode,
          errorMessage,
          isConflict,
          error: lastDisconnect?.error,
        });

        // Handle conflict error (session replaced by another device)
        if (isConflict) {
          logger.warn(`[WhatsApp] ⚠️ Session conflict detected for pairing code, user ${userId} - session was replaced by another device`);
          // Mark session as conflicted to prevent reconnection attempts
          conflictedSessions.add(userId);
          // Clear reconnection attempts
          reconnectionAttempts.delete(userId);
          
          try {
            // Clean up the current session
            if (socket) {
              try {
                await socket.end(undefined);
              } catch (e) {
                // Ignore errors when closing
              }
            }
            activeSockets.delete(userId);
            pairingCodes.delete(userId);
            
            // Update status to disconnected
            await updateSessionStatus(userId, {
              status: 'disconnected',
              qrCode: null,
              pairingCode: null,
            }).catch((err) => {
              logger.error(`[WhatsApp] Error updating session status after conflict (pairing code):`, err);
            });
            
            // Reject the promise to indicate connection failed
            if (pairingCodeReject) {
              pairingCodeReject(new Error('Session replaced by another device. Please disconnect the other device and try again.'));
              pairingCodeReject = null;
              pairingCodeResolve = null;
            }
          } catch (error) {
            logger.error(`[WhatsApp] Error handling conflict (pairing code) for user ${userId}:`, error);
          }
          return; // Exit early, don't try to restart
        }

        // Check if credentials were saved (pairing successful)
        const hasCredentials = state.creds && state.creds.me;
        
        // Handle stream error 515 (restart required after pairing)
        if (streamErrorCode === '515' || errorMessage?.includes('restart required') || errorMessage?.includes('Stream Errored')) {
          logger.info(`[WhatsApp] Stream error 515 detected for pairing code, user ${userId} - restart required`);
          
          if (hasCredentials) {
            logger.info(`[WhatsApp] ✅ Pairing successful for user ${userId}, credentials saved. Restarting connection...`);
            // Pairing was successful, credentials are saved
            // The connection needs to be restarted with the new credentials
            // Don't reject - the connection will be restarted automatically
            // Update status to indicate pairing was successful
            await updateSessionStatus(userId, {
              status: 'connecting', // Will be updated to 'connected' after restart
              pairingCode: null, // Clear pairing code after successful pairing
            }).catch((err) => {
              logger.error(`[WhatsApp] Error updating session status after stream error 515 (pairing code):`, err);
            });
            // Don't delete socket or pairing code yet - let the restart happen
            return; // Exit early, let the restart logic handle it
          } else {
            logger.warn(`[WhatsApp] Stream error 515 but no credentials found for pairing code, user ${userId}`);
          }
        }

        // Handle different disconnect reasons
        if (statusCode === DisconnectReason.loggedOut) {
          await updateSessionStatus(userId, {
            status: 'disconnected',
            pairingCode: null,
          });
          await removeSessionFromSupabase(userId);
          await deleteLocalSessionDirectory(sessionPath);
          activeSockets.delete(userId);
          pairingCodes.delete(userId);
          
          // Reject promise if pairing code wasn't generated
          if (pairingCodeReject) {
            pairingCodeReject(new Error('Connection closed: Logged out'));
            pairingCodeReject = null;
          }
        } else if (statusCode === DisconnectReason.restartRequired) {
          logger.info(`[WhatsApp] Restart required for pairing code, user ${userId} - this is normal after pairing`);
          // Restart required is normal after pairing - don't treat as error
          if (hasCredentials) {
            logger.info(`[WhatsApp] ✅ Credentials present, restart will happen automatically for pairing code, user ${userId}`);
            // Don't reject - the restart will happen
            return;
          }
        } else if (statusCode === DisconnectReason.connectionClosed || statusCode === 405) {
          // Connection closed or method not allowed - might be temporary
          logger.warn(`[WhatsApp] Connection closed with status ${statusCode}, will retry if needed`);
          
          // Stop health monitoring and keep-alive
          stopConnectionHealthMonitor(userId);
          stopKeepAlive(userId);
          
          // Don't reject immediately for connection errors, might retry
          // But if pairing code wasn't generated, we should reject after timeout
          if (pairingCodeReject && !pairingCodes.has(userId)) {
            // Only reject if we've been waiting and no pairing code was generated
            setTimeout(() => {
              if (pairingCodeReject && !pairingCodes.has(userId)) {
                pairingCodeReject(new Error(`Connection error: ${errorMessage} (${statusCode})`));
                pairingCodeReject = null;
              }
            }, 5000); // Wait 5 seconds before rejecting
          }
        } else {
          // Other disconnect reasons - likely connection failure
          logger.error(`[WhatsApp] Connection failed for pairing code, user ${userId}: ${errorMessage} (${statusCode})`);
          
          // Clean up resources
          try {
            if (socket) {
              try {
                await socket.end(undefined);
              } catch (e) {
                // Ignore errors when closing
              }
            }
            activeSockets.delete(userId);
            pairingCodes.delete(userId);
          } catch (cleanupError) {
            logger.warn(`[WhatsApp] Error during cleanup after pairing failure:`, cleanupError);
          }
          
          await updateSessionStatus(userId, {
            status: 'disconnected',
            pairingCode: null,
          }).catch((err) => {
            logger.error(`[WhatsApp] Error updating status after pairing failure:`, err);
          });
          
          if (pairingCodeReject) {
            // Provide user-friendly error message
            let userMessage = 'Échec de la connexion. ';
            if (errorMessage?.includes('timeout') || errorMessage?.includes('expired')) {
              userMessage += 'Le code de couplage a peut-être expiré. Veuillez générer un nouveau code.';
            } else if (errorMessage?.includes('invalid') || errorMessage?.includes('wrong')) {
              userMessage += 'Le code de couplage est invalide. Veuillez générer un nouveau code.';
            } else {
              userMessage += 'Veuillez réessayer ou utiliser le QR Code.';
            }
            pairingCodeReject(new Error(userMessage));
            pairingCodeReject = null;
          }
        }
      } else if (connection === 'open') {
        logger.info(`[WhatsApp] WhatsApp connected via pairing code for user: ${userId}`);
        await updateSessionStatus(userId, {
          status: 'connected',
          pairingCode: null,
          connectedAt: new Date(),
          lastSeen: new Date(),
        });
        activeSockets.set(userId, socket);
        pairingCodes.delete(userId);
        
        // Setup message listeners for connected socket
        setupMessageListeners(userId, socket);
        
        // Setup keep-alive to maintain bot presence as "online"
        setupKeepAlive(userId, socket);
        
        // Start connection health monitoring
        startConnectionHealthMonitor(userId, socket);
        
        // Cancel any scheduled reconnections since we're now connected
        cancelScheduledReconnection(userId);
        
        // Resolve with empty string if connected without pairing code (already connected)
        if (pairingCodeResolve) {
          pairingCodeResolve('');
          pairingCodeResolve = null;
        }
      }
    };
    }
    
    // Attach handler if not already attached (only for fallback case without phoneNumber)
    if (!phoneNumber && pairingCodeHandler) {
      logger.info(`[WhatsApp] Attaching connection.update handler for pairing code (fallback), user ${userId}`);
    socket.ev.on('connection.update', pairingCodeHandler);
    }

    // Also add debug logging for first few connection updates (inspired by reference code)
    let debugUpdateCount = 0;
    socket.ev.on('connection.update', (update: any) => {
      if (debugUpdateCount < 3) {
        debugUpdateCount++;
        const updateKeys = Object.keys(update);
        logger.info(`[WhatsApp] 🔍 DEBUG connection.update #${debugUpdateCount} for pairing code, user ${userId}:`, {
          connection: update.connection,
          hasQR: !!update.qr,
          updateKeys: updateKeys.join(', '),
          updateKeysCount: updateKeys.length,
        });
        
        // Log any potential pairing code values
        updateKeys.forEach(key => {
          if (!['connection', 'lastDisconnect', 'qr', 'isNewLogin'].includes(key)) {
            const value = update[key];
            if (value !== undefined && value !== null) {
              // Check for numeric strings (pairing codes are usually numeric)
              if (typeof value === 'string' && /^\d{4,8}$/.test(value)) {
                logger.info(`[WhatsApp] 🔍 Potential pairing code in '${key}': ${value}`);
              } else if (typeof value === 'number' && value > 1000 && value < 100000000) {
                logger.info(`[WhatsApp] 🔍 Potential pairing code (number) in '${key}': ${value}`);
              }
            }
          }
        });
      }
    });

    // Note: creds.update handler is already attached above (line 1251) for phoneNumber case
    // This duplicate handler is removed to avoid duplicate event listeners
    
    // Check if pairing code was already emitted (can happen synchronously)
    setTimeout(() => {
      const existingPairingCode = pairingCodes.get(userId);
      if (existingPairingCode && pairingCodeResolve) {
        logger.info(`[WhatsApp] Pairing code found immediately after socket creation for user ${userId}`);
        pairingCodeResolve(existingPairingCode);
        pairingCodeResolve = null;
        pairingCodeReject = null;
      }
    }, 100); // Check after 100ms

    // Wait for pairing code generation with timeout (10 seconds initial, then return empty for polling)
    // Note: WhatsApp generates pairing code automatically, but it may take time
    // We return quickly and let the frontend poll for the pairing code
    logger.info(`[WhatsApp] Waiting for pairing code generation for user: ${userId}`);
    
    let finalPairingCode = '';
    try {
      // Wait for pairing code with shorter timeout (10 seconds)
      // If not received, return empty string and let frontend poll
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Pairing code generation timeout - will poll'));
        }, 10000); // 10 seconds initial timeout
      });

      finalPairingCode = await Promise.race([pairingCodePromise, timeoutPromise]);
      logger.info(`[WhatsApp] Pairing code received immediately for user ${userId}, code: ${finalPairingCode}`);
    } catch (error) {
      logger.info(`[WhatsApp] Pairing code not generated immediately for user ${userId}, will be available via polling`);
      
      // Check if pairing code was already stored in memory or database
      const storedPairingCode = pairingCodes.get(userId);
      if (storedPairingCode) {
        finalPairingCode = storedPairingCode;
        logger.info(`[WhatsApp] Using stored pairing code from memory for user ${userId}`);
      } else {
        // Check database as fallback
        const { data: sessionData } = await supabase
      .from('whatsapp_sessions')
      .select('pairing_code, status')
      .eq('user_id', userId)
      .single();
    
        if (sessionData?.pairing_code) {
          finalPairingCode = sessionData.pairing_code;
          logger.info(`[WhatsApp] Using stored pairing code from database for user ${userId}`);
        } else {
          // Return empty string - frontend will poll for it
          logger.info(`[WhatsApp] Pairing code not yet available for user ${userId}, frontend will poll`);
          finalPairingCode = '';
        }
      }
    }

    logger.info(`[WhatsApp] Final pairing code for user ${userId}:`, {
      hasPairingCode: !!finalPairingCode,
      pairingCodeLength: finalPairingCode.length,
    });

    return {
      pairingCode: finalPairingCode,
      sessionId: session.sessionId,
    };
  } catch (error) {
    logger.error(`[WhatsApp] Error connecting WhatsApp with pairing code for user ${userId}:`, error);
    
    // Clean up on error
    try {
      if (activeSockets.has(userId)) {
        const socket = activeSockets.get(userId);
        if (socket) {
          try {
            await socket.end(undefined);
          } catch (e) {
            // Ignore errors when closing
          }
        }
        activeSockets.delete(userId);
      }
      pairingCodes.delete(userId);
      qrCodes.delete(userId);
    } catch (cleanupError) {
      logger.warn(`[WhatsApp] Error during cleanup after pairing code error:`, cleanupError);
    }
    
    try {
      await updateSessionStatus(userId, { status: 'disconnected', pairingCode: null });
    } catch (updateError) {
      logger.warn(`[WhatsApp] Error updating status after pairing code error:`, updateError);
    }
    
    // Preserve original error message if it's a user-friendly error
    if (error instanceof Error) {
      // If it's already a user-friendly error, throw it as-is
      if (error.message.includes('déjà connecté') || 
          error.message.includes('déconnecter') ||
          error.message.includes('invalide') ||
          error.message.includes('Session replaced')) {
        throw error;
      }
      // Otherwise, wrap it with more context
      throw new Error(`Échec de la connexion WhatsApp avec code de couplage: ${error.message}`);
    }
    
    throw new Error('Échec de la connexion WhatsApp avec code de couplage. Veuillez réessayer.');
  }
};

/**
 * Get WhatsApp connection status
 */
/**
 * Check if there's recent activity indicating an active WhatsApp connection
 * This is an alternative way to detect connection status when socket is not available
 */
const checkRecentActivity = async (userId: string): Promise<{ hasRecentActivity: boolean; lastActivity?: Date }> => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Check multiple sources for recent activity:
    // 1. Check last_seen in whatsapp_sessions (updated when socket is active OR messages are received)
    // 2. Check recent messages in deleted_messages (indicates messages were received and deleted)
    // 3. Check recent status likes (indicates status processing is working)
    // 4. Check recent view_once_captures (indicates view once messages were received)
    // 5. Check recent contacts updates (indicates new contacts were added from messages)
    // 6. Check recent autoresponder activity (if available)
    
    const [sessionResult, deletedMessagesResult, statusLikesResult, viewOnceResult, contactsResult] = await Promise.all([
      // Check session last_seen
      supabase
        .from('whatsapp_sessions')
        .select('last_seen')
        .eq('user_id', userId)
        .single(),
      // Check recent deleted messages (within last 5 minutes)
      supabase
        .from('deleted_messages')
        .select('deleted_at')
        .eq('user_id', userId)
        .gte('deleted_at', fiveMinutesAgo.toISOString())
        .order('deleted_at', { ascending: false })
        .limit(1),
      // Check recent status likes (within last 5 minutes)
      supabase
        .from('status_likes')
        .select('liked_at')
        .eq('user_id', userId)
        .gte('liked_at', fiveMinutesAgo.toISOString())
        .order('liked_at', { ascending: false })
        .limit(1),
      // Check recent view_once_captures (within last 5 minutes)
      supabase
        .from('view_once_captures')
        .select('captured_at')
        .eq('user_id', userId)
        .gte('captured_at', fiveMinutesAgo.toISOString())
        .order('captured_at', { ascending: false })
        .limit(1),
      // Check recent contacts updates (within last 10 minutes - more lenient)
      supabase
        .from('contacts')
        .select('last_seen_at')
        .eq('user_id', userId)
        .gte('last_seen_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
        .order('last_seen_at', { ascending: false })
        .limit(1),
    ]);
    
    // Check if any recent activity exists
    const lastSeen = sessionResult.data?.last_seen ? new Date(sessionResult.data.last_seen) : null;
    const hasRecentSessionActivity = lastSeen && lastSeen > fiveMinutesAgo;
    
    const hasRecentDeletedMessages = deletedMessagesResult.data && deletedMessagesResult.data.length > 0;
    const hasRecentStatusLikes = statusLikesResult.data && statusLikesResult.data.length > 0;
    const hasRecentViewOnce = viewOnceResult.data && viewOnceResult.data.length > 0;
    const hasRecentContacts = contactsResult.data && contactsResult.data.length > 0;
    
    const hasRecentActivity: boolean = Boolean(hasRecentSessionActivity || hasRecentDeletedMessages || hasRecentStatusLikes || hasRecentViewOnce || hasRecentContacts);
    
    // Find the most recent activity timestamp
    let lastActivity: Date | undefined;
    if (hasRecentSessionActivity && lastSeen) {
      lastActivity = lastSeen;
    }
    if (hasRecentDeletedMessages && deletedMessagesResult.data?.[0]?.deleted_at) {
      const deletedAt = new Date(deletedMessagesResult.data[0].deleted_at);
      if (!lastActivity || deletedAt > lastActivity) {
        lastActivity = deletedAt;
      }
    }
    if (hasRecentStatusLikes && statusLikesResult.data?.[0]?.liked_at) {
      const likedAt = new Date(statusLikesResult.data[0].liked_at);
      if (!lastActivity || likedAt > lastActivity) {
        lastActivity = likedAt;
      }
    }
    if (hasRecentViewOnce && viewOnceResult.data?.[0]?.captured_at) {
      const capturedAt = new Date(viewOnceResult.data[0].captured_at);
      if (!lastActivity || capturedAt > lastActivity) {
        lastActivity = capturedAt;
      }
    }
    if (hasRecentContacts && contactsResult.data?.[0]?.last_seen_at) {
      const contactSeenAt = new Date(contactsResult.data[0].last_seen_at);
      if (!lastActivity || contactSeenAt > lastActivity) {
        lastActivity = contactSeenAt;
      }
    }
    
    logger.info(`[WhatsApp] Recent activity check for user ${userId}:`, {
      hasRecentActivity,
      hasRecentSessionActivity,
      hasRecentDeletedMessages,
      hasRecentStatusLikes,
      hasRecentViewOnce,
      hasRecentContacts,
      lastActivity: lastActivity?.toISOString(),
    });
    
    return { hasRecentActivity, lastActivity };
  } catch (error) {
    logger.error(`[WhatsApp] Error checking recent activity for user ${userId}:`, error);
    return { hasRecentActivity: false };
  }
};

export const getWhatsAppStatus = async (userId: string): Promise<{
  status: 'disconnected' | 'connecting' | 'connected';
  qrCode?: string;
  pairingCode?: string;
  connectedAt?: Date;
  lastSeen?: Date;
}> => {
  const session = await getOrCreateSession(userId);

  // Check if socket is still active and actually connected
  const socket = activeSockets.get(userId);
  let actualStatus: 'disconnected' | 'connecting' | 'connected' = session.status;
  
  // ALTERNATIVE DETECTION: Check for recent activity to detect if session is actually active
  // This is important because even if socket is not in memory, if messages are being received,
  // it means the session is active on the phone and the bot is receiving data
  const { hasRecentActivity, lastActivity } = await checkRecentActivity(userId);
  
  // Check if credentials exist
  const sessionPath = getSessionPath(userId);
  const credsPath = join(sessionPath, 'creds.json');
  const hasCredentials = existsSync(credsPath);
  
  // If socket exists and is connected, we're definitely connected
  if (socket) {
    try {
      const isActuallyConnected = socket.user && socket.user.id;
      if (isActuallyConnected) {
        const now = new Date();
        await updateSessionStatus(userId, {
          status: 'connected',
          lastSeen: now,
        });
        session.status = 'connected';
        session.lastSeen = now;
        actualStatus = 'connected';
      } else {
        logger.warn(`[WhatsApp] Socket exists but not connected for user ${userId}`);
        activeSockets.delete(userId);
        actualStatus = 'disconnected';
      }
    } catch (error) {
      logger.warn(`[WhatsApp] Socket validation failed for user ${userId}:`, error);
      activeSockets.delete(userId);
      actualStatus = 'disconnected';
    }
  }
  
  // ALTERNATIVE: If no socket but credentials exist AND recent activity, consider as connected
  // This handles the case where server restarted but session is still active on phone
  if (!socket && hasCredentials && hasRecentActivity) {
    logger.info(`[WhatsApp] ✅ No socket but recent activity detected for user ${userId}, considering as connected`);
    actualStatus = 'connected';
    
    // Update lastSeen in database with the last activity timestamp
    if (lastActivity) {
      await updateSessionStatus(userId, { 
        lastSeen: lastActivity,
        status: 'connected',
      }).catch((err) => {
        logger.error(`[WhatsApp] Error updating session status:`, err);
      });
      session.lastSeen = lastActivity;
    }
    
    // Try to reconnect in background to restore socket (but don't block)
    reconnectWhatsAppIfCredentialsExist(userId).then((reconnected) => {
      if (reconnected) {
        logger.info(`[WhatsApp] ✅ Socket restored for user ${userId}`);
      }
    }).catch((err) => {
      logger.debug(`[WhatsApp] Background reconnection for user ${userId}:`, err);
    });
  }
  // If DB says "connected" but no socket and no recent activity, check credentials
  else if (session.status === 'connected' && !socket && !hasRecentActivity) {
    logger.warn(`[WhatsApp] Session status is "connected" in DB but no socket and no recent activity for user ${userId}`);
    
    if (hasCredentials) {
      logger.info(`[WhatsApp] Credentials found for user ${userId}, attempting to reconnect...`);
      actualStatus = 'connecting';
      
      reconnectWhatsAppIfCredentialsExist(userId).then((reconnected) => {
        if (reconnected) {
          logger.info(`[WhatsApp] ✅ Successfully reconnected user ${userId}`);
        } else {
          logger.warn(`[WhatsApp] ⚠️ Failed to reconnect user ${userId}`);
        }
      }).catch((err) => {
        logger.error(`[WhatsApp] Auto-reconnect attempt for user ${userId} failed:`, err);
      });
    } else {
      logger.warn(`[WhatsApp] No credentials found for user ${userId}, marking as disconnected`);
      actualStatus = 'disconnected';
      await updateSessionStatus(userId, {
        status: 'disconnected',
      }).catch((err) => {
        logger.error(`[WhatsApp] Error updating session status for user ${userId}:`, err);
      });
    }
  }
  // If status is disconnected but credentials exist and recent activity, consider as connected
  else if (actualStatus === 'disconnected' && hasCredentials && hasRecentActivity) {
    logger.info(`[WhatsApp] ✅ Status is disconnected but recent activity detected for user ${userId}, considering as connected`);
    actualStatus = 'connected';
    
    // Update status and lastSeen
    if (lastActivity) {
      await updateSessionStatus(userId, { 
        lastSeen: lastActivity,
        status: 'connected',
      }).catch((err) => {
        logger.error(`[WhatsApp] Error updating session status:`, err);
      });
      session.lastSeen = lastActivity;
    }
    
    // Try to reconnect in background
    reconnectWhatsAppIfCredentialsExist(userId).catch((err) => {
      logger.debug(`[WhatsApp] Background reconnection for user ${userId}:`, err);
    });
  }
  // If status is disconnected but credentials exist (no recent activity), try to reconnect
  else if (actualStatus === 'disconnected' && hasCredentials && !hasRecentActivity) {
    logger.info(`[WhatsApp] Status is disconnected but credentials exist for user ${userId}, attempting to reconnect...`);
    actualStatus = 'connecting';
    
    reconnectWhatsAppIfCredentialsExist(userId).then((reconnected) => {
      if (reconnected) {
        logger.info(`[WhatsApp] ✅ Successfully reconnected user ${userId} from disconnected state`);
      } else {
        logger.debug(`[WhatsApp] Reconnection attempt for user ${userId} did not complete immediately`);
      }
    }).catch((err) => {
      logger.debug(`[WhatsApp] Reconnection attempt for user ${userId} failed:`, err);
    });
  }

  // Get QR code and pairing code if available
  const qrCode = qrCodes.get(userId) || session.qrCode;
  const pairingCode = pairingCodes.get(userId) || session.pairingCode;
  
  // Also check database
  const { data: sessionData } = await supabase
    .from('whatsapp_sessions')
    .select('qr_code, pairing_code')
    .eq('user_id', userId)
    .single();
  
  return {
    status: actualStatus,
    qrCode: qrCode || sessionData?.qr_code || undefined,
    pairingCode: pairingCode || sessionData?.pairing_code || undefined,
    connectedAt: session.connectedAt,
    lastSeen: session.lastSeen,
  };
};

/**
 * Disconnect WhatsApp
 */
export const disconnectWhatsApp = async (userId: string): Promise<void> => {
  try {
    // Stop keep-alive first
    stopKeepAlive(userId);
    
    const socket = activeSockets.get(userId);

    if (socket) {
      try {
        await socket.logout();
      } catch (error) {
        // If logout fails, try to end the connection
        logger.warn(`[WhatsApp] Logout failed for user ${userId}, trying to end connection:`, error);
        try {
          await socket.end(undefined);
        } catch (e) {
          // Ignore errors when ending connection
        }
      }
      activeSockets.delete(userId);
    }

    // Clear conflict status and reconnection attempts when user manually disconnects
    conflictedSessions.delete(userId);
    reconnectionAttempts.delete(userId);
    
    // Stop all monitoring and scheduled reconnections
    stopConnectionHealthMonitor(userId);
    stopKeepAlive(userId);
    cancelScheduledReconnection(userId);

    // Update status
    await updateSessionStatus(userId, {
      status: 'disconnected',
      qrCode: null,
      pairingCode: null,
    }).catch((err) => {
      logger.error(`[WhatsApp] Error updating session status during disconnect:`, err);
    });

    qrCodes.delete(userId);
    pairingCodes.delete(userId);

    const sessionPath = getSessionPath(userId);
    await removeSessionFromSupabase(userId);
    await deleteLocalSessionDirectory(sessionPath);

    logger.info(`[WhatsApp] WhatsApp disconnected for user: ${userId}`);
  } catch (error) {
    logger.error('Error disconnecting WhatsApp:', error);
    throw new Error('Failed to disconnect WhatsApp');
  }
};

/**
 * Get active socket for a user
 */
/**
 * Get active socket for user
 * Returns null if socket doesn't exist or is invalid
 */
export const getSocket = (userId: string): WASocket | null => {
  const socket = activeSockets.get(userId);
  
  if (!socket) {
    logger.debug(`[WhatsApp] No socket found for user ${userId}`);
    return null;
  }

  // Verify socket is valid by checking if it has the sendMessage method
  // This is a basic check - a more thorough check would require trying to use the socket
  try {
    if (typeof socket.sendMessage !== 'function') {
      logger.warn(`[WhatsApp] Socket for user ${userId} is invalid (no sendMessage method)`);
      // Remove invalid socket from map
      activeSockets.delete(userId);
      return null;
    }
  } catch (error) {
    logger.warn(`[WhatsApp] Error checking socket for user ${userId}:`, error);
    // Remove potentially invalid socket
    activeSockets.delete(userId);
    return null;
  }

  return socket;
};

/**
 * Add or update a contact in the contacts table
 * Called automatically when a message is received
 */
export const addContactIfNotExists = async (
  userId: string,
  contactId: string,
  contactName: string
): Promise<void> => {
  try {
    if (!contactId || contactId.includes('@g.us') || contactId.includes('@broadcast')) {
      return; // Skip groups and broadcasts
    }

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, contact_name')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .single();

    if (existingContact) {
      // Update last_seen_at and contact_name if it has changed
      if (existingContact.contact_name !== contactName && contactName && contactName !== contactId.split('@')[0]) {
        await supabase
          .from('contacts')
          .update({
            contact_name: contactName,
            last_seen_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('contact_id', contactId);
        logger.debug(`[WhatsApp] Updated contact ${contactId} name to ${contactName}`);
      } else {
        // Just update last_seen_at
        await supabase
          .from('contacts')
          .update({
            last_seen_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('contact_id', contactId);
      }
    } else {
      // Insert new contact
      await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          contact_id: contactId,
          contact_name: contactName || contactId.split('@')[0],
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        });
      logger.debug(`[WhatsApp] Added new contact ${contactId} (${contactName})`);
    }
  } catch (error) {
    // Log but don't throw - we don't want to break message processing
    logger.warn(`[WhatsApp] Error adding/updating contact ${contactId}:`, error);
  }
};

/**
 * Get all contacts from Baileys socket
 * Returns all contacts that are in the user's WhatsApp contact list
 */
export const getAllContactsFromSocket = async (userId: string): Promise<Array<{ contact_id: string; contact_name: string }>> => {
  try {
    const contacts: Array<{ contact_id: string; contact_name: string }> = [];
    const socket = activeSockets.get(userId);
    
    // Method 1: Try to get contacts from socket.store (if socket is available)
    if (socket) {
      try {
        // Cast socket to any to access store property (not in TypeScript types)
        const socketAny = socket as any;
        
        if (socketAny.store && typeof socketAny.store.contacts === 'object') {
          try {
            const storeContacts = socketAny.store.contacts;
            if (storeContacts && typeof storeContacts.getAll === 'function') {
              const allContacts = storeContacts.getAll();
              for (const [jid, contact] of allContacts) {
                if (jid && !jid.includes('@g.us') && !jid.includes('@broadcast')) {
                  const contactName = contact?.name || contact?.notify || jid.split('@')[0];
                  contacts.push({
                    contact_id: jid,
                    contact_name: contactName,
                  });
                }
              }
            } else if (storeContacts && typeof storeContacts === 'object') {
              // If it's a Map or object
              for (const [jid, contact] of Object.entries(storeContacts)) {
                if (jid && !jid.includes('@g.us') && !jid.includes('@broadcast')) {
                  const contactData = contact as any;
                  const contactName = contactData?.name || contactData?.notify || jid.split('@')[0];
                  contacts.push({
                    contact_id: jid,
                    contact_name: contactName,
                  });
                }
              }
            }
          } catch (error) {
            logger.warn(`[WhatsApp] Error accessing socket.store.contacts: ${error}`);
          }

          // Method 2: If store.contacts is not available, try to get from chats
          if (contacts.length === 0 && socketAny.store && typeof socketAny.store.chats === 'object') {
            try {
              const storeChats = socketAny.store.chats;
              if (storeChats && typeof storeChats.getAll === 'function') {
                const allChats = storeChats.getAll();
                const seenContacts = new Set<string>();
                
                for (const [jid, chat] of allChats) {
                  if (jid && !jid.includes('@g.us') && !jid.includes('@broadcast') && !seenContacts.has(jid)) {
                    seenContacts.add(jid);
                    const contactName = (chat as any)?.name || (chat as any)?.notify || jid.split('@')[0];
                    contacts.push({
                      contact_id: jid,
                      contact_name: contactName,
                    });
                  }
                }
              }
            } catch (error) {
              logger.warn(`[WhatsApp] Error accessing socket.store.chats: ${error}`);
            }
          }
        }
      } catch (error) {
        logger.warn(`[WhatsApp] Error accessing socket for user ${userId}: ${error}`);
      }
    } else {
      logger.info(`[WhatsApp] No active socket for user ${userId}, will use database sources only`);
    }

    // Method 3: Get contacts from contacts table (primary source)
    try {
      logger.info(`[WhatsApp] Getting contacts from contacts table for user ${userId}`);
      const { data: dbContacts } = await supabase
        .from('contacts')
        .select('contact_id, contact_name')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false });

      if (dbContacts && dbContacts.length > 0) {
        const seenContacts = new Set(contacts.map(c => c.contact_id));
        for (const contact of dbContacts) {
          if (contact.contact_id && 
              !contact.contact_id.includes('@g.us') && 
              !contact.contact_id.includes('@broadcast') &&
              !seenContacts.has(contact.contact_id)) {
            seenContacts.add(contact.contact_id);
            contacts.push({
              contact_id: contact.contact_id,
              contact_name: contact.contact_name || contact.contact_id.split('@')[0],
            });
          }
        }
        logger.info(`[WhatsApp] Added ${dbContacts.length} contacts from contacts table`);
      } else {
        // If contacts table is empty, try to get from other sources
        logger.info(`[WhatsApp] Contacts table is empty, fetching from other sources for user ${userId}`);
        
        // Method 4: Get contacts from deleted_messages
        try {
          const { data: deletedMessages } = await supabase
            .from('deleted_messages')
            .select('sender_id, sender_name')
            .eq('user_id', userId)
            .not('sender_id', 'is', null);

          if (deletedMessages && deletedMessages.length > 0) {
            const seenContacts = new Set(contacts.map(c => c.contact_id));
            for (const msg of deletedMessages) {
              if (msg.sender_id && 
                  !msg.sender_id.includes('@g.us') && 
                  !msg.sender_id.includes('@broadcast') &&
                  !seenContacts.has(msg.sender_id)) {
                seenContacts.add(msg.sender_id);
                contacts.push({
                  contact_id: msg.sender_id,
                  contact_name: msg.sender_name || msg.sender_id.split('@')[0],
                });
              }
            }
            logger.info(`[WhatsApp] Added ${deletedMessages.length} contacts from deleted_messages`);
          }
        } catch (error) {
          logger.warn(`[WhatsApp] Error getting contacts from deleted_messages: ${error}`);
        }

        // Method 5: Get contacts from view_once_captures
        try {
          const { data: viewOnceCaptures } = await supabase
            .from('view_once_captures')
            .select('sender_id, sender_name')
            .eq('user_id', userId)
            .not('sender_id', 'is', null);

          if (viewOnceCaptures && viewOnceCaptures.length > 0) {
            const seenContacts = new Set(contacts.map(c => c.contact_id));
            for (const capture of viewOnceCaptures) {
              if (capture.sender_id && 
                  !capture.sender_id.includes('@g.us') && 
                  !capture.sender_id.includes('@broadcast') &&
                  !seenContacts.has(capture.sender_id)) {
                seenContacts.add(capture.sender_id);
                contacts.push({
                  contact_id: capture.sender_id,
                  contact_name: capture.sender_name || capture.sender_id.split('@')[0],
                });
              }
            }
            logger.info(`[WhatsApp] Added ${viewOnceCaptures.length} contacts from view_once_captures`);
          }
        } catch (error) {
          logger.warn(`[WhatsApp] Error getting contacts from view_once_captures: ${error}`);
        }

        // Method 6: Get contacts from status_likes
        try {
          const { data: statusLikes } = await supabase
            .from('status_likes')
            .select('contact_id, contact_name')
            .eq('user_id', userId)
            .not('contact_id', 'is', null);

          if (statusLikes && statusLikes.length > 0) {
            const seenContacts = new Set(contacts.map(c => c.contact_id));
            for (const like of statusLikes) {
              if (like.contact_id && 
                  !like.contact_id.includes('@g.us') && 
                  !like.contact_id.includes('@broadcast') &&
                  !seenContacts.has(like.contact_id)) {
                seenContacts.add(like.contact_id);
                contacts.push({
                  contact_id: like.contact_id,
                  contact_name: like.contact_name || like.contact_id.split('@')[0],
                });
              }
            }
            logger.info(`[WhatsApp] Added ${statusLikes.length} contacts from status_likes`);
          }
        } catch (error) {
          logger.warn(`[WhatsApp] Error getting contacts from status_likes: ${error}`);
        }

        // If we found contacts from other sources, upsert them into contacts table
        if (contacts.length > 0) {
          logger.info(`[WhatsApp] Found ${contacts.length} contacts from other sources, upserting into contacts table`);
          for (const contact of contacts) {
            try {
              await supabase
                .from('contacts')
                .upsert({
                  user_id: userId,
                  contact_id: contact.contact_id,
                  contact_name: contact.contact_name,
                  first_seen_at: new Date().toISOString(),
                  last_seen_at: new Date().toISOString(),
                }, {
                  onConflict: 'user_id,contact_id',
                });
            } catch (upsertError) {
              logger.warn(`[WhatsApp] Error upserting contact ${contact.contact_id}: ${upsertError}`);
            }
          }
          logger.info(`[WhatsApp] Upserted ${contacts.length} contacts into contacts table`);
        }
      }
    } catch (error) {
      logger.warn(`[WhatsApp] Error getting contacts from contacts table: ${error}`);
    }

    // Deduplicate contacts and keep the most recent name for each contact
    const uniqueContactsMap = new Map<string, { contact_id: string; contact_name: string }>();
    for (const contact of contacts) {
      if (contact.contact_id) {
        const existing = uniqueContactsMap.get(contact.contact_id);
        // Keep the contact with the most complete name (prefer longer names)
        if (!existing || contact.contact_name.length > existing.contact_name.length) {
          uniqueContactsMap.set(contact.contact_id, contact);
        }
      }
    }

    const finalContacts = Array.from(uniqueContactsMap.values());
    logger.info(`[WhatsApp] Retrieved ${finalContacts.length} unique contacts from all sources for user ${userId}`);
    return finalContacts;
  } catch (error) {
    logger.error(`[WhatsApp] Error getting contacts from socket for user ${userId}:`, error);
    return [];
  }
};

/**
 * Like a status
 */
/**
 * Like a status and save to database
 * Note: The actual reaction is sent in handleStatusUpdate
 * This function only saves the like to the database
 */
export const likeStatus = async (
  userId: string,
  contactId: string,
  statusId: string,
  emoji: string = '❤️',
  contactName?: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<void> => {
  try {
    // Get contact name - use provided name or try to get from database
    let finalContactName = contactName;
    if (!finalContactName) {
      try {
        // Essayer de récupérer depuis la base de données (si déjà liké)
        const { data: existingLike } = await supabase
          .from('status_likes')
          .select('contact_name')
          .eq('user_id', userId)
          .eq('contact_id', contactId)
          .order('liked_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (existingLike && existingLike.contact_name && 
            existingLike.contact_name !== contactId.split('@')[0]) {
          finalContactName = existingLike.contact_name;
          logger.info(`[WhatsApp] Contact name from database: ${finalContactName}`);
        } else {
          // Extract phone number from JID (e.g., "1234567890@s.whatsapp.net" -> "1234567890")
          if (contactId.includes('@')) {
            finalContactName = contactId.split('@')[0];
          } else {
            finalContactName = contactId;
          }
        }
      } catch (error) {
        logger.warn(`[WhatsApp] Could not extract contact name from ${contactId}:`, error);
        finalContactName = contactId.includes('@') ? contactId.split('@')[0] : contactId;
      }
    }
    
    logger.info(`[WhatsApp] 💾 Saving status like: ${statusId} from ${finalContactName} (${contactId}) with emoji ${emoji}`);

    // Save to database
    const insertData: any = {
      user_id: userId,
      contact_id: contactId,
      contact_name: finalContactName,
      status_id: statusId,
      emoji_used: emoji,
      liked_at: new Date().toISOString(),
    };

    if (mediaUrl) {
      insertData.media_url = mediaUrl;
    }
    if (mediaType) {
      insertData.media_type = mediaType;
    }

    const { error } = await supabase.from('status_likes').insert(insertData);

    if (error) {
      logger.error('[WhatsApp] Error saving status like:', error);
      throw new Error('Failed to save status like');
    }

    // Mettre à jour les autres entrées avec le même contact_id si le nom a changé
    if (finalContactName && finalContactName !== contactId.split('@')[0]) {
      try {
        await supabase
          .from('status_likes')
          .update({ contact_name: finalContactName })
          .eq('user_id', userId)
          .eq('contact_id', contactId)
          .neq('contact_name', finalContactName);
        logger.info(`[WhatsApp] Updated contact names for ${contactId}`);
      } catch (updateError) {
        logger.debug(`[WhatsApp] Could not update contact names:`, updateError);
      }
    }

    logger.info(`[WhatsApp] ✅ Status like saved to database for ${finalContactName}`);

    // Envoyer une notification push
    try {
      const { sendPushNotification } = await import('./notifications.service');
      await sendPushNotification(userId, {
        title: 'Status liké',
        body: `Status de ${finalContactName} liké avec ${emoji}`,
        image: mediaUrl || undefined,
        data: {
          type: 'status_liked',
          contactId,
          contactName: finalContactName,
          statusId,
          emoji,
        },
      });
    } catch (notifError) {
      logger.warn('[WhatsApp] Failed to send push notification:', notifError);
    }
  } catch (error) {
    logger.error('[WhatsApp] Error in likeStatus:', error);
    throw error;
  }
};

// Track if listeners are already set up for a socket to avoid duplicates
const listenersSetup = new WeakSet<WASocket>();

/**
 * Setup keep-alive to maintain bot presence as "online"
 * Sends presence updates periodically to keep the bot active
 */
const setupKeepAlive = (userId: string, socket: WASocket): void => {
  // Clear any existing keep-alive interval for this user
  const existingInterval = keepAliveIntervals.get(userId);
  if (existingInterval) {
    clearInterval(existingInterval);
    keepAliveIntervals.delete(userId);
  }

  // Send initial presence update
  try {
    socket.sendPresenceUpdate('available');
    logger.info(`[WhatsApp] ✅ Initial presence update sent for user ${userId}`);
  } catch (error) {
    logger.warn(`[WhatsApp] Error sending initial presence update for user ${userId}:`, error);
  }

  // Set up periodic presence updates (every 15 seconds)
  // This keeps the bot visible as "online" on WhatsApp
  const interval = setInterval(() => {
    try {
      if (socket.user && socket.user.id) {
        socket.sendPresenceUpdate('available');
        logger.debug(`[WhatsApp] 🔄 Keep-alive presence update sent for user ${userId}`);
        
        // Also update lastSeen in database
        updateSessionStatus(userId, {
          lastSeen: new Date(),
          status: 'connected',
        }).catch((err) => {
          logger.debug(`[WhatsApp] Error updating lastSeen in keep-alive:`, err);
        });
      } else {
        logger.warn(`[WhatsApp] Socket not connected for user ${userId}, stopping keep-alive`);
        clearInterval(interval);
        keepAliveIntervals.delete(userId);
      }
    } catch (error) {
      logger.warn(`[WhatsApp] Error in keep-alive for user ${userId}:`, error);
      // If there's an error, try to clear the interval
      clearInterval(interval);
      keepAliveIntervals.delete(userId);
    }
  }, 15000); // Every 15 seconds

  keepAliveIntervals.set(userId, interval);
  logger.info(`[WhatsApp] ✅ Keep-alive started for user ${userId} (updates every 15s)`);
};

/**
 * Stop keep-alive for a user
 */
const stopKeepAlive = (userId: string): void => {
  const interval = keepAliveIntervals.get(userId);
  if (interval) {
    clearInterval(interval);
    keepAliveIntervals.delete(userId);
    logger.info(`[WhatsApp] 🛑 Keep-alive stopped for user ${userId}`);
  }
};

/**
 * Monitor connection health and trigger reconnection if needed
 */
const startConnectionHealthMonitor = (userId: string, socket: WASocket): void => {
  // Clear any existing monitor
  stopConnectionHealthMonitor(userId);

  let lastHealthCheck = Date.now();
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3;

  const monitor = setInterval(async () => {
    try {
      const currentSocket = activeSockets.get(userId);
      
      // If socket was removed, stop monitoring
      if (!currentSocket || currentSocket !== socket) {
        logger.debug(`[WhatsApp] Socket removed for user ${userId}, stopping health monitor`);
        clearInterval(monitor);
        connectionHealthMonitors.delete(userId);
        return;
      }

      // Check if socket is still valid
      if (!socket.user || !socket.user.id) {
        consecutiveFailures++;
        logger.warn(`[WhatsApp] ⚠️ Connection health check failed for user ${userId} - socket invalid (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
        
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          logger.warn(`[WhatsApp] ⚠️ Multiple consecutive health check failures for user ${userId}, triggering reconnection`);
          clearInterval(monitor);
          connectionHealthMonitors.delete(userId);
          
          // Stop keep-alive
          stopKeepAlive(userId);
          
          // Trigger reconnection
          scheduleReconnection(userId);
          return;
        }
        return;
      }

      // Try to verify connection by checking socket state
      try {
        // Try a lightweight operation to verify connection is alive
        // Check if socket has valid connection state
        const socketAny = socket as any;
        const hasValidConnection = socketAny.ws && socketAny.ws.readyState !== undefined;
        
        if (hasValidConnection) {
          // Connection appears healthy
          consecutiveFailures = 0; // Reset failure counter
          lastHealthCheck = Date.now();
          logger.debug(`[WhatsApp] Connection health check passed for user ${userId}`);
        } else {
          consecutiveFailures++;
          logger.warn(`[WhatsApp] ⚠️ Connection health check warning for user ${userId} - socket state unclear (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
          
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            logger.warn(`[WhatsApp] ⚠️ Multiple consecutive health check failures for user ${userId}, triggering reconnection`);
            clearInterval(monitor);
            connectionHealthMonitors.delete(userId);
            
            // Stop keep-alive
            stopKeepAlive(userId);
            
            // Trigger reconnection
            scheduleReconnection(userId);
            return;
          }
        }
      } catch (error) {
        consecutiveFailures++;
        logger.warn(`[WhatsApp] ⚠️ Connection health check error for user ${userId} (failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);
        
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          logger.warn(`[WhatsApp] ⚠️ Multiple consecutive health check errors for user ${userId}, triggering reconnection`);
          clearInterval(monitor);
          connectionHealthMonitors.delete(userId);
          
          // Stop keep-alive
          stopKeepAlive(userId);
          
          // Trigger reconnection
          scheduleReconnection(userId);
          return;
        }
      }
    } catch (error) {
      logger.error(`[WhatsApp] Error in connection health monitor for user ${userId}:`, error);
    }
  }, CONNECTION_HEALTH_CHECK_INTERVAL);

  connectionHealthMonitors.set(userId, monitor);
  logger.info(`[WhatsApp] ✅ Connection health monitor started for user ${userId} (checks every ${CONNECTION_HEALTH_CHECK_INTERVAL / 1000}s)`);
};

/**
 * Stop connection health monitor for a user
 */
const stopConnectionHealthMonitor = (userId: string): void => {
  const monitor = connectionHealthMonitors.get(userId);
  if (monitor) {
    clearInterval(monitor);
    connectionHealthMonitors.delete(userId);
    logger.debug(`[WhatsApp] Connection health monitor stopped for user ${userId}`);
  }
};

/**
 * Schedule a reconnection attempt with exponential backoff
 */
const scheduleReconnection = (userId: string): void => {
  // Check if already connected - don't schedule if connected
  const socket = activeSockets.get(userId);
  if (socket && socket.user && socket.user.id) {
    logger.debug(`[WhatsApp] User ${userId} already connected, skipping scheduled reconnection`);
    return;
  }

  // Clear any existing reconnection timer
  const existingTimer = reconnectionTimers.get(userId);
  if (existingTimer) {
    // Timer already exists, don't schedule another one
    logger.debug(`[WhatsApp] Reconnection already scheduled for user ${userId}, skipping duplicate`);
    return;
  }

  // Check if session has a conflict
  if (conflictedSessions.has(userId)) {
    logger.warn(`[WhatsApp] Session for user ${userId} has a conflict, skipping scheduled reconnection`);
    return;
  }

  // Get current attempt count
  const attempts = reconnectionAttempts.get(userId) || { count: 0, lastAttempt: 0 };
  const now = Date.now();

  // Check if we've exceeded max attempts
  if (attempts.count >= MAX_RECONNECTION_ATTEMPTS) {
    // Check if cooldown has passed (2x the normal cooldown for max attempts)
    if (now - attempts.lastAttempt > RECONNECTION_COOLDOWN * 2) {
      logger.info(`[WhatsApp] Extended cooldown passed for user ${userId}, resetting reconnection attempts`);
      reconnectionAttempts.delete(userId);
      // Retry after reset
      scheduleReconnection(userId);
      return;
    } else {
      logger.warn(`[WhatsApp] Max reconnection attempts reached for user ${userId}, waiting for extended cooldown`);
      return;
    }
  }

  // Check cooldown period
  if (now - attempts.lastAttempt < RECONNECTION_COOLDOWN) {
    const remainingCooldown = RECONNECTION_COOLDOWN - (now - attempts.lastAttempt);
    logger.debug(`[WhatsApp] Reconnection cooldown active for user ${userId}, waiting ${Math.round(remainingCooldown / 1000)}s more`);
    // Schedule after cooldown
    const timer = setTimeout(() => {
      reconnectionTimers.delete(userId);
      scheduleReconnection(userId);
    }, remainingCooldown);
    reconnectionTimers.set(userId, timer);
    return;
  }

  // Calculate delay with exponential backoff
  const baseDelay = INITIAL_RECONNECTION_DELAY;
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempts.count),
    MAX_RECONNECTION_DELAY
  );
  const jitter = Math.random() * 1000; // Add random jitter (0-1s) to prevent thundering herd
  const delay = exponentialDelay + jitter;

  logger.info(`[WhatsApp] 🔄 Scheduling reconnection for user ${userId} in ${Math.round(delay / 1000)}s (attempt ${attempts.count + 1}/${MAX_RECONNECTION_ATTEMPTS})`);

  const timer = setTimeout(async () => {
    reconnectionTimers.delete(userId);
    
    // Double-check if already connected (might have connected during delay)
    const currentSocket = activeSockets.get(userId);
    if (currentSocket && currentSocket.user && currentSocket.user.id) {
      logger.info(`[WhatsApp] User ${userId} already connected, cancelling scheduled reconnection`);
      reconnectionAttempts.delete(userId);
      return;
    }

    // Update attempt count
    reconnectionAttempts.set(userId, {
      count: attempts.count + 1,
      lastAttempt: Date.now(),
    });

    // Attempt reconnection
    try {
      logger.info(`[WhatsApp] 🔄 Attempting scheduled reconnection for user ${userId}...`);
      const reconnected = await reconnectWhatsAppIfCredentialsExist(userId);
      
      if (reconnected) {
        logger.info(`[WhatsApp] ✅ Scheduled reconnection successful for user ${userId}`);
        reconnectionAttempts.delete(userId);
      } else {
        logger.warn(`[WhatsApp] ⚠️ Scheduled reconnection failed for user ${userId}, will retry`);
        // Schedule another attempt only if not conflicted
        if (!conflictedSessions.has(userId)) {
          scheduleReconnection(userId);
        }
      }
    } catch (error) {
      logger.error(`[WhatsApp] Error during scheduled reconnection for user ${userId}:`, error);
      // Schedule another attempt only if not conflicted
      if (!conflictedSessions.has(userId)) {
        scheduleReconnection(userId);
      }
    }
  }, delay);

  reconnectionTimers.set(userId, timer);
};

/**
 * Cancel any scheduled reconnection for a user
 */
const cancelScheduledReconnection = (userId: string): void => {
  const timer = reconnectionTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    reconnectionTimers.delete(userId);
    logger.debug(`[WhatsApp] Cancelled scheduled reconnection for user ${userId}`);
  }
};

/**
 * Process and store a status message (inspired by reference code)
 */
const processAndStoreStatus = async (userId: string, socket: WASocket, message: any): Promise<void> => {
  try {
    const statusId = message.key?.id;
    if (!statusId) {
      logger.warn(`[WhatsApp] Status message without ID for user ${userId}`);
      return;
    }

    // Get contact ID from participant (the person who posted the status)
    const contactId = message.key.participant || message.key.remoteJid;
    if (!contactId || contactId === 'status@broadcast') {
      logger.warn(`[WhatsApp] Status without valid contact ID for user ${userId}`);
      return;
    }

    // Get contact name
    let contactName = contactId.split('@')[0];
    try {
      const contactsResult = await socket.onWhatsApp(contactId);
      if (contactsResult && Array.isArray(contactsResult) && contactsResult.length > 0) {
        const contact = contactsResult[0];
        if (contact && contact.exists) {
          contactName = contact.jid.split('@')[0];
          // Try to get the name from contacts
          try {
            // Try to get from store
            const socketAny = socket as any;
            if (socketAny.store?.contacts) {
              const contacts = socketAny.store.contacts;
              if (contacts && typeof contacts.get === 'function') {
                const contactData = contacts.get(contactId);
                if (contactData?.name || contactData?.notify) {
                  contactName = contactData.name || contactData.notify || contactName;
                }
              }
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }
    } catch (e) {
      logger.debug(`[WhatsApp] Could not get contact name for ${contactId}:`, e);
    }

    const timestamp = message.messageTimestamp ? message.messageTimestamp * 1000 : Date.now();

    // Determine status type and content
    let type: 'image' | 'video' | 'text' = 'text';
    let url: string | undefined;
    let caption: string | undefined;

    if (message.message?.imageMessage) {
      type = 'image';
      caption = message.message.imageMessage.caption;
      
      // Try to download and store media
      try {
        const buffer = await downloadMediaMessage(
          message,
          'buffer',
          {},
          {
            logger,
            reuploadRequest: socket.updateMediaMessage,
          }
        );

        if (buffer && Buffer.isBuffer(buffer)) {
          // Upload to Supabase Storage
          const { uploadMediaToSupabase } = await import('./supabaseStorage.service');
          const mediaPath = `statuses/${userId}/${statusId}.jpg`;
          const mediaUrl = await uploadMediaToSupabase(buffer, mediaPath, 'image/jpeg');
          if (mediaUrl) {
            url = mediaUrl;
          }
        }
      } catch (mediaError) {
        logger.warn(`[WhatsApp] Could not download status image for user ${userId}:`, mediaError);
        // Use direct URL if available
        url = message.message.imageMessage.url || message.message.imageMessage.directPath;
      }
    } else if (message.message?.videoMessage) {
      type = 'video';
      caption = message.message.videoMessage.caption;
      
      // Try to download and store media
      try {
        const buffer = await downloadMediaMessage(
          message,
          'buffer',
          {},
          {
            logger,
            reuploadRequest: socket.updateMediaMessage,
          }
        );

        if (buffer && Buffer.isBuffer(buffer)) {
          // Upload to Supabase Storage
          const { uploadMediaToSupabase } = await import('./supabaseStorage.service');
          const mediaPath = `statuses/${userId}/${statusId}.mp4`;
          const mediaUrl = await uploadMediaToSupabase(buffer, mediaPath, 'video/mp4');
          if (mediaUrl) {
            url = mediaUrl;
          }
        }
      } catch (mediaError) {
        logger.warn(`[WhatsApp] Could not download status video for user ${userId}:`, mediaError);
        // Use direct URL if available
        url = message.message.videoMessage.url || message.message.videoMessage.directPath;
      }
    } else if (message.message?.extendedTextMessage) {
      type = 'text';
      caption = message.message.extendedTextMessage.text;
    } else if (message.message?.conversation) {
      type = 'text';
      caption = message.message.conversation;
    }

    // Get or create status list for this user
    let userStatuses = statusCache.get(userId) || [];
    
    // Check if status already exists
    const exists = userStatuses.find(s => s.id === statusId);
    if (!exists) {
      const statusData = {
        id: statusId,
        contactId,
        contactName,
        timestamp,
        type,
        url,
        caption,
      };

      // Add to beginning of list
      userStatuses.unshift(statusData);
      
      // Limit to 200 statuses per user
      if (userStatuses.length > 200) {
        userStatuses = userStatuses.slice(0, 200);
      }

      statusCache.set(userId, userStatuses);
      logger.info(`[WhatsApp] ✅ Status stored: ${type} from ${contactName} for user ${userId}`);
    }
  } catch (error) {
    logger.error(`[WhatsApp] Error processing status for user ${userId}:`, error);
  }
};

/**
 * Setup message event listeners for a connected socket
 */
const setupMessageListeners = (userId: string, socket: WASocket): void => {
  // Check if listeners are already set up for this socket
  if (listenersSetup.has(socket)) {
    logger.info(`[WhatsApp] Listeners already set up for user ${userId}, skipping`);
    return;
  }

  logger.info(`[WhatsApp] 🔧 Setting up message listeners for user ${userId}`);
  logger.info(`[WhatsApp] 📡 Available events: messages.upsert, messages.delete, messages.update`);

  // Mark that listeners are set up for this socket
  listenersSetup.add(socket);
  
  logger.info(`[WhatsApp] ✅ Listeners marked as set up for user ${userId}`);

  // Listen for incoming messages
  socket.ev.on('messages.upsert', async (update: any) => {
    try {
      logger.info(`[WhatsApp] 📨 messages.upsert event received for user ${userId}`, {
        messageCount: update.messages?.length || 0,
        type: update.type,
        updateKeys: update ? Object.keys(update) : [],
      });
      
      // Update lastSeen when messages are received - this indicates the session is active
      // This is important for detecting connection status even after server restart
      await updateSessionStatus(userId, { 
        lastSeen: new Date(),
        status: 'connected', // Ensure status is set to connected when messages are received
      }).catch((err) => {
        logger.debug(`[WhatsApp] Error updating lastSeen on message receive:`, err);
      });

      // Log all remoteJids to help debug status detection
      if (update.messages && update.messages.length > 0) {
        const remoteJids: string[] = update.messages
          .map((m: any) => m.key?.remoteJid)
          .filter((jid: any): jid is string => typeof jid === 'string' && jid.length > 0);
        const uniqueRemoteJids: string[] = [...new Set(remoteJids)];
        logger.info(`[WhatsApp] 📋 RemoteJids in update:`, {
          count: uniqueRemoteJids.length,
          remoteJids: uniqueRemoteJids,
          hasStatus: uniqueRemoteJids.some((jid: string) => jid.includes('status') || jid.includes('broadcast')),
        });
      }

      if (!update.messages || update.messages.length === 0) {
        logger.warn(`[WhatsApp] ⚠️ No messages in update for user ${userId}`);
        return;
      }

      // Handle status updates FIRST (before processing individual messages)
      // This should be called once per update, not per message
      logger.info(`[Status] 🚀 Calling handleStatusUpdate for user ${userId}`);
      await handleStatusUpdate(userId, socket, update).catch((err) => {
        logger.error(`[WhatsApp] Error handling status update for user ${userId}:`, err);
      });
      logger.info(`[Status] ✅ handleStatusUpdate completed for user ${userId}`);

      // 🔥 DÉTECTER ET STOCKER LES STATUS (inspiré du code de référence)
      for (const message of update.messages) {
        // Vérifier si c'est un status (remoteJid === 'status@broadcast')
        if (message.key?.remoteJid === 'status@broadcast') {
          try {
            logger.info(`[WhatsApp] 📸 Status détecté dans messages.upsert pour user ${userId}`);
            await processAndStoreStatus(userId, socket, message);
          } catch (error) {
            logger.error(`[WhatsApp] Error processing status from messages.upsert:`, error);
          }
        }
      }

      for (const message of update.messages) {
        logger.info(`[WhatsApp] 📥 Processing message for user ${userId}:`, {
          messageId: message.key?.id,
          senderId: message.key?.remoteJid,
          fromMe: message.key?.fromMe,
        });

        // Skip messages from self
        if (!message.key?.fromMe && message.key?.remoteJid) {
          const senderId = message.key.remoteJid;
          const senderName = message.pushName || senderId.split('@')[0];
          
          // Add contact to contacts table if not exists
          await addContactIfNotExists(userId, senderId, senderName).catch((err) => {
            logger.error(`[WhatsApp] Error adding contact for user ${userId}:`, err);
          });
        }

        // Store message for deletion detection
        storeMessage(userId, message);

        // Handle view once messages
        // ⚠️ DÉSACTIVÉ : Les View Once ne sont plus accessibles directement sur les appareils connectés
        // La seule méthode fonctionnelle est via quoted messages (commande 👀)
        // handleViewOnceMessage est désactivée car elle ne fonctionne plus depuis 2024
        // await handleViewOnceMessage(userId, socket, message).catch((err) => {
        //   logger.error(`[WhatsApp] Error handling view-once message for user ${userId}:`, err);
        // });

        // Handle autoresponder
        await handleIncomingMessage(userId, socket, message).catch((err: any) => {
          logger.error(`[WhatsApp] Error handling incoming message for user ${userId}:`, err);
        });
      }
    } catch (error) {
      logger.error(`[WhatsApp] Error handling messages.upsert for user ${userId}:`, error);
    }
  });

  // Listen for presence updates (alternative method for status detection)
  socket.ev.on('presence.update', async (presence: any) => {
    try {
      logger.info(`[Status] 📡 presence.update event received for user ${userId}:`, {
        id: presence.id,
        presences: presence.presences ? Object.keys(presence.presences) : [],
        hasStatus: presence.id && (presence.id.includes('status@broadcast') || presence.id.includes('status')),
      });
      
      // Détecter si c'est un statut
      if (presence.id && (presence.id.includes('status@broadcast') || presence.id.includes('status'))) {
        const statusAuthor = presence.id.split('@')[0] || 'Inconnu';
        logger.info(`[Status] 📱 New status detected via presence.update: ${statusAuthor} for user ${userId}`);
        logger.info(`[Status] Presence data:`, JSON.stringify(presence, null, 2));
      }
    } catch (error) {
      logger.warn(`[Status] Error in presence.update listener:`, error);
    }
  });


  // Listen for message deletions
  socket.ev.on('messages.delete', async (deletion: any) => {
    try {
      logger.info(`[WhatsApp] 🗑️ messages.delete event received for user ${userId}`, {
        hasKeys: !!deletion?.keys,
        keysCount: deletion?.keys?.length || 0,
        deletionType: deletion?.type,
        deletion: JSON.stringify(deletion).substring(0, 500),
      });
      await handleMessageDeletion(userId, socket, deletion);
    } catch (error) {
      logger.error(`[WhatsApp] Error handling messages.delete for user ${userId}:`, error);
    }
  });

  // DEBUG: Log all events to see what happens when a message is deleted
  // Note: This might not work with Baileys, but we'll try
  try {
    // Listen to connection updates to see if deletions are signaled there
    socket.ev.on('connection.update', async (update: any) => {
      try {
        if (update?.update?.messageStubType === 0 || update?.update?.status === 'ERROR') {
          logger.info(`[WhatsApp] 🔍 DEBUG: Connection update might signal deletion:`, {
            messageStubType: update?.update?.messageStubType,
            status: update?.update?.status,
            hasKey: !!update?.update?.key,
          });
        }
      } catch (error) {
        logger.debug(`[WhatsApp] Error in connection.update debug handler:`, error);
      }
    });
  } catch (e) {
    // Ignore if this doesn't work
    logger.debug(`[WhatsApp] Could not set up debug connection.update handler:`, e);
  }

  // ⚠️ DÉSACTIVÉ: messages.update peut capturer d'autres types d'événements (réactions, modifications, etc.)
  // qui ne sont pas vraiment des suppressions, causant des faux positifs.
  // On utilise uniquement messages.delete qui est plus fiable pour détecter les suppressions.
  // Si messages.delete ne fonctionne pas correctement, on peut réactiver messages.update avec une détection très stricte.
  
  // Listen for message updates (edits, reactions, deletions, etc.)
  // NOTE: Désactivé pour éviter les faux positifs - utiliser uniquement messages.delete
  /*
  socket.ev.on('messages.update', async (updates: any) => {
    // Désactivé pour éviter de capturer des messages non supprimés
    // On utilise uniquement messages.delete qui est plus fiable
  });
  */

  logger.info(`[WhatsApp] Message listeners set up successfully for user ${userId}`);
};

/**
 * Reconnect WhatsApp automatically if credentials exist
 * This is called on server startup to restore connections
 */
export const reconnectWhatsAppIfCredentialsExist = async (userId: string): Promise<boolean> => {
  try {
    // Check if session has a conflict - don't reconnect if conflicted
    if (conflictedSessions.has(userId)) {
      logger.warn(`[WhatsApp] Session for user ${userId} has a conflict, skipping auto-reconnect. User must manually reconnect.`);
      return false;
    }
    
    // Check if we've exceeded max reconnection attempts
    const attempts = reconnectionAttempts.get(userId);
    if (attempts && attempts.count >= MAX_RECONNECTION_ATTEMPTS) {
      const now = Date.now();
      // Check if cooldown has passed - if so, reset attempts
      if (now - attempts.lastAttempt > RECONNECTION_COOLDOWN * 2) {
        logger.info(`[WhatsApp] Cooldown period passed for user ${userId}, resetting reconnection attempts`);
        reconnectionAttempts.delete(userId);
      } else {
        logger.warn(`[WhatsApp] Max reconnection attempts reached for user ${userId}, skipping auto-reconnect`);
        return false;
      }
    }
    
    // Check if credentials exist
    const sessionPath = getSessionPath(userId);
    await ensureSessionFromSupabase(userId, sessionPath);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const persistCreds = async () => {
      try {
        await saveCreds();
        await syncSessionToSupabase(userId, sessionPath);
      } catch (error) {
        logger.warn(`[WhatsApp] Error persisting credentials during auto-reconnect for user ${userId}:`, error);
      }
    };
    
    if (!state.creds || !state.creds.me) {
      logger.info(`[WhatsApp] No credentials found for user ${userId}, skipping auto-reconnect`);
      return false;
    }

    // Check if already connected and socket is still active
    if (activeSockets.has(userId)) {
      const socket = activeSockets.get(userId);
      if (socket?.user) {
        // Verify socket is still connected by checking connection state
        try {
          // Check if socket is still valid and connected
          const isConnected = socket.user && socket.user.id;
          if (isConnected) {
            logger.info(`[WhatsApp] User ${userId} already connected with active socket, skipping auto-reconnect`);
            // Clear any reconnection attempts since we're connected
            reconnectionAttempts.delete(userId);
            conflictedSessions.delete(userId);
            // Note: Listeners should already be set up, but if they were lost,
            // they will be re-setup when messages arrive (Baileys handles this)
            return true;
          }
        } catch (error) {
          // Socket might be invalid, continue with reconnect
          logger.warn(`[WhatsApp] Existing socket for user ${userId} appears invalid, will reconnect:`, error);
          activeSockets.delete(userId);
        }
      } else {
        // Socket exists but no user, remove it
        logger.warn(`[WhatsApp] Socket exists for user ${userId} but no user data, removing and reconnecting`);
        activeSockets.delete(userId);
      }
    }

    logger.info(`[WhatsApp] 🔄 Auto-reconnecting user ${userId} with saved credentials...`);

    // Fetch latest Baileys version
    let baileysVersion: [number, number, number] | null = null;
    try {
      const { version } = await fetchLatestBaileysVersion();
      baileysVersion = version;
    } catch (error) {
      logger.warn(`[WhatsApp] Error fetching Baileys version for auto-reconnect: ${error}`);
    }

    // Create socket with saved credentials
    const socketConfig: any = {
      auth: state,
      logger: createBaileysLogger(), // Use filtered logger to suppress non-critical decryption errors
      getMessage: async (_key: any) => undefined,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 10000, // Keep alive every 10 seconds
      retryRequestDelayMs: 250,
      browser: ['Ubuntu', 'Chrome', '22.04.4'],
      // Increase timeout for keep alive to prevent errors
      keepAliveTimeoutMs: 30000, // 30 seconds timeout for keep alive
      // Handle connection errors gracefully
      markOnlineOnConnect: false, // Don't mark as online immediately
    };

    if (baileysVersion) {
      socketConfig.version = baileysVersion;
    }

    const socket = makeWASocket(socketConfig);
    
    // Store socket immediately to prevent race conditions
    activeSockets.set(userId, socket);
    
    // Save credentials when updated
    socket.ev.on('creds.update', persistCreds);

    // Handle connection updates
    socket.ev.on('connection.update', async (update: any) => {
      try {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
          logger.info(`[WhatsApp] ✅ Successfully auto-reconnected user ${userId}`);
          // Clear conflict status and reconnection attempts on successful connection
          conflictedSessions.delete(userId);
          reconnectionAttempts.delete(userId);
          
          await updateSessionStatus(userId, {
            status: 'connected',
            qrCode: null,
            pairingCode: null,
            connectedAt: new Date(),
            lastSeen: new Date(),
          }).catch((err) => {
            logger.error(`[WhatsApp] Error updating session status after reconnect:`, err);
          });
          
          activeSockets.set(userId, socket);

          // Setup message listeners for reconnected socket
          setupMessageListeners(userId, socket);
          
          // Setup keep-alive to maintain bot presence as "online"
          setupKeepAlive(userId, socket);
          
          // Start connection health monitoring
          startConnectionHealthMonitor(userId, socket);
          
          // Cancel any scheduled reconnections since we're now connected
          cancelScheduledReconnection(userId);
        } else if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
          const streamErrorCode = (lastDisconnect?.error as any)?.output?.statusCode || 
                                  (lastDisconnect?.error as any)?.tag?.attrs?.code;
          
          // Check for conflict error (session replaced)
          const errorContent = (lastDisconnect?.error as any)?.output?.tag?.content;
          const isConflict = errorContent?.some?.((item: any) => item?.tag === 'conflict' && item?.attrs?.type === 'replaced') || 
                            errorMessage?.includes('conflict') || 
                            errorMessage?.includes('replaced');
          
          // Check if this is a normal connection termination (not an error)
          const isNormalClose = statusCode === 1000 || 
                                errorMessage?.includes('Connection Terminated') ||
                                errorMessage?.includes('connection closed');
          
          // Check if this is a keep alive error (non-critical)
          const isKeepAliveError = errorMessage?.includes('keep alive') || 
                                   errorMessage?.includes('keepAlive');
          
          if (isKeepAliveError) {
            // Keep alive errors are non-critical, log as debug
            logger.debug(`[WhatsApp] Keep alive error for user ${userId} (non-critical):`, { 
              errorMessage,
            });
            // Don't mark as disconnected for keep alive errors - they're temporary
            return;
          }
          
          if (isNormalClose && !isConflict) {
            // Normal connection close, log as info
            logger.info(`[WhatsApp] Connection closed normally for user ${userId}:`, { 
              statusCode, 
              streamErrorCode,
            });
            
            // Stop health monitoring and keep-alive
            stopConnectionHealthMonitor(userId);
            stopKeepAlive(userId);
            
            // Update status but schedule reconnection after a short delay
            await updateSessionStatus(userId, {
              status: 'disconnected',
              lastSeen: new Date(),
            }).catch((err) => {
              logger.error(`[WhatsApp] Error updating session status:`, err);
            });
            
            // Schedule reconnection for normal closes (might be temporary network issue)
            scheduleReconnection(userId);
            return;
          }
          
          logger.warn(`[WhatsApp] Auto-reconnection closed for user ${userId}:`, { 
            statusCode, 
            streamErrorCode,
            isConflict,
            errorMessage,
          });
          
          // Handle conflict error - mark session as conflicted and prevent reconnection
          if (isConflict) {
            logger.warn(`[WhatsApp] ⚠️ Conflict detected during auto-reconnect for user ${userId} - stopping reconnection attempts`);
            conflictedSessions.add(userId);
            reconnectionAttempts.delete(userId);
            
            // Clean up
            try {
              if (socket) {
                try {
                  socket.end(undefined);
                } catch (e) {
                  // Ignore errors when ending connection
                }
              }
            } catch (e) {
              // Ignore errors
            }
            activeSockets.delete(userId);
            
            await updateSessionStatus(userId, {
              status: 'disconnected',
              qrCode: null,
              pairingCode: null,
            }).catch((err) => {
              logger.error(`[WhatsApp] Error updating session status after conflict in auto-reconnect:`, err);
            });
            
            return; // Don't attempt to reconnect
          }
          
          if (statusCode === DisconnectReason.loggedOut) {
            // User logged out, clean up
            conflictedSessions.delete(userId);
            reconnectionAttempts.delete(userId);
            await removeSessionFromSupabase(userId);
            await deleteLocalSessionDirectory(sessionPath);
            
            await updateSessionStatus(userId, {
              status: 'disconnected',
              qrCode: null,
              pairingCode: null,
            }).catch((err) => {
              logger.error(`[WhatsApp] Error updating session status after logout:`, err);
            });
            
            activeSockets.delete(userId);
          } else {
            // Other disconnect reasons - schedule automatic reconnection
            logger.warn(`[WhatsApp] Auto-reconnection closed for user ${userId} with status ${statusCode}, scheduling reconnection`);
            
            // Stop health monitoring and keep-alive
            stopConnectionHealthMonitor(userId);
            stopKeepAlive(userId);
            
            // Schedule automatic reconnection with exponential backoff
            scheduleReconnection(userId);
          }
        }
      } catch (error) {
        logger.error(`[WhatsApp] Error in connection.update handler during auto-reconnect for user ${userId}:`, error);
      }
    });

    return true;
  } catch (error) {
    logger.error(`[WhatsApp] Error auto-reconnecting user ${userId}:`, error);
    
    // Stop monitoring if it was started
    stopConnectionHealthMonitor(userId);
    stopKeepAlive(userId);
    
    // Update status
    await updateSessionStatus(userId, {
      status: 'disconnected',
      qrCode: null,
      pairingCode: null,
    }).catch((err) => {
      logger.error(`[WhatsApp] Error updating session status after failed reconnect:`, err);
    });
    
    // Schedule another reconnection attempt if not a conflict
    if (!conflictedSessions.has(userId)) {
      const attempts = reconnectionAttempts.get(userId) || { count: 0, lastAttempt: 0 };
      if (attempts.count < MAX_RECONNECTION_ATTEMPTS) {
        logger.info(`[WhatsApp] Scheduling retry after error for user ${userId}`);
        scheduleReconnection(userId);
      }
    }
    
    return false;
  }
};

/**
 * Send a message
 */
export const sendMessage = async (
  userId: string,
  to: string,
  message: string
): Promise<void> => {
  try {
    const socket = activeSockets.get(userId);
    if (!socket) {
      throw new Error('WhatsApp not connected');
    }

    // Send message using Baileys
    await socket.sendMessage(to, { text: message });
    logger.info(`[WhatsApp] Sent message to ${to} for user ${userId}`);
  } catch (error) {
    logger.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
};

/**
 * Get all available statuses from contacts
 * Returns statuses in WhatsApp format (similar to status list view)
 * Note: Baileys doesn't have a direct method to fetch all statuses.
 * We use the contacts from status_likes and enrich them with available status info.
 */
export const getAllAvailableStatuses = async (userId: string): Promise<Array<{
  contactId: string;
  contactName: string;
  lastStatusTime: number;
  statusCount: number;
  hasUnviewed: boolean;
  latestStatusId?: string;
}>> => {
  try {
    const socket = activeSockets.get(userId);
    if (!socket) {
      throw new Error('WhatsApp not connected');
    }

    // First, try to get statuses from cache (collected from messages.upsert)
    const cachedStatuses = statusCache.get(userId) || [];
    
    // Group cached statuses by contact
    const contactsWithStatuses = new Map<string, {
      contactId: string;
      contactName: string;
      lastStatusTime: number;
      statusCount: number;
      statusIds: Set<string>;
      latestStatusId?: string;
    }>();

    for (const status of cachedStatuses) {
      if (!contactsWithStatuses.has(status.contactId)) {
        contactsWithStatuses.set(status.contactId, {
          contactId: status.contactId,
          contactName: status.contactName,
          lastStatusTime: status.timestamp,
          statusCount: 0,
          statusIds: new Set(),
        });
      }

      const contact = contactsWithStatuses.get(status.contactId)!;
      if (!contact.statusIds.has(status.id)) {
        contact.statusIds.add(status.id);
        contact.statusCount++;
        if (status.timestamp > contact.lastStatusTime) {
          contact.lastStatusTime = status.timestamp;
          contact.latestStatusId = status.id;
        }
      }
    }

    // Get all contacts with their names first (this ensures we have proper names)
    const allContacts = await getAllContactsFromSocket(userId);
    const contactsMap = new Map<string, string>();
    for (const contact of allContacts) {
      contactsMap.set(contact.contact_id, contact.contact_name);
    }

    // If we have cached statuses, use them but update contact names from contactsMap
    if (contactsWithStatuses.size > 0) {
      logger.info(`[WhatsApp] Using ${contactsWithStatuses.size} contacts with cached statuses for user ${userId}`);
      // Update contact names from contactsMap
      for (const [contactId, contact] of contactsWithStatuses.entries()) {
        if (contactsMap.has(contactId)) {
          contact.contactName = contactsMap.get(contactId)!;
        }
      }
    } else {
      // Fallback: Try to fetch from WhatsApp using Baileys
      try {
        // Fetch statuses for each contact
        for (const contact of allContacts) {
          const contactId = contact.contact_id;
          if (!contactId || contactId.includes('@g.us') || contactId.includes('@broadcast')) {
            continue;
          }

          try {
            const statusList = await socket.fetchStatus(contactId);
            
            if (statusList && Array.isArray(statusList) && statusList.length > 0) {
              let latestTime = 0;
              let latestStatusId: string | undefined;
              const statusIds = new Set<string>();

              for (const status of statusList) {
                const statusId = (status.key && typeof status.key === 'object' && 'id' in status.key) 
                  ? (status.key as any).id 
                  : `status_${Date.now()}_${Math.random()}`;
                const timestamp = status.updateTimestamp && typeof status.updateTimestamp === 'number' 
                  ? status.updateTimestamp * 1000 
                  : Date.now();
                
                statusIds.add(statusId);
                
                if (timestamp > latestTime) {
                  latestTime = timestamp;
                  latestStatusId = statusId;
                }
              }

              if (statusIds.size > 0) {
                // Use contact name from contactsMap, fallback to contact.contact_name, then to phone number
                const contactName = contactsMap.get(contactId) || contact.contact_name || contactId.split('@')[0];
                contactsWithStatuses.set(contactId, {
                  contactId,
                  contactName,
                  lastStatusTime: latestTime,
                  statusCount: statusIds.size,
                  statusIds,
                  latestStatusId,
                });
              }
            }
          } catch (contactError: any) {
            // Skip contacts that don't have statuses or have errors
            logger.debug(`[WhatsApp] No statuses or error for contact ${contactId}:`, contactError?.message);
          }
        }
      } catch (fetchError: any) {
        logger.warn(`[WhatsApp] Could not fetch all statuses from WhatsApp:`, fetchError?.message || fetchError);
        
        // Fallback: Get from status_likes table
        const { data: statusLikes } = await supabase
          .from('status_likes')
          .select('contact_id, contact_name, liked_at, status_id')
          .eq('user_id', userId)
          .order('liked_at', { ascending: false });

        if (statusLikes && statusLikes.length > 0) {
          for (const like of statusLikes) {
            const contactId = like.contact_id;
            if (!contactId || contactId.includes('@g.us') || contactId.includes('@broadcast')) {
              continue;
            }

            // Use contact name from contactsMap, fallback to like.contact_name, then to phone number
            const contactName = contactsMap.get(contactId) || like.contact_name || contactId.split('@')[0];

            if (!contactsWithStatuses.has(contactId)) {
              contactsWithStatuses.set(contactId, {
                contactId,
                contactName,
                lastStatusTime: new Date(like.liked_at).getTime(),
                statusCount: 0,
                statusIds: new Set(),
              });
            }

            const contact = contactsWithStatuses.get(contactId)!;
            if (!contact.statusIds.has(like.status_id)) {
              contact.statusIds.add(like.status_id);
              contact.statusCount++;
              const statusTime = new Date(like.liked_at).getTime();
              if (statusTime > contact.lastStatusTime) {
                contact.lastStatusTime = statusTime;
                contact.latestStatusId = like.status_id;
              }
            }
          }
        }
      }
    }

    // Convert to array and sort by most recent status
    const result = Array.from(contactsWithStatuses.values())
      .map(contact => ({
        contactId: contact.contactId,
        contactName: contact.contactName,
        lastStatusTime: contact.lastStatusTime,
        statusCount: contact.statusCount,
        hasUnviewed: false, // TODO: Implement unviewed status detection
        latestStatusId: contact.latestStatusId,
      }))
      .sort((a, b) => b.lastStatusTime - a.lastStatusTime);

    logger.info(`[WhatsApp] Retrieved ${result.length} contacts with statuses for user ${userId}`);
    return result;
  } catch (error) {
    logger.error(`[WhatsApp] Error fetching available statuses for user ${userId}:`, error);
    throw new Error('Failed to fetch available statuses');
  }
};

/**
 * Get all statuses for a specific contact
 */
export const getContactStatuses = async (userId: string, contactId: string): Promise<{
  contactId: string;
  contactName: string;
  statuses: Array<{
    id: string;
    timestamp: number;
    caption?: string;
    type: 'image' | 'video' | 'text';
    url?: string;
  }>;
}> => {
  try {
    const socket = activeSockets.get(userId);
    if (!socket) {
      throw new Error('WhatsApp not connected');
    }

    // Decode contactId if it's URL encoded
    const decodedContactId = decodeURIComponent(contactId);
    
    // Fetch statuses from WhatsApp using Baileys
    let statuses: Array<{
      id: string;
      timestamp: number;
      caption?: string;
      type: 'image' | 'video' | 'text';
      url?: string;
    }> = [];

    // First, try to get statuses from cache (collected from messages.upsert)
    const cachedStatuses = statusCache.get(userId) || [];
    const contactStatuses = cachedStatuses.filter(s => s.contactId === decodedContactId);
    
    if (contactStatuses.length > 0) {
      statuses = contactStatuses.map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        caption: s.caption,
        type: s.type,
        url: s.url,
      }));
      logger.info(`[WhatsApp] Using ${statuses.length} cached statuses for contact ${decodedContactId}`);
    } else {
      // Fallback: Try to fetch from WhatsApp using Baileys
      try {
        const statusList = await socket.fetchStatus(decodedContactId);
        
        if (statusList && Array.isArray(statusList) && statusList.length > 0) {
          statuses = statusList.map((status: any) => {
            const statusId = (status.key && typeof status.key === 'object' && 'id' in status.key) 
              ? (status.key as any).id 
              : `status_${Date.now()}_${Math.random()}`;
            const timestamp = status.updateTimestamp ? status.updateTimestamp * 1000 : Date.now();
            
            let type: 'image' | 'video' | 'text' = 'text';
            let url: string | undefined;
            let caption: string | undefined;

            if (status.message?.imageMessage) {
              type = 'image';
              const imageMsg = status.message.imageMessage;
              url = imageMsg.url || imageMsg.directPath || undefined;
              caption = imageMsg.caption;
            } else if (status.message?.videoMessage) {
              type = 'video';
              const videoMsg = status.message.videoMessage;
              url = videoMsg.url || videoMsg.directPath || undefined;
              caption = videoMsg.caption;
            } else if (status.message?.extendedTextMessage) {
              type = 'text';
              caption = status.message.extendedTextMessage.text;
            } else if (status.message?.conversation) {
              type = 'text';
              caption = status.message.conversation;
            }

            return {
              id: statusId,
              timestamp,
              caption,
              type,
              url,
            };
          });
          
          logger.info(`[WhatsApp] Fetched ${statuses.length} statuses from WhatsApp for contact ${decodedContactId}`);
        }
      } catch (fetchError: any) {
        logger.warn(`[WhatsApp] Could not fetch statuses from WhatsApp for contact ${decodedContactId}:`, fetchError?.message || fetchError);
        
        // Final fallback: Get from status_likes table
        const { data: statusLikes } = await supabase
          .from('status_likes')
          .select('status_id, liked_at, emoji')
          .eq('user_id', userId)
          .eq('contact_id', decodedContactId)
          .order('liked_at', { ascending: false });

        if (statusLikes && statusLikes.length > 0) {
          statuses = statusLikes.map((like: any) => ({
            id: like.status_id || `status_${Date.now()}_${Math.random()}`,
            timestamp: new Date(like.liked_at).getTime(),
            type: 'text' as const,
          }));
          logger.info(`[WhatsApp] Using ${statuses.length} statuses from status_likes as fallback`);
        }
      }
    }

    // Get contact name from contacts table or status_likes
    let contactName = decodedContactId.split('@')[0];
    const { data: contactData } = await supabase
      .from('contacts')
      .select('contact_name')
      .eq('user_id', userId)
      .eq('contact_id', decodedContactId)
      .limit(1)
      .maybeSingle();

    if (contactData?.contact_name) {
      contactName = contactData.contact_name;
    } else {
      // Fallback to status_likes
      const { data: statusLikeData } = await supabase
        .from('status_likes')
        .select('contact_name')
        .eq('user_id', userId)
        .eq('contact_id', decodedContactId)
        .limit(1)
        .maybeSingle();
      
      if (statusLikeData?.contact_name) {
        contactName = statusLikeData.contact_name;
      }
    }

    logger.info(`[WhatsApp] Retrieved ${statuses.length} statuses for contact ${decodedContactId} (user ${userId})`);
    
    return {
      contactId: decodedContactId,
      contactName,
      statuses,
    };
  } catch (error) {
    logger.error(`[WhatsApp] Error fetching contact statuses for user ${userId}, contact ${contactId}:`, error);
    throw new Error('Failed to fetch contact statuses');
  }
};
