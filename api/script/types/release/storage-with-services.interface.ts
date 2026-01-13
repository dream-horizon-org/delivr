/**
 * Extended Storage interface with release management services
 *
 * These services are dynamically attached by S3Storage during initialization.
 * Use the type guard to safely cast and access these services.
 */

import * as storageTypes from '../../storage/storage';
import type { ReleaseCreationService } from '../../services/release/release-creation.service';
import type { ReleaseRetrievalService } from '../../services/release/release-retrieval.service';
import type { ReleaseStatusService } from '../../services/release/release-status.service';
import type { ReleaseUpdateService } from '../../services/release/release-update.service';
import type { ReleaseActivityLogService } from '../../services/release/release-activity-log.service';
import type { ReleaseNotificationService } from '../../services/release-notification/release-notification.service';
import type { BuildArtifactService } from '../../services/release/build/build-artifact.service';
import type { BuildNotificationService } from '../../services/release/build/build-notification.service';
import type { ReleaseRepository } from '../../models/release/release.repository';
import type { ReleaseUploadsRepository } from '../../models/release/release-uploads.repository';
import type { ReleasePlatformTargetMappingRepository } from '../../models/release/release-platform-target-mapping.repository';
import type { CronJobRepository } from '../../models/release/cron-job.repository';
import type { ReleaseTaskRepository } from '../../models/release/release-task.repository';
import type { BuildRepository } from '../../models/release/build.repository';
import type { RegressionCycleRepository } from '../../models/release/regression-cycle.repository';
import type { StoreIntegrationController, StoreCredentialController } from '../../storage/integrations/store/store-controller';
import type { CronicleService } from '../../services/cronicle';
import type { TaskExecutor } from '../../services/release/task-executor/task-executor';
import type { GlobalSchedulerService } from '../../services/release/cron-job/global-scheduler.service';
import type { CronJobService } from '../../services/release/cron-job/cron-job.service';
import type { UploadValidationService } from '../../services/release/upload-validation.service';
import type { ManualUploadService } from '../../services/release/manual-upload.service';
import type { BuildCallbackService } from '../../services/release/build-callback.service';
import type { TestFlightBuildVerificationService } from '../../services/release/testflight-build-verification.service';
import type { ReleaseScheduleService } from '../../services/release-schedules/release-schedule.service';

/**
 * Storage with release management services attached
 *
 * S3Storage initializes these services during setup()
 */
export type StorageWithReleaseServices = storageTypes.Storage & {
  // Services
  releaseCreationService: ReleaseCreationService;
  releaseRetrievalService: ReleaseRetrievalService;
  releaseStatusService: ReleaseStatusService;
  releaseUpdateService: ReleaseUpdateService;
  releaseActivityLogService: ReleaseActivityLogService;
  releaseNotificationService: ReleaseNotificationService;
  buildArtifactService: BuildArtifactService;
  buildNotificationService: BuildNotificationService;
  cronJobService: CronJobService;
  taskExecutor: TaskExecutor;
  globalSchedulerService: GlobalSchedulerService;  // ✅ Required - actively initialized in aws-storage.ts
  uploadValidationService: UploadValidationService;
  manualUploadService: ManualUploadService;
  buildCallbackService: BuildCallbackService;
  testFlightBuildVerificationService: TestFlightBuildVerificationService;
  releaseScheduleService: ReleaseScheduleService;

  // Repositories
  releaseRepository: ReleaseRepository;
  releaseUploadsRepository: ReleaseUploadsRepository;
  platformMappingRepository: ReleasePlatformTargetMappingRepository;
  releasePlatformTargetMappingRepository: ReleasePlatformTargetMappingRepository;
  cronJobRepository: CronJobRepository;
  releaseTaskRepository: ReleaseTaskRepository;
  buildRepository: BuildRepository;
  regressionCycleRepository: RegressionCycleRepository;

  // Store Controllers (for TestFlight verification)
  storeIntegrationController: StoreIntegrationController;
  storeCredentialController: StoreCredentialController;

  // Cronicle Service (optional - for workflow polling jobs)
  cronicleService?: CronicleService;
};

/**
 * Type guard to check if storage has release services initialized
 */
export const hasReleaseCreationService = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.releaseCreationService !== undefined;
};

/**
 * Type guard to check if storage has manual upload dependencies
 */
export const hasManualUploadDependencies = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  const hasUploadsRepo = storageWithServices.releaseUploadsRepository !== undefined;
  const hasReleaseRepo = storageWithServices.releaseRepository !== undefined;
  const hasPlatformRepo = storageWithServices.platformMappingRepository !== undefined;
  return hasUploadsRepo && hasReleaseRepo && hasPlatformRepo;
};

/**
 * Type guard to check if storage has build callback dependencies
 */
export const hasBuildCallbackDependencies = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  const hasBuildRepo = storageWithServices.buildRepository !== undefined;
  const hasTaskRepo = storageWithServices.releaseTaskRepository !== undefined;
  const hasReleaseRepo = storageWithServices.releaseRepository !== undefined;
  const hasCronRepo = storageWithServices.cronJobRepository !== undefined;
  return hasBuildRepo && hasTaskRepo && hasReleaseRepo && hasCronRepo;
};

/**
 * Type guard to check if storage has TestFlight verification dependencies
 */
export const hasTestFlightVerificationDependencies = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  const hasStoreController = storageWithServices.storeIntegrationController !== undefined;
  const hasCredController = storageWithServices.storeCredentialController !== undefined;
  const hasPlatformRepo = storageWithServices.releasePlatformTargetMappingRepository !== undefined;
  const hasReleaseRepo = storageWithServices.releaseRepository !== undefined;
  const hasUploadsRepo = storageWithServices.releaseUploadsRepository !== undefined;
  return hasStoreController && hasCredController && hasPlatformRepo && hasReleaseRepo && hasUploadsRepo;
};

/**
 * Type guard to check if storage has taskExecutor
 */
export const hasTaskExecutor = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.taskExecutor !== undefined;
};

/**
 * Type guard to check if storage has globalSchedulerService
 */
export const hasGlobalSchedulerService = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.globalSchedulerService !== undefined;
};

/**
 * Type guard to check if storage has cronJobService
 */
export const hasCronJobService = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.cronJobService !== undefined;
};

/**
 * Type guard to check if storage has uploadValidationService
 */
export const hasUploadValidationService = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.uploadValidationService !== undefined;
};

/**
 * Type guard to check if storage has manualUploadService
 */
export const hasManualUploadService = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.manualUploadService !== undefined;
};

/**
 * Type guard to check if storage has buildCallbackService
 */
export const hasBuildCallbackService = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.buildCallbackService !== undefined;
};

/**
 * Type guard to check if storage has releaseScheduleService
 */
export const hasReleaseScheduleService = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.releaseScheduleService !== undefined;
};

/**
 * Type guard to check if storage has testFlightBuildVerificationService
 */
export const hasTestFlightBuildVerificationService = (
  storage: storageTypes.Storage
): storage is StorageWithReleaseServices => {
  const storageWithServices = storage as StorageWithReleaseServices;
  return storageWithServices.testFlightBuildVerificationService !== undefined;
};
