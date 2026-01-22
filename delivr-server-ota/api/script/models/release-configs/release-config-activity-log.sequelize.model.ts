/**
 * Release Config Activity Log Sequelize Model
 * Tracks all changes to release configs (base fields, CI, test mgmt, PM, comms, schedule)
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type ReleaseConfigActivityLogAttributes = {
  id: string;
  releaseConfigId: string;
  type: string;
  previousValue: any; // JSON object
  newValue: any; // JSON object
  updatedAt: Date;
  updatedBy: string;
};

export type ReleaseConfigActivityLogModelType = typeof Model & {
  new (): Model<ReleaseConfigActivityLogAttributes>;
};

export const createReleaseConfigActivityLogModel = (
  sequelize: Sequelize
): ReleaseConfigActivityLogModelType => {
  const ReleaseConfigActivityLogModel = sequelize.define<Model<ReleaseConfigActivityLogAttributes>>(
    'ReleaseConfigActivityLog',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      releaseConfigId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'releaseConfigId',
        references: {
          model: 'release_configurations',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: 'type'
      },
      previousValue: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'previousValue',
        comment: 'Previous value before change (JSON)'
      },
      newValue: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'newValue',
        comment: 'New value after change (JSON)'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt'
      },
      updatedBy: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'updatedBy',
        references: {
          model: 'accounts',
          key: 'id'
        }
      }
    },
    {
      tableName: 'release_config_activity_logs',
      timestamps: false,
      underscored: false
    }
  ) as ReleaseConfigActivityLogModelType;

  return ReleaseConfigActivityLogModel;
};

