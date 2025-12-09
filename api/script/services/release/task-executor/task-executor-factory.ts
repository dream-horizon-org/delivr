/**
 * Task Executor Factory (Production)
 * 
 * Singleton factory for creating and caching TaskExecutor instance.
 * Creates all dependencies once and reuses the same instance across all cron jobs.
 * 
 * Uses REAL services only - no test-specific logic.
 * For tests, use test-helpers/task-executor-factory.ts instead.
 * 
 * Follows cursor rules: No 'any' types, no 'as' operators
 */

import { TaskExecutor } from './task-executor';
import { SCMService } from '../../integrations/scm/scm.service';
import { CICDIntegrationRepository } from '../../../models/integrations/ci-cd/connection/connection.repository';
import { CICDWorkflowRepository } from '../../../models/integrations/ci-cd/workflow/workflow.repository';
import { ProjectManagementTicketService } from '../../integrations/project-management/ticket/ticket.service';
import { ProjectManagementConfigRepository } from '../../../models/integrations/project-management/configuration/configuration.repository';
import { ProjectManagementIntegrationRepository } from '../../../models/integrations/project-management/integration/integration.repository';
import { TestManagementRunService } from '../../integrations/test-management/test-run/test-run.service';
import { TestManagementConfigRepository } from '../../../models/integrations/test-management/test-management-config/test-management-config.repository';
import { TenantTestManagementIntegrationRepository } from '../../../models/integrations/test-management';
import { MessagingService } from '../../integrations/comm/messaging/messaging.service';
import { CommIntegrationService } from '../../integrations/comm/comm-integration/comm-integration.service';
import { CommConfigService } from '../../integrations/comm/comm-config/comm-config.service';
import { CommIntegrationRepository } from '../../../models/integrations/comm/comm-integration/comm-integration.repository';
import { CommConfigRepository } from '../../../models/integrations/comm/comm-config/comm-config.repository';
import { ReleaseConfigRepository } from '../../../models/release-configs/release-config.repository';
import { ReleaseTaskRepository } from '../../../models/release/release-task.repository';
import { ReleaseRepository } from '../../../models/release/release.repository';
import { createReleaseTaskModel } from '../../../models/release/release-task.sequelize.model';
import { createReleaseModel } from '../../../models/release/release.sequelize.model';
import { getStorage } from '../../../storage/storage-instance';
import { hasSequelize } from '../../../types/release/api-types';

/**
 * Cached TaskExecutor instance (singleton)
 */
let taskExecutorInstance: TaskExecutor | null = null;

/**
 * Get or create TaskExecutor instance
 * 
 * Uses singleton pattern: Creates all dependencies once on first call,
 * then returns the cached instance on subsequent calls.
 * 
 * @returns TaskExecutor instance
 * @throws Error if storage doesn't have Sequelize instance
 */
export function getTaskExecutor(): TaskExecutor {
  if (taskExecutorInstance) {
    return taskExecutorInstance;
  }

  // Get storage and verify it has Sequelize
  const storage = getStorage();
  
  if (!hasSequelize(storage)) {
    throw new Error('Storage does not have Sequelize instance');
  }
  
  // After type guard, TypeScript knows storage is StorageWithSequelize
  // No need for 'as' cast - the type guard narrows the type
  const sequelize = storage.sequelize;
  
  // Instantiate repositories
  const cicdIntegrationRepo = new CICDIntegrationRepository(sequelize.models.CICDIntegrationModel as any);
  const cicdWorkflowRepo = new CICDWorkflowRepository(sequelize.models.CICDWorkflowModel as any);
  const pmConfigRepo = new ProjectManagementConfigRepository(sequelize.models.ProjectManagementConfig);
  const pmIntegrationRepo = new ProjectManagementIntegrationRepository(sequelize.models.ProjectManagementIntegrationModel as any);
  const tmConfigRepo = new TestManagementConfigRepository(sequelize.models.TestManagementConfig);
  const tmIntegrationRepo = new TenantTestManagementIntegrationRepository(sequelize.models.TenantTestManagementIntegrationModel as any);
  const releaseConfigRepo = new ReleaseConfigRepository(sequelize.models.ReleaseConfig);
  
  // Instantiate services
  const scmService = new SCMService();
  
  const pmTicketService = new ProjectManagementTicketService(pmConfigRepo, pmIntegrationRepo);
  const testRunService = new TestManagementRunService(tmConfigRepo, tmIntegrationRepo);
  
  // Communication/Messaging service (for notifications)
  const commIntegrationRepo = new CommIntegrationRepository(sequelize.models.CommIntegrationModel as any);
  const commConfigRepo = new CommConfigRepository(sequelize.models.CommConfigModel as any);
  const commIntegrationService = new CommIntegrationService(commIntegrationRepo);
  const commConfigService = new CommConfigService(commConfigRepo, commIntegrationRepo);
  const messagingService = new MessagingService(commIntegrationService, commConfigService);
  
  // Release repositories (needed for task executor)
  const ReleaseTaskModel = createReleaseTaskModel(sequelize);
  const ReleaseModel = createReleaseModel(sequelize);
  const releaseTaskRepo = new ReleaseTaskRepository(ReleaseTaskModel);
  const releaseRepo = new ReleaseRepository(ReleaseModel);
  
  // Create TaskExecutor with all 9 dependencies
  taskExecutorInstance = new TaskExecutor(
    scmService,
    cicdIntegrationRepo,
    cicdWorkflowRepo,
    pmTicketService,
    testRunService,
    messagingService,
    releaseConfigRepo,
    releaseTaskRepo,
    releaseRepo
  );
  
  return taskExecutorInstance;
}

/**
 * Reset the cached TaskExecutor instance
 * 
 * Useful for testing or when you need to force recreation of the executor
 * with fresh dependencies.
 */
export function resetTaskExecutor(): void {
  taskExecutorInstance = null;
}

