/**
 * Build Sequelize Model
 * Tracks individual builds (iOS, Android, Web) for releases
 * 
 * Note: Uses ENUM for platform/target instead of FK references
 * This aligns with release_platforms_targets_mapping pattern
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type PlatformName = 'ANDROID' | 'IOS' | 'WEB';
export type TargetName = 'WEB' | 'PLAY_STORE' | 'APP_STORE';

export type BuildAttributes = {
  id: string;
  number: string;
  link: string | null;
  releaseId: string | null;
  platform: PlatformName;
  target: TargetName | null;
  regressionId: string | null;
  createdAt: Date;
  updatedAt: Date;
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
      number: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'number',
        comment: 'Build number from CI/CD'
      },
      link: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'link',
        comment: 'URL to build artifacts or CI/CD pipeline'
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'releaseId',
        references: {
          model: 'releases',
          key: 'id'
        }
      },
      platform: {
        type: DataTypes.ENUM('ANDROID', 'IOS', 'WEB'),
        allowNull: false,
        field: 'platform',
        comment: 'Platform: ANDROID, IOS, or WEB'
      },
      target: {
        type: DataTypes.ENUM('WEB', 'PLAY_STORE', 'APP_STORE'),
        allowNull: true,
        field: 'target',
        comment: 'Target: WEB, PLAY_STORE, or APP_STORE'
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
      tableName: 'builds',
      timestamps: true,
      underscored: false,
      indexes: [
        { fields: ['releaseId'] },
        { fields: ['platform'] },
        { fields: ['target'] },
        { fields: ['regressionId'] },
        { 
          fields: ['regressionId', 'platform'], 
          unique: true,
          name: 'idx_builds_regression_platform'
        }
      ]
    }
  ) as BuildModelType;

  return BuildModel;
};

