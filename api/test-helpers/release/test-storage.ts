/**
 * Test Storage Helper
 * 
 * Creates a minimal storage instance for testing that initializes all integration controllers
 * without requiring S3 or other production dependencies.
 */

import { Sequelize } from 'sequelize';
import { SCMIntegrationController } from '../../script/storage/integrations/scm/scm-controller';
import { createModelss, S3Storage } from '../../script/storage/aws-storage';
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
import {
  createReleaseModel,
  createCronJobModel,
  createReleaseTaskModel,
  createRegressionCycleModel,
  createPlatformTargetMappingModel,
  createReleaseUploadModel,
  createBuildModel,
  ReleaseRepository,
  ReleasePlatformTargetMappingRepository,
  CronJobRepository,
  ReleaseTaskRepository,
  RegressionCycleRepository,
  ReleaseUploadsRepository,
  BuildRepository
} from '../../script/models/release';
import { SCMService } from '../../script/services/integrations/scm/scm.service';
import { MessagingService } from '../../script/services/integrations/comm/messaging/messaging.service';
import { CommIntegrationService } from '../../script/services/integrations/comm/comm-integration';
import { CommConfigService } from '../../script/services/integrations/comm/comm-config';
import {
  createCommIntegrationModel,
  createCommConfigModel,
  CommIntegrationRepository,
  CommConfigRepository
} from '../../script/models/integrations/comm';
import { ReleaseNotificationRepository } from '../../script/models/release-notification';
import { ReleaseNotificationService } from '../../script/services/release-notification';
import { TaskExecutor } from '../../script/services/release/task-executor/task-executor';
import { GlobalSchedulerService, type StateMachineFactory } from '../../script/services/release/cron-job/global-scheduler.service';
import { CronJobStateMachine } from '../../script/services/release/cron-job/cron-job-state-machine';
import type { CronJob } from '../../script/models/release/release.interface';
import { initializeStorage } from '../../script/storage/storage-instance';
import { UploadValidationService } from '../../script/services/release/upload-validation.service';
import { ManualUploadService } from '../../script/services/release/manual-upload.service';
import { BuildCallbackService } from '../../script/services/release/build-callback.service';
import { TestFlightBuildVerificationService } from '../../script/services/release/testflight-build-verification.service';
import { BuildArtifactService } from '../../script/services/release/build/build-artifact.service';
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

  // Initialize Comm Integration (needed for MessagingService)
  const commIntegrationModel = createCommIntegrationModel(sequelize);
  const commConfigModel = createCommConfigModel(sequelize);
  const commIntegrationRepository = new CommIntegrationRepository(commIntegrationModel);
  const commConfigRepository = new CommConfigRepository(commConfigModel);
  const commIntegrationService = new CommIntegrationService(commIntegrationRepository);
  const commConfigService = new CommConfigService(commConfigRepository, commIntegrationRepository);
  const messagingService = new MessagingService(commIntegrationService, commConfigService);

  // Initialize Release repositories (needed for TaskExecutor and GlobalSchedulerService)
  const ReleaseModel = createReleaseModel(sequelize);
  const ReleaseTaskModel = createReleaseTaskModel(sequelize);
  const CronJobModel = createCronJobModel(sequelize);
  const RegressionCycleModel = createRegressionCycleModel(sequelize);
  const PlatformMappingModel = createPlatformTargetMappingModel(sequelize);
  const ReleaseUploadModel = createReleaseUploadModel(sequelize);
  const BuildModel = createBuildModel(sequelize);

  const releaseRepository = new ReleaseRepository(ReleaseModel);
  const releaseTaskRepository = new ReleaseTaskRepository(ReleaseTaskModel);
  const cronJobRepository = new CronJobRepository(CronJobModel);
  const regressionCycleRepository = new RegressionCycleRepository(RegressionCycleModel);
  const platformMappingRepository = new ReleasePlatformTargetMappingRepository(PlatformMappingModel);
  const releaseUploadsRepository = new ReleaseUploadsRepository(sequelize, ReleaseUploadModel);
  const buildRepository = new BuildRepository(BuildModel);  // ✅ Required - actively initialized in aws-storage.ts

  // Initialize SCM Service (needed for TaskExecutor)
  const scmService = new SCMService();

  // Initialize Release Notification Service (needed for TaskExecutor)
  const releaseNotificationRepository = new ReleaseNotificationRepository(models.releaseNotification);
  // Note: ReleaseRetrievalService would be needed for ReleaseNotificationService, but for tests we can pass null
  const releaseNotificationService = new ReleaseNotificationService(
    messagingService,
    releaseNotificationRepository,
    releaseConfigService,
    null as any // releaseRetrievalService - not needed for basic tests
  );

  // Create minimal storage object and initialize it BEFORE creating TaskExecutor
  // (TaskExecutor constructor calls getStorage() which requires storage to be initialized)
  const minimalStorage = {
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
    releaseConfigRepository,
    releaseConfigService,
    releaseRepository,
    releaseTaskRepository,
    cronJobRepository,
    regressionCycleRepository,
    releasePlatformTargetMappingRepository: platformMappingRepository,
    releaseUploadsRepository,
    scmService,
    messagingService,
    releaseNotificationRepository,
    releaseNotificationService,
    setupPromise: Promise.resolve(),
    storeIntegrationController: null,
    storeCredentialController: null,
    platformStoreMappingController: null
  };
  
  // Initialize storage singleton BEFORE creating TaskExecutor
  initializeStorage(minimalStorage as any);

  // Initialize TaskExecutor (centralized initialization - replaces factory)
  // ✅ Pass Sequelize directly to avoid circular dependency (TaskExecutor no longer calls getStorage())
  // ✅ Pass regressionCycleRepository from storage to avoid creating new instance
  const taskExecutor = new TaskExecutor(
    scmService,
    cicdIntegrationRepository,
    cicdWorkflowRepository,
    cicdConfigService,
    projectManagementTicketService,
    testManagementRunService,
    messagingService,
    releaseConfigRepository,
    releaseTaskRepository,
    releaseRepository,
    releaseUploadsRepository,
    cronJobRepository,
    releaseNotificationService,
    sequelize,  // ✅ Pass Sequelize directly instead of TaskExecutor calling getStorage()
    regressionCycleRepository,  // ✅ Pass RegressionCycleRepository from storage instead of creating new instance
    undefined as any  // buildNotificationService (optional for tests)
  );

  // Initialize GlobalSchedulerService (centralized initialization - replaces factory)
  // Create state machine factory function
  const stateMachineFactory: StateMachineFactory = async (
    cronJob: CronJob
  ): Promise<CronJobStateMachine> => {
    const stateMachine = new CronJobStateMachine(
      cronJob.releaseId,
      cronJobRepository,
      releaseRepository,
      releaseTaskRepository,
      regressionCycleRepository,
      taskExecutor,
      { sequelize } as any, // Minimal storage object for tests
      platformMappingRepository,
      releaseUploadsRepository,
      buildRepository  // ✅ Required - actively initialized in aws-storage.ts
    );

    await stateMachine.initialize();
    return stateMachine;
  };

  const globalSchedulerService = new GlobalSchedulerService(
    cronJobRepository,
    stateMachineFactory
  );

  // Initialize Build Artifact Service (needed for ManualUploadService and BuildCallbackService)
  // Note: BuildArtifactService requires S3Storage instance
  // For tests, we create a mock object that passes instanceof S3Storage check
  // by setting its prototype to S3Storage.prototype
  const testS3Storage = Object.create(S3Storage.prototype) as any;
  testS3Storage.sequelize = sequelize;
  testS3Storage.buildRepository = buildRepository;
  testS3Storage.storeIntegrationController = null;
  testS3Storage.storeCredentialController = null;
  testS3Storage.testFlightBuildVerificationService = null; // Will be set below
  
  const buildArtifactService = new BuildArtifactService(testS3Storage);

  // Initialize Upload Validation Service (centralized initialization - replaces factory)
  const uploadValidationService = new UploadValidationService(
    releaseRepository,
    cronJobRepository,
    releaseTaskRepository,
    regressionCycleRepository,
    platformMappingRepository
  );

  // Initialize Manual Upload Service (centralized initialization - replaces factory)
  const manualUploadService = new ManualUploadService(
    releaseUploadsRepository,
    releaseRepository,
    platformMappingRepository,
    uploadValidationService,
    buildArtifactService
  );

  // Initialize Build Callback Service (centralized initialization - replaces factory)
  // Create a mock buildNotificationService for tests
  const mockBuildNotificationService = {
    notifyBuildCompletions: jest.fn().mockResolvedValue(undefined)
  } as any;
  
  const buildCallbackService = new BuildCallbackService(
    buildRepository,
    releaseTaskRepository,
    releaseRepository,
    cronJobRepository,
    releaseNotificationService,
    mockBuildNotificationService
  );

  // Initialize TestFlight Build Verification Service (centralized initialization - replaces factory)
  const testFlightBuildVerificationService = new TestFlightBuildVerificationService(
    null as any, // storeIntegrationController - not needed for basic tests
    null as any, // storeCredentialController - not needed for basic tests
    platformMappingRepository,
    releaseRepository
  );

  // Update testS3Storage with testFlightBuildVerificationService
  testS3Storage.testFlightBuildVerificationService = testFlightBuildVerificationService;

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
    // Release repositories (for TaskExecutor and GlobalSchedulerService)
    releaseRepository,
    releaseTaskRepository,
    cronJobRepository,
    regressionCycleRepository,
    releasePlatformTargetMappingRepository: platformMappingRepository,
    releaseUploadsRepository,
    // Services (for TaskExecutor and GlobalSchedulerService)
    scmService,
    messagingService,
    releaseNotificationRepository,
    releaseNotificationService,
    // Centralized services (replaces factories)
    taskExecutor,
    globalSchedulerService,
    // New services (centralized initialization - replaces factories)
    buildRepository,  // ✅ Required - actively initialized in aws-storage.ts
    buildArtifactService,  // ✅ Required - actively initialized in aws-storage.ts
    uploadValidationService,  // ✅ Required - actively initialized in aws-storage.ts
    manualUploadService,  // ✅ Required - actively initialized in aws-storage.ts
    buildCallbackService,  // ✅ Required - actively initialized in aws-storage.ts
    testFlightBuildVerificationService,  // ✅ Required - actively initialized in aws-storage.ts
    // Release services (placeholders for tests - full initialization would require many dependencies)
    releaseCreationService: null as any,  // TODO: Initialize if needed for specific tests
    releaseRetrievalService: null as any,  // TODO: Initialize if needed for specific tests
    releaseStatusService: null as any,  // TODO: Initialize if needed for specific tests
    releaseUpdateService: null as any,  // TODO: Initialize if needed for specific tests
    releaseActivityLogService: null as any,  // TODO: Initialize if needed for specific tests
    cronJobService: null as any,  // TODO: Initialize if needed for specific tests
    // Add minimal placeholders for S3Storage properties not needed in tests
    setupPromise: Promise.resolve(),
    storeIntegrationController: null,
    storeCredentialController: null,
    platformStoreMappingController: null
  };
}

