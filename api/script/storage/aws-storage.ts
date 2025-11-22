import { S3 } from "aws-sdk";
import { CreateBucketRequest, HeadBucketRequest } from "aws-sdk/clients/s3";
import { DataTypes, Sequelize } from "sequelize";
import * as stream from "stream";
import * as storage from "./storage";
//import * from nanoid;
import * as mysql from "mysql2/promise";
import * as shortid from "shortid";
import {
  createTenantTestManagementIntegrationModel,
  createTestManagementConfigModel,
  TenantTestManagementIntegrationRepository,
  TestManagementConfigRepository
} from "../models/integrations/test-management";
import {
  TestManagementConfigService,
  TestManagementIntegrationService,
  TestManagementRunService
} from "../services/integrations/test-management";
import { CheckmateMetadataService } from "../services/integrations/test-management/metadata/checkmate";
import {
  createProjectManagementIntegrationModel,
  createProjectManagementConfigModel,
  ProjectManagementIntegrationRepository,
  ProjectManagementConfigRepository
} from "../models/integrations/project-management";
import {
  ProjectManagementIntegrationService,
  ProjectManagementConfigService,
  ProjectManagementTicketService
} from "../services/integrations/project-management";
import { SlackIntegrationService } from "../services/integrations/comm/slack-integration";
import { SlackChannelConfigService } from "../services/integrations/comm/slack-channel-config";
import {
  createReleaseConfigModel,
  ReleaseConfigRepository
} from "../models/release-configs";
import { ReleaseConfigService } from "../services/release-configs";
import * as utils from "../utils/common";
import { SCMIntegrationController } from "./integrations/scm/scm-controller";
import { createSlackIntegrationModel, createChannelConfigModel } from "./integrations/comm/slack-models";
import { SlackIntegrationController, ChannelController } from "./integrations/comm/slack-controller";
import { createCICDIntegrationModel, createCICDWorkflowModel, createCICDConfigModel } from "../models/integrations/ci-cd";
import { CICDIntegrationRepository, CICDWorkflowRepository, CICDConfigRepository } from "../models/integrations/ci-cd";
import { CICDConfigService } from "../services/integrations/ci-cd/config/config.service";
import { createSCMIntegrationModel } from "./integrations/scm/scm-models";
import { createRelease } from "./release-models";
import { createStoreIntegrationModel, createStoreCredentialModel } from "./integrations/store/store-models";
import { StoreIntegrationController, StoreCredentialController } from "./integrations/store/store-controller";
import { createPlatformStoreMappingModel } from "./integrations/store/platform-store-mapping-models";

//Creating Access Key
export function createAccessKey(sequelize: Sequelize) {
    return sequelize.define("accessKey", {
        createdBy: { type: DataTypes.STRING, allowNull: false },
        createdTime: { type: DataTypes.FLOAT, allowNull: false },
        expires: { type: DataTypes.FLOAT, allowNull: false },
        description: { type: DataTypes.STRING, allowNull: true },
        friendlyName: { type: DataTypes.STRING, allowNull: false},
        name: { type: DataTypes.STRING, allowNull: false},
        id: { type: DataTypes.STRING, allowNull: false, primaryKey: true},
        isSession: { type: DataTypes.BOOLEAN, allowNull: true},
        scope: {
          type: DataTypes.ENUM({
              values: ["All", "Write", "Read"]
          }),
          allowNull:true
        },
        accountId: { type: DataTypes.STRING, allowNull: false, references: {
            model: sequelize.models["account"],
            key: 'id',
          },},
    })
}

//Creating Account Type
export function createAccount(sequelize: Sequelize) {
  return sequelize.define("account", {
    id: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      primaryKey: true 
    },
    email: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
    name: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    picture: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },

    createdTime: { 
      type: DataTypes.FLOAT, 
      defaultValue: () => new Date().getTime() 
    },
  }, {
    tableName: 'accounts',
  });
}

export function createAccountChannel(sequelize: Sequelize) {
  return sequelize.define("AccountChannel", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    accountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id',
      },
    },
    externalChannelId: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'external_channel_id',
    },
    channelType: {
      type: DataTypes.ENUM('google_oauth', 'github_oauth', 'slack', 'teams', 'other'),
      allowNull: false,
      defaultValue: 'other',
      field: 'channel_type',
    },
    channelMetadata: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'channel_metadata',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
  }, {
    tableName: 'account_channels',
    timestamps: true,
    indexes: [
      {
        name: 'idx_account_channels_account_id',
        fields: ['accountId'],
      },
      {
        name: 'idx_account_channels_external',
        unique: true,
        fields: ['external_channel_id', 'channel_type'],
      },
    ],
  });
}


//Creating App

export function createApp(sequelize: Sequelize) {
    return sequelize.define("apps", {
        createdTime: { type: DataTypes.FLOAT, allowNull: false },
        name: { type: DataTypes.STRING, allowNull: false },
        id: { type: DataTypes.STRING, allowNull: false, primaryKey: true},
        accountId: { 
          type: DataTypes.STRING, 
          allowNull: true,  // Optional for backward compatibility
          references: {
            model: 'accounts',
            key: 'id',
          },
        },
        tenantId: {
          type: DataTypes.UUID,
          allowNull: true,  // Optional for backward compatibility (v1 apps might not have it)
          references: {
            model: 'tenants',
            key: 'id',
          },
        },
    })
}


//Creating Tenants/Orgs

export function createTenant(sequelize: Sequelize) {
  return sequelize.define("tenant", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id',
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    timestamps: true,
    tableName: 'tenants'
  });
}


//Create Collabarorators

// Unified collaborators table - supports BOTH app-level AND tenant-level collaboration
export function createCollaborators(sequelize: Sequelize) {
    return sequelize.define("collaborator", {
        email: {type: DataTypes.STRING, allowNull: false},
        accountId: { 
          type: DataTypes.STRING, 
          allowNull: false,
          references: {
            model: 'accounts',
            key: 'id',
          }
        },
        appId: { 
          type: DataTypes.STRING, 
          allowNull: true  // Null for tenant-level collaborators (NO FK constraint)
        },
        tenantId: {
          type: DataTypes.UUID,
          allowNull: true,  // Null for app-level-only collaborators
          references: {
            model: 'tenants',
            key: 'id',
          },
        },
        permission: {
            type: DataTypes.ENUM({
                values: ["Owner", "Editor", "Viewer"]  // Tenant-level roles
            }),
            allowNull:true
        },
        isCreator: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false  // True for tenant creators
        },
    }, {
      tableName: 'collaborators',
      timestamps: true
    })
}


//Create Deployment

export function createDeployment(sequelize: Sequelize) {
  return sequelize.define("deployment", {
      id: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      key: { type: DataTypes.STRING, allowNull: false },
      packageId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
              model: sequelize.models["package"],
              key: 'id',
          },
      },
      appId: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
              model: sequelize.models["apps"],
              key: 'id',
          },
      },
      createdTime: { type: DataTypes.FLOAT, allowNull: true },
  }, {
    tableName: 'deployments',
    timestamps: true
  });
}


//Create Package
export function createPackage(sequelize: Sequelize) {
  return sequelize.define("package", {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false, primaryKey: true },
      appVersion: { type: DataTypes.STRING, allowNull: false },
      blobUrl: { type: DataTypes.STRING },
      description: { type: DataTypes.STRING },
      diffPackageMap: { type: DataTypes.JSON, allowNull: true },
      isDisabled: DataTypes.BOOLEAN,
      isMandatory: DataTypes.BOOLEAN,
      label: { type: DataTypes.STRING, allowNull: true },
      manifestBlobUrl: { type: DataTypes.STRING, allowNull: true },
      originalDeployment: { type: DataTypes.STRING, allowNull: true },
      originalLabel: { type: DataTypes.STRING, allowNull: true },
      packageHash: { type: DataTypes.STRING, allowNull: false },
      releasedBy: { type: DataTypes.STRING, allowNull: true },
      releaseMethod: {
          type: DataTypes.ENUM({
              values: ["Upload", "Promote", "Rollback"],
          }),
      },
      rollout: { type: DataTypes.FLOAT, allowNull: true },
      size: { type: DataTypes.FLOAT, allowNull: false },
      uploadTime: { type: DataTypes.BIGINT, allowNull: false },
      isBundlePatchingEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      deploymentId: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
          model: sequelize.models["deployment"],
          key: 'id',
        },
      },
  }, {
    tableName: 'packages',
    timestamps: true
  });
}

//create App Pointer

export function createAppPointer(sequelize: Sequelize) {
    return sequelize.define("AppPointer", {
        id: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
          defaultValue: DataTypes.UUIDV4, // Generates a UUID by default
        },
        accountId: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
            model: 'accounts', // References Account model
            key: 'id',
          },
        },
        appId: {
          type: DataTypes.STRING,
          allowNull: false,
          references: {
            model: 'apps', // References App model
            key: 'id',
          },
        },
        partitionKeyPointer: {
          type: DataTypes.STRING,
          allowNull: false, // Could be useful for referencing legacy data
        },
        rowKeyPointer: {
          type: DataTypes.STRING,
          allowNull: false, // Could be useful for referencing legacy data
        },
      });
}


export function createModelss(sequelize: Sequelize) {
  // Create models and register them
  const Account = createAccount(sequelize);
  const AccountChannel = createAccountChannel(sequelize);
  const Tenant = createTenant(sequelize);
  const Package = createPackage(sequelize);
  const Deployment = createDeployment(sequelize);
  const AccessKey = createAccessKey(sequelize);
  const AppPointer = createAppPointer(sequelize);
  const Collaborator = createCollaborators(sequelize);  // UNIFIED: supports BOTH app-level AND tenant-level
  const App = createApp(sequelize);
  const SCMIntegrations = createSCMIntegrationModel(sequelize);  // SCM integrations (GitHub, GitLab, etc.)
  const CICDIntegrations = createCICDIntegrationModel(sequelize);  // CI/CD integrations (Jenkins, etc.)
  const CICDWorkflows = createCICDWorkflowModel(sequelize);  // CI/CD workflows/jobs across providers
  const CICDConfig = createCICDConfigModel(sequelize);  // CI/CD configurations
  const Release = createRelease(sequelize);  // Release management from Delivr

  // ============================================
  const SlackIntegrations = createSlackIntegrationModel(sequelize);  // Slack integrations(Slack, Email, Teams)
  const StoreIntegrations = createStoreIntegrationModel(sequelize);  // Store integrations (App Store, Play Store, etc.)
  const StoreCredentials = createStoreCredentialModel(sequelize);  // Store credentials (encrypted)
  const PlatformStoreMapping = createPlatformStoreMappingModel(sequelize);  // Platform to store type mapping (static data)
  const ChannelConfig = createChannelConfigModel(sequelize);  // Channel configurations for communication integrations
  
  // Test Management integrations
  const TenantTestManagementIntegration = createTenantTestManagementIntegrationModel(sequelize);
  const TestManagementConfig = createTestManagementConfigModel(sequelize);
  
  // Define associations
  // ============================================

  // Account ↔ AccountChannel (1:N)
  Account.hasMany(AccountChannel, { foreignKey: 'accountId', as: 'channels' });
  AccountChannel.belongsTo(Account, { foreignKey: 'accountId', onDelete: 'CASCADE' });

  // Account and Tenant (Creator relationship)
  Account.hasMany(Tenant, { foreignKey: 'createdBy' });
  Tenant.belongsTo(Account, { foreignKey: 'createdBy' });
  
  // Tenant and Release (One Tenant can have many Releases)
  Tenant.hasMany(Release, { foreignKey: 'tenantId' });
  Release.belongsTo(Tenant, { foreignKey: 'tenantId' });
  
  // Account and Release (Creator relationship)
  Account.hasMany(Release, { foreignKey: 'createdBy', as: 'createdReleases' });
  Release.belongsTo(Account, { foreignKey: 'createdBy', as: 'creator' });
  
  // Account and Release (Pilot relationship)
  Account.hasMany(Release, { foreignKey: 'releasePilotId', as: 'pilotedReleases' });
  Release.belongsTo(Account, { foreignKey: 'releasePilotId', as: 'pilot' });
  
  // Account and Release (Last updater relationship)
  Account.hasMany(Release, { foreignKey: 'lastUpdatedBy', as: 'lastUpdatedReleases' });
  Release.belongsTo(Account, { foreignKey: 'lastUpdatedBy', as: 'lastUpdater' });
  
  // Release self-referencing (Parent-child for hotfixes)
  Release.hasMany(Release, { foreignKey: 'parentId', as: 'hotfixes' });
  Release.belongsTo(Release, { foreignKey: 'parentId', as: 'parent' });

  // Tenant and App (One Tenant can have many Apps) - NEW FLOW
  Tenant.hasMany(App, { foreignKey: 'tenantId' });
  App.belongsTo(Tenant, { foreignKey: 'tenantId' });

  // Account and App (One Account can have many Apps) - OLD FLOW (backward compatibility)
  Account.hasMany(App, { foreignKey: 'accountId' });
  App.belongsTo(Account, { foreignKey: 'accountId' });
  
  // Tenant and Collaborator (One Tenant can have many Collaborators) - NEW FLOW
  Tenant.hasMany(Collaborator, { foreignKey: 'tenantId' });
  Collaborator.belongsTo(Tenant, { foreignKey: 'tenantId' });

  // App and Deployment (One App can have many Deployments)
  App.hasMany(Deployment, { foreignKey: 'appId' });
  Deployment.belongsTo(App, { foreignKey: 'appId' });

  // Deployment and Package (One Package can be linked to many Deployments)
  Deployment.hasMany(Package, { foreignKey: 'deploymentId', as: 'packageHistory' });
  Package.belongsTo(Deployment, { foreignKey: 'deploymentId' });
  Deployment.belongsTo(Package, { foreignKey: 'packageId', as: 'packageDetails' });

  // Collaborator associations
  // Note: accountId FK is defined in model, Account association is for querying only
  Collaborator.belongsTo(Account, { foreignKey: 'accountId' });
  
  // appId association WITHOUT FK constraint (collaborators can be tenant-level without app)
  Collaborator.belongsTo(App, { 
    foreignKey: 'appId',
    constraints: false  // Don't create FK constraint - appId can be NULL for tenant-level collaborators
  });

  // SCM Integration associations
  // Tenant has ONE SCM integration (set up during onboarding)
  Tenant.hasOne(SCMIntegrations, { foreignKey: 'tenantId', as: 'scmIntegration' });
  SCMIntegrations.belongsTo(Tenant, { foreignKey: 'tenantId' });
  
  // Account (creator) reference for SCM
  SCMIntegrations.belongsTo(Account, { foreignKey: 'createdByAccountId', as: 'creator' });

  // Slack Integration associations
  // Tenant has ONE Slack integration (set up during onboarding)
  Tenant.hasOne(SlackIntegrations, { foreignKey: 'tenantId', as: 'slackIntegration' });
  SlackIntegrations.belongsTo(Tenant, { foreignKey: 'tenantId' });

  // Channel Configuration associations
  // Slack integration has ONE channel configuration
  SlackIntegrations.hasOne(ChannelConfig, { foreignKey: 'integrationId', as: 'channelConfig' });
  ChannelConfig.belongsTo(SlackIntegrations, { foreignKey: 'integrationId' });

  // Test Management associations
  // Tenant has many Test Management Integrations
  Tenant.hasMany(TenantTestManagementIntegration, { 
    foreignKey: 'tenantId',
    as: 'testManagementIntegrations' 
  });
  TenantTestManagementIntegration.belongsTo(Tenant, { 
    foreignKey: 'tenantId',
    as: 'tenant'
  });
  
  // Tenant has many Test Management Configs
  Tenant.hasMany(TestManagementConfig, { 
    foreignKey: 'tenantId',
    as: 'testManagementConfigs' 
  });
  TestManagementConfig.belongsTo(Tenant, { 
    foreignKey: 'tenantId',
    as: 'tenant'
  });

  return {
    Account,
    AccountChannel,
    Tenant,
    Package,
    Deployment,
    AccessKey,
    AppPointer,
    Collaborator,  // UNIFIED: supports both app-level AND tenant-level
    App,
    SCMIntegrations,       // SCM integrations (GitHub, GitLab, Bitbucket)
    CICDIntegrations,      // CI/CD connections (Jenkins, etc.)
    CICDWorkflows,         // CI/CD workflows/jobs across providers
    CICDConfig,            // CI/CD configurations
    Release,
    SlackIntegrations,  // Slack integrations
    StoreIntegrations,  // Store integrations (App Store, Play Store, etc.)
    StoreCredentials,   // Store credentials (encrypted)
    PlatformStoreMapping,   // Platform to store type mapping (static data)
    ChannelConfig,  // Channel configurations for communication integrations
    TenantTestManagementIntegration,  // Test management integrations
    TestManagementConfig,  // Test management configurations
  };
}


//function to mimic defer function in q package
export function defer<T>() {
  // eslint-disable-next-line no-unused-vars
  let resolve!: (value: T | PromiseLike<T>) => void;
  // eslint-disable-next-line no-unused-vars
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}


export const MODELS = {
  COLLABORATOR : "collaborator",  // UNIFIED: supports both app-level AND tenant-level collaboration
  DEPLOYMENT : "deployment",
  APPS : "apps",
  PACKAGE : "package",
  ACCESSKEY : "accessKey",
  ACCOUNT : "account",
  APPPOINTER: "AppPointer",
  TENANT : "tenant",
}

const DB_NAME = "codepushdb"
const DB_USER = "root"
const DB_PASS = "root"
const DB_HOST = "localhost"

export class S3Storage implements storage.Storage {
    private s3: S3;
    private bucketName : string = process.env.S3_BUCKETNAME || "codepush-local-bucket";
    private sequelize:Sequelize;
    public readonly setupPromise: Promise<void>;  // Public so it can be awaited before using services
    public scmController!: SCMIntegrationController;  // SCM integration controller
    
    // Test Management Integration - Repositories and Services
    public tenantIntegrationRepository!: TenantTestManagementIntegrationRepository;
    public testManagementConfigRepository!: TestManagementConfigRepository;
    public testManagementIntegrationService!: TestManagementIntegrationService;
    public testManagementConfigService!: TestManagementConfigService;
    public testManagementRunService!: TestManagementRunService;
    public checkmateMetadataService!: CheckmateMetadataService;
    
    // Project Management Integration - Repositories and Services
    public projectManagementIntegrationRepository!: ProjectManagementIntegrationRepository;
    public projectManagementConfigRepository!: ProjectManagementConfigRepository;
    public projectManagementIntegrationService!: ProjectManagementIntegrationService;
    public projectManagementConfigService!: ProjectManagementConfigService;
    public projectManagementTicketService!: ProjectManagementTicketService;
    public cicdIntegrationRepository!: CICDIntegrationRepository;  // CI/CD integration repository
    public cicdWorkflowRepository!: CICDWorkflowRepository;  // CI/CD workflows repository
    public cicdConfigRepository!: CICDConfigRepository;  // CI/CD config repository
    public cicdConfigService!: CICDConfigService;  // CI/CD config service
    public releaseConfigRepository!: ReleaseConfigRepository;
    public releaseConfigService!: ReleaseConfigService;
    public slackController!: SlackIntegrationController;  // Slack integration controller
    public storeIntegrationController!: StoreIntegrationController;  // Store integration controller
    public storeCredentialController!: StoreCredentialController;  // Store credential controller
    public channelController!: ChannelController;  // Channel configuration controller
    public slackIntegrationService!: SlackIntegrationService;
    public slackChannelConfigService!: SlackChannelConfigService;// Slack channel config service
    public constructor() {
        const s3Config = {
          region: process.env.S3_REGION, 
        }

        if (process.env.NODE_ENV === "local" || process.env.NODE_ENV === "dev") {
          // These additional configurations are passed due to AWS SDK Version issue on local
          this.s3 = new S3({
            ...s3Config,
            endpoint: process.env.S3_ENDPOINT, // LocalStack S3 endpoint
            s3ForcePathStyle: true,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          });
        } else {
          this.s3 = new S3(s3Config);
        }
        shortid.characters("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-");

        // Ensure the database exists, then initialize Sequelize
        this.setupPromise = this.createDatabaseIfNotExists().then(() => {
          this.sequelize = new Sequelize({
            database: process.env.DB_NAME || DB_NAME,
            username: process.env.DB_USER || DB_USER,
            password: process.env.DB_PASS || DB_PASS,
            host: process.env.DB_HOST || DB_HOST,
            dialect: 'mysql',
            replication: {
                write: {
                    host: process.env.DB_HOST || DB_HOST,
                    username: process.env.DB_USER || DB_USER,
                    password: process.env.DB_PASS || DB_PASS
                },
                read: [
                    {
                        host: process.env.DB_HOST_READER,
                        username: process.env.DB_USER || DB_USER,
                        password: process.env.DB_PASS || DB_PASS
                    }
                ]
            },
            pool: {
                max: 5,
                min: 1,
                acquire: 10000,
                idle: 10000,
                evict: 15000,
                maxUses: 100000 
              }
            });
          return this.setup();
      });   
    }

    private async createDatabaseIfNotExists(): Promise<void> {

      try {
          const connection = await mysql.createConnection({
              host: process.env.DB_HOST || DB_HOST,
              user: process.env.DB_USER,
              password: process.env.DB_PASS || DB_PASS,
          });

          await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
          console.log(`Database "${process.env.DB_NAME}" ensured.`);
          await connection.end();
      } catch (error) {
          console.error("Error creating database:", error);
          throw error;
      }
  }

    private setup(): Promise<void> {
      const headBucketParams: HeadBucketRequest = {
          Bucket: this.bucketName,
      };

      const createBucketParams: CreateBucketRequest = {
          Bucket: this.bucketName,
      };

      return this.s3.headBucket(headBucketParams).promise()
        .catch((err) => {
          if (err.code === 'NotFound' || err.code === 'NoSuchBucket') {
            console.log(`Bucket ${this.bucketName} does not exist, creating it...`);
            return this.s3.createBucket(createBucketParams).promise();
          } else if (err.code === 'Forbidden') {
            console.error('Forbidden: Check your credentials and S3 endpoint');
            throw err;
          } else {
            throw err;
          }
        })
        .then(() => {
          return this.sequelize.authenticate();
        })
        .then(() => {
          const models = createModelss(this.sequelize);
          console.log("Models registered");
          
          // Initialize SCM Integration Controller
          this.scmController = new SCMIntegrationController(models.SCMIntegrations);
          console.log("SCM Integration Controller initialized");
          
          // Initialize CI/CD Repositories
          this.cicdIntegrationRepository = new CICDIntegrationRepository(models.CICDIntegrations);
          console.log("CI/CD Integration Repository initialized");

          this.cicdWorkflowRepository = new CICDWorkflowRepository(models.CICDWorkflows);
          console.log("CI/CD Workflow Repository initialized");
          
          this.cicdConfigRepository = new CICDConfigRepository(models.CICDConfig);
          console.log("CI/CD Config Repository initialized");
          
          // Initialize CI/CD Config Service
          this.cicdConfigService = new CICDConfigService(this.cicdConfigRepository, this.cicdWorkflowRepository);
          console.log("CI/CD Config Service initialized");
          
          
          // Initialize Test Management Integration
          const tenantIntegrationModel = createTenantTestManagementIntegrationModel(this.sequelize);
          this.tenantIntegrationRepository = new TenantTestManagementIntegrationRepository(tenantIntegrationModel);
          
          const testManagementConfigModel = createTestManagementConfigModel(this.sequelize);
          this.testManagementConfigRepository = new TestManagementConfigRepository(testManagementConfigModel);
          
          // Service 1: Tenant Integration Service (manages credentials)
          this.testManagementIntegrationService = new TestManagementIntegrationService(
            this.tenantIntegrationRepository
          );
          
          // Service 2: Config Service (manages test management configs)
          this.testManagementConfigService = new TestManagementConfigService(
            this.testManagementConfigRepository,
            this.tenantIntegrationRepository
          );
          
          // Service 3: Run Service (stateless test operations)
          this.testManagementRunService = new TestManagementRunService(
            this.testManagementConfigRepository,
            this.tenantIntegrationRepository
          );
          
          // Service 4: Metadata Service (fetches metadata from providers)
          this.checkmateMetadataService = new CheckmateMetadataService(
            this.tenantIntegrationRepository
          );
          
          console.log("Test Management Integration initialized");
          
          // Initialize Project Management Integration
          const projectManagementIntegrationModel = createProjectManagementIntegrationModel(this.sequelize);
          this.projectManagementIntegrationRepository = new ProjectManagementIntegrationRepository(projectManagementIntegrationModel);
          
          const projectManagementConfigModel = createProjectManagementConfigModel(this.sequelize);
          this.projectManagementConfigRepository = new ProjectManagementConfigRepository(projectManagementConfigModel);
          
          this.projectManagementIntegrationService = new ProjectManagementIntegrationService(
            this.projectManagementIntegrationRepository
          );
          
          this.projectManagementConfigService = new ProjectManagementConfigService(
            this.projectManagementConfigRepository,
            this.projectManagementIntegrationRepository
          );
          
          this.projectManagementTicketService = new ProjectManagementTicketService(
            this.projectManagementConfigRepository,
            this.projectManagementIntegrationRepository
          );
          
          console.log("Project Management Integration initialized");
          
          // Initialize Slack Integration Controller
          this.slackController = new SlackIntegrationController(models.SlackIntegrations);
          console.log("Slack Integration Controller initialized");

          // Initialize Store Integration Controllers
          this.storeIntegrationController = new StoreIntegrationController(
            models.StoreIntegrations,
            models.StoreCredentials
          );
          this.storeCredentialController = new StoreCredentialController(models.StoreCredentials);
          console.log("Store Integration Controllers initialized");
          
          // Initialize Channel Configuration Controller
          this.channelController = new ChannelController(models.ChannelConfig);
          console.log("Channel Configuration Controller initialized");
          
          // Initialize Slack Services (similar to test-management services)
          this.slackIntegrationService = new SlackIntegrationService(this.slackController);
          console.log("Slack Integration Service initialized");
          
          this.slackChannelConfigService = new SlackChannelConfigService(
            this.channelController,
            this.slackController
          );
          console.log("Slack Channel Config Service initialized");
          
          // Initialize Release Config (AFTER all integration services are ready)
          const releaseConfigModel = createReleaseConfigModel(this.sequelize);
          this.releaseConfigRepository = new ReleaseConfigRepository(releaseConfigModel);
          this.releaseConfigService = new ReleaseConfigService(
            this.releaseConfigRepository,
            this.cicdConfigService,
            this.testManagementConfigService,
            this.slackChannelConfigService,
            this.projectManagementConfigService
          );
          console.log("Release Config Service initialized");
          
          // return this.sequelize.sync();
        })
        .then(() => {
          console.log("Sequelize models synced");
          console.log(this.sequelize.models);
        })
        .catch((error) => {
          console.error('Error during setup:', error);
          throw error;
        });
  }
      

    public reinitialize(): Promise<void> {
      console.log("Re-initializing AWS storage");
      return this.setup();
    }
  
    public checkHealth(): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        this.setupPromise
          .then(() => {
            return Promise.all([this.sequelize.authenticate()]);
          })
          .then(() => {
            resolve();
          })
          .catch(reject);
      });
    }
  
    public addAccount(account: storage.Account): Promise<string> {
        account = storage.clone(account); // pass by value
        account.id = shortid.generate();
        return this.setupPromise
          .then(() => {
            return this.sequelize.models[MODELS.ACCOUNT].findOrCreate({where: {id :account.id}, defaults: {
              ...account
            }}); // Successfully fails if duplicate email
          })
          .then(() => {
            return account.id;
          })
          .catch(S3Storage.storageErrorHandler);
      }
  
    public getAccount(accountId: string): Promise<storage.Account> {
      // console.log("Fetching account for accountId:", accountId); // Debug log
      return this.setupPromise
        .then(() => {
          return this.sequelize.models[MODELS.ACCOUNT].findByPk(accountId)
        })
        .then((account) => {
          console.log("Fetched account:", account.dataValues); // Debug log
          return account.dataValues
        })
        .catch((error) => {
          console.error("Error fetching account:", error.message);
          throw S3Storage.storageErrorHandler(error);
        });
    }
  
    public getAccountByEmail(email: string): Promise<storage.Account> {
        return this.setupPromise
            .then(async () => {
              const account = await this.sequelize.models[MODELS.ACCOUNT].findOne({where: {email : email}})
              if (account === null) {
                throw storage.storageError(storage.ErrorCode.NotFound, `Account with email ${email} not found`);
              }
              return account.dataValues;
            })
    }
  
    public updateAccount(email: string, updateProperties: storage.Account): Promise<void> {
      if (!email) throw new Error("No account email");
  
      return this.setupPromise
        .then(() => {
          this.sequelize.models[MODELS.ACCOUNT].update({
              ...updateProperties
            },{
            where: {"email" : email},
          },)
        })
        .catch(S3Storage.storageErrorHandler);
    }

    public getAppOwnershipCount(accountId: string): Promise<number> {
        return this.setupPromise
            .then(() => {
                // Direct query to collaborators table
                return this.sequelize.models[MODELS.COLLABORATOR].count({
                    where: {
                        accountId: accountId,
                        permission: 'Owner'
                    }
                });
            })
            .catch(S3Storage.storageErrorHandler);
    }

  
    public getAccountIdFromAccessKey(accessKey: string): Promise<string> {
  
      return this.setupPromise
        .then(() => {
          return this.sequelize.models[MODELS.ACCESSKEY].findOne({
            where: {"name" : accessKey}
          })
        })
        .then((accessKey) => {
          if (new Date().getTime() >= accessKey.dataValues["expires"]) {
            throw storage.storageError(storage.ErrorCode.Expired, "The access key has expired.");
          }
  
          return accessKey.dataValues["accountId"];
        })
        .catch(S3Storage.storageErrorHandler);
    }
  
    public addApp(accountId: string, app: storage.App): Promise<storage.App> {
      app = storage.clone(app); // Clone the app data to avoid mutating the original
      app.id = shortid.generate();
    
      return this.setupPromise
        .then(() => this.getAccount(accountId)) // Fetch account details to check permissions
        .then(async (account: storage.Account) => {
          const tenantId = app.tenantId;
          
          // V2 Flow: Tenant-based (NEW)
          if (tenantId) {
            // Verify tenant exists
            const tenant = await this.sequelize.models[MODELS.TENANT].findOne({
              where: { id: tenantId },
            });
            
            if (!tenant) {
              throw storage.storageError(
                storage.ErrorCode.NotFound, 
                "Specified organization does not exist."
              );
            }
            
            // Check Account has permission (editor or admin) in the tenant
            // Query tenant-level collaborators (where appId is null)
            const tenantCollab = await this.sequelize.models[MODELS.COLLABORATOR].findOne({
              where: { 
                accountId: accountId, 
                tenantId,
                appId: null  // Tenant-level collaborator
              },
            });
            
            if (!tenantCollab) {
              throw storage.storageError(
                storage.ErrorCode.Invalid, 
                "You are not a member of this organization."
              );
            }
            
            const accountPermission = tenantCollab.dataValues.permission;
            if (accountPermission === 'Viewer') {
              throw storage.storageError(
                storage.ErrorCode.Invalid, 
                "You need Owner or Editor permissions to create apps."
              );
            }
      
            // Set the tenantId and tenantName on the app object
            app.tenantId = tenantId;
            app.tenantName = tenant.dataValues.displayName;
      
            // Add the App (tenant is the owner, accountId also set for backward compat)
            const addedApp = await this.sequelize.models[MODELS.APPS].create({
              ...app,
              accountId, // Set both for dual compatibility
            });
      
            // Add tenant-level collaborator entry (unified collaborators table)
            const tenantCollabMap = {
              email: account.email,
              accountId: accountId,
              tenantId,  // Tenant-level collaborator
              appId: null,  // No specific app
              permission: storage.Permissions.Owner,
            };
            await this.sequelize.models[MODELS.COLLABORATOR].findOrCreate({
              where: { tenantId, accountId: accountId },
              defaults: tenantCollabMap,
            });
            
            // Also add app-level collaborator entry for backward compatibility
            const appCollabMap = {
              email: account.email,
              accountId: accountId,
              appId: app.id,  // App-level collaborator
              tenantId: null,  // No tenant association for app-level
              permission: storage.Permissions.Owner,
            };
            await this.sequelize.models[MODELS.COLLABORATOR].findOrCreate({
              where: { appId: app.id, email: account.email },
              defaults: appCollabMap,
            });
      
            return addedApp;
          } 
          // V1 Flow: Account-based (OLD - backward compatibility)
          else {
            // Add the App with accountId as owner (old flow)
            const addedApp = await this.sequelize.models[MODELS.APPS].create({
              ...app,
              accountId, // Direct account ownership
            });
      
            // Add app-level collaborator entry (old flow)
            const collabMap = {
              email: account.email,
              accountId: accountId,
              permission: storage.Permissions.Owner,
              appId: app.id,
            };
            await this.sequelize.models[MODELS.COLLABORATOR].findOrCreate({
              where: { appId: app.id, email: account.email },
              defaults: collabMap,
            });
      
            return addedApp;
          }
        })
        .then(() => app) // Return the app object
        .catch((error) => {
          console.error("Error adding app:", error.message);
          throw S3Storage.storageErrorHandler(error);
        });
    }
    

    public getApps(accountId: string): Promise<storage.App[]> {
      // Get apps from BOTH flows:
      // V2: Account → Tenant (via collaborators) → Apps (NEW)
      // V1: Account → Apps (directly via accountId) (OLD - backward compatibility)
      return this.setupPromise
        .then(async () => {
          // V2 Flow: Get all tenants Account is a member of
          // Query tenant-level collaborators (where appId is null)
          const tenantCollabRecords = await this.sequelize.models[MODELS.COLLABORATOR].findAll({
            where: { 
              accountId: accountId,
              appId: null  // Tenant-level collaborators only
            },
          });
          
          // Extract tenant IDs
          const tenantIds = tenantCollabRecords.map((record: any) => 
            record.dataValues.tenantId
          ).filter(id => id !== null);  // Filter out any nulls
          
          // V2: Get all apps from these tenants
          const tenantApps = tenantIds.length > 0 
            ? await this.sequelize.models[MODELS.APPS].findAll({
                where: {
                  tenantId: tenantIds
                }
              })
            : [];
          
          // V1 Flow: Get all apps directly owned by accountId (old flow)
          const accountApps = await this.sequelize.models[MODELS.APPS].findAll({
            where: {
              accountId: accountId,
              tenantId: null  // Only get old-style apps (no tenant)
            }
          });
          
          // Merge both lists, avoiding duplicates
          const allAppsModel = [...tenantApps, ...accountApps];
          const uniqueAppsMap = new Map();
          allAppsModel.forEach((app: any) => {
            const appData = app.dataValues;
            uniqueAppsMap.set(appData.id, appData);
          });
          
          const flatApps = Array.from(uniqueAppsMap.values());
          const apps = [];
          for (let i = 0; i < flatApps.length; i++) {
            const updatedApp = await this.getCollabrators(flatApps[i], accountId);
            apps.push(updatedApp);
          }
          return apps;
        })
        .catch(S3Storage.storageErrorHandler);
    }
    
    public getTenants(accountId: string): Promise<storage.Organization[]> {
      // Fetch all tenants where the account is a member (via collaborators)
      // Account → Tenant (parent entity) → Apps
      return this.setupPromise
        .then(async () => {
          // Get account's tenant-level collaborations (where appId is null)
          const tenantCollabs = await this.sequelize.models[MODELS.COLLABORATOR].findAll({
            where: { 
              accountId: accountId,
              appId: null  // Tenant-level collaborators only
            }
          });
          
          // Fetch full tenant details for each
          const tenants = await Promise.all(
            tenantCollabs.map(async (collab: any) => {
              const tenantId = collab.dataValues.tenantId;
              const permission = collab.dataValues.permission;
              
              const tenant = await this.sequelize.models[MODELS.TENANT].findOne({
                where: { id: tenantId }
              });
              
              if (!tenant) return null;
              
              return {
                id: tenant.dataValues.id,
                displayName: tenant.dataValues.displayName,
                role: permission,  // Already in correct format: Owner/Editor/Viewer
                createdBy: tenant.dataValues.createdBy,
                createdTime: tenant.dataValues.createdTime
              };
            })
          );
          
          // Filter out any nulls
          return tenants.filter(t => t !== null);
        })
        .catch(S3Storage.storageErrorHandler);
    }
    
    public addTenant(accountId: string, tenant: storage.Organization): Promise<storage.Organization> {
      return this.setupPromise
        .then(async () => {
          const tenantId = tenant.id || shortid.generate();
          const now = new Date().getTime();
          
          // Create the tenant
          await this.sequelize.models[MODELS.TENANT].create({
            id: tenantId,
            displayName: tenant.displayName,
            createdBy: accountId,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Add creator as tenant-level collaborator with Owner permission
          const account = await this.sequelize.models[MODELS.ACCOUNT].findOne({
            where: { id: accountId }
          });
          
          await this.sequelize.models[MODELS.COLLABORATOR].create({
            email: account.dataValues.email,
            accountId: accountId,
            appId: null,  // Tenant-level (no specific app)
            tenantId: tenantId,
            permission: 'Owner',  // Creator gets Owner permission
            isCreator: true,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          return {
            id: tenantId,
            displayName: tenant.displayName,
            role: 'Owner',
            createdBy: accountId,
            createdTime: now
          };
        })
        .catch(S3Storage.storageErrorHandler);
    }
    
    public removeTenant(accountId: string, tenantId: string): Promise<void> {
      return this.setupPromise
        .then( async () => {
          // Remove all apps under the tenant
          //Remove all collaborators from that apps
          //check permission whether Account is owner or not
          const tenant = await this.sequelize.models[MODELS.TENANT].findOne({
            where: { id: tenantId },
          });

          if(!tenant) {
            throw storage.storageError(storage.ErrorCode.NotFound, "Specified Organisation does not exist.");
          }

          if(tenant.dataValues.createdBy !== accountId) {
            throw storage.storageError(storage.ErrorCode.Invalid, "Account does not have admin permissions for the specified tenant.");
          }

          const apps = await this.sequelize.models[MODELS.APPS].findAll({
            where: { tenantId },
          });
    
          // Iterate over each app and take appropriate action
          for (const app of apps) {
            const appOwnerId = app.dataValues.accountId;
    
            if (appOwnerId === accountId) {
              // If the app is owned by the Account, remove it
              await this.removeApp(accountId, app.dataValues.id);
            } else {
              // If the app is not owned by the Account, set tenantId to null
              await this.sequelize.models[MODELS.APPS].update(
                { tenantId: null },
                { where: { id: app.dataValues.id } }
              );
            }
          }
        
        })
        .then(() => {
          // Remove the tenant entry
          return this.sequelize.models[MODELS.TENANT].destroy({
            where: { id: tenantId, createdBy: accountId },
          });
        })
        .catch(S3Storage.storageErrorHandler);
    }

    // Tenant Collaborator Methods
    
    public getTenantCollaborators(tenantId: string): Promise<storage.CollaboratorMap> {
      return this.setupPromise
        .then(async () => {
          // Get all tenant-level collaborators (where appId is NULL)
          const collaborators = await this.sequelize.models[MODELS.COLLABORATOR].findAll({
            where: {
              tenantId: tenantId,
              appId: null
            }
          });

          const collaboratorMap: storage.CollaboratorMap = {};
          
          for (const collab of collaborators) {
            const email = collab.dataValues.email;
            collaboratorMap[email] = {
              accountId: collab.dataValues.accountId,
              permission: collab.dataValues.permission
            };
          }

          return collaboratorMap;
        })
        .catch(S3Storage.storageErrorHandler);
    }

    public addTenantCollaborator(tenantId: string, email: string, permission: string): Promise<void> {
      return this.setupPromise
        .then(async () => {
          // Find the account by email
          const account = await this.sequelize.models[MODELS.ACCOUNT].findOne({
            where: { email: email }
          });

          if (!account) {
            throw storage.storageError(storage.ErrorCode.NotFound, "Account with this email does not exist");
          }

          const accountId = account.dataValues.id;

          // Check if collaborator already exists
          const existing = await this.sequelize.models[MODELS.COLLABORATOR].findOne({
            where: {
              tenantId: tenantId,
              accountId: accountId,
              appId: null
            }
          });

          if (existing) {
            throw storage.storageError(storage.ErrorCode.AlreadyExists, "Account is already a collaborator");
          }

          // Add collaborator
          await this.sequelize.models[MODELS.COLLABORATOR].create({
            email: email,
            accountId: accountId,
            tenantId: tenantId,
            appId: null,
            permission: permission,
            isCreator: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        })
        .catch(S3Storage.storageErrorHandler);
    }

    public updateTenantCollaborator(tenantId: string, email: string, permission: string): Promise<void> {
      return this.setupPromise
        .then(async () => {
          const result = await this.sequelize.models[MODELS.COLLABORATOR].update(
            { permission: permission, updatedAt: new Date() },
            {
              where: {
                tenantId: tenantId,
                email: email,
                appId: null
              }
            }
          );

          if (result[0] === 0) {
            throw storage.storageError(storage.ErrorCode.NotFound, "Collaborator not found");
          }
        })
        .catch(S3Storage.storageErrorHandler);
    }

    public removeTenantCollaborator(tenantId: string, email: string): Promise<void> {
      return this.setupPromise
        .then(async () => {
          const result = await this.sequelize.models[MODELS.COLLABORATOR].destroy({
            where: {
              tenantId: tenantId,
              email: email,
              appId: null
            }
          });

          if (result === 0) {
            throw storage.storageError(storage.ErrorCode.NotFound, "Collaborator not found");
          }
        })
        .catch(S3Storage.storageErrorHandler);
    }
    
    public getApp(accountId: string, appId: string): Promise<storage.App> {
      return this.setupPromise
        .then(() => {
          return this.sequelize.models[MODELS.APPS].findByPk(appId, {
            include: [{ model: this.sequelize.models[MODELS.TENANT], as: 'tenant' }], // Include tenant details if available
          });
        })
        .then((flatAppModel) => {
          return this.getCollabrators(flatAppModel.dataValues, accountId);
        })
        .then((app) => {
          return app;
        })
        .catch(S3Storage.storageErrorHandler);
    }
    
  
    public removeApp(accountId: string, appId: string): Promise<void> {
      return this.setupPromise
        .then(() => {
          // Remove all collaborator entries for this app
          return this.sequelize.models[MODELS.COLLABORATOR].destroy({
            where: { appId, accountId: accountId },
          });
        })
        .then(() => {
          // Remove the app entry
          return this.sequelize.models[MODELS.APPS].destroy({
            where: { id: appId, accountId: accountId },
          });
        })
        .then(() => {
          // Remove the app entry
          //MARK: Fix this
          this.removeAppPointer(accountId, appId);
        })
        .catch(S3Storage.storageErrorHandler);
    }    
  
    public updateApp(accountId: string, app: storage.App): Promise<void> {
      const appId: string = app.id;
      if (!appId) throw new Error("No app id");
  
      return this.setupPromise
        .then(() => {
          return this.updateAppWithPermission(accountId,app,true)
        })
        .catch(S3Storage.storageErrorHandler);
    }

    
  
    //P1

    //MARK: TODO
    public transferApp(accountId: string, appId: string, email: string): Promise<void> {
      let app: storage.App;
      let targetCollaboratorAccountId: string;
      let requestingCollaboratorEmail: string;
      let isTargetAlreadyCollaborator: boolean;
  
      return this.setupPromise
        .then(() => {
          const getAppPromise: Promise<storage.App> = this.getApp(accountId, appId);
          const accountPromise: Promise<storage.Account> = this.getAccountByEmail(email);
          return Promise.all<any>([getAppPromise, accountPromise]);
        })
        .then(([appPromiseResult, accountPromiseResult]: [storage.App, storage.Account]) => {
          targetCollaboratorAccountId = accountPromiseResult.id;
          email = accountPromiseResult.email; // Use the original email stored on the account to ensure casing is consistent
          app = appPromiseResult;
          requestingCollaboratorEmail = S3Storage.getEmailForAccountId(app.collaborators, accountId);
  
          if (requestingCollaboratorEmail === email) {
            throw storage.storageError(storage.ErrorCode.AlreadyExists, "The given account already owns the app.");
          }
  
          return this.getApps(targetCollaboratorAccountId);
        })
        .then((appsForCollaborator: storage.App[]) => {
          if (storage.NameResolver.isDuplicate(appsForCollaborator, app.name)) {
            throw storage.storageError(
              storage.ErrorCode.AlreadyExists,
              'Cannot transfer ownership. An app with name "' + app.name + '" already exists for the given collaborator.'
            );
          }
  
          isTargetAlreadyCollaborator = S3Storage.isCollaborator(app.collaborators, email);
  
          // Update the current owner to be an editor
          S3Storage.setCollaboratorPermission(app.collaborators, requestingCollaboratorEmail, storage.Permissions.Editor);
  
          // set target collaborator as an owner.
          if (isTargetAlreadyCollaborator) {
            S3Storage.setCollaboratorPermission(app.collaborators, email, storage.Permissions.Owner);
          } else {
            const targetOwnerProperties: storage.CollaboratorProperties = {
              accountId: targetCollaboratorAccountId,  // This is for CollaboratorProperties interface (returned to client)
              permission: storage.Permissions.Owner,
            };
            S3Storage.addToCollaborators(app.collaborators, email, targetOwnerProperties);
          }
  
          return this.updateAppWithPermission(accountId, app, /*updateCollaborator*/ true);
        })
        .then(() => {
          if (!isTargetAlreadyCollaborator) {
            // Added a new collaborator as owner to the app, create a corresponding entry for app in target collaborator's account.
            return this.addAppPointer(targetCollaboratorAccountId, app.id);
          }
        })
        .catch(S3Storage.storageErrorHandler);
    }
  

    private addAppPointer(accountId: string, appId: string): Promise<void> {
        return this.setupPromise
          .then(() => {
            // Directly create the pointer in the DB using foreign keys (instead of partition/row keys)
            return this.sequelize.models[MODELS.APPPOINTER].create({
              accountId,
              appId,
              partitionKeyPointer: `accountId ${accountId}`,
              rowKeyPointer: `appId ${appId}`,
            });
          })
          .then(() => {
            console.log('App pointer added successfully');
            return Promise.resolve();
          })
          .catch(S3Storage.storageErrorHandler);
      }
      
    //P0
    public addCollaborator(accountId: string, appId: string, email: string): Promise<void> {
      return this.setupPromise
        .then(() => {
          const getAppPromise: Promise<storage.App> = this.getApp(accountId, appId);
          const accountPromise: Promise<storage.Account> = this.getAccountByEmail(email);
          return Promise.all<any>([getAppPromise, accountPromise]);
        })
        .then(([app, account]: [storage.App, storage.Account]) => {
          // Use the original email stored on the account to ensure casing is consistent
          email = account.email;
          return this.addCollaboratorWithPermissions(accountId, app, email, {
            accountId: account.id,  // This is for CollaboratorProperties interface (returned to client)
            permission: storage.Permissions.Viewer,
          });
        })
        .catch(S3Storage.storageErrorHandler);
    }

    public updateCollaborators(accountId: string, appId: string, email: string, role: string): Promise<void> {
      return this.setupPromise
      .then(() => {
        const getAppPromise: Promise<storage.App> = this.getApp(accountId, appId);
        const requestCollaboratorAccountPromise: Promise<storage.Account> = this.getAccountByEmail(email);
        return Promise.all<any>([getAppPromise, requestCollaboratorAccountPromise]);
      })
      .then(([app, accountToModify]: [storage.App, storage.Account]) => {
        // Use the original email stored on the account to ensure casing is consistent
        email = accountToModify.email;
        const permission = role === "Owner" ? storage.Permissions.Owner : storage.Permissions.Editor;
        return this.updateCollaboratorWithPermissions(accountId, app, email, {
          accountId: accountToModify.id,  // This is for CollaboratorProperties interface (returned to client)
          permission: permission,
        });
      })
      .catch(S3Storage.storageErrorHandler);
    }
  
    public getCollaborators(accountId: string, appId: string): Promise<storage.CollaboratorMap> {
      return this.setupPromise
        .then(() => {
          return this.getApp(accountId, appId);
        })
        .then((app: storage.App) => {
          return Promise.resolve(app.collaborators);
        })
        .catch(S3Storage.storageErrorHandler);
    }
  
    public removeCollaborator(accountId: string, appId: string, email: string): Promise<void> {
        return this.setupPromise
        .then(() => {
          // Get the App and Collaborators from the DB
          return this.getApp(accountId, appId);
        })
        .then((app: storage.App) => {
          const removedCollabProperties: storage.CollaboratorProperties = app.collaborators[email];
  
          if (!removedCollabProperties) {
            throw storage.storageError(storage.ErrorCode.NotFound, "The given email is not a collaborator for this app.");
          }
  
          // Cannot remove the owner
          if (removedCollabProperties.permission === storage.Permissions.Owner) {
            throw storage.storageError(storage.ErrorCode.AlreadyExists, "Cannot remove the owner of the app from collaborator list.");
          }
  
          // Remove the collaborator
          delete app.collaborators[email];
  
          // Update the App in the DB
          return this.updateAppWithPermission(accountId, app, true).then(() => {
            return this.removeAppPointer(removedCollabProperties.accountId, app.id);
          });
        })
        .catch(S3Storage.storageErrorHandler);
    }

    private removeAppPointer(accountId: string, appId: string): Promise<void> {
        return this.setupPromise
        .then(() => {
          // Use Sequelize to destroy (delete) the record
          return this.sequelize.models[MODELS.APPPOINTER].destroy({
            where: {
              accountId: accountId,
              appId: appId,
            },
          });
        })
        .then((deletedCount: number) => {
          if (deletedCount === 0) {
            console.log('AppPointer not found');
          }
          console.log('AppPointer successfully removed');
        })
        .catch((error: any) => {
          console.error('Error removing AppPointer:', error);
          throw error;
        });
      }

    //Utility Collaboratos methods
    private static isOwner(collaboratorsMap: storage.CollaboratorMap, email: string): boolean {
        return (
          collaboratorsMap &&
          email &&
          collaboratorsMap[email] &&
          (<storage.CollaboratorProperties>collaboratorsMap[email]).permission === storage.Permissions.Owner
        );
      }

      private static isCollaborator(collaboratorsMap: storage.CollaboratorMap, email: string): boolean {
        return (
          collaboratorsMap &&
          email &&
          collaboratorsMap[email] &&
          (<storage.CollaboratorProperties>collaboratorsMap[email]).permission !== storage.Permissions.Owner
        );
      }

      private static setCollaboratorPermission(collaboratorsMap: storage.CollaboratorMap, email: string, permission: string): void {
        if (collaboratorsMap && email && !storage.isPrototypePollutionKey(email) && collaboratorsMap[email]) {
          (<storage.CollaboratorProperties>collaboratorsMap[email]).permission = permission;
        }
      }
    
      private static addToCollaborators(
        collaboratorsMap: storage.CollaboratorMap,
        email: string,
        collabProps: storage.CollaboratorProperties
      ): void {
        if (collaboratorsMap && email && !storage.isPrototypePollutionKey(email) && !collaboratorsMap[email]) {
          collaboratorsMap[email] = collabProps;
        }
      }

      private addCollaboratorWithPermissions(
        accountId: string,
        app: storage.App,
        email: string,
        collabProperties: storage.CollaboratorProperties
      ): Promise<void> {
        if (app && app.collaborators && !app.collaborators[email]) {
          app.collaborators[email] = collabProperties;
          return this.updateAppWithPermission(accountId, app, /*updateCollaborator*/ true).then(() => {
            return this.addAppPointer(collabProperties.accountId, app.id);
          });
        } else {
          throw storage.storageError(storage.ErrorCode.AlreadyExists, "The given account is already a collaborator for this app.");
        }
      }

      private updateCollaboratorWithPermissions(
        accountId: string,
        app: storage.App,
        email: string,
        collabProperties: storage.CollaboratorProperties
      ): Promise<void> {
        if (app && app.collaborators && app.collaborators[email]) {
          app.collaborators[email] = collabProperties;
          return this.updateAppWithPermission(accountId, app, /*updateCollaborator*/ true).then(() => {
            return this.addAppPointer(collabProperties.accountId, app.id);
          });
        } else {
          throw storage.storageError(storage.ErrorCode.AlreadyExists, "The given account is already a collaborator for this app.");
        }
      }


      //Deployment Methods

    
      public addDeployment(accountId: string, appId: string, deployment: storage.Deployment): Promise<string> {
        let deploymentId: string;
        return this.setupPromise
          .then(() => {
            // Generate deployment ID
            deployment.id = shortid.generate();
            deploymentId = deployment.id;
    
            // Insert the deployment in the DB
            return this.sequelize.models[MODELS.DEPLOYMENT].create({ ...deployment, appId, createdTime: Date.now() });
          })
          .then(() => {
            // Return deployment ID
            return deploymentId;
          })
          .catch(S3Storage.storageErrorHandler);
    }

    public getDeploymentInfo(deploymentKey: string): Promise<storage.DeploymentInfo> {
        return this.setupPromise
          .then(() => {
            return this.sequelize.models[MODELS.DEPLOYMENT].findOne({ where: { key: deploymentKey } });
          })
          .then((deployment: any): storage.DeploymentInfo => {
            if (!deployment) {
              throw storage.storageError(storage.ErrorCode.NotFound, "Deployment not found");
            }
    
            return { appId: deployment.appId, deploymentId: deployment.id };
          })
          .catch(S3Storage.storageErrorHandler);
    }


    public getDeployments(accountId: string, appId: string): Promise<storage.Deployment[]> {
      return this.setupPromise
        .then(() => {
          // Retrieve deployments for the given appId, including the associated Package
          return this.sequelize.models[MODELS.DEPLOYMENT].findAll({
            where: { appId: appId },
          });
        })
        .then((flatDeployments: any[]) => {
          // Use Promise.all to wait for all unflattenDeployment promises to resolve
          return Promise.all(flatDeployments.map((flatDeployment) => this.attachPackageToDeployment(accountId,flatDeployment)));
        })
        .catch((error) => {
          console.error("Error retrieving deployments:", error);
          throw error;
        });
    }

    public removeDeployment(accountId: string, appId: string, deploymentId: string): Promise<void> {
      //MARK:TODO TEST THIS
        return this.setupPromise
          .then(() => {
            // Delete the deployment from the database using Sequelize
            return this.sequelize.models[MODELS.DEPLOYMENT].destroy({
              where: { id: deploymentId, appId: appId },
            });
          })
          .then(() => {
            // Delete history from S3
            return this.deleteHistoryBlob(deploymentId);
          })
          .catch((error) => {
            console.error("Error deleting deployment:", error);
            throw error;
          });
    }

    public updateDeployment(accountId: string, appId: string, deployment: storage.Deployment): Promise<void> {
        const deploymentId: string = deployment.id;
        if (!deploymentId) throw new Error("No deployment id");
    
        return this.setupPromise
          .then(() => {
            // Update deployment details in the database
            return this.sequelize.models[MODELS.DEPLOYMENT].update(deployment, {
              where: { id: deploymentId, appId: appId },
            });
          })
          .then(() => {})
          .catch((error) => {
            console.error("Error updating deployment:", error);
            throw error;
          });
    }
 /*
             // Remove the rollout value for the last package.
            const lastPackage: storage.Package = packageHistory.length ? packageHistory[packageHistory.length - 1] : null;
            if (lastPackage) {
              lastPackage.rollout = null;
            }
 */
    
    public commitPackage(accountId: string, appId: string, deploymentId: string, appPackage: storage.Package): Promise<storage.Package> {
        if (!deploymentId) throw new Error("No deployment id");
        if (!appPackage) throw new Error("No package specified");
    
        let packageHistory: storage.Package[];
        return this.setupPromise
          .then(() => {
            // Fetch the package history from S3
            return this.getPackageHistory(accountId, appId, deploymentId);
          })
          .then((history: storage.Package[]) => {
            packageHistory = history;
            appPackage.label = this.getNextLabel(packageHistory);
            return this.getAccount(accountId);
          })
          .then(async (account: storage.Account) => {
            appPackage.releasedBy = account.email;
    
            // Note: Rollout handling commented out for future implementation
            // const lastPackage: storage.Package = packageHistory.length ? packageHistory[packageHistory.length - 1] : null;
            // if (lastPackage) {
            //   lastPackage.rollout = null;
            // }
    
            packageHistory.push(appPackage);
    
            if (packageHistory.length > 100) { // Define your max history length
              packageHistory.splice(0, packageHistory.length - 100);
            }
    
            const savedPackage = await this.sequelize.models[MODELS.PACKAGE].create({...appPackage, deploymentId});
            // Update deployment with the new package information
            await this.sequelize.models[MODELS.DEPLOYMENT].update(
              { packageId: savedPackage.dataValues.id },
              { where: { id: deploymentId, appId } }
            );
            return savedPackage.dataValues;
          })
          .catch((error) => {
            console.error("Error committing package:", error);
            throw error;
          });
    }



    public clearPackageHistory(accountId: string, appId: string, deploymentId: string): Promise<void> {
      return this.setupPromise
        .then(() => {
          // Remove all packages linked to the deployment
          return this.sequelize.models[MODELS.PACKAGE].destroy({
            where: { deploymentId },
          });
        })
        .then(() => {
          // Reset the currentPackageId for the deployment to clear the history
          return this.sequelize.models[MODELS.DEPLOYMENT].update(
            { currentPackageId: null },
            { where: { id: deploymentId, appId } }
          );
        })
        .then(()=>{})
        .catch((error) => {
          console.error("Error clearing package history:", error);
          throw error;
        });
    }
    
    public getPackageHistory(accountId: string, appId: string, deploymentId: string): Promise<storage.Package[]> {
      return this.setupPromise
        .then(() => {
          // Fetch all packages associated with the deploymentId, ordered by uploadTime
          return this.sequelize.models[MODELS.PACKAGE].findAll({
            where: { deploymentId: deploymentId },
            order: [['uploadTime', 'ASC']], // Sort by upload time to maintain historical order
          });
        })
        .then((packageRecords: any[]) => {
          // Map each package record to the storage.Package format
          return packageRecords.map((pkgRecord) => this.formatPackage(pkgRecord.dataValues));
        })
        .catch((error) => {
          console.error("Error retrieving package history:", error);
          throw error;
        });
    }
    

    public updatePackageHistory(accountId: string, appId: string, deploymentId: string, history: storage.Package[]): Promise<void> {
        if (!history || !history.length) {
          throw storage.storageError(storage.ErrorCode.Invalid, "Cannot clear package history from an update operation");
        }
    
        return this.setupPromise
        .then(async () => {
          for (const appPackage of history) {
            // Find the existing package in the table using unique label and packageHash for data integrity
            const existingPackage = await this.sequelize.models[MODELS.PACKAGE].findOne({
              where: { 
                deploymentId: deploymentId, 
                label: appPackage.label,
                packageHash: appPackage.packageHash
              },
            });
    
            if (existingPackage) {
    
              const existingData = existingPackage.dataValues;

              const isChanged = Object.keys(appPackage).some((key) => {
                return appPackage[key] !== existingData[key];
              });
    
              // Update the package if it has been changed
              if (isChanged) {
                await this.sequelize.models[MODELS.PACKAGE].update(appPackage, {
                  where: { id: existingData.id },
                });
              }
            } else {
              // If the package does not exist, insert it
              await this.sequelize.models[MODELS.PACKAGE].create({
                ...appPackage,
                deploymentId: deploymentId,
              });
            }
          }
        })
          .catch((error) => {
            console.error("Error updating package history:", error);
            throw error;
          });
    }

    //Utility Package Methods
    

    //blobs
    public addBlob(blobId: string, stream: stream.Readable): Promise<string> {
      return this.setupPromise
      .then(() => {
        // Generate a unique key if blobId is not provided
        if (!blobId) {
          blobId = `deployments/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.zip`;
          console.log("Generated Blob ID:", blobId);
        }
  
        // Convert the stream to a buffer
        return utils.streamToBufferS3(stream);
      })
      .then((buffer) => {
        // Upload the buffer to S3
        return this.s3
          .putObject({
            Bucket: this.bucketName,
            Key: blobId,
            Body: buffer,
            ContentType: 'application/zip', // Assume all deployments are zipped
          })
          .promise();
      })
      .then(() => {
        console.log('blobId here ::', blobId);
        //generate CF Distribution URL using environment variable signed Url
        return blobId
      }) // Return the Blob ID for further use
      .catch((error) => {
        console.error("Error adding blob:", error);
        throw error;
      });
    }

    private getSignedUrlFromCF(blobId: string): string {
      const cloudFrontUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${blobId}`;
      // Generate a signed URL
      // const privateKey = fs.readFileSync(process.env.CLOUDFRONT_PRIVATE_KEY_PATH, 'utf8')
      // const signedUrl = getSignedUrl(cloudFrontUrl, {
      //   keypairId: process.env.CLOUDFRONT_KEY_PAIR_ID, // Replace with your CloudFront Key Pair ID
      //   privateKeyString: privateKey, // Replace with the private key content or path
      //   expireTime: Date.now() + 60 * 60 * 12000, // 24-hour expiration
      // });
      // console.log('signedUrl here ::', signedUrl);
      return cloudFrontUrl;
    }

    public getBlobUrl(blobId: string): Promise<string> {
        return this.setupPromise
          .then(() => {

            if(process.env.NODE_ENV === "development") {
              // Get the signed URL from S3
              return this.s3.getSignedUrlPromise('getObject', {
                Bucket: this.bucketName,
                Key: blobId,
                Expires: 60 * 60 * 24000, // URL valid for 1 hour
              });
            } else {
              return this.getSignedUrlFromCF(blobId);
            }
            
          })
          .catch((error) => {
            console.error("Error getting blob URL:", error);
            throw error;
          });
    }


    public removeBlob(blobId: string): Promise<void> {
        return this.setupPromise
          .then(() => {
            // Delete the blob from S3
            return this.s3.deleteObject({
              Bucket: this.bucketName,
              Key: blobId,
            }).promise();
          })
          .then(()=>{})
          .catch((error) => {
            console.error("Error removing blob:", error);
            throw error;
          });
    }
       

    //MARK: TODO Test this
    public getPackageHistoryFromDeploymentKey(deploymentKey: string): Promise<storage.Package[]> {
        return this.setupPromise
          .then(async () => {
            const deployment = await this.sequelize.models[MODELS.DEPLOYMENT].findOne({ where: { key: deploymentKey } });
            if (!deployment?.dataValues) {
              console.log(`Deployment not found for key: ${deploymentKey}`);
              return [];
            }
            return deployment.dataValues;
          })
          .then((deployment: storage.Deployment) => {
            // Fetch all packages associated with the deploymentId, ordered by uploadTime
            if (!deployment?.id) {
              console.log("Skipping package lookup due to missing deployment data.");
              return [];
            }
            return this.sequelize.models[MODELS.PACKAGE].findAll({
              where: { deploymentId: deployment.id },
              order: [['uploadTime', 'ASC']], // Sort by upload time to maintain historical order
            });
          })
          .then((packageRecords: any[]) => {
            if (!Array.isArray(packageRecords) || packageRecords.length === 0) {
              console.log("No packages found for the given deployment.");
              return [];
            }
            // Map each package record to the storage.Package format
            return packageRecords.map((pkgRecord) => this.formatPackage(pkgRecord.dataValues));
          })
          .catch((error) => {
            console.error("Error retrieving package history:", error);
            throw error;
          });
    }

    private getPackageHistoryFromBlob(deploymentId: string): Promise<storage.Package[]> {
        const deferred = defer<storage.Package[]>();
    
        // Use AWS SDK to download the blob from S3
        this.s3
          .getObject({ Bucket: this.bucketName, Key: `${deploymentId}/history.json` })
          .promise()
          .then((data) => {
            const packageHistory = JSON.parse(data.Body.toString());
            deferred.resolve(packageHistory);
          })
          .catch((error) => {
            deferred.reject(error);
          });
    
        return deferred.promise;
    }

    //blob utility methods
    private deleteHistoryBlob(blobId: string): Promise<void> {
        const deferred = defer<void>();
    
        this.s3
          .deleteObject({
            Bucket: this.bucketName,  // Your S3 bucket name
            Key: blobId               // The blob (file) ID to be deleted
          })
          .promise()
          .then(() => {
            deferred.resolve();
          })
          .catch((error: any) => {
            deferred.reject(error);
          });
    
        return deferred.promise;
    }
    

    private uploadToHistoryBlob(deploymentId: string, content: string): Promise<void> {
        const deferred = defer<void>();
    
        this.s3
          .putObject({
            Bucket: this.bucketName,
            Key: `${deploymentId}/history.json`,
            Body: content,
            ContentType: "application/json",
          })
          .promise()
          .then(() => {
            deferred.resolve();
          })
          .catch((error) => {
            deferred.reject(error);
          });
    
        return deferred.promise;
    }


    //Access Key Conformation
    public addAccessKey(accountId: string, accessKey: storage.AccessKey): Promise<string> {
        accessKey.id = shortid.generate();
        return this.setupPromise
          .then(() => {
            // Insert the access key into the database
            return this.sequelize.models[MODELS.ACCESSKEY].create({ ...accessKey, accountId: accountId });
          })
          .then(() => {
            return accessKey.id;
          });
    }

    public getUserFromAccessKey(accessKey: string): Promise<storage.Account> {
        return this.setupPromise
        .then(() => {
          return this.sequelize.models[MODELS.ACCESSKEY].findOne({ where: { friendlyName: accessKey } });
        }).then(async (accessKey: any) => {    
          if (!accessKey) {
            throw new Error("Access key not found");
          }
          return this.getAccount(accessKey.dataValues.accountId);
        }).catch((error: any) => {
          console.error("Error retrieving account:", error);
          throw error;
        });
    }

    public getUserFromAccessToken(accessToken: string): Promise<storage.Account> {
      return this.setupPromise
        .then(() => {
          return this.sequelize.models[MODELS.ACCESSKEY].findOne({ where: { name: accessToken } });
        }).then(async (accessKey: any) => {    
          if (!accessKey) {
            throw new Error("Access key not found");
          }
          return this.getAccount(accessKey.dataValues.accountId);
        }).catch((error: any) => {
          console.error("Error retrieving account:", error);
          throw error;
        });
    }


    public getAccessKey(accountId: string, accessKeyId: string): Promise<storage.AccessKey> {
        return this.setupPromise
          .then(() => {
            // Find the access key in the database using Sequelize
            return this.sequelize.models[MODELS.ACCESSKEY].findOne({
              where: {
                accountId: accountId,
                id: accessKeyId,
              },
            });
          })
          .then((accessKey: any) => {
            if (!accessKey) {
              throw new Error("Access key not found");
            }
            return accessKey.dataValues; // Return the access key data
          })
          .catch((error: any) => {
            console.error("Error retrieving access key:", error);
            throw error;
          });
    }

    public removeAccessKey(accountId: string, accessKeyId: string): Promise<void> {
        return this.setupPromise
          .then(() => {
            // First, retrieve the access key
            return this.getAccessKey(accountId, accessKeyId);
          })
          .then((accessKey) => {
            if (!accessKey) {
              throw new Error("Access key not found");
            }
    
            // Remove the access key from the database
            return this.sequelize.models[MODELS.ACCESSKEY].destroy({
              where: {
                accountId: accountId,
                id: accessKeyId,
              },
            });
          })
          .then(() => {
            console.log("Access key removed successfully");
          })
          .catch((error: any) => {
            console.error("Error removing access key:", error);
            throw error;
          });
    }

    public updateAccessKey(accountId: string, accessKey: storage.AccessKey): Promise<void> {
        if (!accessKey) {
          throw new Error("No access key provided");
        }
    
        if (!accessKey.id) {
          throw new Error("No access key ID provided");
        }
    
        return this.setupPromise
          .then(() => {
            // Update the access key in the database
            return this.sequelize.models[exports.MODELS.ACCESSKEY].update(accessKey, {
              where: {
                accountId: accountId,
                id: accessKey.id,
              },
            });
          })
          .then(() => {
            console.log("Access key updated successfully");
          })
          .catch((error: any) => {
            console.error("Error updating access key:", error);
            throw error;
          });
    }
    
    
    

    public getAccessKeys(accountId: string): Promise<storage.AccessKey[]> {
        return this.setupPromise
          .then(() => {
            // Retrieve all access keys for the account
            return this.sequelize.models[MODELS.ACCESSKEY].findAll({ where: { accountId: accountId } });
          })
          .then((accessKeys: any[]) => {
            return accessKeys.map((accessKey: any) => accessKey.dataValues);
          });
    }
    public getDeployment(accountId: string, appId: string, deploymentId: string): Promise<storage.Deployment> {
        return this.setupPromise
          .then(async () => {
            // Fetch the deployment by appId and deploymentId using Sequelize
            return this.retrieveByAppHierarchy(appId, deploymentId);
          })
          .then(async (flatDeployment: any) => {
            // Convert the retrieved Sequelize object to the desired format
            return this.attachPackageToDeployment(accountId, flatDeployment);
          })
          .catch((error) => {
            // Handle any Sequelize errors here
            console.error("Error fetching deployment:", error);
            throw error;
          });
    }

    private unflattenDeployment(flatDeployment: any): storage.Deployment {
        if (!flatDeployment) throw new Error("Deployment not found");
    
        // Parse the package field if it's stored as a JSON string in the DB
        flatDeployment.package = flatDeployment.package ? JSON.parse(flatDeployment.package) : null;
    
        // Return the unflattened deployment
        return flatDeployment;
    }

    private async attachPackageToDeployment(accounId: string, flatDeployment: any): Promise<storage.Deployment> {
      if (!flatDeployment) throw new Error("Deployment not found");
    
      // Retrieve the package details from the Package table using packageId
      let packageData: storage.Package | null = null;
      let packageHistory: storage.Package[] = [];
    
      if (flatDeployment.packageId) {
        const packageRecord = await this.sequelize.models[MODELS.PACKAGE].findOne({
          where: { id: flatDeployment.packageId },
        });
    
        if (packageRecord) {
          packageData = this.formatPackage(packageRecord.dataValues); // Format to match storage.Package interface
        }
      }

      packageHistory = await this.getPackageHistory(accounId, flatDeployment.appId, flatDeployment.id);
    
      // Construct and return the full deployment object
      return {
        id: flatDeployment.id,
        name: flatDeployment.name,
        key: flatDeployment.key,
        package: packageData, // Include the resolved package data
        packageHistory: packageHistory,
      };
    }
    
    // Helper function to format package data to storage.Package
    private formatPackage(pkgData: any): storage.Package | null {
      if (!pkgData) return null;
    
      return {
        appVersion: pkgData.appVersion,
        blobUrl: pkgData.blobUrl,
        description: pkgData.description,
        diffPackageMap: pkgData.diffPackageMap ? JSON.parse(pkgData.diffPackageMap) : undefined,
        isDisabled: pkgData.isDisabled,
        isMandatory: pkgData.isMandatory,
        label: pkgData.label,
        manifestBlobUrl: pkgData.manifestBlobUrl,
        originalDeployment: pkgData.originalDeployment,
        originalLabel: pkgData.originalLabel,
        packageHash: pkgData.packageHash,
        releasedBy: pkgData.releasedBy,
        releaseMethod: pkgData.releaseMethod,
        rollout: pkgData.rollout,
        size: pkgData.size,
        uploadTime: pkgData.uploadTime,
        isBundlePatchingEnabled: pkgData.isBundlePatchingEnabled,
      };
    }
    
    private retrieveByAppHierarchy(appId: string, deploymentId: string): Promise<any> {
        return Promise.resolve(
          this.sequelize.models[MODELS.DEPLOYMENT].findOne({
            where: {
              appId: appId,
              id: deploymentId, // Assuming 'id' is the deploymentId
            }
          })
        );
    }
    
    
    
    

    // No-op for safety, so that we don't drop the wrong db, pending a cleaner solution for removing test data.
    public dropAll(): Promise<void> {
      return Promise.resolve(<void>null);
    }
  

    private async getCollabrators(app:storage.App, accountId) {
      // BACKWARDS COMPATIBLE: Support both old app-level AND new tenant-level collaborators
      // Query: (tenantId = X AND appId IS NULL) OR (appId = Y)
      const { Op } = require('sequelize');
      
      const collabModel = await this.sequelize.models[MODELS.COLLABORATOR].findAll({
        where: { 
          [Op.or]: [
            { tenantId: app.tenantId, appId: null },  // NEW: Tenant-level
            { appId: app.id }                         // OLD: App-level (backwards compat)
          ]
        }
      });
      
      const collabMap = {}
      let foundOldFormat = false;
      
      collabModel.forEach((collab) => {
        const email = collab.dataValues["email"];
        const isAppLevel = collab.dataValues.appId !== null;
        const isTenantLevel = collab.dataValues.appId === null;
        
        // Log warning if old app-level collaborator found
        if (isAppLevel) {
          foundOldFormat = true;
          console.warn('⚠️ OLD APP-LEVEL COLLABORATOR FOUND:', {
            email: email,
            appId: collab.dataValues.appId,
            appName: app.name,
            message: 'Run migration: migrations/009_migrate_app_level_to_tenant_level.sql'
          });
        }
        
        // If Account exists in BOTH app-level and tenant-level, tenant-level wins
        if (collabMap[email]) {
          if (isTenantLevel) {
            // Override with tenant-level
            collabMap[email] = {
              accountId: collab.dataValues.accountId,  // Map DB column accountId to interface property accountId
              email: collab.dataValues.email,
              permission: collab.dataValues.permission,
              isCurrentAccount: false,
              source: 'tenant_level'
            };
          }
          // If app-level and already exists, skip (tenant-level already set)
        } else {
          // First time seeing this Account
          collabMap[email] = {
            accountId: collab.dataValues.accountId,  // Map DB column accountId to interface property accountId
            email: collab.dataValues.email,
            permission: collab.dataValues.permission,
            isCurrentAccount: false,
            source: isAppLevel ? 'app_level_legacy' : 'tenant_level'
          };
        }
      });
      
      // Log summary if old format found
      if (foundOldFormat) {
        console.warn(`⚠️ App "${app.name}" (${app.id}) has old app-level collaborators. Migration recommended.`);
      }
      
      // Mark current Account
      const currentAccountEmail: string = S3Storage.getEmailForAccountId(collabMap, accountId);
      if (currentAccountEmail && collabMap[currentAccountEmail]) {
        collabMap[currentAccountEmail].isCurrentAccount = true;
      }
      
      // NEW: Check if current Account is app creator (automatic Owner)
      const appCreatorId = (app as any).accountId || (app as any).createdBy;
      if (appCreatorId === accountId) {
        // Get Account's email
        const account = await this.sequelize.models["account"].findByPk(accountId);
        if (account) {
          const accountEmail = account.dataValues.email;
          
          // If Account is already in collabMap, ensure they have Owner permission
          if (collabMap[accountEmail]) {
            collabMap[accountEmail].permission = 'Owner';
            collabMap[accountEmail].isCurrentAccount = true;
            collabMap[accountEmail].source = 'app_creator';
          } else {
            // Add creator to collabMap as Owner
            collabMap[accountEmail] = {
              accountId: accountId,  // This is for CollaboratorMap interface (returned to client)
              email: accountEmail,
              permission: 'Owner',
              isCurrentAccount: true,
              source: 'app_creator'
            };
          }
        }
      }
      
      app["collaborators"] = collabMap
      return app;
    }

    

    public updateAppWithPermission(accountId: string, app: any, updateCollaborator: boolean = false): Promise<void> {
        const appId: string = app.id;
        if (!appId) throw new Error("No app id");
    
        const flatApp = this.flattenAppForSequelize(app, updateCollaborator);
    
        // Start a transaction since we may be updating multiple tables (app + collaborators)
        return this.setupPromise
            .then(() => {
                return this.sequelize.transaction((t) => {
                    // Update the App in the database
                    return this.sequelize.models[MODELS.APPS].update(flatApp, {
                        where: { id: appId },
                        transaction: t,
                    }).then(() => {
                        if (updateCollaborator && app.collaborators) {
                            // Remove 'isCurrentAccount' flag before updating collaborators
                            this.deleteIsCurrentAccountProperty(app.collaborators);
    
                            // First, remove existing collaborators for this app
                            return this.sequelize.models[MODELS.COLLABORATOR].destroy({
                                where: { appId: appId },
                                transaction: t,
                            }).then(() => {
                                // Then, add updated collaborators
                                const collaborators = Object.keys(app.collaborators).map((email) => {
                                    const collaborator = app.collaborators[email];
                                    return {
                                        email,
                                        accountId: collaborator.accountId,  // DB column is accountId, but interface uses accountId
                                        appId: appId,
                                        permission: collaborator.permission,
                                    };
                                });
    
                                // Add updated collaborators
                                return this.sequelize.models[MODELS.COLLABORATOR].bulkCreate(collaborators, { transaction: t }).then(() => {
                                    // Explicitly return void to satisfy the function's return type
                                    return;
                                });
                            });
                        } else {
                            // No collaborator update, just resolve the promise
                            return;
                        }
                    });
                });
            });
    }
    

    private flattenAppForSequelize(app: any, updateCollaborator: boolean = false): any {
        if (!app) {
            return app;
        }
    
        const flatApp: any = {};
        for (const property in app) {
            if (property === "collaborators" && updateCollaborator) {
                this.deleteIsCurrentAccountProperty(app.collaborators); // Remove unnecessary properties from collaborators
            } else if (property !== "collaborators") {
                flatApp[property] = app[property];  // Copy all other properties
            }
        }
    
        return flatApp;
    }

    private getNextLabel(packageHistory: storage.Package[]): string {
        if (packageHistory.length === 0) {
          return "v1";
        }
    
        const lastLabel: string = packageHistory[packageHistory.length - 1].label;
        const lastVersion: number = parseInt(lastLabel.substring(1)); // Trim 'v' from the front
        return "v" + (lastVersion + 1);
      }
    

    private deleteIsCurrentAccountProperty(map: any): void {
        if (map) {
            Object.keys(map).forEach((key: string) => {
                delete map[key].isCurrentAccount;
            });
        }
    }
    

  
    private static storageErrorHandler(
      azureError: any,
      overrideMessage: boolean = false,
      overrideCondition?: string,
      overrideValue?: string
    ): any {
      let errorCodeRaw: number | string;
      let errorMessage: string;
  
      try {
        const parsedMessage = JSON.parse(azureError.message);
        errorCodeRaw = parsedMessage["odata.error"].code;
        errorMessage = parsedMessage["odata.error"].message.value;
      } catch (error) {
        errorCodeRaw = azureError.code;
        errorMessage = azureError.message;
      }
  
      if (overrideMessage && overrideCondition === errorCodeRaw) {
        errorMessage = overrideValue;
      }
  
      if (typeof errorCodeRaw === "number") {
        // This is a storage.Error that we previously threw; just re-throw it
        throw azureError;
      }
  
      let errorCode: storage.ErrorCode;
      switch (errorCodeRaw) {
        case "BlobNotFound":
        case "ResourceNotFound":
        case "TableNotFound":
          errorCode = storage.ErrorCode.NotFound;
          break;
        case "EntityAlreadyExists":
        case "TableAlreadyExists":
          errorCode = storage.ErrorCode.AlreadyExists;
          break;
        case "EntityTooLarge":
        case "PropertyValueTooLarge":
          errorCode = storage.ErrorCode.TooLarge;
          break;
        case "ETIMEDOUT":
        case "ESOCKETTIMEDOUT":
        case "ECONNRESET":
          // This is an error emitted from the 'request' module, which is a
          // dependency of 'azure-storage', and indicates failure after multiple
          // retries.
          errorCode = storage.ErrorCode.ConnectionFailed;
          break;
        default:
          errorCode = storage.ErrorCode.Other;
          break;
      }
      throw storage.storageError(errorCode, errorMessage);
    }
  
    private static getEmailForAccountId(collaboratorsMap: storage.CollaboratorMap, accountId: string): string {
      if (collaboratorsMap) {
        for (const email of Object.keys(collaboratorsMap)) {
          if ((<storage.CollaboratorProperties>collaboratorsMap[email]).accountId === accountId) {
            return email;
          }
        }
      }
  
      return null;
    }
  }