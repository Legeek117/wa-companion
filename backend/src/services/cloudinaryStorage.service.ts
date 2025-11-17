import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Readable } from 'stream';

// Configure Cloudinary
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info('[CloudinaryStorage] Cloudinary configured', {
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY ? `${env.CLOUDINARY_API_KEY.substring(0, 4)}...` : 'missing',
  });
} else {
  logger.warn('[CloudinaryStorage] Cloudinary not configured, missing credentials');
}

const isCloudinaryEnabled = (): boolean => {
  return !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
};

/**
 * Upload media to Cloudinary
 */
export const uploadMediaToCloudinary = async (
  buffer: Buffer,
  path: string,
  contentType: string,
  options?: {
    folder?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
    publicId?: string;
  }
): Promise<string | null> => {
  if (!isCloudinaryEnabled()) {
    logger.warn('[CloudinaryStorage] Cloudinary not enabled, missing credentials');
    return null;
  }

  try {
    // Determine resource type from content type
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = options?.resourceType || 'auto';
    if (resourceType === 'auto') {
      if (contentType.startsWith('image/')) {
        resourceType = 'image';
      } else if (contentType.startsWith('video/')) {
        resourceType = 'video';
      } else {
        resourceType = 'raw';
      }
    }

    // Extract folder and filename from path
    // Path format: subdirectory/userId/filename or subdirectory/filename
    const pathParts = path.split('/');
    const filename = pathParts.pop() || 'file';
    
    // Build folder structure: subdirectory/userId (if userId exists)
    // This matches Supabase structure: {subdirectory}/{userId}/{filename}
    let folder = options?.folder;
    if (!folder && pathParts.length > 0) {
      // If path has parts, use them as folder (e.g., "deleted-messages/userId")
      folder = pathParts.join('/');
    }
    if (!folder) {
      folder = 'amda-media';
    }

    // Build publicId: filename only (without extension and without folder)
    // Cloudinary will combine folder + publicId automatically
    let publicId = options?.publicId;
    if (!publicId) {
      // Extract just the filename without extension
      const filenameWithoutExt = filename.includes('.') 
        ? filename.substring(0, filename.lastIndexOf('.'))
        : filename;
      publicId = filenameWithoutExt;
    } else if (publicId.includes('.')) {
      publicId = publicId.substring(0, publicId.lastIndexOf('.'));
      // Remove folder from publicId if it's included
      if (publicId.includes('/')) {
        publicId = publicId.split('/').pop() || publicId;
      }
    }

    // Log upload parameters for debugging
    logger.debug('[CloudinaryStorage] Upload parameters:', {
      path,
      folder,
      publicId,
      resourceType,
      bufferSize: buffer.length,
      contentType,
    });

    // Convert buffer to stream
    const stream = Readable.from(buffer);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: resourceType,
          overwrite: true,
          use_filename: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            // Log full error details
            logger.error('[CloudinaryStorage] Upload error details:', {
              message: error.message || 'Unknown error',
              http_code: error.http_code || 'N/A',
              name: error.name || 'Error',
              path: path,
              folder: folder,
              publicId: publicId,
              resourceType: resourceType,
              error_string: String(error),
              error_json: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            });
            console.error('[CloudinaryStorage] Full error object:', error);
            resolve(null);
          } else if (result) {
            logger.info(`[CloudinaryStorage] Media uploaded: ${path} -> ${result.secure_url}`);
            resolve(result.secure_url);
          } else {
            logger.warn('[CloudinaryStorage] Upload completed but no result returned');
            resolve(null);
          }
        }
      );

      stream.pipe(uploadStream);
      
      // Handle stream errors
      stream.on('error', (streamError) => {
        logger.error('[CloudinaryStorage] Stream error:', streamError);
        resolve(null);
      });
      
      uploadStream.on('error', (uploadError) => {
        logger.error('[CloudinaryStorage] Upload stream error:', uploadError);
        resolve(null);
      });
    });
  } catch (error) {
    logger.error('[CloudinaryStorage] Error uploading media:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
};

/**
 * Delete media from Cloudinary
 */
export const deleteMediaFromCloudinary = async (
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<boolean> => {
  if (!isCloudinaryEnabled()) {
    return false;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result === 'ok') {
      logger.info(`[CloudinaryStorage] Media deleted: ${publicId}`);
      return true;
    } else {
      logger.warn(`[CloudinaryStorage] Failed to delete media: ${publicId}, result: ${result.result}`);
      return false;
    }
  } catch (error) {
    logger.error('[CloudinaryStorage] Error deleting media:', error);
    return false;
  }
};

/**
 * Get public URL for media in Cloudinary
 */
export const getMediaPublicUrl = (publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): string | null => {
  if (!isCloudinaryEnabled()) {
    return null;
  }

  try {
    const url = cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
    });
    return url;
  } catch (error) {
    logger.error('[CloudinaryStorage] Error getting public URL:', error);
    return null;
  }
};

/**
 * Extract public ID from Cloudinary URL
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{version}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (match && match[1]) {
      return match[1];
    }
    return null;
  } catch (error) {
    logger.error('[CloudinaryStorage] Error extracting public ID from URL:', error);
    return null;
  }
};

