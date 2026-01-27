/**
 * Release Configuration Component Props
 * Centralized interfaces for all component props
 * 
 * NO INTERFACES IN COMPONENT FILES - USE THIS FILE!
 * 
 * Organization:
 * - Wizard Components
 * - Pipeline/Workflow Components
 * - Platform/Target Components
 * - Test Management Components
 * - Communication Components
 * - Scheduling Components
 * - Project Management Components
 * - Settings Components
 * - Shared/Utility Components
 */

import type React from 'react';
import type {
  ReleaseConfiguration,
  Workflow,
  Platform,
  TargetPlatform,
  BuildProvider,
  BuildEnvironment,
  BuildUploadStep,
  TestManagementConfig,
  CommunicationConfig,
  SchedulingConfig,
  JiraProjectConfig,
  JenkinsConfig,
  GitHubActionsConfig,
  ManualUploadConfig,
  RegressionSlot,
  ReleaseFrequency,
  CheckmatePlatformConfiguration,
  JiraPlatformConfig,
} from './release-config';

import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';

// ============================================================================
// Wizard Components
// ============================================================================

export interface ConfigurationWizardProps {
  tenantId: string;
  onSubmit: (config: ReleaseConfiguration) => Promise<void>;
  onCancel: () => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string; displayName?: string }>;
    github: Array<{ id: string; name: string; displayName?: string }>; // GitHub SCM (for branch fetching)
    githubActions: Array<{ id: string; name: string; displayName?: string }>; // GitHub Actions (for CI/CD workflows)
    slack: Array<{ id: string; name: string; displayName?: string }>;
    jira: Array<{ id: string; name: string; displayName?: string }>;
    checkmate: Array<{ id: string; name: string; workspaceId?: string; displayName?: string }>;
    appStore: Array<{ id: string; name: string; displayName?: string }>; // App Store Connect
    playStore: Array<{ id: string; name: string; displayName?: string }>; // Google Play Store
  };
  existingConfig?: ReleaseConfiguration | null;
  isEditMode?: boolean;
  returnTo?: string | null;
  skipDraftLoading?: boolean; // When true, start fresh without loading draft from localStorage
}

export interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onFinish: () => void;
  onCancel?: () => void;
  canProceed: boolean;
  isLoading?: boolean;
  isEditMode?: boolean;
}

export interface WizardStepIndicatorProps {
  steps: Array<{
    id: string;
    title: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }>;
  currentStep: number;
  completedSteps: Set<number>;
}

export interface BasicInfoFormProps {
  config: Partial<ReleaseConfiguration>;
  onChange: (config: Partial<ReleaseConfiguration>) => void;
  tenantId: string;
  showValidation?: boolean;
  hasScmIntegration?: boolean;
}

export interface ConfigSummaryProps {
  config: Partial<ReleaseConfiguration>;
}

// ============================================================================
// Pipeline/Workflow Components
// ============================================================================

export interface FixedPipelineCategoriesProps {
  pipelines: Workflow[];
  onChange: (pipelines: Workflow[]) => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string; displayName?: string }>;
    githubActions: Array<{ id: string; name: string; displayName?: string }>;
  };
  selectedPlatforms: Platform[];
  tenantId: string;
  showValidation?: boolean;
}

export interface PipelineCategoryConfig {
  id: string;
  platform: Platform;
  environment: BuildEnvironment;
  label: string;
  description: string;
  required: boolean;
}

export interface PipelineEditModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (pipeline: Workflow) => void;
  pipeline?: Workflow;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string; displayName?: string }>;
    githubActions: Array<{ id: string; name: string; displayName?: string }>;
  };
  existingPipelines: Workflow[];
  fixedPlatform?: Platform;
  fixedEnvironment?: BuildEnvironment;
  workflows: CICDWorkflow[];
  tenantId: string;
}

export interface PipelineCardProps {
  pipeline: Workflow;
  onEdit: () => void;
  onDelete: () => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string; displayName?: string }>;
    githubActions: Array<{ id: string; name: string; displayName?: string }>;
  };
}

export interface PipelineProviderSelectProps {
  value: BuildProvider;
  onChange: (value: BuildProvider) => void;
  availableProviders: BuildProvider[];
  disabled?: boolean;
}

export interface RequiredPipelinesCheckProps {
  pipelines: Workflow[];
  selectedPlatforms: Platform[];
}

export interface JenkinsConfigFormProps {
  config: Partial<JenkinsConfig>;
  onChange: (config: Partial<JenkinsConfig>) => void;
  availableIntegrations: Array<{ id: string; name: string; displayName?: string }>;
  workflows: CICDWorkflow[];
  tenantId: string;
}

export interface GitHubActionsConfigFormProps {
  config: Partial<GitHubActionsConfig>;
  onChange: (config: Partial<GitHubActionsConfig>) => void;
  availableIntegrations: Array<{ id: string; name: string; displayName?: string }>;
  workflows: CICDWorkflow[];
  tenantId: string;
}

export interface ManualUploadConfigFormProps {
  config: Partial<ManualUploadConfig>;
  onChange: (config: Partial<ManualUploadConfig>) => void;
}

// ============================================================================
// Build Upload Components
// ============================================================================

export interface BuildUploadSelectorProps {
  hasManualBuildUpload: boolean;
  onChange: (hasManualBuildUpload: boolean) => void;
  hasIntegrations: boolean;
}

// ============================================================================
// Platform/Target Components
// ============================================================================

export interface PlatformSelectorProps {
  platformTargets: Array<{ platform: Platform; target: TargetPlatform }>;
  onChange: (platformTargets: Array<{ platform: Platform; target: TargetPlatform }>) => void;
}

export interface JiraProjectStepProps {
  config: JiraProjectConfig;
  onChange: (config: JiraProjectConfig) => void;
  availableIntegrations: Array<{ id: string; name: string; displayName?: string }>;
  selectedPlatforms?: Platform[];
}

export interface PlatformCardProps {
  platform: TargetPlatform;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

// ============================================================================
// Test Management Components
// ============================================================================

export interface TestManagementSelectorProps {
  config: TestManagementConfig | undefined;
  onChange: (config: TestManagementConfig | undefined) => void;
  availableIntegrations: {
    checkmate: Array<{ id: string; name: string; workspaceId?: string }>;
  };
  selectedTargets: TargetPlatform[];
}

export interface CheckmatePlatformConfigProps {
  platform: Platform;
  config: CheckmatePlatformConfiguration;
  onChange: (config: CheckmatePlatformConfiguration) => void;
  integrationId: string;
}

// ============================================================================
// Communication Components
// ============================================================================

export interface CommunicationConfigProps {
  config: CommunicationConfig;
  onChange: (config: CommunicationConfig) => void;
  availableIntegrations: {
    slack: Array<{ id: string; name: string }>;
  };
  tenantId: string;
}

export interface SlackChannelConfigEnhancedProps {
  config: CommunicationConfig;
  onChange: (config: CommunicationConfig) => void;
  availableIntegrations: Array<{ id: string; name: string; displayName?: string }>;
  tenantId: string;
}

export interface SlackChannelMapperProps {
  enabled: boolean;
  integrationId: string;
  channels: {
    releases: Array<{ id: string; name: string }>;
    builds: Array<{ id: string; name: string }>;
    regression: Array<{ id: string; name: string }>;
    critical: Array<{ id: string; name: string }>;
  };
  onToggle: (enabled: boolean) => void;
  onChange: (channels: any) => void;
  onIntegrationChange: (integrationId: string) => void;
  availableIntegrations: Array<{ id: string; name: string; displayName?: string }>;
  availableChannels?: Array<{ id: string; name: string }>;
}

// ============================================================================
// Scheduling Components
// ============================================================================

export interface SchedulingStepWrapperProps {
  scheduling: SchedulingConfig | undefined;
  onChange: (scheduling: SchedulingConfig | undefined) => void;
  selectedPlatforms: Platform[];
  showValidation?: boolean;
  isEditMode?: boolean;
  originalSchedulingRef?: React.MutableRefObject<SchedulingConfig | undefined>; // Ref to original scheduling (persists across navigation)
}

export interface SchedulingConfigProps {
  config: SchedulingConfig;
  onChange: (config: SchedulingConfig) => void;
  selectedPlatforms: Platform[];
  showValidation?: boolean;
  isEditMode?: boolean;
}

export interface ReleaseFrequencySelectorProps {
  frequency: ReleaseFrequency;
  onChange: (frequency: ReleaseFrequency) => void;
}

export interface WorkingDaysSelectorProps {
  workingDays: number[];
  onChange: (days: number[]) => void;
}

export interface TimezonePickerProps {
  timezone: string;
  onChange: (timezone: string) => void;
}

export interface RegressionSlotEditorProps {
  opened: boolean;
  onClose: () => void;
  onSave: (slot: RegressionSlot) => void;
  slot?: RegressionSlot;
  kickoffDate: string;
  targetReleaseDate: string;
}

export interface RegressionSlotTimelineProps {
  slots: RegressionSlot[];
  onEdit: (slot: RegressionSlot) => void;
  onDelete: (slotId: string) => void;
  kickoffDate: string;
  targetReleaseDate: string;
}


// ============================================================================
// Project Management (Jira) Components
// ============================================================================

export interface JiraProjectStepProps {
  config: JiraProjectConfig;
  onChange: (config: JiraProjectConfig) => void;
  availableIntegrations: Array<{ id: string; name: string; displayName?: string }>;
  selectedPlatforms?: Platform[];
  tenantId: string;
}

export interface JiraPlatformConfigCardProps {
  platform: Platform;
  config: JiraPlatformConfig;
  onChange: (config: JiraPlatformConfig) => void;
  integrationId: string;
  tenantId: string;
  onRemove?: () => void;
  projects?: Array<{ key: string; name: string }>;
}

// ============================================================================
// Scheduling Components - Sub-components
// ============================================================================

export interface WorkingDaysSelectorProps {
  workingDays: number[];
  onChange: (days: number[]) => void;
}

export interface TimezonePickerProps {
  timezone: string;
  onChange: (timezone: string) => void;
}

export interface RegressionSlotEditorProps {
  opened: boolean;
  onClose: () => void;
  onSave: (slot: RegressionSlot) => void;
  slot?: RegressionSlot;
}

export interface RegressionSlotTimelineProps {
  slots: RegressionSlot[];
  onEdit: (slot: RegressionSlot) => void;
  onDelete: (slotId: string) => void;
  onAdd: () => void;
}

export interface RegressionSlotCardProps {
  slot: RegressionSlot;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUpdate: (slot: RegressionSlot) => void;
  onCollapse: () => void;
  targetReleaseOffset: number;
  targetReleaseTime: string;
  kickoffTime: string;
  allSlots?: RegressionSlot[]; // All slots for duplicate and chronological validation
}

// ============================================================================
// Platform Card & Other UI Components
// ============================================================================

export interface PlatformCardProps {
  platform: TargetPlatform;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export interface DraftReleaseDialogProps {
  opened: boolean;
  onClose: () => void;
  draftConfig: Partial<ReleaseConfiguration> | null;
  onContinueDraft: () => void;
  onStartNew: () => void;
}

// ============================================================================
// Settings Components
// ============================================================================

export interface ConfigurationListProps {
  configurations: ReleaseConfiguration[];
  onEdit: (config: ReleaseConfiguration) => void;
  onDuplicate: (config: ReleaseConfiguration) => void;
  onArchive: (configId: string) => void;
  onSetDefault: (configId: string) => void;
  onCreate: () => void;
}


export interface ConfigurationListItemProps {
  config: ReleaseConfiguration;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onExport: () => void;
  onSetDefault: () => void;
}

// ============================================================================
// Dialog Components
// ============================================================================


// ============================================================================
// Shared/Utility Component Props
// ============================================================================

export interface IntegrationReference {
  id: string;
  name: string;
  type?: string;
}

export interface AvailableIntegrations {
  jenkins: IntegrationReference[];
  github: IntegrationReference[];
  slack: IntegrationReference[];
  checkmate: IntegrationReference[];
  jira: IntegrationReference[];
}

export interface CheckmateConfigFormEnhancedProps {
  config: Partial<TestManagementConfig>;
  onChange: (config: TestManagementConfig) => void;
  availableIntegrations: Array<{ 
    id: string; 
    name: string; 
    workspaceId?: string;
    baseUrl?: string;
    orgId?: string;
  }>;
  selectedTargets: TargetPlatform[];
  integrationId?: string; // Optional: if provided, auto-select this integration (one-to-one mapping)
  tenantId: string; // Required for new API format
}

export interface ConfigSummaryProps {
  config: Partial<ReleaseConfiguration>;
}

