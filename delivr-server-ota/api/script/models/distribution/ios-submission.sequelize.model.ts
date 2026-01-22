/**
 * iOS Submission Build Sequelize Model
 * Tracks iOS build submissions to App Store
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type { SubmissionStatus, BuildType, IosReleaseType } from '~types/distribution/submission.constants';
import { SUBMISSION_STATUSES, BUILD_TYPES, IOS_RELEASE_TYPE } from '~types/distribution/submission.constants';

export type IosSubmissionBuildAttributes = {
  id: string;
  distributionId: string;
  testflightNumber: string;
  version: string;
  buildType: BuildType;
  storeType: string;
  status: SubmissionStatus;
  releaseNotes: string | null;
  phasedRelease: boolean | null;
  releaseType: IosReleaseType;
  resetRating: boolean | null;
  rolloutPercentage: number | null;
  appStoreVersionId: string | null;
  cronicleJobId: string | null;
  isActive: boolean;
  submittedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  statusUpdatedAt: Date;
};

export type IosSubmissionBuildModelType = typeof Model & {
  new (): Model<IosSubmissionBuildAttributes>;
};

export const createIosSubmissionBuildModel = (
  sequelize: Sequelize
): IosSubmissionBuildModelType => {
  const IosSubmissionBuildModel = sequelize.define<Model<IosSubmissionBuildAttributes>>(
    'IosSubmissionBuild',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique iOS submission identifier'
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
      testflightNumber: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'testflightNumber',
        comment: 'TestFlight build number'
      },
      version: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'version',
        comment: 'App version (e.g., 1.0.0)'
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
        defaultValue: 'APP_STORE',
        field: 'storeType',
        comment: 'Store type (default: APP_STORE)'
      },
      status: {
        type: DataTypes.ENUM(...SUBMISSION_STATUSES),
        allowNull: false,
        defaultValue: 'PENDING',
        field: 'status',
        comment: 'iOS submission lifecycle status'
      },
      releaseNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'releaseNotes',
        comment: 'Release notes for this submission'
      },
      phasedRelease: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'phasedRelease',
        comment: 'Whether phased release is enabled'
      },
      releaseType: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: IOS_RELEASE_TYPE,
        field: 'releaseType',
        comment: 'Release type (always AUTOMATIC for iOS)'
      },
      resetRating: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'resetRating',
        comment: 'Whether to reset app ratings'
      },
      rolloutPercentage: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: 'rolloutPercentage',
        comment: 'Percentage of users to rollout to (0-100)'
      },
      appStoreVersionId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'appStoreVersionId',
        comment: 'Apple App Store version ID (cached for performance)'
      },
      cronicleJobId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'cronicleJobId',
        comment: 'Cronicle job ID for status sync (null if no job or job deleted)'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'isActive',
        comment: 'Whether this submission is active'
      },
      submittedBy: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: 'submittedBy',
        comment: 'Account ID of user who submitted'
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
        comment: 'Timestamp when submission was submitted to App Store'
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
      tableName: 'ios_submission_builds',
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
  ) as IosSubmissionBuildModelType;

  return IosSubmissionBuildModel;
};

