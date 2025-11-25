import type { StateHistoryModelType } from './state-history.sequelize.model';
import { StateHistory, CreateStateHistoryDto } from './release.interface';

export class StateHistoryRepository {
  constructor(private readonly model: StateHistoryModelType) {}

  private toPlainObject(instance: any): StateHistory {
    return instance.toJSON() as StateHistory;
  }

  async create(data: CreateStateHistoryDto): Promise<StateHistory> {
    const history = await this.model.create({
      id: data.id,
      action: data.action,
      accountId: data.accountId,
      releaseId: data.releaseId || null,
      codepushId: data.codepushId || null,
      settingsId: data.settingsId || null
    });

    return this.toPlainObject(history);
  }

  async findById(id: string): Promise<StateHistory | null> {
    const history = await this.model.findByPk(id);
    if (!history) return null;
    return this.toPlainObject(history);
  }

  async findByReleaseId(releaseId: string): Promise<StateHistory[]> {
    const histories = await this.model.findAll({
      where: { releaseId },
      order: [['createdAt', 'DESC']]
    });
    return histories.map((h: any) => this.toPlainObject(h));
  }

  async findByAccountId(accountId: string): Promise<StateHistory[]> {
    const histories = await this.model.findAll({
      where: { accountId },
      order: [['createdAt', 'DESC']]
    });
    return histories.map((h: any) => this.toPlainObject(h));
  }

  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }
}
