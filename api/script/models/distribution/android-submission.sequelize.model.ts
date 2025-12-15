/**
 * Android Submission Build Sequelize Model
 * Tracks Android build submissions to Play Store
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type { SubmissionStatus, BuildType } from '~types/distribution/submission.constants';
import { SUBMISSION_STATUSES, BUILD_TYPES } from '~types/distribution/submission.constants';

export type AndroidSubmissionBuildAttributes = {
  id: string;
  distributionId: string;
  internalTrackLink: string | null;
  artifactPath: string;
  version: string;
  versionCode: number;
  buildType: BuildType;
  storeType: string;
  status: SubmissionStatus;
  releaseNotes: string | null;
  inAppUpdatePriority: number | null;
  rolloutPercentage: number | null;
  submittedBy: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  statusUpdatedAt: Date;
};

export type AndroidSubmissionBuildModelType = typeof Model & {
  new (): Model<AndroidSubmissionBuildAttributes>;
};

export const createAndroidSubmissionBuildModel = (
  sequelize: Sequelize
): AndroidSubmissionBuildModelType => {
  const AndroidSubmissionBuildModel = sequelize.define<Model<AndroidSubmissionBuildAttributes>>(
    'AndroidSubmissionBuild',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique Android submission identifier'
      },
      distributionId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'distributionId',
        references: {
          model: 'distribution',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to distribution table'
      },
      internalTrackLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'internalTrackLink',
        comment: 'Internal track link for Play Store'
      },
      artifactPath: {
        type: DataTypes.TEXT,
        allowNull: false,
        field: 'artifactPath',
        comment: 'Path to the APK/AAB artifact'
      },
      version: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'version',
        comment: 'App version name (e.g., 1.0.0)'
      },
      versionCode: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'versionCode',
        comment: 'Android version code (numeric)'
      },
      buildType: {
        type: DataTypes.ENUM(...BUILD_TYPES),
        allowNull: false,
        field: 'buildType',
        comment: 'Build type (MANUAL or CI_CD)'
      },
      storeType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'PLAY_STORE',
        field: 'storeType',
        comment: 'Store type (default: PLAY_STORE)'
      },
      status: {
        type: DataTypes.ENUM(...SUBMISSION_STATUSES),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'status',
        comment: 'Android submission lifecycle status'
      },
      releaseNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'releaseNotes',
        comment: 'Release notes for this submission'
      },
      inAppUpdatePriority: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'inAppUpdatePriority',
        comment: 'In-app update priority (0-5)'
      },
      rolloutPercentage: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'rolloutPercentage',
        comment: 'Percentage of users to rollout to (0-100)'
      },
      submittedBy: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'submittedBy',
        comment: 'Account ID of user who submitted'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'isActive',
        comment: 'Whether this submission is active'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',
        comment: 'Timestamp when submission was created'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt',
        comment: 'Timestamp when submission was last updated'
      },
      submittedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'submittedAt',
        comment: 'Timestamp when submission was submitted to Play Store'
      },
      statusUpdatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'statusUpdatedAt',
        comment: 'Timestamp when status was last changed'
      }
    },
    {
      tableName: 'android_submission_builds',
      timestamps: true,
      underscored: false,
      hooks: {
        beforeUpdate: (instance: any) => {
          const statusChanged = instance.changed('status');
          if (statusChanged) {
            instance.statusUpdatedAt = new Date();
          }
          
          const statusIsSubmitted = instance.status === 'SUBMITTED';
          const submittedAtIsNull = !instance.submittedAt;
          if (statusIsSubmitted && submittedAtIsNull) {
            instance.submittedAt = new Date();
          }
        }
      }
    }
  ) as AndroidSubmissionBuildModelType;

  return AndroidSubmissionBuildModel;
};

