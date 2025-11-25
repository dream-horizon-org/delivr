import { DataTypes, Model, Sequelize } from 'sequelize';

export type BuildAttributes = {
  id: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
  artifact_version_code: string;
  artifact_version_name: string;
  artifact_path: string | null;
  release_id: string;
  platform: 'ANDROID' | 'IOS';
  storeType: 'APP_STORE' | 'PLAY_STORE' | 'TESTFLIGHT' | 'MICROSOFT_STORE' | 'FIREBASE';
  regression_id?: string | null;
  ci_run_id?: string | null;
  build_upload_status: 'PENDING' | 'UPLOADED' | 'FAILED';
  build_type: 'MANUAL' | 'CI_CD';
  queue_location?: string | null;
  queue_status?: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | null;
  ci_run_type?: 'JENKINS' | 'GITHUB_ACTIONS' | 'CIRCLE_CI' | 'GITLAB_CI' | null;
};

export type BuildModelType = typeof Model & {
  new (): Model<BuildAttributes>;
};

export const createBuildModel = (sequelize: Sequelize): BuildModelType => {
  const BuildModel = sequelize.define<Model<BuildAttributes>>(
    'Build',
    {
      id: { type: DataTypes.STRING(255), primaryKey: true, allowNull: false },
      tenant_id: { type: DataTypes.STRING(255), allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      artifact_version_code: { type: DataTypes.STRING(255), allowNull: false },
      artifact_version_name: { type: DataTypes.STRING(255), allowNull: false },
      artifact_path: { type: DataTypes.STRING(255), allowNull: true },
      release_id: { type: DataTypes.STRING(255), allowNull: false },
      platform: { type: DataTypes.ENUM('ANDROID', 'IOS'), allowNull: false },
      storeType: {
        type: DataTypes.ENUM('APP_STORE', 'PLAY_STORE', 'TESTFLIGHT', 'MICROSOFT_STORE', 'FIREBASE'),
        allowNull: false
      },
      regression_id: { type: DataTypes.STRING(255), allowNull: true },
      ci_run_id: { type: DataTypes.STRING(255), allowNull: true },
      build_upload_status: { type: DataTypes.ENUM('PENDING', 'UPLOADED', 'FAILED'), allowNull: false },
      build_type: { type: DataTypes.ENUM('MANUAL', 'CI_CD'), allowNull: false },
      queue_location: { type: DataTypes.STRING(255), allowNull: true },
      queue_status: { type: DataTypes.ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'), allowNull: true },
      ci_run_type: { type: DataTypes.ENUM('JENKINS', 'GITHUB_ACTIONS', 'CIRCLE_CI', 'GITLAB_CI'), allowNull: true }
    },
    {
      tableName: 'build',
      timestamps: false
    }
  ) as BuildModelType;

  return BuildModel;
};


