/**
 * Configuration Wizard Steps Constants
 * Defines the step configuration for the release configuration wizard
 */

import {
  IconSettings,
  IconTarget,
  IconTestPipe,
  IconChecklist,
  IconCalendar,
  IconBell,
  IconFileCheck,
} from '@tabler/icons-react';
import type { Step } from '~/components/Common/VerticalStepper';

export const WIZARD_STEPS: Step[] = [
  { 
    id: 'basic', 
    title: 'Basic Information',
    description: 'Name and type',
    icon: (props: { size?: number; className?: string }) => <IconSettings size={props.size} className={props.className} />,
  },
  {
    id: 'platforms',
    title: 'Target Platforms',
    description: 'Select platforms',
    icon: (props: { size?: number; className?: string }) => <IconTarget size={props.size} className={props.className} />,
  },
  // ==================== COMMENTED OUT: CI/CD PIPELINE STEP ====================
  // TODO: Uncomment this step when CI/CD pipeline integration is ready
  // This was commented out to show manual upload flow only
  // When uncommenting, also update STEP_INDEX below (PIPELINES = 2, adjust all subsequent indices)
  // { 
  //   id: 'pipelines', 
  //   title: 'Build Pipelines', 
  //   description: 'Configure builds',
  //   icon: (props: { size?: number; className?: string }) => <IconSettings size={props.size} className={props.className} />,
  // },
  // ============================================================================
  { 
    id: 'build-upload', 
    title: 'Build Upload', 
    description: 'Manual upload',
    icon: (props: { size?: number; className?: string }) => <IconSettings size={props.size} className={props.className} />,
  },
  { 
    id: 'testing', 
    title: 'Test Management', 
    description: 'Optional',
    icon: (props: { size?: number; className?: string }) => <IconTestPipe size={props.size} className={props.className} />,
  },
  { 
    id: 'communication', 
    title: 'Communication', 
    description: 'Slack & email',
    icon: (props: { size?: number; className?: string }) => <IconBell size={props.size} className={props.className} />,
  },
  { 
    id: 'jira', 
    title: 'Jira Project', 
    description: 'Optional',
    icon: (props: { size?: number; className?: string }) => <IconChecklist size={props.size} className={props.className} />,
  },
  { 
    id: 'scheduling', 
    title: 'Scheduling (Optional)', 
    description: 'Release train',
    icon: (props: { size?: number; className?: string }) => <IconCalendar size={props.size} className={props.className} />,
  },
  { 
    id: 'review', 
    title: 'Review & Submit', 
    description: 'Final check',
    icon: (props: { size?: number; className?: string }) => <IconFileCheck size={props.size} className={props.className} />,
  },
];

// Step indices for easier reference
// NOTE: When uncommenting PIPELINES step, adjust all indices below it (+1)
export const STEP_INDEX = {
  BASIC: 0,
  PLATFORMS: 1,
  // PIPELINES: 2, // Commented out - restore when CI/CD is ready
  BUILD_UPLOAD: 2, // Manual upload step (replaces PIPELINES temporarily)
  TESTING: 3,
  COMMUNICATION: 4,
  PROJECT_MANAGEMENT: 5,
  SCHEDULING: 6,
  REVIEW: 7,
} as const;

