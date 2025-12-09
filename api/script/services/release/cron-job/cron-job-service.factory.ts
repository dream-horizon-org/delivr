/**
 * CronJobService Factory
 * 
 * Creates CronJobService instance with all required dependencies.
 * Uses singleton pattern for performance.
 */

import type { Storage } from '../../../storage/storage';
import { CronJobService } from './cron-job.service';
import { CronJobRepository } from '../../../models/release/cron-job.repository';
import { ReleaseRepository } from '../../../models/release/release.repository';
import { ReleaseTaskRepository } from '../../../models/release/release-task.repository';
import { RegressionCycleRepository } from '../../../models/release/regression-cycle.repository';
import { createCronJobModel } from '../../../models/release/cron-job.sequelize.model';
import { createReleaseModel } from '../../../models/release/release.sequelize.model';
import { createReleaseTaskModel } from '../../../models/release/release-task.sequelize.model';
import { createRegressionCycleModel } from '../../../models/release/regression-cycle.sequelize.model';
import { hasSequelize } from '../../../types/release/api-types';

/** Cached CronJobService instance */
let cachedService: CronJobService | null = null;

/**
 * Get or create CronJobService instance
 * 
 * @param storage - Storage with Sequelize instance
 * @returns CronJobService instance or null if storage invalid
 */
export function getCronJobService(storage: Storage): CronJobService | null {
  // Return cached instance
  if (cachedService) {
    return cachedService;
  }

  // Validate storage
  if (!hasSequelize(storage)) {
    console.warn('[CronJobService Factory] Storage does not have Sequelize');
    return null;
  }

  const sequelize = storage.sequelize;

  // Create models
  const CronJobModel = createCronJobModel(sequelize);
  const ReleaseModel = createReleaseModel(sequelize);
  const ReleaseTaskModel = createReleaseTaskModel(sequelize);
  const RegressionCycleModel = createRegressionCycleModel(sequelize);

  // Create repositories
  const cronJobRepo = new CronJobRepository(CronJobModel);
  const releaseRepo = new ReleaseRepository(ReleaseModel);
  const releaseTaskRepo = new ReleaseTaskRepository(ReleaseTaskModel);
  const regressionCycleRepo = new RegressionCycleRepository(RegressionCycleModel);

  // Create and cache service
  cachedService = new CronJobService(
    cronJobRepo,
    releaseRepo,
    releaseTaskRepo,
    regressionCycleRepo,
    storage
  );

  return cachedService;
}

/**
 * Reset cached service (for testing)
 */
export function resetCronJobService(): void {
  cachedService = null;
}

