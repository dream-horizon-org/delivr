import { Sequelize } from 'sequelize';

/**
 * Creates test integration configurations for a tenant
 * This allows tests to run full E2E flows with mock integrations
 */
export async function setupTestIntegrations(sequelize: Sequelize, tenantId: string, accountId: string) {
  // Model names registered in createModelss() function (aws-storage.ts lines 392-394)
  const SCMIntegrationModel = sequelize.models.SCMIntegrationModel;
  const CICDIntegrationModel = sequelize.models.CICDIntegrationModel;
  const CICDWorkflowModel = sequelize.models.CICDWorkflowModel;

  if (!SCMIntegrationModel || !CICDIntegrationModel || !CICDWorkflowModel) {
    console.warn('⚠️  Integration models not found - skipping test integration setup');
    console.warn('   Available models:', Object.keys(sequelize.models));
    return {
      scmIntegrationId: null,
      cicdIntegrationId: null,
      workflows: []
    };
  }

  // 1. Create Test SCM Integration (GitHub)
  const scmIntegrationId = `test-scm-${tenantId}`;
  await SCMIntegrationModel.findOrCreate({
    where: { id: scmIntegrationId },
    defaults: {
      id: scmIntegrationId,
      tenantId,
      scmType: 'GITHUB',
      displayName: 'Test SCM Integration',
      owner: 'test-owner',
      repo: 'test-repo',
      repositoryUrl: 'https://github.com/test-owner/test-repo',
      defaultBranch: 'main',
      accessToken: 'test-token-placeholder',
      webhookEnabled: false,
      isActive: true,
      verificationStatus: 'VALID',
      createdByAccountId: accountId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // 2. Create Test CI/CD Integration (GitHub Actions)
  const cicdIntegrationId = `test-cicd-${tenantId}`;
  await CICDIntegrationModel.findOrCreate({
    where: { id: cicdIntegrationId },
    defaults: {
      id: cicdIntegrationId,
      tenantId,
      providerType: 'GITHUB_ACTIONS',
      displayName: 'Test CI/CD Integration',
      hostUrl: 'https://api.github.com',
      authType: 'BEARER',
      apiToken: 'test-token-placeholder',
      createdByAccountId: accountId,
      verificationStatus: 'VALID',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  // 3. Create Test CI/CD Workflows
  const workflows = [
    {
      id: `test-workflow-pre-regression-ios-${tenantId}`,
      workflowType: 'PRE_REGRESSION_BUILD',
      platform: 'IOS',
      displayName: 'Test Workflow - Pre-Regression iOS'
    },
    {
      id: `test-workflow-regression-ios-${tenantId}`,
      workflowType: 'REGRESSION_BUILD',
      platform: 'IOS',
      displayName: 'Test Workflow - Regression iOS'
    },
    {
      id: `test-workflow-regression-android-${tenantId}`,
      workflowType: 'REGRESSION_BUILD',
      platform: 'ANDROID',
      displayName: 'Test Workflow - Regression Android'
    },
    {
      id: `test-workflow-automation-ios-${tenantId}`,
      workflowType: 'AUTOMATION_BUILD',
      platform: 'IOS',
      displayName: 'Test Workflow - Automation iOS'
    },
    {
      id: `test-workflow-testflight-ios-${tenantId}`,
      workflowType: 'TEST_FLIGHT_BUILD',
      platform: 'IOS',
      displayName: 'Test Workflow - TestFlight iOS'
    }
  ];

  const workflowIds: string[] = [];
  for (const workflow of workflows) {
    await CICDWorkflowModel.findOrCreate({
      where: { id: workflow.id },
      defaults: {
        id: workflow.id,
        integrationId: cicdIntegrationId,
        tenantId,
        providerType: 'GITHUB_ACTIONS',
        workflowType: workflow.workflowType,
        platform: workflow.platform,
        displayName: workflow.displayName,
        workflowUrl: `https://github.com/test-owner/test-repo/actions/workflows/${workflow.workflowType.toLowerCase()}.yml`,
        providerIdentifiers: JSON.stringify({
          workflowId: 'test-workflow.yml',
          repositoryOwner: 'test-owner',
          repositoryName: 'test-repo',
          branch: 'main'
        }),
        parameters: null,
        createdByAccountId: accountId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    workflowIds.push(workflow.id);
  }

  // 4. Create Release Configuration linking all integrations
  const ReleaseConfigModel = sequelize.models.ReleaseConfig;
  const releaseConfigId = `test-release-config-${tenantId}`;
  
  if (ReleaseConfigModel) {
    await ReleaseConfigModel.findOrCreate({
      where: { id: releaseConfigId },
      defaults: {
        id: releaseConfigId,
        tenantId,
        name: 'Test Release Config',
        description: 'Test configuration for integration tests',
        releaseType: 'PLANNED',
        // New schema uses platformTargets (JSON array of {platform, target} objects)
        platformTargets: JSON.stringify([
          { platform: 'ANDROID', target: 'PLAY_STORE' },
          { platform: 'IOS', target: 'APP_STORE' },
          { platform: 'WEB', target: 'WEB' }
        ]),
        baseBranch: 'main',
        ciConfigId: workflowIds[0], // Use first workflow ID as CI config
        testManagementConfigId: null,
        projectManagementConfigId: null,
        commsConfigId: null,
        scheduling: null,
        hasManualBuildUpload: false,
        isActive: true,
        isDefault: false,
        createdByAccountId: accountId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  console.log(`  ✅ Test integrations created for tenant ${tenantId}`);
  console.log(`     - SCM: ${scmIntegrationId}`);
  console.log(`     - CI/CD: ${cicdIntegrationId}`);
  console.log(`     - Workflows: ${workflowIds.length}`);
  console.log(`     - Release Config: ${releaseConfigId}`);

  return {
    scmIntegrationId,
    cicdIntegrationId,
    workflowIds,
    releaseConfigId
  };
}

/**
 * Cleans up test integrations for a tenant
 */
export async function cleanupTestIntegrations(sequelize: Sequelize, tenantId: string) {
  const SCMIntegrationModel = sequelize.models.SCMIntegrationModel;
  const CICDIntegrationModel = sequelize.models.CICDIntegrationModel;
  const CICDWorkflowModel = sequelize.models.CICDWorkflowModel;

  if (!SCMIntegrationModel || !CICDIntegrationModel || !CICDWorkflowModel) {
    return;
  }

  // Clean up workflows first (foreign key constraint)
  await CICDWorkflowModel.destroy({
    where: { tenantId }
  });

  // Then integrations
  await SCMIntegrationModel.destroy({
    where: { tenantId }
  });

  await CICDIntegrationModel.destroy({
    where: { tenantId }
  });

  console.log(`  🧹 Test integrations cleaned up for tenant ${tenantId}`);
}

