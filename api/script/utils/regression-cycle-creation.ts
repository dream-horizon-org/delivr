/**
 * Regression Cycle Creation Utilities
 * 
 * Creates regression cycles with tasks on-demand when slot time arrives
 */

import { RegressionCycleDTO } from '../storage/release/regression-cycle-dto';
import { ReleaseTasksDTO } from '../storage/release/release-tasks-dto';
import { ReleaseDTO } from '../storage/release/release-dto';
import { createStage2Tasks, CreateStage2TasksOptions } from './task-creation';
import { RegressionCycleStatus } from '../storage/release/release-models';

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
  regressionCycleDTO: RegressionCycleDTO,
  releaseTasksDTO: ReleaseTasksDTO,
  releaseDTO: ReleaseDTO,
  options: CreateRegressionCycleWithTasksOptions
): Promise<{ cycle: any; taskIds: string[] }> {
  const { releaseId, accountId, cronConfig, hasTestPlatformIntegration } = options;

  // Get release to get version
  const release = await releaseDTO.get(releaseId);
  if (!release) {
    throw new Error(`Release ${releaseId} not found`);
  }

  // Get current cycle count to determine if this is the first cycle
  const cycleCount = await regressionCycleDTO.getCycleCount(releaseId);
  const isFirstCycle = cycleCount === 0;

  // Get tag count for RC tag generation
  const tagCount = await regressionCycleDTO.getTagCount(releaseId);

  // Generate cycle tag (v{version}_rc_{count})
  const cycleTag = `v${release.version}_rc_${tagCount}`;

  // Create cycle (this will mark previous cycles as not latest)
  const cycle = await regressionCycleDTO.create({
    releaseId,
    accountId,
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

  const taskIds = await createStage2Tasks(releaseTasksDTO, stage2TasksOptions);

  return {
    cycle,
    taskIds
  };
}

