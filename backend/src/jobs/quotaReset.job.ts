import { resetMonthlyQuotas } from '../services/quota.service';
import { logger } from '../config/logger';

/**
 * Reset monthly quotas job
 * This job runs monthly to reset user quotas
 * Should be scheduled with a cron job (e.g., node-cron)
 */
export async function resetMonthlyQuotasJob(): Promise<void> {
  try {
    logger.info('Starting monthly quota reset job...');
    await resetMonthlyQuotas();
    logger.info('Monthly quota reset job completed successfully');
  } catch (error) {
    logger.error('Error in monthly quota reset job:', error);
    throw error;
  }
}

// For manual execution
if (require.main === module) {
  resetMonthlyQuotasJob()
    .then(() => {
      logger.info('Job completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Job failed:', error);
      process.exit(1);
    });
}
