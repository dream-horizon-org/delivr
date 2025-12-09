/**
 * Release Task Sequelize Model
 * Tracks individual tasks in a release workflow
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

export type ReleaseTaskAttributes = {
  id: string;
  releaseId: string;
  taskId: string | null; // Unique task identifier
  taskType: string; // Type of task (e.g., CREATE_JIRA_EPIC, TRIGGER_BUILD)
  taskStatus: 'PENDING' | 'IN_PROGRESS' | 'AWAITING_CALLBACK' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  taskConclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  stage: 'KICKOFF' | 'REGRESSION' | 'POST_REGRESSION';
  branch: string | null;
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: string | null; // Task identifier prefix
  accountId: string | null; // Account ID associated with task
  regressionId: string | null; // FK to regression_cycles
  externalId: string | null; // ID returned by integration (e.g., JIRA ticket ID)
  externalData: any; // Additional data from integration response
  createdAt: Date;
  updatedAt: Date;
};

export type ReleaseTaskModelType = typeof Model & {
  new (): Model<ReleaseTaskAttributes>;
};

export const createReleaseTaskModel = (
  sequelize: Sequelize
): ReleaseTaskModelType => {
  const ReleaseTaskModel = sequelize.define<Model<ReleaseTaskAttributes>>(
    'ReleaseTask',
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
      taskId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        field: 'taskId',
        comment: 'Unique task identifier'
      },
      taskType: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'taskType',
        comment: 'Type of task (e.g., CREATE_JIRA_EPIC, TRIGGER_BUILD)'
      },
      taskStatus: {
        type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'AWAITING_CALLBACK', 'COMPLETED', 'FAILED', 'SKIPPED'),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'taskStatus',
        comment: 'Task execution status (AWAITING_CALLBACK for CI/CD callbacks, SKIPPED for platform-specific tasks)'
      },
      taskConclusion: {
        type: DataTypes.ENUM('success', 'failure', 'cancelled', 'skipped'),
        allowNull: true,
        field: 'taskConclusion'
      },
      stage: {
        type: DataTypes.ENUM('KICKOFF', 'REGRESSION', 'POST_REGRESSION'),
        allowNull: false,
        field: 'stage',
        comment: 'Which stage this task belongs to'
      },
      branch: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'branch'
      },
      isReleaseKickOffTask: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isReleaseKickOffTask'
      },
      isRegressionSubTasks: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isRegressionSubTasks'
      },
      identifier: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'identifier',
        comment: 'Task identifier prefix'
      },
      accountId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'accountId',
        references: {
          model: 'accounts',
          key: 'id'
        }
      },
      regressionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'regressionId',
        comment: 'FK to regression_cycles table'
      },
      externalId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'externalId',
        comment: 'ID returned by integration (e.g., JIRA ticket ID, build ID)'
      },
      externalData: {
        type: DataTypes.JSON,
        allowNull: true,
        field: 'externalData',
        comment: 'Additional data from integration response'
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
      tableName: 'release_tasks',
      timestamps: true,
      underscored: false
    }
  ) as ReleaseTaskModelType;

  return ReleaseTaskModel;
};

