import type { ReleaseTaskModelType } from './release-task.sequelize.model';
import { ReleaseTask, CreateReleaseTaskDto, UpdateReleaseTaskDto } from './release.interface';

export class ReleaseTaskRepository {
  constructor(private readonly model: ReleaseTaskModelType) {}

  private toPlainObject(instance: any): ReleaseTask {
    return instance.toJSON() as ReleaseTask;
  }

  async create(data: CreateReleaseTaskDto): Promise<ReleaseTask> {
    const task = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      taskId: data.taskId ?? null,
      taskType: data.taskType,
      stage: data.stage,
      taskStatus: data.taskStatus || 'PENDING',
      taskConclusion: data.taskConclusion || null,
      accountId: data.accountId ?? null,
      isReleaseKickOffTask: data.isReleaseKickOffTask ?? false,
      isRegressionSubTasks: data.isRegressionSubTasks ?? false,
      identifier: data.identifier ?? null,
      branch: data.branch ?? null,
      regressionId: data.regressionId ?? null,
      externalId: data.externalId || null,
      externalData: data.externalData || null
    });

    return this.toPlainObject(task);
  }

  async findById(id: string): Promise<ReleaseTask | null> {
    const task = await this.model.findByPk(id);
    if (!task) return null;
    return this.toPlainObject(task);
  }

  async findByReleaseId(releaseId: string): Promise<ReleaseTask[]> {
    const tasks = await this.model.findAll({
      where: { releaseId },
      order: [['createdAt', 'ASC']]
    });
    return tasks.map((t: any) => this.toPlainObject(t));
  }

  async findByReleaseIdAndStage(releaseId: string, stage: string): Promise<ReleaseTask[]> {
    const tasks = await this.model.findAll({
      where: { releaseId, stage },
      order: [['createdAt', 'ASC']]
    });
    return tasks.map((t: any) => this.toPlainObject(t));
  }

  async update(taskId: string, updates: UpdateReleaseTaskDto): Promise<void> {
    await this.model.update(updates, {
      where: { id: taskId }
    });
  }

  async updateTaskStatus(
    taskId: string,
    status: ReleaseTask['taskStatus'],
    conclusion?: ReleaseTask['taskConclusion'],
    externalId?: string,
    externalData?: Record<string, unknown>
  ): Promise<void> {
    const updates: UpdateReleaseTaskDto = { taskStatus: status };
    
    if (conclusion) updates.taskConclusion = conclusion;
    if (externalId) updates.externalId = externalId;
    if (externalData) updates.externalData = externalData;

    await this.update(taskId, updates);
  }

  async bulkCreate(data: CreateReleaseTaskDto[]): Promise<ReleaseTask[]> {
    const tasks = await this.model.bulkCreate(
      data.map(d => ({
        id: d.id,
        releaseId: d.releaseId,
        taskId: d.taskId ?? null,
        taskType: d.taskType,
        stage: d.stage,
        taskStatus: d.taskStatus || 'PENDING',
        taskConclusion: d.taskConclusion || null,
        accountId: d.accountId ?? null,
        isReleaseKickOffTask: d.isReleaseKickOffTask ?? false,
        isRegressionSubTasks: d.isRegressionSubTasks ?? false,
        identifier: d.identifier ?? null,
        branch: d.branch ?? null,
        regressionId: d.regressionId ?? null,
        externalId: d.externalId || null,
        externalData: d.externalData || null
      }))
    );
    return tasks.map((t: any) => this.toPlainObject(t));
  }

  async delete(id: string): Promise<void> {
    await this.model.destroy({
      where: { id }
    });
  }
}
