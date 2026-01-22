/**
 * Release Platform Target Mapping Sequelize Model
 * Links releases to platform-target combinations with version and integration run IDs
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type PlatformTargetMappingAttributes = {
  id: string;
  releaseId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  target: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
  version: string; // Version for this platform-target combination (e.g., v6.5.0)
  projectManagementRunId: string | null; // Project management run ID (e.g., Jira epic ID)
  testManagementRunId: string | null; // Test management run ID (e.g., test suite run ID)
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformTargetMappingModelType = typeof Model & {
  new (): Model<PlatformTargetMappingAttributes>;
};

export const createPlatformTargetMappingModel = (
  sequelize: Sequelize
): PlatformTargetMappingModelType => {
  const PlatformTargetMappingModel = sequelize.define<Model<PlatformTargetMappingAttributes>>(
    'PlatformTargetMapping',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'releaseId',
        references: {
          model: 'releases',
          key: 'id'
        }
      },
      platform: {
        type: DataTypes.ENUM('ANDROID', 'IOS', 'WEB'),
        allowNull: false,
        field: 'platform'
      },
      target: {
        type: DataTypes.ENUM('WEB', 'PLAY_STORE', 'APP_STORE'),
        allowNull: false,
        field: 'target'
      },
      version: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'version',
        comment: 'Version for this platform-target combination (e.g., v6.5.0)'
      },
      projectManagementRunId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'projectManagementRunId',
        comment: 'Project management run ID (e.g., Jira epic ID for this platform-target)'
      },
      testManagementRunId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'testManagementRunId',
        comment: 'Test management run ID (e.g., test suite run ID for this platform-target)'
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
      tableName: 'release_platforms_targets_mapping',
      timestamps: true,
      underscored: false,
      indexes: [
        {
          unique: true,
          fields: ['releaseId', 'platform', 'target']
        },
        {
          fields: ['projectManagementRunId']
        },
        {
          fields: ['testManagementRunId']
        }
      ]
    }
  ) as PlatformTargetMappingModelType;

  return PlatformTargetMappingModel;
};

