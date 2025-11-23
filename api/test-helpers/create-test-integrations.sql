-- ============================================================================
-- TEST INTEGRATIONS SETUP
-- ============================================================================
-- Purpose: Create test integration configurations for running full E2E tests
-- Usage: Run this before running test-all-consolidated.ts
-- ============================================================================

-- Clean up any existing test integrations first
DELETE FROM tenant_scm_integrations WHERE display_name LIKE 'Test SCM%';
DELETE FROM tenant_cicd_integrations WHERE display_name LIKE 'Test CI/CD%';
DELETE FROM tenant_cicd_workflows WHERE display_name LIKE 'Test Workflow%';

-- ============================================================================
-- 1. Create Test SCM Integration (GitHub)
-- ============================================================================

INSERT INTO tenant_scm_integrations (
  id,
  tenant_id,
  provider_type,
  display_name,
  host_url,
  owner,
  repository,
  auth_type,
  access_token,
  is_active,
  created_by_account_id,
  created_at,
  updated_at
) VALUES (
  'test-scm-integration-00000000-0000-0000-0000-000000000001',
  'test-tenant-id', -- This will be replaced by test with actual tenant ID
  'GITHUB',
  'Test SCM Integration',
  'https://api.github.com',
  'test-owner',
  'test-repo',
  'TOKEN',
  'test-token-placeholder',
  true,
  'test-account-id',
  NOW(),
  NOW()
);

-- ============================================================================
-- 2. Create Test CI/CD Integration (GitHub Actions)
-- ============================================================================

INSERT INTO tenant_cicd_integrations (
  id,
  tenant_id,
  provider_type,
  display_name,
  host_url,
  auth_type,
  api_token,
  created_by_account_id,
  verification_status,
  created_at,
  updated_at
) VALUES (
  'test-cicd-integration-00000000-0000-0000-0000-000000000001',
  'test-tenant-id', -- This will be replaced by test with actual tenant ID
  'GITHUB_ACTIONS',
  'Test CI/CD Integration',
  'https://api.github.com',
  'TOKEN',
  'test-token-placeholder',
  'test-account-id',
  'VERIFIED',
  NOW(),
  NOW()
);

-- ============================================================================
-- 3. Create Test CI/CD Workflows (for different build types)
-- ============================================================================

-- Pre-regression builds workflow
INSERT INTO tenant_cicd_workflows (
  id,
  integration_id,
  tenant_id,
  provider_type,
  workflow_type,
  platform,
  display_name,
  workflow_id,
  repository_owner,
  repository_name,
  branch,
  is_active,
  created_by_account_id,
  created_at,
  updated_at
) VALUES (
  'test-workflow-pre-regression-ios',
  'test-cicd-integration-00000000-0000-0000-0000-000000000001',
  'test-tenant-id',
  'GITHUB_ACTIONS',
  'PRE_REGRESSION_BUILD',
  'IOS',
  'Test Workflow - Pre-Regression iOS',
  'test-workflow-pre-regression.yml',
  'test-owner',
  'test-repo',
  'main',
  true,
  'test-account-id',
  NOW(),
  NOW()
);

-- Regression builds workflow (IOS)
INSERT INTO tenant_cicd_workflows (
  id,
  integration_id,
  tenant_id,
  provider_type,
  workflow_type,
  platform,
  display_name,
  workflow_id,
  repository_owner,
  repository_name,
  branch,
  is_active,
  created_by_account_id,
  created_at,
  updated_at
) VALUES (
  'test-workflow-regression-ios',
  'test-cicd-integration-00000000-0000-0000-0000-000000000001',
  'test-tenant-id',
  'GITHUB_ACTIONS',
  'REGRESSION_BUILD',
  'IOS',
  'Test Workflow - Regression iOS',
  'test-workflow-regression.yml',
  'test-owner',
  'test-repo',
  'main',
  true,
  'test-account-id',
  NOW(),
  NOW()
);

-- Regression builds workflow (ANDROID_WEB)
INSERT INTO tenant_cicd_workflows (
  id,
  integration_id,
  tenant_id,
  provider_type,
  workflow_type,
  platform,
  display_name,
  workflow_id,
  repository_owner,
  repository_name,
  branch,
  is_active,
  created_by_account_id,
  created_at,
  updated_at
) VALUES (
  'test-workflow-regression-android',
  'test-cicd-integration-00000000-0000-0000-0000-000000000001',
  'test-tenant-id',
  'GITHUB_ACTIONS',
  'REGRESSION_BUILD',
  'ANDROID_WEB',
  'Test Workflow - Regression Android',
  'test-workflow-regression.yml',
  'test-owner',
  'test-repo',
  'main',
  true,
  'test-account-id',
  NOW(),
  NOW()
);

-- Automation runs workflow
INSERT INTO tenant_cicd_workflows (
  id,
  integration_id,
  tenant_id,
  provider_type,
  workflow_type,
  platform,
  display_name,
  workflow_id,
  repository_owner,
  repository_name,
  branch,
  is_active,
  created_by_account_id,
  created_at,
  updated_at
) VALUES (
  'test-workflow-automation-ios',
  'test-cicd-integration-00000000-0000-0000-0000-000000000001',
  'test-tenant-id',
  'GITHUB_ACTIONS',
  'AUTOMATION_RUN',
  'IOS',
  'Test Workflow - Automation iOS',
  'test-workflow-automation.yml',
  'test-owner',
  'test-repo',
  'main',
  true,
  'test-account-id',
  NOW(),
  NOW()
);

-- TestFlight build workflow
INSERT INTO tenant_cicd_workflows (
  id,
  integration_id,
  tenant_id,
  provider_type,
  workflow_type,
  platform,
  display_name,
  workflow_id,
  repository_owner,
  repository_name,
  branch,
  is_active,
  created_by_account_id,
  created_at,
  updated_at
) VALUES (
  'test-workflow-testflight-ios',
  'test-cicd-integration-00000000-0000-0000-0000-000000000001',
  'test-tenant-id',
  'GITHUB_ACTIONS',
  'TESTFLIGHT_BUILD',
  'IOS',
  'Test Workflow - TestFlight iOS',
  'test-workflow-testflight.yml',
  'test-owner',
  'test-repo',
  'main',
  true,
  'test-account-id',
  NOW(),
  NOW()
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT '✅ Test integrations created!' as Status;
SELECT '  - 1 SCM integration (GitHub)' as '';
SELECT '  - 1 CI/CD integration (GitHub Actions)' as '';
SELECT '  - 5 CI/CD workflows (various build types)' as '';
SELECT '' as '';
SELECT 'Note: tenant_id placeholder will be replaced by test code with actual tenant ID' as '';

