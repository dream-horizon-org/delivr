import { DataTypes, Model, Sequelize } from 'sequelize';
import type {
  BuildPlatform,
  BuildStage,
  StoreType,
  BuildType,
  BuildUploadStatus,
  WorkflowStatus,
  CiRunType
} from '~types/release-management/builds';
import {
  BUILD_PLATFORMS,
  BUILD_STAGES,
  STORE_TYPES,
  BUILD_TYPES,
  BUILD_UPLOAD_STATUSES,
  WORKFLOW_STATUSES,
  CI_RUN_TYPES
} from '~types/release-management/builds';

export type BuildAttributes = {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  artifactVersionCode: string;
  artifactVersionName: string;
  artifactPath: string | null;
  releaseId: string;
  platform: BuildPlatform;
  storeType: StoreType | null;
  regressionId?: string | null;
  ciRunId?: string | null;
  buildUploadStatus: BuildUploadStatus;
  buildType: BuildType;
  buildStage: BuildStage;
  queueLocation?: string | null;
  workflowStatus?: WorkflowStatus | null;
  ciRunType?: CiRunType | null;
  taskId?: string | null;
  internalTrackLink?: string | null;
  testflightNumber?: string | null;
};

export type BuildModelType = typeof Model & {
  new (): Model<BuildAttributes>;
};

export const createBuildModel = (sequelize: Sequelize): BuildModelType => {
  const BuildModel = sequelize.define<Model<BuildAttributes>>(
    'Build',
    {
      id: { type: DataTypes.STRING(255), primaryKey: true, allowNull: false },
      tenantId: { type: DataTypes.STRING(255), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      artifactVersionCode: { type: DataTypes.STRING(255), allowNull: true },
      artifactVersionName: { type: DataTypes.STRING(255), allowNull: false },
      artifactPath: { type: DataTypes.STRING(255), allowNull: true },
      releaseId: { type: DataTypes.STRING(255), allowNull: false },
      platform: { type: DataTypes.ENUM(...BUILD_PLATFORMS), allowNull: false },
      storeType: { type: DataTypes.ENUM(...STORE_TYPES), allowNull: true },
      regressionId: { type: DataTypes.STRING(255), allowNull: true },
      ciRunId: { type: DataTypes.STRING(255), allowNull: true },
      buildUploadStatus: { type: DataTypes.ENUM(...BUILD_UPLOAD_STATUSES), allowNull: false },
      buildType: { type: DataTypes.ENUM(...BUILD_TYPES), allowNull: false },
      buildStage: { type: DataTypes.ENUM(...BUILD_STAGES), allowNull: false },
      queueLocation: { type: DataTypes.STRING(255), allowNull: true },
      workflowStatus: { type: DataTypes.ENUM(...WORKFLOW_STATUSES), allowNull: true },
      ciRunType: { type: DataTypes.ENUM(...CI_RUN_TYPES), allowNull: true },
      taskId: { type: DataTypes.STRING(255), allowNull: true },
      internalTrackLink: { type: DataTypes.STRING(255), allowNull: true },
      testflightNumber: { type: DataTypes.STRING(255), allowNull: true }
    },
    {
      tableName: 'build',
      timestamps: false
    }
  ) as BuildModelType;

  return BuildModel;
};
