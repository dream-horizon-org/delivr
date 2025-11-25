/**
 * ReleaseTasksDTO - Data Access Layer for Release Tasks
 * 
 * Adapted from Delivr's ReleaseTasks.service.ts for Sequelize ORM
 * 
 * Key Changes:
 * - Uses Sequelize (not Prisma)
 * - Uses accounts table (not User)
 * - Uses accountId (not userId)
 * - Added stage, externalId, externalData support
 * - Removed workflowStatus, runId, workflowId (no GitHub workflows)
 */

import { v4 as uuidv4 } from 'uuid';
import { Sequelize } from 'sequelize';
import { getStorage } from '../storage-instance';
import { TaskType, TaskStatus, TaskStage, ReleaseTaskConclusion, TaskIdentifier } from './release-models';
import * as storageTypes from '../storage';

export interface CreateReleaseTaskData {
  releaseId: string;
  taskType: TaskType;
  stage: TaskStage;
  accountId?: string;
  regressionId?: string;
  taskId?: string;
  branch?: string;
  isReleaseKickOffTask?: boolean;
  isRegressionSubTasks?: boolean;
  identifier?: TaskIdentifier;
  externalId?: string;
  externalData?: Record<string, unknown>;
  taskStatus?: TaskStatus;
  taskConclusion?: ReleaseTaskConclusion;
}

export interface UpdateReleaseTaskData {
  taskStatus?: TaskStatus;
  taskConclusion?: ReleaseTaskConclusion;
  externalId?: string;
  externalData?: Record<string, unknown>;
  branch?: string;
  accountId?: string;
  [key: string]: unknown; // Allow other fields
}

/**
 * Release Task record type (returned from database)
 */
export interface ReleaseTaskRecord {
  id: string;
  taskId: string;
  releaseId: string | null;
  taskType: TaskType | null;
  stage: TaskStage | null;
  taskStatus: TaskStatus;
  taskConclusion: ReleaseTaskConclusion | null;
  accountId: string | null;
  regressionId: string | null;
  branch: string | null;
  isReleaseKickOffTask: boolean;
  isRegressionSubTasks: boolean;
  identifier: TaskIdentifier | null;
  externalId: string | null;
  externalData: Record<string, unknown> | string | null;
  createdAt: Date;
  updatedAt: Date;
  release?: {
    id: string;
    version: string;
    status: string;
  } | null;
  regressionCycle?: {
    id: string;
    status: string;
    cycleTag: string;
  } | null;
}

/**
 * Type guard to check if storage has Sequelize
 */
function hasSequelize(storage: storageTypes.Storage): storage is storageTypes.Storage & { sequelize: Sequelize } {
  return 'sequelize' in storage && storage.sequelize instanceof Sequelize;
}

export class ReleaseTasksDTO {
  private get sequelize(): Sequelize {
    const storage = getStorage();
    if (!hasSequelize(storage)) {
      throw new Error('Storage does not have Sequelize instance');
    }
    return storage.sequelize;
  }

  private get ReleaseTasksModel() {
    return this.sequelize.models.releaseTasks;
  }

  /**
   * Create a new release task
   */
  async create(data: CreateReleaseTaskData): Promise<ReleaseTaskRecord> {
    const taskId = data.taskId || uuidv4();
    const taskRecordId = uuidv4();

    const taskData = {
      id: taskRecordId,
      taskId,
      releaseId: data.releaseId,
      taskType: data.taskType,
      stage: data.stage,
      taskStatus: data.taskStatus || TaskStatus.PENDING,
      taskConclusion: data.taskConclusion || null,
      accountId: data.accountId || null,
      regressionId: data.regressionId || null,
      branch: data.branch || null,
      isReleaseKickOffTask: data.isReleaseKickOffTask || false,
      isRegressionSubTasks: data.isRegressionSubTasks || false,
      identifier: data.identifier || null,
      externalId: data.externalId || null,
      externalData: data.externalData ? JSON.stringify(data.externalData) : null,
    };

    const task = await this.ReleaseTasksModel.create(taskData);
    return task.toJSON();
  }

  /**
   * Get task by ID
   */
  async get(taskId: string): Promise<ReleaseTaskRecord | null> {
    const task = await this.ReleaseTasksModel.findOne({
      where: { taskId },
      include: [
        {
          model: this.sequelize.models.release,
          as: 'release',
          attributes: ['id', 'version', 'status'],
          required: false
        },
        {
          model: this.sequelize.models.regressionCycle,
          as: 'regressionCycle',
          attributes: ['id', 'status', 'cycleTag'],
          required: false
        }
      ]
    });

    if (!task) {
      return null;
    }

    const taskJson = task.toJSON();
    // Parse externalData if it's a string
    if (taskJson.externalData && typeof taskJson.externalData === 'string') {
      try {
        taskJson.externalData = JSON.parse(taskJson.externalData);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    return taskJson;
  }

  /**
   * Get task by record ID (primary key)
   */
  async getById(id: string): Promise<ReleaseTaskRecord | null> {
    const task = await this.ReleaseTasksModel.findByPk(id, {
      include: [
        {
          model: this.sequelize.models.release,
          as: 'release',
          attributes: ['id', 'version', 'status'],
          required: false
        },
        {
          model: this.sequelize.models.regressionCycle,
          as: 'regressionCycle',
          attributes: ['id', 'status', 'cycleTag'],
          required: false
        }
      ]
    });

    if (!task) {
      return null;
    }

    const taskJson = task.toJSON();
    // Parse externalData if it's a string
    if (taskJson.externalData && typeof taskJson.externalData === 'string') {
      try {
        taskJson.externalData = JSON.parse(taskJson.externalData);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    return taskJson;
  }

  /**
   * Update task
   */
  async update(taskId: string, data: UpdateReleaseTaskData): Promise<ReleaseTaskRecord> {
    const updateData: Record<string, unknown> = { ...data };

    // Stringify externalData if it's an object
    if (updateData.externalData && typeof updateData.externalData === 'object') {
      updateData.externalData = JSON.stringify(updateData.externalData);
    }

    const task = await this.ReleaseTasksModel.update(updateData, {
      where: { taskId },
      returning: true
    });

    if (task[0] === 0) {
      throw new Error(`Task with taskId ${taskId} not found`);
    }

    return await this.get(taskId);
  }

  /**
   * Update task by record ID
   */
  async updateById(id: string, data: UpdateReleaseTaskData): Promise<ReleaseTaskRecord> {
    const updateData: Record<string, unknown> = { ...data };

    // Stringify externalData if it's an object
    if (updateData.externalData && typeof updateData.externalData === 'object') {
      updateData.externalData = JSON.stringify(updateData.externalData);
    }

    const task = await this.ReleaseTasksModel.update(updateData, {
      where: { id },
      returning: true
    });

    if (task[0] === 0) {
      throw new Error(`Task with id ${id} not found`);
    }

    return await this.getById(id);
  }

  /**
   * Get all tasks for a release
   */
  async getByRelease(releaseId: string, options?: { stage?: TaskStage }): Promise<ReleaseTaskRecord[]> {
    const where: { releaseId: string; stage?: TaskStage } = { releaseId };
    if (options?.stage) {
      where.stage = options.stage;
    }

    const tasks = await this.ReleaseTasksModel.findAll({
      where,
      include: [
        {
          model: this.sequelize.models.regressionCycle,
          as: 'regressionCycle',
          attributes: ['id', 'status', 'cycleTag'],
          required: false
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    return tasks.map(task => {
      const taskJson = task.toJSON();
      // Parse externalData if it's a string
      if (taskJson.externalData && typeof taskJson.externalData === 'string') {
        try {
          taskJson.externalData = JSON.parse(taskJson.externalData);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      return taskJson;
    });
  }

  /**
   * Get tasks by release and stage
   */
  async getByReleaseAndStage(releaseId: string, stage: TaskStage): Promise<ReleaseTaskRecord[]> {
    return this.getByRelease(releaseId, { stage });
  }

  /**
   * Get task by task type for a release
   */
  async getByTaskType(releaseId: string, taskType: TaskType): Promise<ReleaseTaskRecord | null> {
    const task = await this.ReleaseTasksModel.findOne({
      where: {
        releaseId,
        taskType
      }
    });

    if (!task) {
      return null;
    }

    const taskJson = task.toJSON();
    // Parse externalData if it's a string
    if (taskJson.externalData && typeof taskJson.externalData === 'string') {
      try {
        taskJson.externalData = JSON.parse(taskJson.externalData);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }
    return taskJson;
  }

  /**
   * Get tasks by regression cycle
   */
  async getByRegressionCycle(regressionId: string): Promise<ReleaseTaskRecord[]> {
    const tasks = await this.ReleaseTasksModel.findAll({
      where: { regressionId },
      order: [['createdAt', 'ASC']]
    });

    return tasks.map(task => {
      const taskJson = task.toJSON();
      // Parse externalData if it's a string
      if (taskJson.externalData && typeof taskJson.externalData === 'string') {
        try {
          taskJson.externalData = JSON.parse(taskJson.externalData);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }
      return taskJson;
    });
  }

  /**
   * Delete task
   */
  async delete(taskId: string): Promise<void> {
    const deleted = await this.ReleaseTasksModel.destroy({
      where: { taskId }
    });

    if (deleted === 0) {
      throw new Error(`Task with taskId ${taskId} not found`);
    }
  }
}

