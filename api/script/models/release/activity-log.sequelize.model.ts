/**
 * Activity Log Sequelize Model
 * Tracks all changes to releases (edits, slot additions, deletions, cron config changes)
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type ActivityLogAttributes = {
  id: string;
  releaseId: string;
  type: string;
  previousValue: any; // JSON object
  newValue: any; // JSON object
  updatedAt: Date;
  updatedBy: string;
};

export type ActivityLogModelType = typeof Model & {
  new (): Model<ActivityLogAttributes>;
};

export const createActivityLogModel = (
  sequelize: Sequelize
): ActivityLogModelType => {
  const ActivityLogModel = sequelize.define<Model<ActivityLogAttributes>>(
    'ActivityLog',
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
      tableName: 'activity_logs',
      timestamps: false,
      underscored: false
    }
  ) as ActivityLogModelType;

  return ActivityLogModel;
};

