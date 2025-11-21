/**
 * Configuration Wizard Component
 * Main wizard container that orchestrates all configuration steps
 */

import { useState, useEffect } from 'react';
import { Container, Paper, Text, Badge } from '@mantine/core';
import type { ReleaseConfiguration } from '~/types/release-config';
import {
  saveDraftConfig,
  loadDraftConfig,
  clearDraftConfig,
  validateConfiguration,
} from '~/utils/release-config-storage';
import { createDefaultConfig } from '~/utils/default-config';
import { WizardNavigation } from './WizardNavigation';
import { ConfigSummary } from './ConfigSummary';
import { BasicInfoForm } from './BasicInfoForm';
import { WIZARD_STEPS, STEP_INDEX } from './wizard-steps.constants';
import { VerticalStepper } from '~/components/Common/VerticalStepper';
import { FixedPipelineCategories } from '../BuildPipeline/FixedPipelineCategories';
import { PlatformSelector } from '../TargetPlatform/PlatformSelector';
import { TestManagementSelector } from '../TestManagement/TestManagementSelector';
import { JiraProjectStep } from '../JiraProject/JiraProjectStep';
import { SchedulingConfig } from '../Scheduling/SchedulingConfig';
import { CommunicationConfig } from '../Communication/CommunicationConfig';

interface ConfigurationWizardProps {
  organizationId: string;
  onSubmit: (config: ReleaseConfiguration) => Promise<void>;
  onCancel: () => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
    slack: Array<{ id: string; name: string }>;
    jira: Array<{ id: string; name: string }>;
    checkmate: Array<{ id: string; name: string; workspaceId?: string }>;
  };
  existingConfig?: ReleaseConfiguration | null;
  isEditMode?: boolean;
  returnTo?: string | null;
}

export function ConfigurationWizard({
  organizationId,
  onSubmit,
  onCancel,
  availableIntegrations,
  existingConfig,
  isEditMode = false,
  returnTo,
}: ConfigurationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('[ConfigurationWizard] Available integrations:', availableIntegrations);
  
  // Initialize configuration from existing, draft, or create new
  const [config, setConfig] = useState<Partial<ReleaseConfiguration>>(() => {
    // If editing, use existing config
    if (isEditMode && existingConfig) {
      console.log('[ConfigWizard] Loading existing config for edit:', existingConfig.id);
      return existingConfig;
    }
    
    // Otherwise, try to load draft
    const draft = loadDraftConfig(organizationId);
    if (draft) {
      console.log('[ConfigWizard] Loading draft config');
      return draft;
    }
    
    // Create new config
    console.log('[ConfigWizard] Creating new config');
    return createDefaultConfig(organizationId);
  });
  
  // Auto-save draft to local storage
  useEffect(() => {
    saveDraftConfig(organizationId, config);
  }, [organizationId, config]);
  
  const canProceedFromStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case STEP_INDEX.BASIC: // Basic Info
        return !!(config.name && config.name.trim());
        
      case STEP_INDEX.PLATFORMS: // Target Platforms (MOVED UP)
        return !!config.defaultTargets && config.defaultTargets.length > 0;
        
      case STEP_INDEX.PIPELINES: // Build Pipelines (MOVED DOWN)
        if (!config.buildPipelines || config.buildPipelines.length === 0) {
          return false;
        }
        // Validate required pipelines based on selected distribution targets
        const needsAndroid = config.defaultTargets?.includes('PLAY_STORE');
        const needsIOS = config.defaultTargets?.includes('APP_STORE');
        
        if (needsAndroid) {
          const hasAndroidRegression = config.buildPipelines.some(
            p => p.platform === 'ANDROID' && p.environment === 'REGRESSION' && p.enabled
          );
          if (!hasAndroidRegression) return false;
        }
        
        if (needsIOS) {
          const hasIOSRegression = config.buildPipelines.some(
            p => p.platform === 'IOS' && p.environment === 'REGRESSION' && p.enabled
          );
          const hasTestFlight = config.buildPipelines.some(
            p => p.platform === 'IOS' && p.environment === 'TESTFLIGHT' && p.enabled
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
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleFinish = async () => {
    console.log('handleFinish', currentStep, canProceedFromStep(currentStep));
    if (!canProceedFromStep(currentStep)) return;
    
    setIsSubmitting(true);
    
    try {
      let updatedConfig = { ...config };

      // Step 1: Create PM config if JIRA is enabled
      if (updatedConfig.jiraProject?.enabled && updatedConfig.jiraProject.integrationId) {
        console.log('[ConfigWizard] Creating JIRA PM config...');
        
        // Import transformer dynamically
        const { transformJiraConfigToBackendDTO } = await import('~/utils/jira-config-transformer');
        
        const pmConfigDTO = transformJiraConfigToBackendDTO(
          updatedConfig.jiraProject,
          organizationId,
          updatedConfig.name || 'Release Configuration'
        );

        if (pmConfigDTO) {
          try {
            const pmResponse = await fetch(
              `/api/v1/tenants/${organizationId}/integrations/project-management/config`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pmConfigDTO),
              }
            );

            if (pmResponse.ok) {
              const pmResult = await pmResponse.json();
              console.log('[ConfigWizard] PM config created:', pmResult.data?.id);
              
              // Update jiraProject with pmConfigId
              if (pmResult.success && pmResult.data?.id) {
                updatedConfig = {
                  ...updatedConfig,
                  jiraProject: {
                    ...updatedConfig.jiraProject,
                    pmConfigId: pmResult.data.id,
                  },
                };
              }
            } else {
              console.warn('[ConfigWizard] Failed to create PM config, continuing anyway');
            }
          } catch (pmError) {
            console.warn('[ConfigWizard] Error creating PM config:', pmError);
            // Continue with release config creation even if PM config fails
          }
        }
      }

      // Step 2: Create/Update Release Configuration
      const completeConfig: ReleaseConfiguration = {
        ...updatedConfig,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
        // Keep existing createdAt if editing, otherwise set new
        createdAt: isEditMode ? updatedConfig.createdAt! : new Date().toISOString(),
      } as ReleaseConfiguration;
      
      // Submit to API (POST for create, PUT for update)
      const method = isEditMode ? 'PUT' : 'POST';
      const response = await fetch(`/api/v1/tenants/${organizationId}/release-config`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: completeConfig }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'save'} configuration`);
      }
      
      const result = await response.json();
      console.log(`[ConfigWizard] Configuration ${isEditMode ? 'updated' : 'saved'} to server:`, result.configId);
      
      // Clear draft after successful submission (but not when editing)
      if (!isEditMode) {
        clearDraftConfig(organizationId);
      }
      
      // Call parent onSubmit with the complete config (for navigation)
      await onSubmit(completeConfig);
    } catch (error) {
      console.error('Failed to save configuration:', error);
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
            tenantId={organizationId}
          />
        );
        
      case STEP_INDEX.PLATFORMS: // Target Platforms (MOVED UP - Select platforms FIRST)
        return (
          <PlatformSelector
            selectedPlatforms={config.defaultTargets || []}
            onChange={(targets) => {
              // Derive platforms from selected targets
              const platforms: Array<'ANDROID' | 'IOS'> = [];
              
              if (targets.includes('PLAY_STORE')) {
                platforms.push('ANDROID');
              }
              if (targets.includes('APP_STORE')) {
                platforms.push('IOS');
              }
              // WEB doesn't map to a mobile platform
              
              setConfig({ 
                ...config, 
                defaultTargets: targets,
                platforms: platforms as any, // Update platforms based on targets
              });
            }}
          />
        );
        
      case STEP_INDEX.PIPELINES: // Build Pipelines (MOVED DOWN - Configure based on selected platforms)
        return (
          <FixedPipelineCategories
            pipelines={config.buildPipelines || []}
            onChange={(pipelines) => setConfig({ ...config, buildPipelines: pipelines })}
            availableIntegrations={{
              jenkins: availableIntegrations.jenkins,
              github: availableIntegrations.github,
            }}
            selectedPlatforms={config.defaultTargets || []}
            tenantId={organizationId}
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
            organizationId={organizationId}
          />
        );
        
      case STEP_INDEX.SCHEDULING: // Scheduling (Optional - Release Train)
        return (
          <SchedulingConfig
            config={config.scheduling!}
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

  console.log('currentStep', currentStep, 'config', config, );
  
  return (
    <Container size="xl" className="py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* Vertical Stepper - Left Side */}
        <div className="col-span-3">
          <Paper shadow="sm" p="lg" radius="md" className="sticky top-8" style={{ minHeight: '700px' }}>
            {isEditMode && (
              <Badge color="blue" size="lg" className="mb-4">
                Editing: {config.name || 'Configuration'}
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

