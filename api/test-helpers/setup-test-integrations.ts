import { Sequelize } from 'sequelize';

/**
 * Creates test integration configurations for a tenant
 * This allows tests to run full E2E flows with mock integrations
 */
export async function setupTestIntegrations(sequelize: Sequelize, tenantId: string, accountId: string) {
  const SCMIntegrationModel = sequelize.models.tenantScmIntegration;
  const CICDIntegrationModel = sequelize.models.tenantCicdIntegration;
  const CICDWorkflowModel = sequelize.models.tenantCicdWorkflow;

  if (!SCMIntegrationModel || !CICDIntegrationModel || !CICDWorkflowModel) {
    console.warn('⚠️  Integration models not found - skipping test integration setup');
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
      providerType: 'GITHUB',
      displayName: 'Test SCM Integration',
      hostUrl: 'https://api.github.com',
      owner: 'test-owner',
      repository: 'test-repo',
      authType: 'TOKEN',
      accessToken: 'test-token-placeholder',
      isActive: true,
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
      authType: 'TOKEN',
      apiToken: 'test-token-placeholder',
      createdByAccountId: accountId,
      verificationStatus: 'VERIFIED',
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
      platform: 'ANDROID_WEB',
      displayName: 'Test Workflow - Regression Android'
    },
    {
      id: `test-workflow-automation-ios-${tenantId}`,
      workflowType: 'AUTOMATION_RUN',
      platform: 'IOS',
      displayName: 'Test Workflow - Automation iOS'
    },
    {
      id: `test-workflow-testflight-ios-${tenantId}`,
      workflowType: 'TESTFLIGHT_BUILD',
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
        workflowId: 'test-workflow.yml',
        repositoryOwner: 'test-owner',
        repositoryName: 'test-repo',
        branch: 'main',
        isActive: true,
        createdByAccountId: accountId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    workflowIds.push(workflow.id);
  }

  console.log(`  ✅ Test integrations created for tenant ${tenantId}`);
  console.log(`     - SCM: ${scmIntegrationId}`);
  console.log(`     - CI/CD: ${cicdIntegrationId}`);
  console.log(`     - Workflows: ${workflowIds.length}`);

  return {
    scmIntegrationId,
    cicdIntegrationId,
    workflowIds
  };
}

/**
 * Cleans up test integrations for a tenant
 */
export async function cleanupTestIntegrations(sequelize: Sequelize, tenantId: string) {
  const SCMIntegrationModel = sequelize.models.tenantScmIntegration;
  const CICDIntegrationModel = sequelize.models.tenantCicdIntegration;
  const CICDWorkflowModel = sequelize.models.tenantCicdWorkflow;

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

