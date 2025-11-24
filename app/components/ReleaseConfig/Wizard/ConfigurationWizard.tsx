/**
 * Configuration Wizard Component
 * Main wizard container that orchestrates all configuration steps
 */

import { useState, useEffect } from 'react';
import { Container, Paper, Text, Badge } from '@mantine/core';
import type { ReleaseConfiguration } from '~/types/release-config';
import { useConfig } from '~/contexts/ConfigContext';
import {
  saveDraftConfig,
  loadDraftConfig,
  clearDraftConfig,
  validateConfiguration,
  saveWizardStep,
  loadWizardStep,
  clearWizardStep,
} from '~/utils/release-config-storage';
import { createDefaultConfig } from '~/utils/default-config';
import { WizardNavigation } from './WizardNavigation';
import { ConfigSummary } from './ConfigSummary';
import { BasicInfoForm } from './BasicInfoForm';
import { WIZARD_STEPS, STEP_INDEX } from './wizard-steps.constants';
import { VerticalStepper } from '~/components/Common/VerticalStepper/VerticalStepper';
import { FixedPipelineCategories } from '../BuildPipeline/FixedPipelineCategories';
import { BuildUploadSelector } from '../BuildUpload/BuildUploadSelector';
import { PlatformSelector } from '../TargetPlatform/PlatformSelector';
import { TestManagementSelector } from '../TestManagement/TestManagementSelector';
import { JiraProjectStep } from '../JiraProject/JiraProjectStep';
import { SchedulingStepWrapper } from '../Scheduling/SchedulingStepWrapper';
import { CommunicationConfig } from '../Communication/CommunicationConfig';
import { derivePlatformsFromTargets } from '~/utils/platform-utils';
import { PLATFORMS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
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
}: ConfigurationWizardProps) {
  const { invalidateReleaseConfigs } = useConfig(); // ✅ For cache invalidation after save
  
  // Initialize step from saved draft step (if exists) or default to 0
  const [currentStep, setCurrentStep] = useState(() => {
    // Only restore step for draft configs, not in edit mode
    if (!isEditMode) {
      const savedStep = loadWizardStep(tenantId);
      if (savedStep > 0) {
        console.log('[ConfigWizard] Resuming from saved step:', savedStep);
      }
      return savedStep;
    }
    return 0;
  });
  
  // Initialize completed steps based on saved step
  // Mark all steps before the saved step as completed
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    const savedStep = !isEditMode ? loadWizardStep(tenantId) : 0;
    if (savedStep > 0) {
      const completed = new Set<number>();
      for (let i = 0; i < savedStep; i++) {
        completed.add(i);
      }
      return completed;
    }
    return new Set();
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // console.log('[ConfigurationWizard] Available integrations:', availableIntegrations);
  
  // Initialize configuration from existing, draft, or create new
  const [config, setConfig] = useState<Partial<ReleaseConfiguration>>(() => {
    // Edit Mode: Use existing config, NEVER touch drafts
    if (isEditMode && existingConfig) {
      console.log('[ConfigWizard] Edit mode: Loading existing config:', existingConfig.id);
      return existingConfig;
    }
    
    // New Config Mode: Try to load draft (for resuming interrupted creation)
    const draft = loadDraftConfig(tenantId);
    if (draft) {
      console.log('[ConfigWizard] New mode: Resuming from draft');
      return draft;
    }
    
    // Fresh start: Create default config
    console.log('[ConfigWizard] New mode: Creating fresh config');
    return createDefaultConfig(tenantId);
  });
  
  // Auto-save draft to local storage (ONLY for NEW configs, NOT in edit mode)
  useEffect(() => {
    if (!isEditMode) {
    saveDraftConfig(tenantId, config);
    }
  }, [tenantId, config, isEditMode]);
  
  // Auto-save current wizard step to local storage
  useEffect(() => {
    // Only save step for draft configs, not in edit mode
    if (!isEditMode) {
      saveWizardStep(tenantId, currentStep);
    }
  }, [tenantId, currentStep, isEditMode]);
  
  const canProceedFromStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case STEP_INDEX.BASIC: // Basic Info
        return !!(config.name && config.name.trim());
        
      case STEP_INDEX.PLATFORMS: // Target Platforms
        return !!config.targets && config.targets.length > 0;
        
      case STEP_INDEX.BUILD_UPLOAD: // Build Upload Method Selection
        // Must select a build upload method
        return !!config.buildUploadStep;
        
      case STEP_INDEX.PIPELINES: // CI/CD Workflows Configuration
        // Only validate if CI/CD is selected
        if (config.buildUploadStep !== 'CI_CD') {
          return true; // Skip validation if not using CI/CD
        }
        
        if (!config.workflows || config.workflows.length === 0) {
          return false;
        }
        
        // Validate required pipelines based on selected distribution targets
        const needsAndroid = config.targets?.includes('PLAY_STORE');
        const needsIOS = config.targets?.includes('APP_STORE');
        
        if (needsAndroid) {
          const hasAndroidRegression = config.workflows.some(
            p => p.platform === 'ANDROID' && p.environment === 'REGRESSION' && p.enabled
          );
          if (!hasAndroidRegression) return false;
        }
        
        if (needsIOS) {
          const hasIOSRegression = config.workflows.some(
            p => p.platform === PLATFORMS.IOS && p.environment === BUILD_ENVIRONMENTS.REGRESSION && p.enabled
          );
          const hasTestFlight = config.workflows.some(
            p => p.platform === PLATFORMS.IOS && p.environment === BUILD_ENVIRONMENTS.TESTFLIGHT && p.enabled
          );
          if (!hasIOSRegression || !hasTestFlight) return false;
        }
        
        return true;
        
      case STEP_INDEX.TESTING: // Test Management
        return true; // Optional
        
      case STEP_INDEX.COMMUNICATION: // Communication
        return true; // Optional
        
      case STEP_INDEX.SCHEDULING: // Scheduling (Optional - for release train automation)
        return true; // Optional - users can skip if they don't want automated scheduling
        
      case STEP_INDEX.REVIEW: // Review
        const validation = validateConfiguration(config);
        console.log('validateConfiguration', validation);
        return validation.isValid;
        
      default:
        return true;
    }
  };
  
  const handleNext = () => {
    if (canProceedFromStep(currentStep)) {
      setCompletedSteps(new Set([...completedSteps, currentStep]));
      
      // Auto-skip PIPELINES step if Manual upload is selected
      if (currentStep === STEP_INDEX.BUILD_UPLOAD && config.buildUploadStep === 'MANUAL') {
        setCompletedSteps(new Set([...completedSteps, currentStep, STEP_INDEX.PIPELINES]));
        setCurrentStep(currentStep + 2); // Skip pipelines step
      } else {
      setCurrentStep(currentStep + 1);
      }
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      // Auto-skip PIPELINES step backwards if Manual upload is selected
      if (currentStep === STEP_INDEX.TESTING && config.buildUploadStep === 'MANUAL') {
        setCurrentStep(currentStep - 2); // Skip back over pipelines step
      } else {
      setCurrentStep(currentStep - 1);
      }
    }
  };
  
  const handleFinish = async () => {
    console.log('handleFinish', currentStep, canProceedFromStep(currentStep));
    if (!canProceedFromStep(currentStep)) return;
    
    setIsSubmitting(true);
    
    try {
      // Create/Update Release Configuration
      // BFF will transform this to backend format and handle all integration configs
      const completeConfig: ReleaseConfiguration = {
        ...config,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
        // Keep existing createdAt if editing, otherwise set new
        createdAt: isEditMode ? config.createdAt! : new Date().toISOString(),
      } as ReleaseConfiguration;
      
      console.log('[ConfigWizard] Submitting configuration:', completeConfig, {
        name: completeConfig.name,
        releaseType: completeConfig.releaseType,
        targets: completeConfig.targets,
        hasJira: !!completeConfig.jiraProject?.enabled,
        hasTestManagement: !!completeConfig.testManagement?.enabled,
        hasSlack: !!completeConfig.communication?.slack?.enabled,
        hasScheduling: !!completeConfig.scheduling,
      });
      
      // Submit to API (POST for create, PUT for update)
      const method = isEditMode ? 'PUT' : 'POST';
      const endpoint = isEditMode && config.id
        ? `/api/v1/tenants/${tenantId}/release-config/${config.id}`
        : `/api/v1/tenants/${tenantId}/release-config`;
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeConfig), // Send config directly (not wrapped)
      });
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[ConfigWizard] Non-JSON response:', text.substring(0, 500));
        throw new Error(`Server returned ${response.status} ${response.statusText}. Expected JSON but got ${contentType || 'unknown'}`);
      }
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('[ConfigWizard] API error:', result);
        throw new Error(result.error || `Failed to ${isEditMode ? 'update' : 'save'} configuration`);
      }
      
      console.log(`[ConfigWizard] Configuration ${isEditMode ? 'updated' : 'created'} successfully:`, result.data?.id);
      
      // ✅ Invalidate cache to refresh configs across all routes
      invalidateReleaseConfigs();
      console.log('[ConfigWizard] Release configs cache invalidated');
      
      // Clear draft after successful submission of NEW config
      // (Edit mode never creates/modifies drafts, so nothing to clear)
      if (!isEditMode) {
        clearDraftConfig(tenantId);
        console.log('[ConfigWizard] Draft cleared after successful submission');
      }
      
      // Call parent onSubmit with the backend response data
      await onSubmit({ ...completeConfig, id: result.data?.id });
    } catch (error) {
      console.error('[ConfigWizard] Failed to save configuration:', error);
      alert(`Failed to ${isEditMode ? 'update' : 'save'} configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
            selectedMode={config.buildUploadStep || 'MANUAL'}
            onChange={(mode) => setConfig({ ...config, buildUploadStep: mode })}
            hasIntegrations={
              availableIntegrations.jenkins.length > 0 || 
              availableIntegrations.github.length > 0
            }
          />
        );
        
      case STEP_INDEX.PIPELINES: // CI/CD Workflows Configuration
        // Only show if CI/CD is selected
        if (config.buildUploadStep !== 'CI_CD') {
          // Skip this step - auto-proceed to next
          return null;
        }
        return (
          <FixedPipelineCategories
            pipelines={config.workflows || []}
            onChange={(pipelines) => setConfig({ ...config, workflows: pipelines })}
            availableIntegrations={{
              jenkins: availableIntegrations.jenkins,
              github: availableIntegrations.github,
            }}
            selectedPlatforms={config.platforms || []}
            tenantId={tenantId}
          />
        );
        
      case STEP_INDEX.TESTING: // Test Management
        return (
          <TestManagementSelector
            config={config.testManagement!}
            onChange={(testManagement) => setConfig({ ...config, testManagement })}
            availableIntegrations={{
              checkmate: availableIntegrations.checkmate,
            }}
            selectedTargets={config.targets || []}
          />
        );
        
      case STEP_INDEX.PROJECT_MANAGEMENT: // Jira Project Management
        return (
          <JiraProjectStep
            config={config.jiraProject!}
            onChange={(jiraProject) => setConfig({ ...config, jiraProject })}
            availableIntegrations={availableIntegrations.jira}
            selectedPlatforms={config.platforms || []}
          />
        );
        
      case STEP_INDEX.COMMUNICATION: // Communication
        return (
          <CommunicationConfig
            config={config.communication!}
            onChange={(communication) => setConfig({ ...config, communication })}
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

  console.log('currentStep', currentStep, 'config', config, isEditMode, existingConfig );
  
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
              {!isEditMode && loadWizardStep(tenantId) > 0 && (
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
                canProceed={canProceedFromStep(currentStep)}
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

