/**
 * Release Configuration Constants
 * Centralized constants for all Release Configuration components
 */

import {
  IconSettings,
  IconTarget,
  IconTestPipe,
  IconChecklist,
  IconCalendar,
  IconBell,
  IconFileCheck,
  IconWorld,
  IconBrandAndroid,
  IconBrandApple,
} from '@tabler/icons-react';
import type { Step } from '~/components/Common/VerticalStepper/VerticalStepper';
import type { BuildProvider, Platform, JiraProjectConfig } from '~/types/release-config';
import { PLATFORMS as PLATFORM_CONSTANTS, BUILD_ENVIRONMENTS, TARGET_PLATFORMS } from '~/types/release-config-constants';
import type { PipelineCategoryConfig } from '~/types/release-config-props';

// =============================================================================
// WIZARD STEPS & NAVIGATION
// =============================================================================

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
    id: 'build-upload', 
    title: 'Build Upload Method', 
    description: 'Manual or CI/CD',
    icon: (props: { size?: number; className?: string }) => <IconSettings size={props.size} className={props.className} />,
  },
  { 
    id: 'pipelines', 
    title: 'CI/CD Workflows', 
    description: 'Configure builds',
    icon: (props: { size?: number; className?: string }) => <IconSettings size={props.size} className={props.className} />,
  },
  { 
    id: 'testing', 
    title: 'Test Management', 
    description: "Configure test management integrations",
    icon: (props: { size?: number; className?: string }) => <IconTestPipe size={props.size} className={props.className} />,
  },
  { 
    id: 'communication', 
    title: 'Communication', 
    description: 'Slack',
    icon: (props: { size?: number; className?: string }) => <IconBell size={props.size} className={props.className} />,
  },
  { 
    id: 'jira', 
    title: 'Project Management', 
    description: 'Link releases to JIRA issues and track project progress',
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
export const STEP_INDEX = {
  BASIC: 0,
  PLATFORMS: 1,
  BUILD_UPLOAD: 2, // Choose between Manual or CI/CD
  PIPELINES: 3, // CI/CD Workflows configuration (conditional - only shown if buildUploadStep = 'CI_CD')
  TESTING: 4,
  COMMUNICATION: 5,
  PROJECT_MANAGEMENT: 6,
  SCHEDULING: 7,
  REVIEW: 8,
} as const;

// =============================================================================
// JIRA / PROJECT MANAGEMENT
// =============================================================================

// Platform display configuration for JIRA (uses global system platforms)
export const JIRA_PLATFORM_CONFIG = {
  IOS: { label: 'iOS', color: 'grape', icon: '📱' },
  ANDROID: { label: 'Android', color: 'green', icon: '🤖' },
} as const;

// Common JIRA issue types
export const JIRA_ISSUE_TYPES = [
  { value: 'Epic', label: 'Epic' },
  { value: 'Task', label: 'Task' },
  { value: 'Subtask', label: 'Subtask' },
] as const;

// Common JIRA completion statuses
export const JIRA_COMPLETION_STATUSES = [
  { value: 'Done', label: 'Done' },
  { value: 'Released', label: 'Released' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Deployed', label: 'Deployed' },
] as const;

// JIRA priority options
export const JIRA_PRIORITIES = [
  { value: 'Highest', label: 'Highest' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
  { value: 'Lowest', label: 'Lowest' },
] as const;

// Default project management configuration
export const DEFAULT_PROJECT_MANAGEMENT_CONFIG: JiraProjectConfig = {
  enabled: false,
  integrationId: '',
  platformConfigurations: [],
} as const;

// =============================================================================
// PLATFORMS & DISTRIBUTION
// =============================================================================

// Re-export PLATFORMS from centralized constants for backward compatibility
export const PLATFORMS = PLATFORM_CONSTANTS;

// Platform display metadata for scheduling
export const PLATFORM_METADATA: Record<Platform, { label: string; color: string }> = {
  ANDROID: { label: 'Android', color: 'green' },
  IOS: { label: 'iOS', color: 'blue' },
} as const;

// Platform card configuration for target platform selection
export const PLATFORM_CARD_CONFIG = {
  PLAY_STORE: {
    label: 'Play Store',
    description: 'Google Play Store distribution',
    icon: IconBrandAndroid,
    color: '#82C91E',
    badge: 'Android',
  },
  APP_STORE: {
    label: 'App Store',
    description: 'Apple App Store distribution via TestFlight',
    icon: IconBrandApple,
    color: '#4DABF7',
    badge: 'iOS',
  },
  WEB: {
    label: 'Web',
    description: 'Web application distribution',
    icon: IconWorld,
    color: '#339AF0',
    badge: 'Web',
  },
} as const;

// Platform configurations (two-level selection)
export const PLATFORM_CONFIGS = [
  {
    id: PLATFORM_CONSTANTS.ANDROID,
    name: 'Android',
    description: 'Build and distribute for Android devices',
    available: true,
    targets: [
      {
        id: TARGET_PLATFORMS.PLAY_STORE,
        name: 'Google Play Store',
        description: 'Distribute to Play Store',
        available: true,
      },
      // Future targets can be added here
      // {
      //   id: 'FIREBASE',
      //   name: 'Firebase App Distribution',
      //   description: 'Internal distribution via Firebase',
      //   available: false,
      //   comingSoon: true,
      // },
    ],
  },
  {
    id: PLATFORM_CONSTANTS.IOS,
    name: 'iOS',
    description: 'Build and distribute for iOS devices',
    available: true,
    targets: [
      {
        id: TARGET_PLATFORMS.APP_STORE,
        name: 'Apple App Store',
        description: 'Distribute to App Store',
        available: true,
      },
      // Future targets can be added here
      // {
      //   id: 'TESTFLIGHT_STANDALONE',
      //   name: 'TestFlight Only',
      //   description: 'TestFlight distribution without App Store',
      //   available: false,
      //   comingSoon: true,
      // },
    ],
  },
];

// =============================================================================
// BUILD PIPELINES
// =============================================================================

// Android pipeline categories
export const ANDROID_PIPELINE_CATEGORIES: readonly PipelineCategoryConfig[] = [
  {
    id: 'android-pre-regression',
    platform: PLATFORM_CONSTANTS.ANDROID,
    environment: BUILD_ENVIRONMENTS.PRE_REGRESSION,
    label: 'Android Pre-Regression',
    description: 'Optional pre-regression build before main testing',
    required: false,
  },
  {
    id: 'android-regression',
    platform: PLATFORM_CONSTANTS.ANDROID,
    environment: BUILD_ENVIRONMENTS.REGRESSION,
    label: 'Android Regression',
    description: 'Main regression build for Play Store release',
    required: true,
  },
  {
    id: 'android-aab',
    platform: PLATFORM_CONSTANTS.ANDROID,
    environment: BUILD_ENVIRONMENTS.AAB_BUILD,
    label: 'Playstore Build',
    description: 'AAB build for Android releases',
    required: true,
  },
] as const;

// iOS pipeline categories
export const IOS_PIPELINE_CATEGORIES: readonly PipelineCategoryConfig[] = [
  {
    id: 'ios-pre-regression',
    platform: PLATFORM_CONSTANTS.IOS,
    environment: BUILD_ENVIRONMENTS.PRE_REGRESSION,
    label: 'iOS Pre-Regression',
    description: 'Optional pre-regression build before main testing',
    required: false,
  },
  {
    id: 'ios-regression',
    platform: PLATFORM_CONSTANTS.IOS,
    environment: BUILD_ENVIRONMENTS.REGRESSION,
    label: 'iOS Regression',
    description: 'Main regression build for App Store release',
    required: true,
  },
  {
    id: 'ios-testflight',
    platform: PLATFORM_CONSTANTS.IOS,
    environment: BUILD_ENVIRONMENTS.TESTFLIGHT,
    label: 'iOS TestFlight',
    description: 'TestFlight build for App Store distribution',
    required: true,
  },
] as const;

// =============================================================================
// SCHEDULING
// =============================================================================

// Release frequency options
export const RELEASE_FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly', description: 'Release every 7 days', days: 7 },
  { value: 'BIWEEKLY', label: 'Biweekly', description: 'Release every 14 days', days: 14 },
  { value: 'TRIWEEKLY', label: 'Triweekly', description: 'Release every 21 days', days: 21 },
  { value: 'MONTHLY', label: 'Monthly', description: 'Release every 30 days', days: 30 },
] as const;

// Days of the week
export const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
] as const;

// Common timezones
export const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST - Asia/Kolkata (GMT+5:30)' },
  { value: 'America/New_York', label: 'EST - America/New_York (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'PST - America/Los_Angeles (GMT-8)' },
  { value: 'America/Chicago', label: 'CST - America/Chicago (GMT-6)' },
  { value: 'Europe/London', label: 'GMT - Europe/London (GMT+0)' },
  { value: 'Europe/Paris', label: 'CET - Europe/Paris (GMT+1)' },
  { value: 'Asia/Tokyo', label: 'JST - Asia/Tokyo (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'CST - Asia/Shanghai (GMT+8)' },
  { value: 'Australia/Sydney', label: 'AEST - Australia/Sydney (GMT+10)' },
  { value: 'Pacific/Auckland', label: 'NZST - Pacific/Auckland (GMT+12)' },
  { value: 'UTC', label: 'UTC - Coordinated Universal Time (GMT+0)' },
] as const;

// =============================================================================
// TEST MANAGEMENT
// =============================================================================

// Test management provider options
export const TEST_MANAGEMENT_PROVIDER_OPTIONS = [
  { value: 'none', label: 'No Test Management', disabled: false },
  { value: 'checkmate', label: 'Checkmate', disabled: false },
  { value: 'testrail', label: 'TestRail (Coming Soon)', disabled: true },
  { value: 'zephyr', label: 'Zephyr (Coming Soon)', disabled: true },
] as const;

