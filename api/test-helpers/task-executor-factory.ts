import { Sequelize } from 'sequelize';
import { TaskExecutor } from '../script/services/task-executor';
import { SCMService } from '../script/services/integrations/scm/scm.service';
import { CICDIntegrationRepository } from '../script/models/integrations/ci-cd/connection/connection.repository';
import { CICDWorkflowRepository } from '../script/models/integrations/ci-cd/workflow/workflow.repository';
import { ProjectManagementTicketService } from '../script/services/integrations/project-management/ticket/ticket.service';
import { ProjectManagementConfigRepository } from '../script/models/integrations/project-management/configuration/configuration.repository';
import { ProjectManagementIntegrationRepository } from '../script/models/integrations/project-management/integration/integration.repository';
import { TestManagementRunService } from '../script/services/integrations/test-management/test-run/test-run.service';
import { TestManagementConfigRepository } from '../script/models/integrations/test-management/test-management-config/test-management-config.repository';
import { TenantTestManagementIntegrationRepository } from '../script/models/integrations/test-management';
import { SlackIntegrationService } from '../script/services/integrations/comm/slack-integration/slack-integration.service';
import { ReleaseConfigRepository } from '../script/models/release-configs/release-config.repository';

/**
 * Creates TaskExecutor with real services for testing
 * 
 * Services will gracefully handle missing configurations in test environment.
 * This allows tests to verify orchestration flow without requiring full integration setup.
 * 
 * @param sequelize - Sequelize instance with initialized models
 * @returns TaskExecutor instance with all required service dependencies
 */
export function createTaskExecutorForTests(sequelize: Sequelize): TaskExecutor {
  // Instantiate all required services
  const scmService = new SCMService();
  
  // Get models from sequelize
  const cicdIntegrationModel = sequelize.models.tenantCicdIntegration as any;
  const cicdWorkflowModel = sequelize.models.tenantCicdWorkflow as any;
  const pmConfigModel = sequelize.models.projectManagementConfig as any;
  const pmIntegrationModel = sequelize.models.projectManagementIntegration as any;
  const testConfigModel = sequelize.models.testManagementConfig as any;
  const testIntegrationModel = sequelize.models.tenantTestManagementIntegration as any;
  const releaseConfigModel = sequelize.models.releaseConfiguration as any;
  
  const cicdIntegrationRepository = new CICDIntegrationRepository(cicdIntegrationModel);
  const cicdWorkflowRepository = new CICDWorkflowRepository(cicdWorkflowModel);
  
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
  
  // Slack service - pass undefined for repository (graceful degradation)
  const slackService = new SlackIntegrationService(undefined as any);
  
  const releaseConfigRepository = new ReleaseConfigRepository(releaseConfigModel);
  
  // Create TaskExecutor with all dependencies
  return new TaskExecutor(
    scmService,
    cicdIntegrationRepository,
    cicdWorkflowRepository,
    pmTicketService,
    testRunService,
    slackService,
    releaseConfigRepository
  );
}

