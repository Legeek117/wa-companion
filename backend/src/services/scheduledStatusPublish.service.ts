import { WASocket } from '@whiskeysockets/baileys';
import { logger } from '../config/logger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Publish a WhatsApp status
 * @param socket - WhatsApp socket
 * @param caption - Status text/caption (optional)
 * @param mediaUrl - Media URL (optional, can be local path or full URL)
 * @returns Promise<boolean> - true if published successfully
 */
export const publishStatus = async (
  socket: WASocket,
  caption?: string | null,
  mediaUrl?: string | null
): Promise<boolean> => {
  try {
    logger.info('[ScheduledStatus] Publishing status...', {
      hasCaption: !!caption,
      hasMedia: !!mediaUrl,
    });

    // If no media and no caption, we can't publish
    if (!mediaUrl && !caption) {
      throw new Error('Cannot publish status: both media and caption are missing');
    }

    // Prepare message content
    let messageContent: any = {};

    // If media is provided, load it
    if (mediaUrl) {
      let mediaBuffer: Buffer | null = null;
      let mimeType: string = 'image/jpeg';

      // Check if it's a local file path
      if (mediaUrl.startsWith('/api/media/scheduled-status/')) {
        // Extract filename from URL
        const filename = mediaUrl.split('/api/media/scheduled-status/')[1];
        const filePath = join(process.cwd(), 'uploads', 'scheduled-status', filename);
        
        if (existsSync(filePath)) {
          mediaBuffer = readFileSync(filePath);
          
          // Determine MIME type from file extension
          const ext = filename.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
          };
          mimeType = mimeTypes[ext || ''] || 'image/jpeg';
          
          logger.info(`[ScheduledStatus] Loaded media from file: ${filePath} (${mimeType}, ${mediaBuffer.length} bytes)`);
        } else {
          throw new Error(`Media file not found: ${filePath}`);
        }
      } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        // Download from URL
        try {
          const response = await fetch(mediaUrl);
          if (!response.ok) {
            throw new Error(`Failed to download media: ${response.statusText}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          mediaBuffer = Buffer.from(arrayBuffer);
          mimeType = response.headers.get('content-type') || 'image/jpeg';
          logger.info(`[ScheduledStatus] Downloaded media from URL: ${mediaUrl} (${mimeType}, ${mediaBuffer.length} bytes)`);
        } catch (error) {
          throw new Error(`Failed to download media from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        throw new Error(`Invalid media URL format: ${mediaUrl}`);
      }

      if (!mediaBuffer) {
        throw new Error('Failed to load media buffer');
      }

      // Determine if it's an image or video
      const isImage = mimeType.startsWith('image/');
      const isVideo = mimeType.startsWith('video/');

      if (isImage) {
        messageContent = {
          image: mediaBuffer,
          caption: caption || undefined,
          mimetype: mimeType,
        };
      } else if (isVideo) {
        messageContent = {
          video: mediaBuffer,
          caption: caption || undefined,
          mimetype: mimeType,
        };
      } else {
        throw new Error(`Unsupported media type: ${mimeType}`);
      }
    } else {
      // Text-only status
      messageContent = {
        text: caption || '',
      };
    }

    // Statuses must be sent to status@broadcast with broadcast option
    // This is the working method confirmed by testing
    const statusJid = 'status@broadcast';
    
    logger.info(`[ScheduledStatus] Publishing status to ${statusJid}...`, {
      hasMedia: !!mediaUrl,
      hasCaption: !!caption,
      messageType: mediaUrl ? (messageContent.image ? 'image' : 'video') : 'text',
    });
    
    try {
      // Publish status to status@broadcast with broadcast option
      // This is the confirmed working method
      await socket.sendMessage(statusJid, messageContent, {
        broadcast: true,
      });
      
      logger.info('[ScheduledStatus] ✅ Status published successfully (method: status@broadcast with broadcast)');
      return true;
    } catch (error: any) {
      logger.error('[ScheduledStatus] ❌ Error publishing status:', {
        error: error?.message || error,
        stack: error?.stack,
      });
      throw error;
    }
  } catch (error) {
    logger.error('[ScheduledStatus] ❌ Error publishing status:', error);
    throw error;
  }
};

















