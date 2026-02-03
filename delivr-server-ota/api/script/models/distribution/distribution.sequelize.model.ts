/**
 * Distribution Sequelize Model
 * Tracks release distributions across platforms and store types
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type { DistributionStatus } from '~types/distribution/distribution.constants';
import { DISTRIBUTION_STATUSES } from '~types/distribution/distribution.constants';

export type DistributionAttributes = {
  id: string;
  appId: string;
  releaseId: string;
  branch: string;
  configuredListOfPlatforms: string[];
  configuredListOfStoreTypes: string[];
  status: DistributionStatus;
  createdAt: Date;
  updatedAt: Date;
  statusUpdatedAt: Date;
};

export type DistributionModelType = typeof Model & {
  new (): Model<DistributionAttributes>;
};

export const createDistributionModel = (
  sequelize: Sequelize
): DistributionModelType => {
  const DistributionModel = sequelize.define<Model<DistributionAttributes>>(
    'Distribution',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique distribution identifier'
      },
      appId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'appId',
        references: {
          model: 'apps',  // Changed from 'tenants' to 'apps'
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to apps table (renamed from tenants)'
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'releaseId',
        references: {
          model: 'releases',
          key: 'id'
        },
        comment: 'Reference to releases table'
      },
      branch: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'branch',
        comment: 'Release branch name (e.g., release/v1.0.0)'
      },
      configuredListOfPlatforms: {
        type: DataTypes.JSON,
        allowNull: false,
        field: 'configuredListOfPlatforms',
        comment: 'Array of platforms configured for this distribution (e.g., ["ANDROID", "IOS"])'
      },
      configuredListOfStoreTypes: {
        type: DataTypes.JSON,
        allowNull: false,
        field: 'configuredListOfStoreTypes',
        comment: 'Array of store types configured for this distribution (e.g., ["APP_STORE", "PLAY_STORE"])'
      },
      status: {
        type: DataTypes.ENUM(...DISTRIBUTION_STATUSES),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'status',
        comment: 'Distribution lifecycle status'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',
        comment: 'Timestamp when distribution was created'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt',
        comment: 'Timestamp when distribution was last updated'
      },
      statusUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'statusUpdatedAt',
        comment: 'Timestamp when status was last changed'
      }
    },
    {
      tableName: 'distribution',
      timestamps: true,
      underscored: false,
      hooks: {
        beforeUpdate: (instance: any) => {
          const statusChanged = instance.changed('status');
          if (statusChanged) {
            instance.statusUpdatedAt = new Date();
          }
        }
      }
    }
  ) as DistributionModelType;

  return DistributionModel;
};

