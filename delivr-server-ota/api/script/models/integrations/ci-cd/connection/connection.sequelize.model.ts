import type { Sequelize } from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import type { TenantCICDIntegration, CICDProviderType, AuthType, VerificationStatus } from '~types/integrations/ci-cd/connection.interface';

export const createCICDIntegrationModel = (sequelize: Sequelize) => {
  class CICDIntegrationModel
    extends Model<TenantCICDIntegration>
    implements TenantCICDIntegration
  {
    declare id: string;
    declare appId: string;
    declare providerType: CICDProviderType;
    declare displayName: string;
    declare hostUrl: string;
    declare authType: AuthType;
    declare username: string | null;
    declare apiToken: string | null;
    declare headerName: string | null;
    declare headerValue: string | null;
    declare providerConfig: any | null;
    declare verificationStatus: VerificationStatus;
    declare lastVerifiedAt: Date | null;
    declare verificationError: string | null;
    declare createdByAccountId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  CICDIntegrationModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique identifier (shortid)'
      },
      appId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'apps', key: 'id' },  // Changed from 'tenants' to 'apps'
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Reference to apps table (renamed from tenants)'
      },
      providerType: {
        type: DataTypes.ENUM('JENKINS','GITHUB_ACTIONS','CIRCLE_CI','GITLAB_CI'),
        allowNull: false,
        comment: 'CI/CD provider type'
      },
      displayName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'User-friendly name'
      },
      hostUrl: {
        type: DataTypes.STRING(512),
        allowNull: false,
        comment: 'Base API URL'
      },
      authType: {
        type: DataTypes.ENUM('BASIC','BEARER','HEADER'),
        allowNull: false,
        defaultValue: 'BEARER',
        comment: 'Authentication mode'
      },
      username: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Username for BASIC auth'
      },
      apiToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted API token / PAT'
      },
      headerName: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Header name for HEADER auth (e.g., Circle-Token)'
      },
      headerValue: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted header value for HEADER auth'
      },
      providerConfig: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Provider-specific configuration JSON'
      },
      verificationStatus: {
        type: DataTypes.ENUM('PENDING','VALID','INVALID','EXPIRED'),
        allowNull: false,
        defaultValue: 'PENDING',
        comment: 'Connection verification status'
      },
      lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last successful verification time'
      },
      verificationError: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Verification error details'
      },
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        references: { model: 'accounts', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        comment: 'Account who created this'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      tableName: 'tenant_ci_cd_integrations',
      timestamps: true,
      indexes: [
        // Unique constraint: one integration type per tenant (also serves as composite index)
        { name: 'uniq_tenant_provider', fields: ['appId', 'providerType'], unique: true }
        // Note: Single-column indexes on appId/providerType/verificationStatus omitted
        // because they are low-cardinality and the unique constraint covers tenant+provider queries
      ]
    }
  );

  return CICDIntegrationModel;
};

export type CICDIntegrationModelType = ReturnType<typeof createCICDIntegrationModel>;


