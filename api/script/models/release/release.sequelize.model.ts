/**
 * Release Sequelize Model
 * Core release information and metadata
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type ReleaseAttributes = {
  id: string;
  releaseId: string; // User-facing release ID (e.g., "REL-001")
  releaseConfigId: string | null; // FK to release_configurations table
  tenantId: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  type: 'PLANNED' | 'HOTFIX' | 'UNPLANNED';
  branch: string | null; // Release branch name (e.g., "release/v1.0.0")
  baseBranch: string | null; // Base branch forked from (e.g., "master")
  baseReleaseId: string | null; // Parent release ID (for hotfixes)
  kickOffReminderDate: Date | null; // When to send kickoff reminder
  kickOffDate: Date | null; // When to start kickoff stage
  targetReleaseDate: Date | null; // Target/planned release date
  releaseDate: Date | null; // Actual release date when marked as COMPLETED
  hasManualBuildUpload: boolean;
  customIntegrationConfigs: any; // Per-release integration config overrides
  preCreatedBuilds: any; // Array of pre-created builds
  createdBy: string; // Account ID who created release
  lastUpdatedBy: string; // Account ID who last updated release
  createdAt: Date;
  updatedAt: Date;
};

export type ReleaseModelType = typeof Model & {
  new (): Model<ReleaseAttributes>;
};

export const createReleaseModel = (
  sequelize: Sequelize
): ReleaseModelType => {
  const ReleaseModel = sequelize.define<Model<ReleaseAttributes>>(
    'Release',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'releaseId',
        comment: 'User-facing release identifier (e.g., REL-001)'
      },
      releaseConfigId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'releaseConfigId',
        comment: 'FK to release_configurations table'
      },
      tenantId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        field: 'tenantId'
      },
      status: {
        type: DataTypes.ENUM('IN_PROGRESS', 'COMPLETED', 'ARCHIVED'),
        allowNull: false,
        defaultValue: 'IN_PROGRESS',
        field: 'status'
      },
      type: {
        type: DataTypes.ENUM('PLANNED', 'HOTFIX', 'UNPLANNED'),
        allowNull: false,
        field: 'type'
      },
      branch: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'branch',
        comment: 'Release branch name (e.g., release/v1.0.0)'
      },
      baseBranch: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'baseBranch',
        comment: 'Base branch forked from (e.g., master)'
      },
      baseReleaseId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'baseReleaseId',
        comment: 'Parent release ID (for hotfixes)'
      },
      kickOffReminderDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'kickOffReminderDate',
        comment: 'When to send kickoff reminder'
      },
      kickOffDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'kickOffDate',
        comment: 'When to start kickoff stage'
      },
      targetReleaseDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'targetReleaseDate',
        comment: 'Target/planned release date'
      },
      releaseDate: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'releaseDate',
        comment: 'Actual release date when release is marked as COMPLETED'
      },
      hasManualBuildUpload: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'hasManualBuildUpload',
        comment: 'Whether manual build upload is enabled'
      },
      customIntegrationConfigs: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'customIntegrationConfigs',
        comment: 'Per-release integration config overrides (JSON object)'
      },
      preCreatedBuilds: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'preCreatedBuilds',
        comment: 'Array of pre-created builds'
      },
      createdBy: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'createdBy',
        comment: 'Account ID who created release'
      },
      lastUpdatedBy: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'lastUpdatedBy',
        comment: 'Account ID who last updated release'
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
      }
    },
    {
      tableName: 'releases',
      timestamps: true,
      underscored: false
    }
  ) as ReleaseModelType;

  return ReleaseModel;
};

