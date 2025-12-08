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
  type: 'MAJOR' | 'MINOR' | 'HOTFIX';
  branch: string | null; // Release branch name (e.g., "release/v1.0.0")
  baseBranch: string | null; // Base branch forked from (e.g., "master")
  baseReleaseId: string | null; // Parent release ID (for hotfixes)
  kickOffReminderDate: Date | null; // When to send kickoff reminder
  kickOffDate: Date | null; // When to start kickoff stage
  targetReleaseDate: Date | null; // Target/planned release date
  releaseDate: Date | null; // Actual release date when marked as COMPLETED
  hasManualBuildUpload: boolean;
  createdByAccountId: string; // Account ID who created release
  releasePilotAccountId: string | null; // Account ID of release pilot
  lastUpdatedByAccountId: string; // Account ID who last updated release
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
        references: {
          model: 'release_configurations',
          key: 'id'
        },
        comment: 'FK to release_configurations table'
      },
      tenantId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        field: 'tenantId',
        references: {
          model: 'tenants',
          key: 'id'
        }
      },
      status: {
        type: DataTypes.ENUM('IN_PROGRESS', 'COMPLETED', 'ARCHIVED'),
        allowNull: false,
        defaultValue: 'IN_PROGRESS',
        field: 'status'
      },
      type: {
        type: DataTypes.ENUM('MAJOR', 'MINOR', 'HOTFIX'),
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
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'createdByAccountId',
        references: {
          model: 'accounts',
          key: 'id'
        },
        comment: 'Account ID who created release'
      },
      releasePilotAccountId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'releasePilotAccountId',
        references: {
          model: 'accounts',
          key: 'id'
        },
        comment: 'Account ID of release pilot'
      },
      lastUpdatedByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'lastUpdatedByAccountId',
        references: {
          model: 'accounts',
          key: 'id'
        },
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

