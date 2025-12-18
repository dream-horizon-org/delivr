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
import { ReleasePlatformTargetMappingRepository } from '../../../models/release/release-platform-target-mapping.repository';
import { ReleaseUploadsRepository } from '../../../models/release/release-uploads.repository';
import { createCronJobModel } from '../../../models/release/cron-job.sequelize.model';
import { createReleaseModel } from '../../../models/release/release.sequelize.model';
import { createReleaseTaskModel } from '../../../models/release/release-task.sequelize.model';
import { createRegressionCycleModel } from '../../../models/release/regression-cycle.sequelize.model';
import { createPlatformTargetMappingModel } from '../../../models/release/platform-target-mapping.sequelize.model';
import { createReleaseUploadModel } from '../../../models/release/release-uploads.sequelize.model';
import { hasSequelize } from '../../../types/release/api-types';
import { DistributionService } from '../../distribution/distribution.service';
import {
  DistributionRepository,
  IosSubmissionBuildRepository,
  AndroidSubmissionBuildRepository,
  SubmissionActionHistoryRepository,
  createDistributionModel,
  createIosSubmissionBuildModel,
  createAndroidSubmissionBuildModel,
  createSubmissionActionHistoryModel
} from '../../../models/distribution';
import { BuildRepository, createBuildModel } from '../../../models/release';

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
  const PlatformMappingModel = createPlatformTargetMappingModel(sequelize);
  const ReleaseUploadModel = createReleaseUploadModel(sequelize);

  // Create repositories
  const cronJobRepo = new CronJobRepository(CronJobModel);
  const releaseRepo = new ReleaseRepository(ReleaseModel);
  const releaseTaskRepo = new ReleaseTaskRepository(ReleaseTaskModel);
  const regressionCycleRepo = new RegressionCycleRepository(RegressionCycleModel);
  const platformMappingRepo = new ReleasePlatformTargetMappingRepository(PlatformMappingModel);
  const releaseUploadsRepo = new ReleaseUploadsRepository(sequelize, ReleaseUploadModel);

  // Get cronicle service from storage (if available)
  const cronicleService = (storage as any).cronicleService ?? null;

  // Get activity log service from storage (if available)
  const activityLogService = (storage as any).releaseActivityLogService ?? null;

  // Create DistributionService (optional dependency)
  let distributionService: DistributionService | undefined;
  try {
    const distributionModel = createDistributionModel(sequelize);
    const iosSubmissionModel = createIosSubmissionBuildModel(sequelize);
    const androidSubmissionModel = createAndroidSubmissionBuildModel(sequelize);
    const actionHistoryModel = createSubmissionActionHistoryModel(sequelize);
    const buildModel = createBuildModel(sequelize);

    const distributionRepository = new DistributionRepository(distributionModel);
    const iosSubmissionRepository = new IosSubmissionBuildRepository(iosSubmissionModel);
    const androidSubmissionRepository = new AndroidSubmissionBuildRepository(androidSubmissionModel);
    const actionHistoryRepository = new SubmissionActionHistoryRepository(actionHistoryModel);
    const buildRepository = new BuildRepository(buildModel);

    distributionService = new DistributionService(
      distributionRepository,
      iosSubmissionRepository,
      androidSubmissionRepository,
      actionHistoryRepository,
      releaseRepo,
      buildRepository,
      platformMappingRepo
    );
  } catch (error) {
    console.warn('[CronJobService Factory] Failed to create DistributionService:', error);
    // Continue without DistributionService - it's optional
  }

  // Create and cache service
  cachedService = new CronJobService(
    cronJobRepo,
    releaseRepo,
    releaseTaskRepo,
    regressionCycleRepo,
    platformMappingRepo,
    storage,
    releaseUploadsRepo,
    cronicleService,
    activityLogService,
    distributionService
  );

  return cachedService;
}

/**
 * Reset cached service (for testing)
 */
export function resetCronJobService(): void {
  cachedService = null;
}

