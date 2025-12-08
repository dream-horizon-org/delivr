/**
 * Release Management Models - Public Exports
 * Central export point for all release-related models, repositories, and interfaces
 */

// Sequelize Models
export { createReleaseModel } from './release.sequelize.model';
export type { ReleaseAttributes, ReleaseModelType } from './release.sequelize.model';

export { createCronJobModel } from './cron-job.sequelize.model';
export type { CronJobAttributes, CronJobModelType } from './cron-job.sequelize.model';

export { createReleaseTaskModel } from './release-task.sequelize.model';
export type { ReleaseTaskAttributes, ReleaseTaskModelType } from './release-task.sequelize.model';

export { createStateHistoryModel } from './state-history.sequelize.model';
export type { StateHistoryAttributes, StateHistoryModelType } from './state-history.sequelize.model';

export { createPlatformTargetMappingModel } from './platform-target-mapping.sequelize.model';
export type { PlatformTargetMappingAttributes, PlatformTargetMappingModelType } from './platform-target-mapping.sequelize.model';

export { createPlatformModel } from './platform.sequelize.model';
export type { PlatformAttributes, PlatformModelType } from './platform.sequelize.model';

export { createTargetModel } from './target.sequelize.model';
export type { TargetAttributes, TargetModelType } from './target.sequelize.model';

export { createBuildModel } from './build.sequelize.model';
export type { BuildAttributes, BuildModelType, PlatformName, TargetName } from './build.sequelize.model';

export { createRegressionCycleModel } from './regression-cycle.sequelize.model';
export type { RegressionCycleAttributes, RegressionCycleModelType } from './regression-cycle.sequelize.model';

// Repositories
export { ReleaseRepository } from './release.repository';
export { CronJobRepository } from './cron-job.repository';
export { ReleaseTaskRepository } from './release-task.repository';
export { StateHistoryRepository } from './state-history.repository';
export { ReleasePlatformTargetMappingRepository } from './release-platform-target-mapping.repository';
export { PlatformRepository } from './platform.repository';
export { TargetRepository } from './target.repository';
export { RegressionCycleRepository } from './regression-cycle.repository';

// Interfaces
export type {
  Platform,
  CreatePlatformDto,
  Target,
  CreateTargetDto,
  Release,
  CreateReleaseDto,
  UpdateReleaseDto,
  ReleasePlatformTargetMapping,
  CreateReleasePlatformTargetMappingDto,
  CronJob,
  CreateCronJobDto,
  UpdateCronJobDto,
  ReleaseTask,
  CreateReleaseTaskDto,
  UpdateReleaseTaskDto,
  StateHistory,
  CreateStateHistoryDto
} from './release.interface';
