/**
 * Regression Cycle Sequelize Model
 * Tracks regression cycles within a release workflow
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type RegressionCycleStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export type RegressionCycleAttributes = {
  id: string;
  releaseId: string;
  isLatest: boolean;
  status: RegressionCycleStatus;
  cycleTag: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type RegressionCycleModelType = typeof Model & {
  new (): Model<RegressionCycleAttributes>;
};

export const createRegressionCycleModel = (
  sequelize: Sequelize
): RegressionCycleModelType => {
  const RegressionCycleModel = sequelize.define<Model<RegressionCycleAttributes>>(
    'RegressionCycle',
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
      isLatest: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'isLatest',
        comment: 'Whether this is the current active regression cycle'
      },
      status: {
        type: DataTypes.ENUM('NOT_STARTED', 'IN_PROGRESS', 'DONE'),
        allowNull: false,
        defaultValue: 'NOT_STARTED',
        field: 'status'
      },
      cycleTag: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'cycleTag',
        comment: 'RC tag (e.g., RC1, RC2)'
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
      tableName: 'regression_cycles',
      timestamps: true,
      underscored: false,
      indexes: [
        { fields: ['releaseId'] },
        { 
          fields: ['releaseId', 'isLatest'],
          name: 'idx_regression_cycles_release_latest'
        }
      ]
    }
  ) as RegressionCycleModelType;

  return RegressionCycleModel;
};

