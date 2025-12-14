/**
 * Build Sequelize Model
 * Tracks individual builds (iOS, Android, Web) for releases
 * 
 * Supports both CI/CD triggered builds and manual uploads
 * Links to tasks for platform-specific retry functionality
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type {
  BuildPlatform,
  BuildStage,
  StoreType,
  BuildType,
  BuildUploadStatus,
  WorkflowStatus,
  CiRunType
} from '~types/release-management/builds';
import {
  BUILD_PLATFORMS,
  BUILD_STAGES,
  STORE_TYPES,
  BUILD_TYPES,
  BUILD_UPLOAD_STATUSES,
  WORKFLOW_STATUSES,
  CI_RUN_TYPES
} from '~types/release-management/builds';

export type BuildAttributes = {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  buildNumber: string | null;
  artifactVersionName: string | null;
  artifactPath: string | null;
  releaseId: string;
  platform: BuildPlatform;
  storeType: StoreType | null;
  regressionId: string | null;
  ciRunId: string | null;
  buildUploadStatus: BuildUploadStatus;
  buildType: BuildType;
  buildStage: BuildStage;
  queueLocation: string | null;
  workflowStatus: WorkflowStatus | null;
  ciRunType: CiRunType | null;
  taskId: string | null;
  internalTrackLink: string | null;
  testflightNumber: string | null;
};

export type BuildModelType = typeof Model & {
  new (): Model<BuildAttributes>;
};

export const createBuildModel = (
  sequelize: Sequelize
): BuildModelType => {
  const BuildModel = sequelize.define<Model<BuildAttributes>>(
    'Build',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'tenantId',
        references: {
          model: 'tenants',
          key: 'id'
        },
        comment: 'FK to tenants table'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updatedAt'
      },
      buildNumber: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'buildNumber',
        comment: 'Build number from CI/CD'
      },
      artifactVersionName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'artifactVersionName',
        comment: 'Version name of the artifact'
      },
      artifactPath: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'artifactPath',
        comment: 'Path or URL to build artifacts'
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'releaseId',
        references: {
          model: 'releases',
          key: 'id'
        },
        comment: 'FK to releases table'
      },
      platform: {
        type: DataTypes.ENUM(...BUILD_PLATFORMS),
        allowNull: false,
        field: 'platform',
        comment: 'Platform type'
      },
      storeType: {
        type: DataTypes.ENUM(...STORE_TYPES),
        allowNull: true,
        field: 'storeType',
        comment: 'Store provider type'
      },
      regressionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'regressionId',
        references: {
          model: 'regression_cycles',
          key: 'id'
        },
        comment: 'FK to regression_cycles table'
      },
      ciRunId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'ciRunId',
        comment: 'CI/CD run/job ID from the provider'
      },
      buildUploadStatus: {
        type: DataTypes.ENUM(...BUILD_UPLOAD_STATUSES),
        allowNull: false,
        field: 'buildUploadStatus',
        defaultValue: 'PENDING',
        comment: 'Build upload status'
      },
      buildType: {
        type: DataTypes.ENUM(...BUILD_TYPES),
        allowNull: false,
        field: 'buildType',
        comment: 'Build type - manual upload or CI/CD triggered'
      },
      buildStage: {
        type: DataTypes.ENUM(...BUILD_STAGES),
        allowNull: false,
        field: 'buildStage',
        comment: 'Build stage in release lifecycle'
      },
      queueLocation: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'queueLocation',
        comment: 'Queue location for CI/CD job'
      },
      workflowStatus: {
        type: DataTypes.ENUM(...WORKFLOW_STATUSES),
        allowNull: true,
        field: 'workflowStatus',
        comment: 'CI/CD workflow status - used for AWAITING_CALLBACK pattern'
      },
      ciRunType: {
        type: DataTypes.ENUM(...CI_RUN_TYPES),
        allowNull: true,
        field: 'ciRunType',
        comment: 'CI/CD provider type'
      },
      taskId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'taskId',
        references: {
          model: 'release_tasks',
          key: 'id'
        },
        comment: 'FK to release_tasks table - links build to specific task for retry'
      },
      internalTrackLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'internalTrackLink',
        comment: 'Play Store Internal Track Link'
      },
      testflightNumber: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'testflightNumber',
        comment: 'TestFlight build number'
      }
    },
    {
      tableName: 'builds',
      timestamps: true,
      underscored: false,
      indexes: [
        // Based on actual repository query patterns (verified from build.repository.ts):
        // - findByReleaseId, findByReleaseAndPlatform, findCiCdBuildsByReleaseAndWorkflowStatus
        { fields: ['releaseId'], name: 'idx_builds_release' },
        // - findByRegressionId, findByRegressionAndPlatform
        { fields: ['regressionId'], name: 'idx_builds_regression' },
        // - findByTaskId, findByTaskAndPlatform, findPendingByTaskId, findFailedByTaskId
        { fields: ['taskId'], name: 'idx_builds_task' },
        // - findByCiRunId (callback lookup)
        { fields: ['ciRunId'], name: 'idx_builds_ci_run_id' },
        // - findByTaskAndQueueLocation (unique callback identifier)
        { fields: ['taskId', 'queueLocation'], unique: true, name: 'idx_builds_task_queue_unique' }
      ]
    }
  ) as BuildModelType;

  return BuildModel;
};
