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
  stage4Status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  cronStatus: 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  pauseType: 'NONE' | 'AWAITING_STAGE_TRIGGER' | 'USER_REQUESTED' | 'TASK_FAILURE';
  cronConfig: any; // JSON configuration object
  upcomingRegressions: any; // JSON array of upcoming regression schedules
  cronCreatedAt: Date;
  cronStoppedAt: Date | null;
  cronCreatedByAccountId: string;
  lockedBy: string | null; // Instance ID holding the lock (for horizontal scaling)
  lockedAt: Date | null; // When lock was acquired
  lockTimeout: number; // Lock timeout in seconds
  autoTransitionToStage3: boolean; // Controls automatic Stage 2 → Stage 3 transition
  autoTransitionToStage2: boolean; // Controls automatic Stage 1 → Stage 2 transition
  stageData: any; // JSON object for stage-specific data
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
        field: 'releaseId',
        references: {
          model: 'releases',
          key: 'id'
        }
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
      stage4Status: {
        type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'stage4Status',
        comment: 'Stage 4 (Submission) status tracking'
      },
      cronStatus: {
        type: DataTypes.ENUM('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED'),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'cronStatus'
      },
      pauseType: {
        type: DataTypes.ENUM('NONE', 'AWAITING_STAGE_TRIGGER', 'USER_REQUESTED', 'TASK_FAILURE'),
        allowNull: false,
        defaultValue: 'NONE',
        field: 'pauseType',
        comment: 'Reason for pause (NONE = not paused)'
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
        field: 'cronCreatedByAccountId',
        references: {
          model: 'accounts',
          key: 'id'
        }
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
      },
      autoTransitionToStage2: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'autoTransitionToStage2',
        comment: 'Controls automatic Stage 1 → Stage 2 transition'
      },
      stageData: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'stageData',
        comment: 'JSON object for stage-specific data'
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

