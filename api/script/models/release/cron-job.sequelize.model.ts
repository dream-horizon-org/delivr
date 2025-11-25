/**
 * Cron Job Sequelize Model
 * Autopilot automation for release stages
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type CronJobAttributes = {
  id: string;
  releaseId: string;
  stage1Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage2Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  stage3Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  cronConfig: any; // JSON configuration object
  upcomingRegressions: any; // JSON array of upcoming regression schedules
  cronCreatedAt: Date;
  cronStoppedAt: Date | null;
  cronCreatedByAccountId: string;
  lockedBy: string | null; // Instance ID holding the lock (for horizontal scaling)
  lockedAt: Date | null; // When lock was acquired
  lockTimeout: number; // Lock timeout in seconds
  autoTransitionToStage3: boolean; // Controls automatic Stage 2 → Stage 3 transition
};

export type CronJobModelType = typeof Model & {
  new (): Model<CronJobAttributes>;
};

export const createCronJobModel = (
  sequelize: Sequelize
): CronJobModelType => {
  const CronJobModel = sequelize.define<Model<CronJobAttributes>>(
    'CronJob',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        field: 'releaseId'
      },
      stage1Status: {
        type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'stage1Status'
      },
      stage2Status: {
        type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'stage2Status'
      },
      stage3Status: {
        type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'stage3Status'
      },
      cronStatus: {
        type: DataTypes.ENUM('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'cronStatus'
      },
      cronConfig: {
        type: DataTypes.JSON,
        allowNull: false,
        field: 'cronConfig',
        comment: 'Cron configuration object'
      },
      upcomingRegressions: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'upcomingRegressions',
        comment: 'Array of upcoming regression schedules'
      },
      cronCreatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'cronCreatedAt'
      },
      cronStoppedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'cronStoppedAt'
      },
      cronCreatedByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'cronCreatedByAccountId'
      },
      lockedBy: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'lockedBy',
        comment: 'Instance ID holding the lock (for horizontal scaling)'
      },
      lockedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'lockedAt',
        comment: 'When lock was acquired'
      },
      lockTimeout: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 300,
        field: 'lockTimeout',
        comment: 'Lock timeout in seconds (default 300 = 5 minutes)'
      },
      autoTransitionToStage3: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'autoTransitionToStage3',
        comment: 'Controls automatic Stage 2 → Stage 3 transition'
      }
    },
    {
      tableName: 'cron_jobs',
      timestamps: false,
      underscored: false
    }
  ) as CronJobModelType;

  return CronJobModel;
};

