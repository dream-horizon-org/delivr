/**
 * Project Management Config Sequelize Model
 * Reusable project management configurations for projects
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import type { PlatformConfiguration } from '~types/integrations/project-management';

export type ProjectManagementConfigAttributes = {
  id: string;
  tenantId: string;
  integrationId: string;
  name: string;
  description: string | null;
  platformConfigurations: PlatformConfiguration[];
  isActive: boolean;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectManagementConfigModelType = typeof Model & {
  new (): Model<ProjectManagementConfigAttributes>;
};

export const createProjectManagementConfigModel = (
  sequelize: Sequelize
): ProjectManagementConfigModelType => {
  const ProjectManagementConfigModel = sequelize.define<
    Model<ProjectManagementConfigAttributes>
  >(
    'ProjectManagementConfig',
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'tenantId',
        comment: 'Tenant identifier'
      },
      integrationId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'integrationId'
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      platformConfigurations: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        field: 'platformConfigurations'
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
        field: 'createdAt'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updatedAt'
      }
    },
    {
      tableName: 'project_management_configs',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      underscored: false
    }
  ) as ProjectManagementConfigModelType;

  return ProjectManagementConfigModel;
};

