/**
 * Platform Sequelize Model
 * Reference table for supported platforms (ANDROID, IOS, WEB)
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type PlatformAttributes = {
  id: string;
  name: 'ANDROID' | 'IOS' | 'WEB';
  createdAt: Date;
  updatedAt: Date;
};

export type PlatformModelType = typeof Model & {
  new (): Model<PlatformAttributes>;
};

export const createPlatformModel = (
  sequelize: Sequelize
): PlatformModelType => {
  const PlatformModel = sequelize.define<Model<PlatformAttributes>>(
    'Platform',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.ENUM('ANDROID', 'IOS', 'WEB'),
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
      tableName: 'platforms',
      timestamps: true,
      underscored: false
    }
  ) as PlatformModelType;

  return PlatformModel;
};

