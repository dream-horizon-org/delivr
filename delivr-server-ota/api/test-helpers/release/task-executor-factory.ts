import { Sequelize } from 'sequelize';
import { TaskExecutor } from '../../script/services/release/task-executor/task-executor';
import { MockSCMService } from './mock-scm-service';
import { CICDIntegrationRepository } from '../../script/models/integrations/ci-cd/connection/connection.repository';
import { CICDWorkflowRepository } from '../../script/models/integrations/ci-cd/workflow/workflow.repository';
import { CICDConfigRepository } from '../../script/models/integrations/ci-cd/config/config.repository';
import { CICDConfigService } from '../../script/services/integrations/ci-cd/config/config.service';
import { ProjectManagementTicketService } from '../../script/services/integrations/project-management/ticket/ticket.service';
import { ProjectManagementConfigRepository } from '../../script/models/integrations/project-management/configuration/configuration.repository';
import { ProjectManagementIntegrationRepository } from '../../script/models/integrations/project-management/integration/integration.repository';
import { TestManagementRunService } from '../../script/services/integrations/test-management/test-run/test-run.service';
import { TestManagementConfigRepository } from '../../script/models/integrations/test-management/test-management-config/test-management-config.repository';
import { TenantTestManagementIntegrationRepository } from '../../script/models/integrations/test-management';
// SlackIntegrationService not yet implemented - using placeholder type
type SlackIntegrationService = {
  sendNotification?: (message: string) => Promise<void>;
};
import { ReleaseConfigRepository } from '../../script/models/release-configs/release-config.repository';
import { ReleaseRepository } from '../../script/models/release/release.repository';
import { ReleaseTaskRepository } from '../../script/models/release/release-task.repository';
import { createReleaseModel } from '../../script/models/release/release.sequelize.model';
import { createReleaseTaskModel } from '../../script/models/release/release-task.sequelize.model';
import { ReleaseUploadsRepository } from '../../script/models/release/release-uploads.repository';
import { createReleaseUploadModel } from '../../script/models/release/release-uploads.sequelize.model';

/**
 * Cached TaskExecutor instance for tests (singleton pattern for performance)
 * Reusing same instance across test iterations avoids overhead of creating services 30 times
 */
let cachedTestTaskExecutor: TaskExecutor | null = null;

/**
 * Clear the cached TaskExecutor instance
 * Use this when you need a fresh TaskExecutor (e.g., after updating factory)
 */
export function clearTaskExecutorCache(): void {
  cachedTestTaskExecutor = null;
  console.log('[TEST FACTORY] TaskExecutor cache cleared');
}

/**
 * Creates TaskExecutor with mock SCM service for testing
 * 
 * Uses MockSCMService to avoid database dependencies on GitHub integrations.
 * Other services will gracefully handle missing configurations in test environment.
 * This allows tests to verify orchestration flow without requiring full integration setup.
 * 
 * Uses singleton pattern (same as production) to avoid recreating services on every call.
 * 
 * @param sequelize - Sequelize instance with initialized models
 * @returns TaskExecutor instance with all required service dependencies (cached after first call)
 */
export function createTaskExecutorForTests(sequelize: Sequelize): TaskExecutor {
  // Return cached instance if available (performance optimization)
  if (cachedTestTaskExecutor) {
    console.log('[TEST FACTORY] Returning cached TaskExecutor');
    return cachedTestTaskExecutor;
  }
  
  console.log('[TEST FACTORY] Creating NEW TaskExecutor with MockSCMService');
  // Instantiate mock SCM service (no database dependencies)
  const scmService = new MockSCMService() as any;
  
  // Get models from sequelize
  const cicdIntegrationModel = sequelize.models.CICDIntegrationModel as any;
  const cicdWorkflowModel = sequelize.models.CICDWorkflowModel as any;
  const pmConfigModel = sequelize.models.projectManagementConfig as any;
  const pmIntegrationModel = sequelize.models.projectManagementIntegration as any;
  const testConfigModel = sequelize.models.testManagementConfig as any;
  const testIntegrationModel = sequelize.models.tenantTestManagementIntegration as any;
  const releaseConfigModel = sequelize.models.ReleaseConfig as any;
  
  const cicdIntegrationRepository = new CICDIntegrationRepository(cicdIntegrationModel);
  const cicdWorkflowRepository = new CICDWorkflowRepository(cicdWorkflowModel);
  const cicdConfigModel = sequelize.models.CICDConfig as any;
  const cicdConfigRepository = new CICDConfigRepository(cicdConfigModel);
  const cicdConfigService = new CICDConfigService(cicdConfigRepository, cicdWorkflowRepository, cicdIntegrationRepository);
  
  const pmConfigRepository = new ProjectManagementConfigRepository(pmConfigModel);
  const pmIntegrationRepository = new ProjectManagementIntegrationRepository(pmIntegrationModel);
  const pmTicketService = new ProjectManagementTicketService(
    pmConfigRepository,
    pmIntegrationRepository
  );
  
  const testConfigRepository = new TestManagementConfigRepository(testConfigModel);
  const testIntegrationRepository = new TenantTestManagementIntegrationRepository(testIntegrationModel);
  const testRunService = new TestManagementRunService(
    testConfigRepository,
    testIntegrationRepository
  );
  
  // Slack service - using mock/placeholder (not yet implemented)
  const slackService: SlackIntegrationService = {
    sendNotification: async () => { /* Mock - no-op */ }
  };
  
  const releaseConfigRepository = new ReleaseConfigRepository(releaseConfigModel);
  
  // Get release models for repositories
  const releaseModel = sequelize.models.releases || createReleaseModel(sequelize);
  const releaseTaskModel = sequelize.models.release_tasks || createReleaseTaskModel(sequelize);
  const releaseUploadModel = sequelize.models.ReleaseUpload || createReleaseUploadModel(sequelize);
  
  const releaseTaskRepo = new ReleaseTaskRepository(releaseTaskModel as any);
  const releaseRepo = new ReleaseRepository(releaseModel as any);
  const releaseUploadsRepo = new ReleaseUploadsRepository(sequelize, releaseUploadModel as any);

  // Create and cache TaskExecutor (singleton for performance)
  // ✅ Pass Sequelize directly to avoid circular dependency (TaskExecutor no longer calls getStorage())
  // ✅ Pass regressionCycleRepository (optional - undefined if not needed for tests)
  cachedTestTaskExecutor = new TaskExecutor(
    scmService,
    cicdIntegrationRepository,
    cicdWorkflowRepository,
    cicdConfigService,
    pmTicketService,
    testRunService,
    slackService as any,  // MessagingService placeholder
    releaseConfigRepository,
    releaseTaskRepo,
    releaseRepo,
    releaseUploadsRepo,  // Optional: for Phase 18 manual build uploads
    undefined,  // cronJobRepo (optional)
    undefined,  // releaseNotificationService (optional)
    sequelize,  // ✅ Pass Sequelize directly instead of TaskExecutor calling getStorage()
    undefined,  // regressionCycleRepo (optional - not needed for all tests)
    undefined as any  // buildNotificationService (optional for tests)
  );
  
  console.log('[TEST FACTORY] TaskExecutor created with ReleaseUploadsRepository ✅');
  
  return cachedTestTaskExecutor;
}

