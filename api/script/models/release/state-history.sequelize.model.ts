/**
 * State History Sequelize Model
 * Audit trail for release changes
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type StateHistoryAttributes = {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'REMOVE' | 'ADD';
  accountId: string;
  releaseId: string | null;
  codepushId: string | null;
  settingsId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StateHistoryModelType = typeof Model & {
  new (): Model<StateHistoryAttributes>;
};

export const createStateHistoryModel = (
  sequelize: Sequelize
): StateHistoryModelType => {
  const StateHistoryModel = sequelize.define<Model<StateHistoryAttributes>>(
    'StateHistory',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      action: {
        type: DataTypes.ENUM('CREATE', 'UPDATE', 'REMOVE', 'ADD'),
        allowNull: false,
        defaultValue: 'CREATE',
        field: 'action'
      },
      accountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'accountId'
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'releaseId'
      },
      codepushId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'codepushId'
      },
      settingsId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'settingsId'
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
      tableName: 'state_history',
      timestamps: true,
      underscored: false
    }
  ) as StateHistoryModelType;

  return StateHistoryModel;
};

