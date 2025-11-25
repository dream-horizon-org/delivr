import { DataTypes, Model, ModelStatic, Sequelize } from 'sequelize';

type BuildAttributes = {
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

let sequelizeInstance: Sequelize | null = null;
let BuildModel: ModelStatic<Model<BuildAttributes, BuildAttributes>> | null = null;

const initSequelize = (): Sequelize => {
  if (sequelizeInstance) return sequelizeInstance;
  const dbName = process.env.DB_NAME || 'codepushdb';
  const dbUser = process.env.DB_USER || 'root';
  const dbPass = process.env.DB_PASS || 'root';
  const dbHost = process.env.DB_HOST || 'localhost';

  sequelizeInstance = new Sequelize({
    database: dbName,
    username: dbUser,
    password: dbPass,
    host: dbHost,
    dialect: 'mysql'
  });
  return sequelizeInstance;
};

const initModel = (sequelize: Sequelize): ModelStatic<Model<BuildAttributes, BuildAttributes>> => {
  if (BuildModel) return BuildModel;
  BuildModel = sequelize.define<Model<BuildAttributes, BuildAttributes>>(
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
  );
  return BuildModel;
};

export class BuildRepository {
  private readonly sequelize: Sequelize;
  private readonly model: ModelStatic<Model<BuildAttributes, BuildAttributes>>;

  constructor() {
    this.sequelize = initSequelize();
    this.model = initModel(this.sequelize);
  }

  async create(attributes: BuildAttributes): Promise<void> {
    await this.model.create(attributes);
  }

  async findArtifactPaths(params: {
    tenantId: string;
    releaseId: string;
    platform: 'ANDROID' | 'IOS';
  }): Promise<string[]> {
    const { tenantId, releaseId, platform } = params;
    const rows = await this.model.findAll({
      attributes: ['artifact_path'],
      where: {
        tenant_id: tenantId,
        release_id: releaseId,
        platform
      }
    });
    const paths: string[] = [];
    for (const row of rows) {
      const data = row.get() as unknown as BuildAttributes;
      const pathValue = data.artifact_path ?? null;
      const hasPath = typeof pathValue === 'string' && pathValue.trim().length > 0;
      if (hasPath) {
        paths.push(pathValue);
      }
    }
    return paths;
  }

  async findByCiRunId(ciRunId: string): Promise<BuildAttributes | null> {
    const row = await this.model.findOne({
      where: { ci_run_id: ciRunId }
    });
    if (!row) return null;
    return row.get() as unknown as BuildAttributes;
  }

  async updateArtifactPath(buildId: string, artifactPath: string): Promise<void> {
    await this.model.update(
      { artifact_path: artifactPath, updated_at: new Date() as unknown as any },
      { where: { id: buildId } }
    );
  }
}


