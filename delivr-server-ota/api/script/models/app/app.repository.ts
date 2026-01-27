/**
 * App Repository
 * Data access layer for App entity (renamed from Tenant)
 */

import type { Sequelize } from 'sequelize';
import type {
  AppAttributes,
  CreateAppRequest,
  UpdateAppRequest,
  AppWithPlatformTargets
} from '~types/app.types';

export class AppRepository {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly modelName: string = 'app'
  ) {}

  private getModel() {
    return this.sequelize.models[this.modelName];
  }

  private toPlainObject = (instance: any): AppAttributes => {
    const json = instance.toJSON();
    return {
      id: json.id,
      name: json.name,
      organizationId: json.organizationId,
      displayName: json.displayName ?? undefined,
      description: json.description ?? undefined,
      createdBy: json.createdBy,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt
    };
  };

  create = async (
    data: CreateAppRequest & { id: string; createdBy: string }
  ): Promise<AppAttributes> => {
    const app = await this.getModel().create({
      id: data.id,
      name: data.name,
      displayName: data.displayName ?? null,
      description: data.description ?? null,
      organizationId: data.organizationId ?? null,
      createdBy: data.createdBy
    });

    return this.toPlainObject(app);
  };

  findById = async (id: string): Promise<AppAttributes | null> => {
    const app = await this.getModel().findByPk(id);

    if (!app) {
      return null;
    }

    return this.toPlainObject(app);
  };

  findByOrganizationId = async (organizationId: string): Promise<AppAttributes[]> => {
    const apps = await this.getModel().findAll({
      where: { organizationId },
      order: [['createdAt', 'DESC']]
    });

    return apps.map((app) => this.toPlainObject(app));
  };

  findByCreatedBy = async (createdBy: string): Promise<AppAttributes[]> => {
    const apps = await this.getModel().findAll({
      where: { createdBy },
      order: [['createdAt', 'DESC']]
    });

    return apps.map((app) => this.toPlainObject(app));
  };

  findByName = async (name: string): Promise<AppAttributes | null> => {
    const app = await this.getModel().findOne({
      where: { name }
    });

    if (!app) {
      return null;
    }

    return this.toPlainObject(app);
  };

  findAll = async (): Promise<AppAttributes[]> => {
    const apps = await this.getModel().findAll({
      order: [['createdAt', 'DESC']]
    });

    return apps.map((app) => this.toPlainObject(app));
  };

  update = async (
    id: string,
    data: UpdateAppRequest
  ): Promise<AppAttributes | null> => {
    const app = await this.getModel().findByPk(id);

    if (!app) {
      return null;
    }

    await app.update({
      name: data.name ?? undefined,
      displayName: data.displayName ?? undefined,
      description: data.description ?? undefined
    });

    return this.toPlainObject(app);
  };

  delete = async (id: string): Promise<boolean> => {
    const rowsDeleted = await this.getModel().destroy({
      where: { id }
    });

    return rowsDeleted > 0;
  };

  findByIdWithPlatformTargets = async (id: string): Promise<AppWithPlatformTargets | null> => {
    const app = await this.getModel().findByPk(id, {
      include: [
        {
          model: this.sequelize.models['app_platform_target'],
          as: 'platformTargets',
          required: false
        }
      ]
    });

    if (!app) {
      return null;
    }

    const appData = this.toPlainObject(app);
    const platformTargets = (app as any).platformTargets?.map((pt: any) => pt.toJSON()) ?? [];

    return {
      ...appData,
      platformTargets
    };
  };
}
