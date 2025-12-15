/**
 * Submission Action History Sequelize Model
 * Tracks actions (pause, halt, cancel) taken on submissions
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type { SubmissionPlatform, SubmissionAction } from '~types/distribution/submission.constants';
import { SUBMISSION_PLATFORMS, SUBMISSION_ACTIONS } from '~types/distribution/submission.constants';

export type SubmissionActionHistoryAttributes = {
  id: string;
  submissionId: string;
  platform: SubmissionPlatform;
  action: SubmissionAction;
  reason: string;
  createdAt: Date;
  createdBy: string;
};

export type SubmissionActionHistoryModelType = typeof Model & {
  new (): Model<SubmissionActionHistoryAttributes>;
};

export const createSubmissionActionHistoryModel = (
  sequelize: Sequelize
): SubmissionActionHistoryModelType => {
  const SubmissionActionHistoryModel = sequelize.define<Model<SubmissionActionHistoryAttributes>>(
    'SubmissionActionHistory',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique action history identifier'
      },
      submissionId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'submissionId',
        comment: 'Reference to submission (iOS or Android) - polymorphic relationship'
      },
      platform: {
        type: DataTypes.ENUM(...SUBMISSION_PLATFORMS),
        allowNull: false,
        field: 'platform',
        comment: 'Platform type (ANDROID or IOS)'
      },
      action: {
        type: DataTypes.ENUM(...SUBMISSION_ACTIONS),
        allowNull: false,
        field: 'action',
        comment: 'Action taken (PAUSED, HALTED, CANCELLED)'
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'reason',
        comment: 'Reason for the action'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',
        comment: 'Timestamp when action was taken'
      },
      createdBy: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'createdBy',
        comment: 'Account ID of user who took the action'
      }
    },
    {
      tableName: 'submission_action_history',
      timestamps: false,
      underscored: false
    }
  ) as SubmissionActionHistoryModelType;

  return SubmissionActionHistoryModel;
};

