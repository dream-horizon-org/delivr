/**
 * Jira Integration Sequelize Models
 * 
 * Defines Sequelize models for Jira integrations:
 * - jira_integrations: Credentials table (one per tenant)
 * - jira_configurations: Reusable configurations (many per tenant)
 * - release_jira_epics: Epic management with config references
 */

import { Sequelize, DataTypes, Model, ModelStatic } from 'sequelize';

/**
 * Create Jira Integrations Model
 * 
 * Stores Jira credentials per tenant (jira_integrations table)
 * 
 * @param sequelize - Sequelize instance
 * @returns Sequelize model for jira_integrations table
 */
export function createJiraIntegrationsModel(sequelize: Sequelize): ModelStatic<Model<any, any>> {
  const JiraIntegrations = sequelize.define('jira_integrations', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    tenantId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'tenantId'
    },
    jiraInstanceUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'jiraInstanceUrl'
    },
    apiToken: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'apiToken',
      comment: 'Encrypted Jira API token or password'
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'email'
    },
    jiraType: {
      type: DataTypes.ENUM('JIRA_CLOUD', 'JIRA_SERVER', 'JIRA_DATA_CENTER'),
      allowNull: false,
      defaultValue: 'JIRA_CLOUD',
      field: 'jiraType'
    },
    isEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'isEnabled'
    },
    verificationStatus: {
      type: DataTypes.ENUM('NOT_VERIFIED', 'VALID', 'INVALID', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'NOT_VERIFIED',
      field: 'verificationStatus'
    },
    lastVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lastVerifiedAt'
    },
    createdByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'createdByAccountId'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updatedAt'
    }
  }, {
    tableName: 'jira_integrations',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['tenantId'],
        name: 'unique_tenant_jira'
      },
      {
        fields: ['tenantId'],
        name: 'idx_jira_integration_tenant'
      },
      {
        fields: ['verificationStatus'],
        name: 'idx_jira_verification'
      }
    ]
  });

  return JiraIntegrations;
}

/**
 * Create Jira Configurations Model
 * 
 * Stores reusable Jira configurations per tenant (jira_configurations table)
 * 
 * @param sequelize - Sequelize instance
 * @returns Sequelize model for jira_configurations table
 */
export function createJiraConfigurationsModel(sequelize: Sequelize): ModelStatic<Model<any, any>> {
  const JiraConfigurations = sequelize.define('jira_configurations', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    tenantId: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      field: 'tenantId'
    },
    configName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'configName'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description'
    },
    platformsConfig: {
      type: DataTypes.JSON,
      allowNull: false,
      field: 'platformsConfig',
      comment: 'Platform-specific Jira project keys and ready states'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'isActive'
    },
    createdByAccountId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'createdByAccountId'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updatedAt'
    }
  }, {
    tableName: 'jira_configurations',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['tenantId', 'configName'],
        name: 'unique_tenant_config_name'
      },
      {
        fields: ['tenantId', 'isActive'],
        name: 'idx_jira_config_tenant'
      },
      {
        fields: ['isActive'],
        name: 'idx_jira_config_active'
      }
    ]
  });

  return JiraConfigurations;
}

/**
 * Create Release Jira Epics Model
 * 
 * Stores epic metadata and tracks creation status for each release
 * Now references jira_configurations table via jiraConfigId
 * 
 * @param sequelize - Sequelize instance
 * @returns Sequelize model for release_jira_epics table
 */
export function createReleaseJiraEpicsModel(sequelize: Sequelize): ModelStatic<Model<any, any>> {
  const ReleaseJiraEpics = sequelize.define('release_jira_epics', {
    id: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      allowNull: false
    },
    releaseId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'releaseId'
    },
    platform: {
      type: DataTypes.ENUM('WEB', 'IOS', 'ANDROID'),
      allowNull: false
    },
    jiraConfigId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'jiraConfigId',
      comment: 'Reference to jira_configurations table'
    },
    epicTitle: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'epicTitle'
    },
    epicDescription: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'epicDescription'
    },
    jiraEpicKey: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'jiraEpicKey'
    },
    jiraEpicId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'jiraEpicId'
    },
    jiraEpicUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'jiraEpicUrl'
    },
    creationStatus: {
      type: DataTypes.ENUM('PENDING', 'CREATING', 'CREATED', 'FAILED'),
      allowNull: false,
      defaultValue: 'PENDING',
      field: 'creationStatus'
    },
    creationError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'creationError'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updatedAt'
    },
    jiraCreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'jiraCreatedAt'
    }
  }, {
    tableName: 'release_jira_epics',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['releaseId', 'platform'],
        name: 'unique_release_platform'
      },
      {
        fields: ['releaseId'],
        name: 'idx_release_epics'
      },
      {
        fields: ['creationStatus'],
        name: 'idx_epic_status'
      },
      {
        fields: ['jiraConfigId'],
        name: 'idx_epic_config'
      }
    ]
  });

  return ReleaseJiraEpics;
}

