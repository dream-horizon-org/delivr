/**
 * App Platform Target Repository
 * Data access layer for app platform-target configurations
 */

import type { Sequelize } from 'sequelize';
import type {
  AppPlatformTargetAttributes,
  CreateAppPlatformTargetRequest,
  UpdateAppPlatformTargetRequest,
  ConfigurePlatformTargetsRequest
} from '~types/app-platform-target.types';

export class AppPlatformTargetRepository {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly modelName: string = 'app_platform_target'
  ) {}

  private getModel() {
    return this.sequelize.models[this.modelName];
  }

  private toPlainObject = (instance: any): AppPlatformTargetAttributes => {
    const json = instance.toJSON();
    return {
      id: json.id,
      appId: json.appId,
      platform: json.platform,
      target: json.target,
      isActive: json.isActive,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt
    };
  };

  create = async (
    data: CreateAppPlatformTargetRequest & { id: string }
  ): Promise<AppPlatformTargetAttributes> => {
    const platformTarget = await this.getModel().create({
      id: data.id,
      appId: data.appId,
      platform: data.platform,
      target: data.target,
      isActive: data.isActive ?? true
    });

    return this.toPlainObject(platformTarget);
  };

  findById = async (id: string): Promise<AppPlatformTargetAttributes | null> => {
    const platformTarget = await this.getModel().findByPk(id);

    if (!platformTarget) {
      return null;
    }

    return this.toPlainObject(platformTarget);
  };

  findByAppId = async (appId: string, activeOnly: boolean = false): Promise<AppPlatformTargetAttributes[]> => {
    const where: any = { appId };
    
    if (activeOnly) {
      where.isActive = true;
    }

    const platformTargets = await this.getModel().findAll({
      where,
      order: [['platform', 'ASC'], ['target', 'ASC']]
    });

    return platformTargets.map((pt) => this.toPlainObject(pt));
  };

  findByAppIdAndPlatform = async (
    appId: string,
    platform: AppPlatformTargetAttributes['platform']
  ): Promise<AppPlatformTargetAttributes[]> => {
    const platformTargets = await this.getModel().findAll({
      where: { appId, platform, isActive: true },
      order: [['target', 'ASC']]
    });

    return platformTargets.map((pt) => this.toPlainObject(pt));
  };

  findByAppIdAndPlatformAndTarget = async (
    appId: string,
    platform: AppPlatformTargetAttributes['platform'],
    target: AppPlatformTargetAttributes['target']
  ): Promise<AppPlatformTargetAttributes | null> => {
    const platformTarget = await this.getModel().findOne({
      where: { appId, platform, target }
    });

    if (!platformTarget) {
      return null;
    }

    return this.toPlainObject(platformTarget);
  };

  update = async (
    id: string,
    data: UpdateAppPlatformTargetRequest
  ): Promise<AppPlatformTargetAttributes | null> => {
    const platformTarget = await this.getModel().findByPk(id);

    if (!platformTarget) {
      return null;
    }

    await platformTarget.update({
      platform: data.platform ?? undefined,
      target: data.target ?? undefined,
      isActive: data.isActive ?? undefined
    });

    return this.toPlainObject(platformTarget);
  };

  delete = async (id: string): Promise<boolean> => {
    const rowsDeleted = await this.getModel().destroy({
      where: { id }
    });

    return rowsDeleted > 0;
  };

  /**
   * Configure platform targets for an app (replace all existing ones)
   */
  configureForApp = async (
    appId: string,
    data: ConfigurePlatformTargetsRequest
  ): Promise<AppPlatformTargetAttributes[]> => {
    // Delete existing platform targets for this app
    await this.getModel().destroy({
      where: { appId }
    });

    // Create new platform targets
    const { v4: uuidv4 } = await import('uuid');
    const created = await Promise.all(
      data.platformTargets.map(async (pt) => {
        return this.create({
          id: uuidv4(),
          appId,
          platform: pt.platform,
          target: pt.target,
          isActive: pt.isActive ?? true
        });
      })
    );

    return created;
  };

  /**
   * Activate/deactivate a platform target
   */
  setActive = async (id: string, isActive: boolean): Promise<AppPlatformTargetAttributes | null> => {
    return this.update(id, { isActive });
  };
}
