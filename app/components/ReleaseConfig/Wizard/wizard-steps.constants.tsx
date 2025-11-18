/**
 * Configuration Wizard Steps Constants
 * Defines the step configuration for the release configuration wizard
 */

import {
  IconSettings,
  IconTarget,
  IconTestPipe,
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
  { 
    id: 'pipelines', 
    title: 'Build Pipelines', 
    description: 'Configure builds',
    icon: (props: { size?: number; className?: string }) => <IconSettings size={props.size} className={props.className} />,
  },
  { 
    id: 'testing', 
    title: 'Test Management', 
    description: 'Optional',
    icon: (props: { size?: number; className?: string }) => <IconTestPipe size={props.size} className={props.className} />,
  },
  { 
    id: 'scheduling', 
    title: 'Scheduling', 
    description: 'Timings & slots',
    icon: (props: { size?: number; className?: string }) => <IconCalendar size={props.size} className={props.className} />,
  },
  { 
    id: 'communication', 
    title: 'Communication', 
    description: 'Slack & email',
    icon: (props: { size?: number; className?: string }) => <IconBell size={props.size} className={props.className} />,
  },
  { 
    id: 'review', 
    title: 'Review & Submit', 
    description: 'Final check',
    icon: (props: { size?: number; className?: string }) => <IconFileCheck size={props.size} className={props.className} />,
  },
];

// Step indices for easier reference
export const STEP_INDEX = {
  BASIC: 0,
  PLATFORMS: 1,
  PIPELINES: 2,
  TESTING: 3,
  SCHEDULING: 4,
  COMMUNICATION: 5,
  REVIEW: 6,
} as const;

