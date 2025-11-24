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
  CheckmateSettings,
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
  existingConfig?: ReleaseConfiguration;
  isEditMode?: boolean;
}

export interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onStepClick: (step: number) => void;
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export interface WizardStepIndicatorProps {
  steps: Array<{
    id: string;
    title: string;
    description: string;
    icon: (props: { size?: number; className?: string }) => JSX.Element;
  }>;
  currentStep: number;
  onStepClick: (step: number) => void;
}

export interface BasicInfoFormProps {
  config: Partial<ReleaseConfiguration>;
  onChange: (config: Partial<ReleaseConfiguration>) => void;
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
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
  };
  selectedPlatforms: Platform[];
  tenantId: string;
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
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
  };
  existingPipelines: Workflow[];
  fixedPlatform?: Platform;
  fixedEnvironment?: BuildEnvironment;
  workflows: CICDWorkflow[];
  tenantId: string;
}

export interface PipelineListProps {
  pipelines: Workflow[];
  onChange: (pipelines: Workflow[]) => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
  };
  selectedPlatforms?: TargetPlatform[];
  tenantId: string;
}

export interface PipelineCardProps {
  pipeline: Workflow;
  onEdit: () => void;
  onDelete: () => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
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
  availableIntegrations: Array<{ id: string; name: string }>;
  workflows: CICDWorkflow[];
}

export interface GitHubActionsConfigFormProps {
  config: Partial<GitHubActionsConfig>;
  onChange: (config: Partial<GitHubActionsConfig>) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
  workflows: CICDWorkflow[];
}

export interface ManualUploadConfigFormProps {
  config: Partial<ManualUploadConfig>;
  onChange: (config: Partial<ManualUploadConfig>) => void;
}

// ============================================================================
// Build Upload Components
// ============================================================================

export interface BuildUploadSelectorProps {
  selectedMode: BuildUploadStep;
  onChange: (mode: BuildUploadStep) => void;
  hasIntegrations: boolean;
}

// ============================================================================
// Platform/Target Components
// ============================================================================

export interface PlatformSelectorProps {
  selectedPlatforms: TargetPlatform[];
  onChange: (platforms: TargetPlatform[]) => void;
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
  config: TestManagementConfig;
  onChange: (config: TestManagementConfig) => void;
  availableIntegrations: {
    checkmate: Array<{ id: string; name: string }>;
  };
  selectedTargets: TargetPlatform[];
}

export interface CheckmateConfigFormEnhancedProps {
  config: Partial<CheckmateSettings>;
  onChange: (config: CheckmateSettings) => void;
  integrationId: string;
  selectedPlatforms?: Platform[];
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
}

export interface SlackChannelConfigEnhancedProps {
  config: CommunicationConfig;
  onChange: (config: CommunicationConfig) => void;
  integrationId: string;
}

export interface SlackChannelMapperProps {
  enabled: boolean;
  integrationId: string;
  channelData: {
    releases: Array<{ id: string; name: string }>;
    builds: Array<{ id: string; name: string }>;
    regression: Array<{ id: string; name: string }>;
    critical: Array<{ id: string; name: string }>;
  };
  onChange: (channelData: any) => void;
}

// ============================================================================
// Scheduling Components
// ============================================================================

export interface SchedulingStepWrapperProps {
  scheduling: SchedulingConfig | undefined;
  onChange: (scheduling: SchedulingConfig | undefined) => void;
  selectedPlatforms: Platform[];
}

export interface SchedulingConfigProps {
  config: SchedulingConfig;
  onChange: (config: SchedulingConfig) => void;
  selectedPlatforms: Platform[];
}

export interface ReleaseFrequencySelectorProps {
  frequency: ReleaseFrequency;
  customDays?: number;
  onChange: (frequency: ReleaseFrequency, customDays?: number) => void;
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

export interface RegressionSlotCardProps {
  slot: RegressionSlot;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

// ============================================================================
// Project Management (Jira) Components
// ============================================================================

export interface JiraProjectStepProps {
  config: JiraProjectConfig;
  onChange: (config: JiraProjectConfig) => void;
  availableIntegrations: Array<{ id: string; name: string }>;
  selectedPlatforms?: Platform[];
}

export interface JiraPlatformConfigCardProps {
  platform: Platform | 'WEB';
  config: JiraPlatformConfig;
  onChange: (config: JiraPlatformConfig) => void;
  integrationId: string;
  onRemove?: () => void;
}

// ============================================================================
// Settings Components
// ============================================================================

export interface ConfigurationListProps {
  configurations: ReleaseConfiguration[];
  onEdit: (config: ReleaseConfiguration) => void;
  onDelete: (configId: string) => void;
  onClone: (config: ReleaseConfiguration) => void;
  onSetDefault: (configId: string) => void;
}

export interface ConfigurationListItemProps {
  config: ReleaseConfiguration;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
  onSetDefault: () => void;
}

// ============================================================================
// Dialog Components
// ============================================================================

export interface DraftReleaseDialogProps {
  opened: boolean;
  onClose: () => void;
  onResume: () => void;
  onDiscard: () => void;
  draftConfig: Partial<ReleaseConfiguration>;
}

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

