import { StateHistory, CreateStateHistoryDto, CreateStateHistoryItemDto } from './release.interface';

export class StateHistoryRepository {
  constructor(
    private readonly stateHistoryModel: any,
    private readonly stateHistoryItemModel: any
  ) {}

  private toPlainObject(instance: any): StateHistory {
    return instance.toJSON() as StateHistory;
  }

  async create(data: CreateStateHistoryDto): Promise<StateHistory> {
    const history = await this.stateHistoryModel.create({
      id: data.id,
      releaseId: data.releaseId,
      accountId: data.accountId,
      action: data.action,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return this.toPlainObject(history);
  }

  async createHistoryItem(data: CreateStateHistoryItemDto): Promise<void> {
    await this.stateHistoryItemModel.create({
      id: data.id,
      historyId: data.historyId,
      group: data.group,
      type: data.type,
      key: data.key,
      value: data.value,
      oldValue: data.oldValue,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

