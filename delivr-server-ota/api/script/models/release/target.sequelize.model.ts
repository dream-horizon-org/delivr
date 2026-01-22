/**
 * Target Sequelize Model
 * Reference table for supported targets (WEB, PLAY_STORE, APP_STORE)
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type TargetAttributes = {
  id: string;
  name: 'WEB' | 'PLAY_STORE' | 'APP_STORE';
  createdAt: Date;
  updatedAt: Date;
};

export type TargetModelType = typeof Model & {
  new (): Model<TargetAttributes>;
};

export const createTargetModel = (
  sequelize: Sequelize
): TargetModelType => {
  const TargetModel = sequelize.define<Model<TargetAttributes>>(
    'Target',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.ENUM('WEB', 'PLAY_STORE', 'APP_STORE'),
        allowNull: false,
        unique: true,
        field: 'name'
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
      tableName: 'targets',
      timestamps: true,
      underscored: false
    }
  ) as TargetModelType;

  return TargetModel;
};

