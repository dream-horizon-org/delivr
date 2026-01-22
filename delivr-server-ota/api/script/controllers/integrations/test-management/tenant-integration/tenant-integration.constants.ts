import { TestManagementProviderType } from '~types/integrations/test-management';

/**
 * Test Management Provider Metadata
 * Information about available test management providers
 */
export const TEST_MANAGEMENT_PROVIDERS = [
  {
    type: TestManagementProviderType.CHECKMATE,
    name: 'Checkmate',
    description: 'Test management platform for organizing and executing test cases',
    enabled: true,
    status: 'available',
    features: ['Projects', 'Sections', 'Labels', 'Squads', 'Test Runs']
  },
  {
    type: TestManagementProviderType.TESTRAIL,
    name: 'TestRail',
    description: 'Test case management software',
    enabled: false,
    status: 'coming_soon',
    features: ['Projects', 'Test Suites', 'Milestones', 'Test Runs']
  },
  // {
  //   type: TestManagementProviderType.XRAY,
  //   name: 'Xray',
  //   description: 'Test management for Jira',
  //   enabled: false,
  //   status: 'coming_soon',
  //   features: ['Projects', 'Test Sets', 'Test Executions']
  // },
  // {
  //   type: TestManagementProviderType.ZEPHYR,
  //   name: 'Zephyr',
  //   description: 'Test management for Jira',
  //   enabled: false,
  //   status: 'coming_soon',
  //   features: ['Projects', 'Test Cycles', 'Test Executions']
  // }
] as const;

