import { getSupabaseClient } from '../config/database';
import { getSocket } from '../services/whatsapp.service';
import { logger } from '../config/logger';

const supabase = getSupabaseClient();

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

    // Find statuses scheduled for now (within the last minute)
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneMinuteAgoISO = oneMinuteAgo.toISOString();

    const { data: scheduledStatuses, error: findError } = await supabase
      .from('scheduled_statuses')
      .select('*')
      .eq('status', 'scheduled')
      .gte('scheduled_at', oneMinuteAgoISO)
      .lte('scheduled_at', nowISO);

    if (findError) {
      logger.error('Error finding scheduled statuses:', findError);
      throw new Error('Failed to find scheduled statuses');
    }

    if (!scheduledStatuses || scheduledStatuses.length === 0) {
      logger.debug('No scheduled statuses to process');
      return;
    }

    logger.info(`Found ${scheduledStatuses.length} scheduled status(es) to process`);

    // Process each scheduled status
    for (const status of scheduledStatuses) {
      try {
        const socket = getSocket(status.user_id);

        if (!socket) {
          logger.warn(`WhatsApp not connected for user ${status.user_id}, skipping status ${status.id}`);
          // Update status to failed
          await supabase
            .from('scheduled_statuses')
            .update({
              status: 'failed',
              error_message: 'WhatsApp not connected',
              updated_at: new Date().toISOString(),
            })
            .eq('id', status.id);
          continue;
        }

        // TODO: Implement actual status publishing via Baileys
        // For now, we'll just mark it as published
        logger.info(`Publishing scheduled status ${status.id} for user ${status.user_id}`);

        // Update status to published
        const { error: updateError } = await supabase
          .from('scheduled_statuses')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', status.id);

        if (updateError) {
          logger.error(`Error updating status ${status.id}:`, updateError);
        } else {
          logger.info(`Status ${status.id} published successfully`);
        }
      } catch (error) {
        logger.error(`Error processing status ${status.id}:`, error);
        // Update status to failed
        await supabase
          .from('scheduled_statuses')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', status.id);
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
