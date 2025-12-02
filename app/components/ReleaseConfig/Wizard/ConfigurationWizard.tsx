/**
 * Configuration Wizard Component
 * Main wizard container that orchestrates all configuration steps
 */

import { useState, useEffect } from 'react';
import { Container, Paper, Text, Badge } from '@mantine/core';
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
import { VerticalStepper } from '~/components/Common/VerticalStepper/VerticalStepper';
import { FixedPipelineCategories } from '../BuildPipeline/FixedPipelineCategories';
import { BuildUploadSelector } from '../BuildUpload/BuildUploadSelector';
import { PlatformSelector } from '../TargetPlatform/PlatformSelector';
import { TestManagementSelector } from '../TestManagement/TestManagementSelector';
import { JiraProjectStep } from '../JiraProject/JiraProjectStep';
import { SchedulingStepWrapper } from '../Scheduling/SchedulingStepWrapper';
import { CommunicationConfig } from '../Communication/CommunicationConfig';
import { derivePlatformsFromTargets } from '~/utils/platform-utils';
import { BUILD_UPLOAD_STEPS } from '~/types/release-config-constants';
import type { ConfigurationWizardProps } from '~/types/release-config-props';

// Using ConfigurationWizardProps from centralized types
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
  const { invalidateReleaseConfigs } = useConfig(); // ✅ For cache invalidation after save
  
  // Draft storage for release config (only active in create mode)
  // MUST be declared FIRST so we can use metadata in state initializers
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
      sensitiveFields: [], // No sensitive fields in config
      shouldSaveDraft: () => false, // Manual save only - don't auto-save on unmount
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days for release configs
      enableMetadata: true, // Enable metadata to store wizard step
    },
    // Initial data: Use existing config (edit mode) or draft (create mode) or default
    isEditMode && existingConfig ? existingConfig : createDefaultConfig(tenantId),
    // When skipDraftLoading is true, pass empty object to prevent draft loading
    skipDraftLoading ? {} as Partial<ReleaseConfiguration> : undefined
  );
  // Removed excessive console.log that ran on every render
  
  // Initialize step state (will be updated from metadata in useEffect)
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Restore wizard step from metadata when draft is loaded (ONCE on mount)
  useEffect(() => {
    if (!isEditMode && isDraftRestored && metadata?.wizardStep !== undefined) {
      console.log('[ConfigWizard] Restoring wizard step from metadata:', metadata.wizardStep);
      setCurrentStep(metadata.wizardStep);
      
      // Mark all previous steps as completed
      const completed = new Set<number>();
      for (let i = 0; i < metadata.wizardStep; i++) {
        completed.add(i);
      }
      setCompletedSteps(completed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDraftRestored, isEditMode]); // ✅ Only run when isDraftRestored changes (on mount)
  
  // Note: Removed auto-save step to metadata useEffect
  // Step is now saved explicitly in handleNext with saveDraftWithStep()
  
  // Helper to save draft with specific metadata
  const saveDraftWithStep = (stepNumber: number) => {
    if (typeof window === 'undefined') return;
    
    try {
      const storageKey = generateStorageKey('release-config', tenantId);
      const draft = {
        data: config,
        savedAt: new Date().toISOString(),
        version: '1.0',
        metadata: { wizardStep: stepNumber },
      };
      localStorage.setItem(storageKey, JSON.stringify(draft));
      // Also update state for consistency
      if (updateMetadata) {
        updateMetadata({ wizardStep: stepNumber });
      }
      console.log('[ConfigWizard] Draft saved with step:', stepNumber);
    } catch (error) {
      console.error('[ConfigWizard] Failed to save draft:', error);
    }
  };
  
  const handleNext = () => {
    if (canProceedFromStep(currentStep, config)) {
      setCompletedSteps(new Set([...completedSteps, currentStep]));
      
      // Calculate next step before saving
      let nextStep = currentStep + 1;
      
      // Auto-skip PIPELINES step if Manual upload is selected
      if (currentStep === STEP_INDEX.BUILD_UPLOAD && config.hasManualBuildUpload) {
        nextStep = currentStep + 2; // Skip pipelines step
        setCompletedSteps(new Set([...completedSteps, currentStep, STEP_INDEX.PIPELINES]));
      }
      
      // Save draft with the NEXT step (only in create mode)
      // This ensures the draft shows up in the configurations list (step > 0)
      if (!isEditMode && config.name) {
        saveDraftWithStep(nextStep);
        console.log('[ConfigWizard] Draft saved on Next click, moving from step', currentStep, 'to', nextStep);
      }
      
      // Move to next step
      setCurrentStep(nextStep);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      // Auto-skip PIPELINES step backwards if Manual upload is selected
      if (currentStep === STEP_INDEX.TESTING && config.hasManualBuildUpload) {
        setCurrentStep(currentStep - 2); // Skip back over pipelines step
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
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
        createdAt: isEditMode ? config.createdAt! : new Date().toISOString(),
      } as ReleaseConfiguration;
      
      const endpoint = isEditMode && config.id
        ? `/api/v1/tenants/${tenantId}/release-config/${config.id}`
        : `/api/v1/tenants/${tenantId}/release-config`;
      
      // Use API client utility
      const result = isEditMode
        ? await apiPut<ReleaseConfiguration>(endpoint, completeConfig)
        : await apiPost<ReleaseConfiguration>(endpoint, completeConfig);

      console.log('[ConfigWizard] Save result:', JSON.stringify(result, null, 2));
      
      // Invalidate cache and clear draft
      invalidateReleaseConfigs();
      if (!isEditMode) {
        markSaveSuccessful(); // Clear draft (including metadata with wizard step)
      }
      
      const savedConfig: ReleaseConfiguration = {
        ...completeConfig,
        id: result.data?.id || completeConfig.id || '',
      };
      
      await onSubmit(savedConfig);
    } catch (error) {
      const action = isEditMode ? 'update' : 'save';
      const message = getApiErrorMessage(error, `Failed to ${action} configuration`);
      showErrorToast(getErrorMessage(message, RELEASE_CONFIG_MESSAGES.SAVE_ERROR(action).title));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case STEP_INDEX.BASIC: // Basic Info
        return (
          <BasicInfoForm
            config={config}
            onChange={setConfig}
            tenantId={tenantId}
          />
        );
        
      case STEP_INDEX.PLATFORMS: // Target Platforms - Select platforms FIRST
        return (
          <PlatformSelector
            selectedPlatforms={config.targets || []}
            onChange={(targets) => {
              const platforms = derivePlatformsFromTargets(targets);
              
              setConfig({ 
                ...config, 
                targets,
                platforms,
              });
            }}
          />
        );
        
      case STEP_INDEX.BUILD_UPLOAD: // Build Upload Method Selection
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
        
      case STEP_INDEX.PIPELINES: // CI/CD Workflows Configuration
        // Only show if CI/CD is selected (hasManualBuildUpload = false)
        if (config.hasManualBuildUpload) {
          // Skip this step - auto-proceed to next
          return null;
        }
        return (
          <FixedPipelineCategories
            pipelines={config.ciConfig?.workflows || []}
            onChange={(pipelines) => setConfig({ 
              ...config, 
              ciConfig: {
                ...config.ciConfig,
                workflows: pipelines
              }
            })}
            availableIntegrations={{
              jenkins: availableIntegrations.jenkins,
              githubActions: availableIntegrations.githubActions,
            }}
            selectedPlatforms={config.platforms || []}
            tenantId={tenantId}
          />
        );
        
      case STEP_INDEX.TESTING: // Test Management
        return (
          <TestManagementSelector
            config={config.testManagementConfig!}
            onChange={(testManagementConfig) => setConfig({ ...config, testManagementConfig })}
            availableIntegrations={{
              checkmate: availableIntegrations.checkmate,
            }}
            selectedTargets={config.targets || []}
          />
        );
        
      case STEP_INDEX.PROJECT_MANAGEMENT: // Jira Project Management
        return (
          <JiraProjectStep
            config={config.projectManagementConfig ?? DEFAULT_PROJECT_MANAGEMENT_CONFIG}
            onChange={(projectManagementConfig) => setConfig({ ...config, projectManagementConfig })}
            availableIntegrations={availableIntegrations.jira}
            selectedPlatforms={config.platforms || []}
            tenantId={tenantId}
          />
        );
        
      case STEP_INDEX.COMMUNICATION: // Communication
        return (
          <CommunicationConfig
            config={config.communicationConfig!}
            onChange={(communicationConfig) => setConfig({ ...config, communicationConfig })}
            availableIntegrations={{
              slack: availableIntegrations.slack,
            }}
            tenantId={tenantId}
          />
        );
        
      case STEP_INDEX.SCHEDULING: // Scheduling (Optional - Release Train)
        return (
          <SchedulingStepWrapper
            scheduling={config.scheduling}
            onChange={(scheduling) => setConfig({ ...config, scheduling })}
            selectedPlatforms={config.platforms || []}
          />
        );
        
      case STEP_INDEX.REVIEW: // Review
        return <ConfigSummary config={config} />;
        
      default:
        return null;
    }
  };
  
  return (
    <Container size="xl" className="py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* Vertical Stepper - Left Side */}
        <div className="col-span-3">
          <div className="sticky top-4" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
            <Paper shadow="sm" p="lg" radius="md" className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
              {isEditMode && (
                <Badge color="blue" size="lg" className="mb-4">
                  Editing: {config.name || 'Configuration'}
                </Badge>
              )}
              {!isEditMode && isDraftRestored && (
                <Badge color="green" size="lg" className="mb-4">
                  📍 Resuming Draft (Step {currentStep + 1})
                </Badge>
              )}
              <Text size="sm" fw={600} c="dimmed" className="mb-4 uppercase tracking-wide">
                Configuration Steps
              </Text>
              
              <VerticalStepper
                steps={WIZARD_STEPS}
                currentStep={currentStep}
                completedSteps={completedSteps}
                allowNavigation={false}
              />
            </Paper>
          </div>
        </div>
        
        {/* Main Content - Right Side */}
        <div className="col-span-9">
          <Paper shadow="sm" p="xl" radius="md">
            
            <div className="min-h-[600px] mb-6 px-4">{renderStepContent()}</div>
            
            <div className="px-4 py-4">
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
            </div>
          </Paper>
        </div>
      </div>
    </Container>
  );
}

