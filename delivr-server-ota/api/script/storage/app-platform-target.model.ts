/**
 * App Platform Target Model
 * Separated for better code organization
 */

import { DataTypes, Sequelize } from 'sequelize';

export function createAppPlatformTargetModel(sequelize: Sequelize) {
  return sequelize.define(
    'app_platform_target',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      appId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'apps',
          key: 'id',
        },
      },
      platform: {
        type: DataTypes.ENUM('ANDROID', 'IOS'),
        allowNull: false,
      },
      target: {
        type: DataTypes.ENUM('PLAY_STORE', 'APP_STORE', 'DOTA'),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'app_platform_targets',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['appId', 'platform', 'target'],
          name: 'unique_app_platform_target',
        },
        {
          fields: ['appId'],
          name: 'idx_app_platform_targets_app_id',
        },
      ],
    }
  );
}
