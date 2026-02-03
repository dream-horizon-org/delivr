/**
 * ReleaseUploads Sequelize Model
 * 
 * Represents manual build uploads staging table.
 * Uploads are stored here temporarily before being consumed by build tasks.
 * 
 * Key Features:
 * - Per-platform uploads for each stage
 * - isUsed flag tracks consumption status
 * - Links to task and cycle that consumed the upload
 */

import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import { PlatformName } from './release.interface';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Build stage for manual uploads
 * Uses same values as builds.buildStage for consistency
 */
export type UploadStage = 'KICKOFF' | 'REGRESSION' | 'PRE_RELEASE';

/**
 * ReleaseUpload attributes (all fields)
 */
export type ReleaseUploadAttributes = {
  id: string;
  appId: string;
  releaseId: string;
  platform: PlatformName;
  stage: UploadStage;
  artifactPath: string | null;
  internalTrackLink: string | null;
  testflightNumber: string | null;
  isUsed: boolean;
  usedByTaskId: string | null;
  usedByCycleId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * ReleaseUpload creation attributes (optional fields for create)
 */
export type ReleaseUploadCreationAttributes = Optional<
  ReleaseUploadAttributes,
  'id' | 'artifactPath' | 'internalTrackLink' | 'testflightNumber' | 'isUsed' | 'usedByTaskId' | 'usedByCycleId' | 'createdAt' | 'updatedAt'
>;

// ============================================================================
// MODEL CLASS
// ============================================================================

export class ReleaseUploadModel extends Model<ReleaseUploadAttributes, ReleaseUploadCreationAttributes> {
  declare id: string;
  declare appId: string;
  declare releaseId: string;
  declare platform: PlatformName;
  declare stage: UploadStage;
  declare artifactPath: string | null;
  declare internalTrackLink: string | null;
  declare testflightNumber: string | null;
  declare isUsed: boolean;
  declare usedByTaskId: string | null;
  declare usedByCycleId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// ============================================================================
// MODEL FACTORY
// ============================================================================

/**
 * Create and initialize the ReleaseUpload model
 */
export const createReleaseUploadModel = (sequelize: Sequelize): typeof ReleaseUploadModel => {
  ReleaseUploadModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
      },
      appId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'appId',
        references: {
          model: 'apps',  // Changed from 'tenants' to 'apps'
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to apps table (renamed from tenants)'
      },
      releaseId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'releaseId',
        references: {
          model: 'releases',
          key: 'id',
        },
      },
      platform: {
        type: DataTypes.ENUM('ANDROID', 'IOS', 'WEB'),
        allowNull: false,
      },
      stage: {
        type: DataTypes.ENUM('KICKOFF', 'REGRESSION', 'PRE_RELEASE'),
        allowNull: false,
      },
      artifactPath: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: 'artifactPath',
        comment: 'S3 artifact path (null for TestFlight builds)',
      },
      internalTrackLink: {
        type: DataTypes.STRING(1024),
        allowNull: true,
        field: 'internalTrackLink',
      },
      testflightNumber: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'testflightNumber',
        comment: 'TestFlight build number (for iOS TestFlight builds)',
      },
      isUsed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'isUsed',
      },
      usedByTaskId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'usedByTaskId',
        references: {
          model: 'release_tasks',
          key: 'id',
        },
      },
      usedByCycleId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'usedByCycleId',
        references: {
          model: 'regression_cycles',
          key: 'id',
        },
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'createdAt',
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updatedAt',
      },
    },
    {
      sequelize,
      tableName: 'release_uploads',
      modelName: 'ReleaseUpload',
      timestamps: true,
      indexes: [
        // Note: Index on appId omitted so sync succeeds when table exists without appId (add via migration first, then add this index)
        { fields: ['releaseId'] },
        { fields: ['releaseId', 'stage'] },
        { fields: ['releaseId', 'platform', 'stage'] },
        { fields: ['releaseId', 'stage', 'isUsed'] },
        { fields: ['usedByTaskId'] },
        { fields: ['usedByCycleId'] },
      ],
    }
  );

  return ReleaseUploadModel;
};

export default createReleaseUploadModel;

