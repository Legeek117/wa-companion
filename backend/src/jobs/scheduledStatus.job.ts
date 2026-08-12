import prisma from '../config/database';
import { getSocket } from '../services/whatsapp.service';
import { logger } from '../config/logger';
import { publishStatus } from '../services/scheduledStatusPublish.service';

/**
 * Process scheduled statuses job
 * This job runs periodically to check and publish scheduled statuses
 * Should be scheduled with a cron job (e.g., node-cron) every minute
 */
export async function processScheduledStatusesJob(): Promise<void> {
  try {
    logger.info('Starting scheduled statuses job...');

    const now = new Date();
    const nowISO = now.toISOString();
    
    // Add a small buffer (5 seconds) to catch statuses that are scheduled for exactly now
    // This helps avoid timing issues where the cron runs at the exact same second
    const bufferSeconds = 5;
    const bufferTime = new Date(now.getTime() + bufferSeconds * 1000);
    const bufferISO = bufferTime.toISOString();

    logger.info('Checking for scheduled statuses...', {
      now: nowISO,
      buffer: bufferISO,
      nowLocal: now.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
    });

    // First, let's check all pending statuses to see what we have
    try {
      const allPendingStatuses = await prisma.scheduledStatus.findMany({
        where: { status: 'pending' },
        select: { id: true, scheduledAt: true, status: true, caption: true },
        orderBy: { scheduledAt: 'asc' }
      });

      logger.info(`Found ${allPendingStatuses.length} total pending status(es)`, {
        statuses: allPendingStatuses.map(s => ({
          id: s.id,
          scheduled_at: s.scheduledAt,
          scheduled_at_local: new Date(s.scheduledAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
          caption: s.caption?.substring(0, 30),
        })),
      });
    } catch (allPendingError) {
      logger.error('Error finding all pending statuses:', allPendingError);
    }

    // Find statuses scheduled for now or in the past (status = pending)
    // Use buffer to catch statuses scheduled for exactly now
    let scheduledStatuses;
    try {
      scheduledStatuses = await prisma.scheduledStatus.findMany({
        where: {
          status: 'pending',
          scheduledAt: { lte: bufferTime }
        }
      });
    } catch (findError) {
      logger.error('Error finding scheduled statuses:', findError);
      throw new Error('Failed to find scheduled statuses');
    }

    if (!scheduledStatuses || scheduledStatuses.length === 0) {
      logger.info('No scheduled statuses to process (none found matching criteria)', {
        criteria: {
          status: 'pending',
          scheduled_at_lte: bufferISO,
        },
      });
      return;
    }

    logger.info(`Found ${scheduledStatuses.length} scheduled status(es) to process`, {
      statuses: scheduledStatuses.map(s => ({
        id: s.id,
        scheduled_at: s.scheduledAt,
        caption: s.caption?.substring(0, 50),
        hasMedia: !!s.mediaUrl,
      })),
    });

    // Process each scheduled status
    for (const status of scheduledStatuses) {
      try {
        const socket = getSocket(status.userId);

        if (!socket) {
          logger.warn(`WhatsApp not connected for user ${status.userId}, skipping status ${status.id}`);
          // Update status to failed
          await prisma.scheduledStatus.update({
            where: { id: status.id },
            data: {
              status: 'failed',
              errorMessage: 'WhatsApp not connected',
            }
          });
          continue;
        }

        // Publish status via Baileys
        logger.info(`Publishing scheduled status ${status.id} for user ${status.userId}`, {
          hasMedia: !!status.mediaUrl,
          hasCaption: !!status.caption,
        });

        try {
          // Publish the status
          logger.info(`[ScheduledStatus] Attempting to publish status ${status.id}...`);
          const published = await publishStatus(
            socket,
            status.caption || undefined,
            status.mediaUrl
          );

          if (!published) {
            throw new Error('Status publication returned false');
          }

          logger.info(`[ScheduledStatus] Status ${status.id} published successfully, updating database...`);

          // Update status to published
          await prisma.scheduledStatus.update({
            where: { id: status.id },
            data: {
              status: 'published',
              publishedAt: new Date(),
            }
          });

          logger.info(`[ScheduledStatus] ✅ Status ${status.id} published and updated successfully`);
        } catch (publishError: any) {
          logger.error(`[ScheduledStatus] ❌ Error publishing status ${status.id}:`, {
            error: publishError?.message || publishError,
            stack: publishError?.stack,
          });
          throw publishError;
        }
      } catch (error) {
        logger.error(`Error processing status ${status.id}:`, error);
        // Update status to failed
        await prisma.scheduledStatus.update({
          where: { id: status.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          }
        });
      }
    }

    logger.info('Scheduled statuses job completed successfully');
  } catch (error) {
    logger.error('Error in scheduled statuses job:', error);
    throw error;
  }
}

// For manual execution
if (require.main === module) {
  processScheduledStatusesJob()
    .then(() => {
      logger.info('Job completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Job failed:', error);
      process.exit(1);
    });
}
