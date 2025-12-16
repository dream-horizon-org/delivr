/**
 * Test Storage Helper
 * 
 * Creates a minimal storage instance for testing that initializes all integration controllers
 * without requiring S3 or other production dependencies.
 */

import { Sequelize } from 'sequelize';
import { SCMIntegrationController } from '../../script/storage/integrations/scm/scm-controller';
import { createModelss } from '../../script/storage/aws-storage';
// Note: Release models are now created within createModelss (aws-storage.ts)
import {
  CICDIntegrationRepository,
  CICDWorkflowRepository,
  CICDConfigRepository
} from '../../script/models/integrations/ci-cd';
import { CICDConfigService } from '../../script/services/integrations/ci-cd';
import {
  createTenantTestManagementIntegrationModel,
  createTestManagementConfigModel,
  TenantTestManagementIntegrationRepository,
  TestManagementConfigRepository
} from '../../script/models/integrations/test-management';
import {
  createProjectManagementIntegrationModel,
  createProjectManagementConfigModel,
  ProjectManagementIntegrationRepository,
  ProjectManagementConfigRepository
} from '../../script/models/integrations/project-management';
import {
  ProjectManagementIntegrationService,
  ProjectManagementConfigService,
  ProjectManagementTicketService
} from '../../script/services/integrations/project-management';
import {
  TestManagementIntegrationService,
  TestManagementConfigService,
  TestManagementRunService
} from '../../script/services/integrations/test-management';
import { CheckmateMetadataService } from '../../script/services/integrations/test-management/metadata/checkmate';
import {
  createReleaseConfigModel,
  ReleaseConfigRepository
} from '../../script/models/release-configs';
import { ReleaseConfigService } from '../../script/services/release-configs';
// TODO: Slack integration not yet implemented
// import { SlackIntegrationService } from '../../script/services/integrations/comm/slack-integration';
// import { SlackChannelConfigService } from '../../script/services/integrations/comm/slack-channel-config';
// import { createSlackIntegrationModel, createChannelConfigModel } from '../../script/storage/integrations/comm/slack-models';
// import { SlackIntegrationController, ChannelController } from '../../script/storage/integrations/comm/slack-controller';

/**
 * Create a test storage object with all controllers initialized
 * This mimics the S3Storage.setup() initialization but without S3 dependencies
 */
export function createTestStorage(sequelize: Sequelize) {
  console.log('📦 Initializing test storage with all controllers...');

  // Create all models (same as S3Storage does)
  // Note: createModelss also creates release models (Release, CronJob, ReleaseTask, etc.)
  const models = createModelss(sequelize);

  // Initialize SCM Controller
  const scmController = new SCMIntegrationController(models.SCMIntegrations);

  // Initialize CI/CD Repositories
  const cicdIntegrationRepository = new CICDIntegrationRepository(models.CICDIntegrations);
  const cicdWorkflowRepository = new CICDWorkflowRepository(models.CICDWorkflows);
  const cicdConfigRepository = new CICDConfigRepository(models.CICDConfig);
  
  // Initialize CI/CD Config Service
  const cicdConfigService = new CICDConfigService(cicdConfigRepository, cicdWorkflowRepository);

  // Initialize Test Management
  const tenantIntegrationModel = createTenantTestManagementIntegrationModel(sequelize);
  const tenantIntegrationRepository = new TenantTestManagementIntegrationRepository(tenantIntegrationModel);
  
  const testManagementConfigModel = createTestManagementConfigModel(sequelize);
  const testManagementConfigRepository = new TestManagementConfigRepository(testManagementConfigModel);
  
  const testManagementIntegrationService = new TestManagementIntegrationService(tenantIntegrationRepository);
  const testManagementConfigService = new TestManagementConfigService(
    testManagementConfigRepository,
    tenantIntegrationRepository
  );
  const testManagementRunService = new TestManagementRunService(
    testManagementConfigRepository,
    tenantIntegrationRepository
  );
  const checkmateMetadataService = new CheckmateMetadataService(tenantIntegrationRepository);

  // Initialize Project Management
  const projectManagementIntegrationModel = createProjectManagementIntegrationModel(sequelize);
  const projectManagementIntegrationRepository = new ProjectManagementIntegrationRepository(
    projectManagementIntegrationModel
  );
  
  const projectManagementConfigModel = createProjectManagementConfigModel(sequelize);
  const projectManagementConfigRepository = new ProjectManagementConfigRepository(
    projectManagementConfigModel
  );
  
  const projectManagementIntegrationService = new ProjectManagementIntegrationService(
    projectManagementIntegrationRepository
  );
  const projectManagementConfigService = new ProjectManagementConfigService(
    projectManagementConfigRepository,
    projectManagementIntegrationRepository
  );
  const projectManagementTicketService = new ProjectManagementTicketService(
    projectManagementConfigRepository,
    projectManagementIntegrationRepository
  );

  // TODO: Slack integration not yet implemented
  // const slackModel = createSlackIntegrationModel(sequelize);
  // const channelConfigModel = createChannelConfigModel(sequelize);
  // const slackController = new SlackIntegrationController(slackModel);
  // const channelController = new ChannelController(channelConfigModel);
  // const slackIntegrationService = new SlackIntegrationService(slackController);
  // const slackChannelConfigService = new SlackChannelConfigService(channelController, slackController);

  // Initialize Release Config
  const releaseConfigModel = createReleaseConfigModel(sequelize);
  const releaseConfigRepository = new ReleaseConfigRepository(releaseConfigModel);
  const releaseConfigService = new ReleaseConfigService(
    releaseConfigRepository,
    null as any, // releaseScheduleService - TODO: implement
    cicdConfigService,
    testManagementConfigService,
    null as any, // commConfigService - TODO: implement
    projectManagementConfigService
  );

  console.log('✅ Test storage initialized with all controllers\n');

  // Return storage object matching the Storage interface structure
  return {
    sequelize,
    scmController,
    cicdIntegrationRepository,
    cicdWorkflowRepository,
    cicdConfigRepository,
    cicdConfigService,
    tenantIntegrationRepository,
    testManagementConfigRepository,
    testManagementIntegrationService,
    testManagementConfigService,
    testManagementRunService,
    checkmateMetadataService,
    projectManagementIntegrationRepository,
    projectManagementConfigRepository,
    projectManagementIntegrationService,
    projectManagementConfigService,
    projectManagementTicketService,
    // TODO: Slack integration not yet implemented
    slackController: null as any,
    channelController: null as any,
    slackIntegrationService: null as any,
    slackChannelConfigService: null as any,
    releaseConfigRepository,
    releaseConfigService,
    // Add minimal placeholders for S3Storage properties not needed in tests
    setupPromise: Promise.resolve(),
    storeIntegrationController: null,
    storeCredentialController: null,
    platformStoreMappingController: null
  };
}

