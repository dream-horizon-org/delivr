import type { TargetModelType } from './target.sequelize.model';
import { Target, CreateTargetDto } from './release.interface';

/**
 * Target Repository
 * Data access layer for targets reference table
 */
export class TargetRepository {
  constructor(private readonly model: TargetModelType) {}

  private toPlainObject(instance: any): Target {
    return instance.toJSON() as Target;
  }

  async create(data: CreateTargetDto): Promise<Target> {
    const target = await this.model.create({
      id: data.id,
      name: data.name
    });

    return this.toPlainObject(target);
  }

  async findById(id: string): Promise<Target | null> {
    const target = await this.model.findByPk(id);
    if (!target) return null;
    return this.toPlainObject(target);
  }

  async findByName(name: Target['name']): Promise<Target | null> {
    const target = await this.model.findOne({
      where: { name }
    });
    if (!target) return null;
    return this.toPlainObject(target);
  }

  async findAll(): Promise<Target[]> {
    const targets = await this.model.findAll({
      order: [['name', 'ASC']]
    });
    return targets.map(t => this.toPlainObject(t));
  }

  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }
}

