/**
 * Regression Cycle Creation Utilities
 * 
 * Creates regression cycles with tasks on-demand when slot time arrives
 */

import { v4 as uuidv4 } from 'uuid';
import { RegressionCycleRepository } from '../models/release/regression-cycle.repository';
import { ReleaseTaskRepository } from '../models/release/release-task.repository';
import { ReleaseRepository } from '../models/release/release.repository';
import { createStage2Tasks, CreateStage2TasksOptions } from './task-creation';
import { RegressionCycleStatus } from '../models/release/release.interface';

export interface CreateRegressionCycleWithTasksOptions {
  releaseId: string;
  accountId: string;
  cronConfig: {
    automationBuilds?: boolean;
    automationRuns?: boolean;
  };
  hasTestPlatformIntegration?: boolean;
}

/**
 * Create a new regression cycle with tasks
 * 
 * Key Logic:
 * - Marks previous cycles as isLatest: false, status: DONE
 * - Creates new cycle with isLatest: true, status: NOT_STARTED
 * - Generates cycle tag (v{version}_rc_{count})
 * - Creates all Stage 2 tasks for the cycle
 * 
 * @returns Created cycle with cycleTag set
 */
export async function createRegressionCycleWithTasks(
  regressionCycleRepo: RegressionCycleRepository,
  releaseTaskRepo: ReleaseTaskRepository,
  releaseRepo: ReleaseRepository,
  options: CreateRegressionCycleWithTasksOptions
): Promise<{ cycle: import('../models/release/regression-cycle.repository').RegressionCycle; taskIds: string[] }> {
  const { releaseId, accountId, cronConfig, hasTestPlatformIntegration } = options;

  // Get release to get version
  const release = await releaseRepo.findById(releaseId);
  if (!release) {
    throw new Error(`Release ${releaseId} not found`);
  }

  // Get current cycle count to determine if this is the first cycle
  const cycleCount = await regressionCycleRepo.getCycleCount(releaseId);
  const isFirstCycle = cycleCount === 0;

  // Get tag count for RC tag generation
  const tagCount = await regressionCycleRepo.getTagCount(releaseId);

  // Generate cycle tag (v{version}_rc_{count}) - use releaseId prefix since Release doesn't have version field
  const cycleTag = `${releaseId.substring(0, 8)}_rc_${tagCount + 1}`;

  // Create cycle (this will mark previous cycles as not latest)
  const cycle = await regressionCycleRepo.create({
    id: uuidv4(),
    releaseId,
    cycleTag,
    status: RegressionCycleStatus.NOT_STARTED
  });

  // Create Stage 2 tasks for this cycle
  const stage2TasksOptions: CreateStage2TasksOptions = {
    releaseId,
    regressionId: cycle.id,
    accountId,
    cronConfig,
    hasTestPlatformIntegration,
    isFirstCycle
  };

  const taskIds = await createStage2Tasks(releaseTaskRepo, stage2TasksOptions);

  return {
    cycle,
    taskIds
  };
}

