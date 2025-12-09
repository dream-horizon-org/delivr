/**
 * Release Config Sequelize Model
 * Release configuration profiles linking to various integration configs
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type { ReleaseConfiguration } from '~types/release-configs/release-config.interface';

export type ReleaseConfigAttributes = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'MAJOR' | 'MINOR' | 'HOTFIX';
  platformTargets: Array<{ platform: string; target: string }> | null;
  baseBranch: string | null;
  ciConfigId: string | null;
  testManagementConfigId: string | null;
  projectManagementConfigId: string | null;
  commsConfigId: string | null;
  // NOTE: releaseScheduleId removed - schedule references config via release_schedules.releaseConfigId
  hasManualBuildUpload: boolean;
  isActive: boolean;
  isDefault: boolean;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ReleaseConfigModelType = typeof Model & {
  new (): Model<ReleaseConfigAttributes>;
};

export const createReleaseConfigModel = (
  sequelize: Sequelize
): ReleaseConfigModelType => {
  const ReleaseConfigModel = sequelize.define<Model<ReleaseConfigAttributes>>(
    'ReleaseConfig',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
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
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      releaseType: {
        type: DataTypes.ENUM('MAJOR', 'MINOR', 'HOTFIX'),
        allowNull: false,
        field: 'releaseType'
      },
      platformTargets: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Array of platform-target pairs: [{"platform": "ANDROID", "target": "PLAY_STORE"}, ...]'
      },
      baseBranch: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'baseBranch',
        comment: 'Base branch for releases'
      },
      ciConfigId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'ciConfigId',
        comment: 'Reference to CI integration config (contains all build pipelines)'
      },
      testManagementConfigId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'testManagementConfigId',
        comment: 'Reference to Test Case Management integration config'
      },
      projectManagementConfigId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'projectManagementConfigId',
        comment: 'Reference to Project Management integration config'
      },
      commsConfigId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'commsConfigId'
      },
      // NOTE: releaseScheduleId removed - schedule references config via release_schedules.releaseConfigId
      hasManualBuildUpload: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'hasManualBuildUpload',
        comment: 'Whether manual build upload is enabled for this configuration'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'isActive'
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isDefault'
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'createdByAccountId',
        references: {
          model: 'accounts',
          key: 'id'
        }
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
      tableName: 'release_configurations',
      timestamps: true,
      underscored: false
    }
  ) as ReleaseConfigModelType;

  return ReleaseConfigModel;
};

