import { WASocket, downloadMediaMessage } from '@whiskeysockets/baileys';
import { logger } from '../config/logger';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Get file extension from mime type
 */
export const getExtensionFromMimeType = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/aac': 'aac',
    'audio/amr': 'amr',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
  };
  
  return mimeToExt[mimeType.toLowerCase()] || 'bin';
};

/**
 * Upload media to local storage
 * Saves files to uploads/deleted-messages/ directory
 * TODO: In production, implement upload to Cloudinary/S3
 */
export const uploadMedia = async (
  buffer: Buffer,
  filename: string,
  mimeType: string,
  subdirectory: 'deleted-messages' | 'scheduled-status' = 'deleted-messages'
): Promise<string> => {
  try {
    logger.info(`[Media] Saving media locally: ${filename} (${mimeType}, ${buffer.length} bytes)`);
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads', subdirectory);
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
      logger.info(`[Media] Created uploads directory: ${uploadsDir}`);
    }
    
    // Get extension from mime type if not in filename
    let finalFilename = filename;
    if (!filename.includes('.')) {
      const extension = getExtensionFromMimeType(mimeType);
      finalFilename = `${filename}.${extension}`;
    }
    
    // Ensure unique filename by adding timestamp if needed
    const filePath = join(uploadsDir, finalFilename);
    
    // Write file to disk
    writeFileSync(filePath, buffer);
    
    // Return URL path (will be served by Express static middleware)
    const mediaUrl = `/api/media/${subdirectory}/${finalFilename}`;
    
    logger.info(`[Media] Media saved successfully: ${filePath} -> ${mediaUrl}`);
    
    return mediaUrl;
  } catch (error) {
    logger.error('[Media] Error saving media:', error);
    throw new Error('Failed to save media');
  }
};

/**
 * Download media from WhatsApp using Baileys
 */
export const downloadMediaFromWhatsApp = async (
  socket: WASocket,
  message: any
): Promise<Buffer | null> => {
  try {
    // Download media using Baileys
    // downloadMediaMessage returns a buffer or stream depending on options
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      {
        logger,
        reuploadRequest: socket.updateMediaMessage,
      }
    );
    
    if (!buffer) {
      logger.warn('[Media] No media buffer found in message');
      return null;
    }

    // If buffer is already a Buffer, return it
    if (Buffer.isBuffer(buffer)) {
      logger.info(`[Media] Downloaded media: ${buffer.length} bytes`);
      return buffer;
    }

    // If it's a stream, convert to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of buffer as any) {
      chunks.push(Buffer.from(chunk));
    }
    
    const finalBuffer = Buffer.concat(chunks);
    
    logger.info(`[Media] Downloaded media: ${finalBuffer.length} bytes`);
    
    return finalBuffer;
  } catch (error) {
    logger.error('[Media] Error downloading media from WhatsApp:', error);
    return null;
  }
};

/**
 * Get media type from message
 */
export const getMediaType = (message: any): {
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker' | null;
  mimeType: string | null;
  filename: string | null;
} => {
  if (message.message?.imageMessage) {
    return {
      type: 'image',
      mimeType: message.message.imageMessage.mimetype || 'image/jpeg',
      filename: message.message.imageMessage.caption || 'image.jpg',
    };
  }
  
  if (message.message?.videoMessage) {
    return {
      type: 'video',
      mimeType: message.message.videoMessage.mimetype || 'video/mp4',
      filename: message.message.videoMessage.caption || 'video.mp4',
    };
  }
  
  if (message.message?.audioMessage) {
    return {
      type: 'audio',
      mimeType: message.message.audioMessage.mimetype || 'audio/ogg',
      filename: 'audio.ogg',
    };
  }
  
  if (message.message?.documentMessage) {
    return {
      type: 'document',
      mimeType: message.message.documentMessage.mimetype || 'application/octet-stream',
      filename: message.message.documentMessage.fileName || 'document',
    };
  }
  
  if (message.message?.stickerMessage) {
    return {
      type: 'sticker',
      mimeType: message.message.stickerMessage.mimetype || 'image/webp',
      filename: 'sticker.webp',
    };
  }
  
  return {
    type: null,
    mimeType: null,
    filename: null,
  };
};

/**
 * Process and upload media from WhatsApp message
 */
export const processAndUploadMedia = async (
  socket: WASocket,
  message: any,
  userId: string
): Promise<string | null> => {
  try {
    const mediaInfo = getMediaType(message);
    
    if (!mediaInfo.type) {
      logger.warn('[Media] No media type found in message');
      return null;
    }
    
    // Download media
    const buffer = await downloadMediaFromWhatsApp(socket, message);
    
    if (!buffer) {
      logger.warn('[Media] Failed to download media');
      return null;
    }
    
    // Generate unique filename with user ID, timestamp, and random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = getExtensionFromMimeType(mediaInfo.mimeType || 'application/octet-stream') ||
                     mediaInfo.filename?.split('.').pop() || 
                     (mediaInfo.type === 'image' ? 'jpg' : 
                      mediaInfo.type === 'video' ? 'mp4' : 
                      mediaInfo.type === 'audio' ? 'ogg' : 
                      mediaInfo.type === 'document' ? 'bin' : 'webp');
    const filename = `${userId}_${timestamp}_${randomStr}.${extension}`;
    
    // Save media locally
    const mediaUrl = await uploadMedia(buffer, filename, mediaInfo.mimeType || 'application/octet-stream');
    
    logger.info(`[Media] Media processed and uploaded: ${mediaUrl}`);
    
    return mediaUrl;
  } catch (error) {
    logger.error('[Media] Error processing and uploading media:', error);
    return null;
  }
};

















