/**
 * Test Management Config Repository
 * Data access layer for test management configurations
 */

import type {
  CreateTestManagementConfigDto,
  TestManagementConfig,
  UpdateTestManagementConfigDto
} from '~types/integrations/test-management/test-management-config';
import type { TestManagementConfigModelType } from './test-management-config.sequelize.model';

export class TestManagementConfigRepository {
  constructor(
    private readonly model: TestManagementConfigModelType
  ) {}

  private toPlainObject = (instance: InstanceType<TestManagementConfigModelType>): TestManagementConfig => {
    const json = instance.toJSON();
    return json;
  };

  create = async (
    data: CreateTestManagementConfigDto
  ): Promise<TestManagementConfig> => {
    const createdByAccountIdValue = data.createdByAccountId ?? null;

    const config = await this.model.create({
      projectId: data.projectId,
      integrationId: data.integrationId,
      name: data.name,
      passThresholdPercent: data.passThresholdPercent,
      platformConfigurations: data.platformConfigurations,
      createdByAccountId: createdByAccountIdValue
    });

    return this.toPlainObject(config);
  };

  findById = async (id: string): Promise<TestManagementConfig | null> => {
    const config = await this.model.findByPk(id);

    if (!config) {
      return null;
    }

    return this.toPlainObject(config);
  };

  findByProjectId = async (projectId: string): Promise<TestManagementConfig[]> => {
    const configs = await this.model.findAll({
      where: { projectId },
      order: [['createdAt', 'DESC']]
    });

    return configs.map((config) => this.toPlainObject(config));
  };

  findByIntegrationId = async (integrationId: string): Promise<TestManagementConfig[]> => {
    const configs = await this.model.findAll({
      where: { integrationId },
      order: [['createdAt', 'DESC']]
    });

    return configs.map((config) => this.toPlainObject(config));
  };

  update = async (
    id: string,
    data: UpdateTestManagementConfigDto
  ): Promise<TestManagementConfig | null> => {
    const config = await this.model.findByPk(id);

    if (!config) {
      return null;
    }

    await config.update(data);

    return this.toPlainObject(config);
  };

  delete = async (id: string): Promise<boolean> => {
    const rowsDeleted = await this.model.destroy({
      where: { id }
    });

    return rowsDeleted > 0;
  };
}

