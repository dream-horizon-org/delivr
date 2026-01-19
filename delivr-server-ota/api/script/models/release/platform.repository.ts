import type { PlatformModelType } from './platform.sequelize.model';
import { Platform, CreatePlatformDto } from './release.interface';

/**
 * Platform Repository
 * Data access layer for platforms reference table
 */
export class PlatformRepository {
  constructor(private readonly model: PlatformModelType) {}

  private toPlainObject(instance: any): Platform {
    return instance.toJSON() as Platform;
  }

  async create(data: CreatePlatformDto): Promise<Platform> {
    const platform = await this.model.create({
      id: data.id,
      name: data.name
    });

    return this.toPlainObject(platform);
  }

  async findById(id: string): Promise<Platform | null> {
    const platform = await this.model.findByPk(id);
    if (!platform) return null;
    return this.toPlainObject(platform);
  }

  async findByName(name: Platform['name']): Promise<Platform | null> {
    const platform = await this.model.findOne({
      where: { name }
    });
    if (!platform) return null;
    return this.toPlainObject(platform);
  }

  async findAll(): Promise<Platform[]> {
    const platforms = await this.model.findAll({
      order: [['name', 'ASC']]
    });
    return platforms.map(p => this.toPlainObject(p));
  }

  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }
}

