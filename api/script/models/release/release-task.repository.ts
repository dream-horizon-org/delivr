import { ReleaseTask, CreateReleaseTaskDto } from './release.interface';
import { TaskStatus } from '../../storage/release/release-models';

export class ReleaseTaskRepository {
  constructor(private readonly model: any) {}

  private toPlainObject(instance: any): ReleaseTask {
    return instance.toJSON() as ReleaseTask;
  }

  async create(data: CreateReleaseTaskDto): Promise<ReleaseTask> {
    const task = await this.model.create({
      id: data.id,
      releaseId: data.releaseId,
      taskId: data.taskId,
      taskType: data.taskType,
      stage: data.stage,
      taskStatus: TaskStatus.PENDING,
      taskConclusion: null,
      accountId: data.accountId,
      isReleaseKickOffTask: data.isReleaseKickOffTask ?? false,
      isRegressionSubTasks: data.isRegressionSubTasks ?? false,
      identifier: data.identifier ?? null,
      branch: data.branch ?? null,
      regressionId: data.regressionId ?? null,
      externalId: null,
      externalData: null
    });

    return this.toPlainObject(task);
  }

  async findByReleaseIdAndStage(releaseId: string, stage: string): Promise<ReleaseTask[]> {
    const tasks = await this.model.findAll({
      where: { releaseId, stage }
    });
    return tasks.map((t: any) => this.toPlainObject(t));
  }

  async bulkCreate(data: CreateReleaseTaskDto[]): Promise<ReleaseTask[]> {
    const tasks = await this.model.bulkCreate(
      data.map(d => ({
        id: d.id,
        releaseId: d.releaseId,
        taskId: d.taskId,
        taskType: d.taskType,
        stage: d.stage,
        taskStatus: TaskStatus.PENDING,
        taskConclusion: null,
        accountId: d.accountId,
        isReleaseKickOffTask: d.isReleaseKickOffTask ?? false,
        isRegressionSubTasks: d.isRegressionSubTasks ?? false,
        identifier: d.identifier ?? null,
        branch: d.branch ?? null,
        regressionId: d.regressionId ?? null,
        externalId: null,
        externalData: null
      }))
    );
    return tasks.map((t: any) => this.toPlainObject(t));
  }
}

