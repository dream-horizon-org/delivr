/**
 * Workflow Tabs Constants
 * Constants for workflow list page tabs
 */

import { IconServer, IconBrandGithub } from '@tabler/icons-react';
import { CICD_PROVIDER_TYPES } from './integrations';

export const WORKFLOW_TABS = {
  JENKINS: 'jenkins',
  GITHUB: 'github',
} as const;

export type WorkflowTabValue = typeof WORKFLOW_TABS[keyof typeof WORKFLOW_TABS];

export interface WorkflowTabConfig {
  value: WorkflowTabValue;
  label: string;
  icon: React.ComponentType<any>;
  providerType: string; // CICD_PROVIDER_TYPES value
}

export const WORKFLOW_TAB_CONFIGS: WorkflowTabConfig[] = [
  {
    value: WORKFLOW_TABS.JENKINS,
    label: 'Jenkins',
    icon: IconServer,
    providerType: CICD_PROVIDER_TYPES.JENKINS,
  },
  {
    value: WORKFLOW_TABS.GITHUB,
    label: 'GitHub Actions',
    icon: IconBrandGithub,
    providerType: CICD_PROVIDER_TYPES.GITHUB_ACTIONS,
  },
] as const;

