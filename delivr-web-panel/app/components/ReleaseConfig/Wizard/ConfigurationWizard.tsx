/**
 * Configuration Wizard Component
 * Main wizard container that orchestrates all configuration steps
 */

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Paper,
  Text,
  Group,
  Stack,
  useMantineTheme,
} from '@mantine/core';
import { Breadcrumb } from '~/components/Common';
import { PageHeader } from '~/components/Common/PageHeader';
import { getBreadcrumbItems } from '~/constants/breadcrumbs';
import { CONFIGURATION_PAGE_HEADER } from '~/constants/page-headers';
import { IconSettings, IconEdit, IconCopy } from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import { useConfig } from '~/contexts/ConfigContext';
import { useDraftStorage, generateStorageKey } from '~/hooks/useDraftStorage';
import { createDefaultConfig } from '~/utils/default-config';
import { apiPost, apiPut, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { RELEASE_CONFIG_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import { WizardNavigation } from './WizardNavigation';
import { ConfigSummary } from './ConfigSummary';
import { BasicInfoForm } from './BasicInfoForm';
import { WIZARD_STEPS, STEP_INDEX } from '~/constants/wizard-steps';
import { DEFAULT_PROJECT_MANAGEMENT_CONFIG } from '~/constants/release-config';
import { canProceedFromStep } from './wizard-validation';
import { validateScheduling } from '~/components/ReleaseConfig/Scheduling/scheduling-validation';
import { VerticalStepper } from '~/components/Common/VerticalStepper/VerticalStepper';
import { FixedPipelineCategories } from '../BuildPipeline/FixedPipelineCategories';
import { BuildUploadSelector } from '../BuildUpload/BuildUploadSelector';
import { PlatformSelector } from '../TargetPlatform/PlatformSelector';
import { TestManagementSelector } from '../TestManagement/TestManagementSelector';
import { JiraProjectStep } from '../JiraProject/JiraProjectStep';
import { SchedulingStepWrapper } from '../Scheduling/SchedulingStepWrapper';
import { CommunicationConfig } from '../Communication/CommunicationConfig';
import { BUILD_UPLOAD_STEPS, CONFIG_STATUSES } from '~/types/release-config-constants';
import type { ConfigurationWizardProps } from '~/types/release-config-props';
import { getPlatformsFromPlatformTargets, getTargetsFromPlatformTargets } from '~/utils/platform-utils';
import { AppBadge } from '~/components/Common/AppBadge';

export function ConfigurationWizard({
  tenantId,
  onSubmit,
  onCancel,
  availableIntegrations,
  existingConfig,
  isEditMode = false,
  returnTo,
  skipDraftLoading = false,
}: ConfigurationWizardProps) {
  const theme = useMantineTheme();
  const { invalidateReleaseConfigs } = useConfig();
  
  // Draft storage for release config (only active in create mode)
  const {
    formData: config,
    setFormData: setConfig,
    isDraftRestored,
    markSaveSuccessful,
    saveDraft,
    metadata,
    updateMetadata,
  } = useDraftStorage<Partial<ReleaseConfiguration>>(
    {
      storageKey: generateStorageKey('release-config', tenantId),
      sensitiveFields: [],
      shouldSaveDraft: () => false,
      ttl: 30 * 24 * 60 * 60 * 1000,
      enableMetadata: true,
    },
    createDefaultConfig(tenantId), // initialData - always default
    isEditMode && existingConfig ? existingConfig : undefined // existingData - only in edit mode (skips draft loading)
  );
  console.log("config", config);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptedSteps, setAttemptedSteps] = useState<Set<number>>(new Set());
  
  // Track if draft restoration has already happened (to prevent infinite loop)
  const hasRestoredDraft = useRef(false);
  
  // Store original scheduling in ref (persists across navigation, initialized from existingConfig)
  const originalSchedulingRef = useRef(existingConfig?.releaseSchedule);
  
  // Restore wizard step from metadata when draft is loaded (ONCE on mount)
  useEffect(() => {
    // IMPORTANT: Only restore ONCE to prevent infinite loop with auto-save
    if (!isEditMode && isDraftRestored && metadata?.wizardStep !== undefined && !hasRestoredDraft.current) {
      hasRestoredDraft.current = true; // Mark as restored to prevent loop
      setCurrentStep(metadata.wizardStep);
      const completed = new Set<number>();
      for (let i = 0; i < metadata.wizardStep; i++) {
        completed.add(i);
      }
      setCompletedSteps(completed);
    }
  }, [isDraftRestored, metadata, isEditMode]);
  
  // Auto-save current wizard step to metadata
  useEffect(() => {
    // Don't auto-save immediately after restoring draft (causes loop)
    if (!isEditMode && updateMetadata && hasRestoredDraft.current) {
      updateMetadata({ wizardStep: currentStep });
    }
  }, [currentStep, isEditMode, updateMetadata]);

  // Auto-save draft when config changes (especially targets/platforms)
  // This ensures draft stays in sync with UI state when integrations change
  useEffect(() => {
    // Only auto-save if:
    // 1. Not in edit mode
    // 2. Draft has been restored (to avoid saving before restoration)
    // 3. Config has a name (indicates user has started filling the form)
    if (!isEditMode && hasRestoredDraft.current && config.name) {
      // Debounce to avoid too many saves
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [config.platformTargets, isEditMode, saveDraft, config.name]);
  
  const handleNext = () => {
    // Mark this step as attempted (this will show validation errors)
    setAttemptedSteps(new Set([...attemptedSteps, currentStep]));
    
    // For SCHEDULING step, check validation separately to show errors
    if (currentStep === STEP_INDEX.SCHEDULING) {
      // CRITICAL: Cannot configure scheduling without platformTargets
      if (!config.platformTargets || config.platformTargets.length === 0) {
        return; // Cannot proceed - no platform-targets selected
      }
      
      // If user opted out of scheduling, allow proceed
      if (!config.releaseSchedule) {
        setCompletedSteps(new Set([...completedSteps, currentStep]));
        if (!isEditMode && config.name) {
          saveDraft();
        }
        setCurrentStep(currentStep + 1);
        return;
      }
      
      // If user opted in, validate scheduling config
      const schedulingErrors = validateScheduling(config.releaseSchedule, isEditMode);
      
      // Only proceed if no validation errors
      if (schedulingErrors.length === 0) {
        setCompletedSteps(new Set([...completedSteps, currentStep]));
        if (!isEditMode && config.name) {
          saveDraft();
        }
        setCurrentStep(currentStep + 1);
      }
      // If there are errors, they will be shown because attemptedSteps includes this step
      return;
    }
    
    // For other steps, use existing logic
    if (canProceedFromStep(currentStep, config)) {
      setCompletedSteps(new Set([...completedSteps, currentStep]));
      
      if (!isEditMode && config.name) {
        saveDraft();
      }
      
      // Auto-skip PIPELINES step if Manual upload is selected
      if (currentStep === STEP_INDEX.BUILD_UPLOAD && config.hasManualBuildUpload) {
        // Skip pipelines step and mark it as completed
        setCompletedSteps(new Set([...completedSteps, currentStep, STEP_INDEX.PIPELINES]));
        setCurrentStep(currentStep + 2);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      if (currentStep === STEP_INDEX.TESTING && config.hasManualBuildUpload) {
        setCurrentStep(currentStep - 2);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };
  
  const handleFinish = async () => {
    if (!canProceedFromStep(currentStep, config)) return;
    
    setIsSubmitting(true);
    
    try {
      const completeConfig: ReleaseConfiguration = {
        ...config,
        status: CONFIG_STATUSES.ACTIVE,
        updatedAt: new Date().toISOString(),
        createdAt: isEditMode ? config.createdAt! : new Date().toISOString(),
      } as ReleaseConfiguration;
      
      const endpoint = isEditMode && config.id
        ? `/api/v1/tenants/${tenantId}/release-config/${config.id}`
        : `/api/v1/tenants/${tenantId}/release-config`;
      
      const result = isEditMode
        ? await apiPut<ReleaseConfiguration>(endpoint, completeConfig)
        : await apiPost<ReleaseConfiguration>(endpoint, completeConfig);
      
      invalidateReleaseConfigs();
      if (!isEditMode) {
        markSaveSuccessful();
      }
      
      const savedConfig: ReleaseConfiguration = {
        ...completeConfig,
        id: result.data?.id || completeConfig.id || '',
      };
      
      showSuccessToast({
        title: isEditMode ? 'Configuration Updated' : 'Configuration Created',
        message: `"${savedConfig.name}" has been ${isEditMode ? 'updated' : 'saved'} successfully.`,
      });
      
      await onSubmit(savedConfig);
    } catch (error) {
      const action = isEditMode ? 'update' : 'save';
      const message = getApiErrorMessage(error, `Failed to ${action} configuration`);
      showErrorToast(getErrorMessage(message, RELEASE_CONFIG_MESSAGES.SAVE_ERROR(action).title));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Breadcrumb items
  const breadcrumbItems = getBreadcrumbItems('releases.configure', {
    org: tenantId,
    isEditMode,
  });

  const currentStepData = WIZARD_STEPS[currentStep];
  
  const renderStepContent = () => {
    switch (currentStep) {
      case STEP_INDEX.BASIC:
        return (
          <BasicInfoForm
            config={config}
            onChange={setConfig}
            tenantId={tenantId}
            showValidation={attemptedSteps.has(STEP_INDEX.BASIC)}
            hasScmIntegration={availableIntegrations.github.length > 0}
          />
        );
        
      case STEP_INDEX.PLATFORMS:
        return (
          <PlatformSelector
            platformTargets={config.platformTargets || []}
            onChange={(platformTargets) => {
              setConfig((prev) => ({ ...prev, platformTargets }));
            }}
          />
        );
        
      case STEP_INDEX.BUILD_UPLOAD:
        return (
          <BuildUploadSelector
            hasManualBuildUpload={config.hasManualBuildUpload ?? true}
            onChange={(hasManualBuildUpload) => setConfig({ ...config, hasManualBuildUpload })}
            hasIntegrations={
              availableIntegrations.jenkins.length > 0 || 
              availableIntegrations.githubActions.length > 0
            }
          />
        );
        
      case STEP_INDEX.PIPELINES:
        if (config.hasManualBuildUpload) return null;
        return (
          <FixedPipelineCategories
            pipelines={config.ciConfig?.workflows || []}
            onChange={(pipelines) => setConfig({ 
              ...config, 
              ciConfig: { ...config.ciConfig, workflows: pipelines }
            })}
            availableIntegrations={{
              jenkins: availableIntegrations.jenkins,
              githubActions: availableIntegrations.githubActions,
            }}
            selectedPlatforms={getPlatformsFromPlatformTargets(config.platformTargets || [])}
            tenantId={tenantId}
            showValidation={attemptedSteps.has(STEP_INDEX.PIPELINES)}
          />
        );
        
      case STEP_INDEX.TESTING:
        return (
          <TestManagementSelector
            config={config.testManagementConfig!}
            onChange={(testManagementConfig) => setConfig({ ...config, testManagementConfig })}
            availableIntegrations={{ checkmate: availableIntegrations.checkmate }}
            selectedTargets={getTargetsFromPlatformTargets(config.platformTargets || [])}
          />
        );
        
      case STEP_INDEX.PROJECT_MANAGEMENT:
        return (
          <JiraProjectStep
            config={config.projectManagementConfig ?? DEFAULT_PROJECT_MANAGEMENT_CONFIG}
            onChange={(projectManagementConfig) => setConfig({ ...config, projectManagementConfig })}
            availableIntegrations={availableIntegrations.jira}
            selectedPlatforms={getPlatformsFromPlatformTargets(config.platformTargets || [])}
            tenantId={tenantId}
          />
        );
        
      case STEP_INDEX.COMMUNICATION:
        return (
          <CommunicationConfig
            config={config.communicationConfig!}
            onChange={(communicationConfig) => setConfig({ ...config, communicationConfig })}
            availableIntegrations={{ slack: availableIntegrations.slack }}
            tenantId={tenantId}
          />
        );
        
      case STEP_INDEX.SCHEDULING:
        return (
          <SchedulingStepWrapper
            scheduling={config.releaseSchedule}
            onChange={(releaseSchedule) => setConfig({ ...config, releaseSchedule })}
            selectedPlatforms={getPlatformsFromPlatformTargets(config.platformTargets || [])}
            showValidation={attemptedSteps.has(STEP_INDEX.SCHEDULING)}
            communicationConfig={config.communicationConfig}
            platformTargets={config.platformTargets || []}
            isEditMode={isEditMode}
            originalSchedulingRef={originalSchedulingRef}
          />
        );
        
      case STEP_INDEX.REVIEW:
        return <ConfigSummary config={config} />;
        
      default:
        return null;
    }
  };
  
  return (
    <Container size="xl" py={16}>
      {/* Header */}
      <Breadcrumb items={breadcrumbItems} mb={16} />
      <PageHeader
        title={isEditMode ? CONFIGURATION_PAGE_HEADER.TITLE_EDIT : CONFIGURATION_PAGE_HEADER.TITLE_CREATE}
        description={isEditMode ? CONFIGURATION_PAGE_HEADER.DESCRIPTION_EDIT : CONFIGURATION_PAGE_HEADER.DESCRIPTION_CREATE}
        icon={IconSettings}
        descriptionMaxWidth={600}
        mb={24}
        rightSection={
          <Group gap="sm">
            {isEditMode && (
              <AppBadge
                type="status"
                value="info"
                title={`Editing: ${config.name || 'Configuration'}`}
                size="lg"
                leftSection={<IconEdit size={14} />}
              />
            )}
            {!isEditMode && isDraftRestored && (
              <AppBadge
                type="status"
                value="success"
                title="Resuming Draft"
                size="lg"
                leftSection={<IconCopy size={14} />}
              />
            )}
          </Group>
        }
      />

      {/* Wizard Content */}
      <Group align="flex-start" gap="lg" wrap="nowrap">
        {/* Left Sidebar - Stepper */}
        <Box w={300} style={{ flexShrink: 0 , position:"sticky"}} top={24}>
          <Paper 
            p="xl" 
            radius="md" 
            shadow="sm" 
            withBorder
            style={{
              top: 24,
              maxHeight: 'calc(100vh - 96px)',
              overflowY: 'auto',
              backgroundColor: theme.white,
            }}
          >
            <Text 
              size="xs" 
              fw={700} 
              c={theme.colors.slate[7]} 
              tt="uppercase" 
              mb="lg"
              style={{
                letterSpacing: '0.5px',
              }}
            >
              Configuration Steps
            </Text>
            
            <VerticalStepper
              steps={WIZARD_STEPS}
              currentStep={currentStep}
              completedSteps={completedSteps}
              allowNavigation={false}
            />
          </Paper>
        </Box>
        
        {/* Main Content */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Paper p="xl" radius="md" shadow="sm" withBorder>
            {/* Step Header */}
            <Box mb={24} pb={16} style={{ borderBottom: `1px solid ${theme.colors.slate[2]}` }}>
              <Text size="lg" fw={600} c={theme.colors.slate[9]}>
                {currentStepData?.title}
              </Text>
              {currentStepData?.description && (
                <Text size="sm" c={theme.colors.slate[5]} mt={4}>
                  {currentStepData.description}
                </Text>
              )}
            </Box>
            
            {/* Step Content */}
            <Box mih={400} mb={24}>
              {renderStepContent()}
            </Box>
            
            {/* Navigation */}
            <Box pt={16} style={{ borderTop: `1px solid ${theme.colors.slate[2]}` }}>
              <WizardNavigation
                currentStep={currentStep}
                totalSteps={WIZARD_STEPS.length}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onFinish={handleFinish}
                onCancel={onCancel}
                canProceed={canProceedFromStep(currentStep, config)}
                isLoading={isSubmitting}
                isEditMode={isEditMode}
              />
            </Box>
          </Paper>
        </Box>
      </Group>
    </Container>
  );
}
