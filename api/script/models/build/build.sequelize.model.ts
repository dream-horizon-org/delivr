import { DataTypes, Model, Sequelize } from 'sequelize';

export type BuildAttributes = {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  artifactVersionCode: string;
  artifactVersionName: string;
  artifactPath: string | null;
  releaseId: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  storeType: 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE' | 'WEB';
  regressionId?: string | null;
  ciRunId?: string | null;
  buildUploadStatus: 'PENDING' | 'UPLOADED' | 'FAILED';
  buildType: 'MANUAL' | 'CI_CD';
  buildStage: 'KICK_OFF' | 'REGRESSION' | 'PRE_RELEASE';
  queueLocation?: string | null;
  workflowStatus?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
  ciRunType?: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI' | null;
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
      artifactVersionCode: { type: DataTypes.STRING(255), allowNull: false },
      artifactVersionName: { type: DataTypes.STRING(255), allowNull: false },
      artifactPath: { type: DataTypes.STRING(255), allowNull: true },
      releaseId: { type: DataTypes.STRING(255), allowNull: false },
      platform: { type: DataTypes.ENUM('ANDROID', 'IOS'), allowNull: false },
      storeType: {
        type: DataTypes.ENUM('APP_STORE', 'PLAY_STORE', 'TESTFLIGHT', 'MICROSOFT_STORE', 'FIREBASE'),
        allowNull: false
      },
      regressionId: { type: DataTypes.STRING(255), allowNull: true },
      ciRunId: { type: DataTypes.STRING(255), allowNull: true },
      buildUploadStatus: { type: DataTypes.ENUM('PENDING', 'UPLOADED', 'FAILED'), allowNull: false },
      buildType: { type: DataTypes.ENUM('MANUAL', 'CI_CD'), allowNull: false },
      buildStage: { type: DataTypes.ENUM('KICK_OFF', 'REGRESSION', 'PRE_RELEASE'), allowNull: false },
      queueLocation: { type: DataTypes.STRING(255), allowNull: true },
      workflowStatus: { type: DataTypes.ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'), allowNull: true },
      ciRunType: { type: DataTypes.ENUM('JENKINS', 'GITHUB_ACTIONS', 'CIRCLE_CI', 'GITLAB_CI'), allowNull: true },
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


