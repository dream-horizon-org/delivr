/**
 * Configuration Wizard Component
 * Main wizard container that orchestrates all configuration steps
 */

import { useState, useEffect } from 'react';
import { Container, Paper, Text, TextInput, Textarea, Select, Switch } from '@mantine/core';
import {
  IconSettings,
  IconTarget,
  IconTestPipe,
  IconCalendar,
  IconBell,
  IconFileCheck,
} from '@tabler/icons-react';
import type { ReleaseConfiguration } from '~/types/release-config';
import {
  generateConfigId,
  saveDraftConfig,
  loadDraftConfig,
  clearDraftConfig,
  validateConfiguration,
} from '~/utils/release-config-storage';
import { WizardStepIndicator } from './WizardStepIndicator';
import { WizardNavigation } from './WizardNavigation';
import { ConfigSummary } from './ConfigSummary';
import { PipelineList } from '../BuildPipeline/PipelineList';
import { PlatformSelector } from '../TargetPlatform/PlatformSelector';
import { TestManagementSelector } from '../TestManagement/TestManagementSelector';
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
    checkmate: Array<{ id: string; name: string; workspaceId?: string }>;
  };
}

const steps = [
  { id: 'basic', title: 'Basic Info', icon: IconSettings },
  { id: 'platforms', title: 'Target Platforms', icon: IconTarget },
  { id: 'pipelines', title: 'Build Pipelines', icon: IconSettings },
  { id: 'testing', title: 'Test Management', icon: IconTestPipe },
  { id: 'scheduling', title: 'Scheduling', icon: IconCalendar },
  { id: 'communication', title: 'Communication', icon: IconBell },
  { id: 'review', title: 'Review', icon: IconFileCheck },
];

export function ConfigurationWizard({
  organizationId,
  onSubmit,
  onCancel,
  availableIntegrations,
}: ConfigurationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize configuration from draft or create new
  const [config, setConfig] = useState<Partial<ReleaseConfiguration>>(() => {
    const draft = loadDraftConfig(organizationId);
    if (draft) return draft;
    
    return {
      id: generateConfigId(),
      organizationId,
      name: '',
      releaseType: 'PLANNED',
      isDefault: true,
      defaultTargets: [],
      buildPipelines: [],
      testManagement: {
        enabled: false,
        provider: 'NONE',
      },
      scheduling: {
        releaseFrequency: 'WEEKLY',
        defaultReleaseTime: '18:00',
        defaultKickoffTime: '10:00',
        kickoffLeadDays: 7,
        kickoffReminderEnabled: true,
        kickoffReminderTime: '09:00',
        kickoffReminderLeadDays: 1,
        workingDays: [1, 2, 3, 4, 5],
        timezone: 'Asia/Kolkata',
        regressionSlots: [],
      },
      communication: {},
      status: 'DRAFT',
    };
  });
  
  // Auto-save draft to local storage
  useEffect(() => {
    saveDraftConfig(organizationId, config);
  }, [organizationId, config]);
  
  const canProceedFromStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Basic Info
        return !!(config.name && config.name.trim());
        
      case 1: // Target Platforms (MOVED UP)
        return !!config.defaultTargets && config.defaultTargets.length > 0;
        
      case 2: // Build Pipelines (MOVED DOWN)
        return !!config.buildPipelines && config.buildPipelines.length > 0;
        
      case 3: // Test Management
        return true; // Optional
        
      case 4: // Scheduling
        return (
          !!config.scheduling &&
          !!config.scheduling.defaultReleaseTime &&
          !!config.scheduling.defaultKickoffTime &&
          config.scheduling.workingDays.length > 0 &&
          config.scheduling.regressionSlots.length > 0
        );
        
      case 5: // Communication
        return true; // Optional
        
      case 6: // Review
        const validation = validateConfiguration(config);
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
    if (!canProceedFromStep(currentStep)) return;
    
    setIsSubmitting(true);
    
    try {
      const completeConfig: ReleaseConfiguration = {
        ...config,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ReleaseConfiguration;
      
      await onSubmit(completeConfig);
      
      // Clear draft after successful submission
      clearDraftConfig(organizationId);
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return (
          <div className="space-y-4">
            <TextInput
              label="Configuration Name"
              placeholder="e.g., Standard Release Configuration"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              required
              description="A descriptive name for this configuration"
            />
            
            <Textarea
              label="Description (Optional)"
              placeholder="Describe when to use this configuration..."
              value={config.description || ''}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              rows={3}
              description="Provide context about this configuration"
            />
            
            <Select
              label="Release Type"
              data={[
                { value: 'PLANNED', label: 'Planned Release' },
                { value: 'HOTFIX', label: 'Hotfix Release' },
                { value: 'EMERGENCY', label: 'Emergency Release' },
              ]}
              value={config.releaseType}
              onChange={(val) => setConfig({ ...config, releaseType: val as any })}
              required
              description="Type of releases this configuration is for"
            />
            
            <Switch
              label="Set as Default Configuration"
              description="Use this configuration for new releases by default"
              checked={config.isDefault}
              onChange={(e) => setConfig({ ...config, isDefault: e.currentTarget.checked })}
            />
          </div>
        );
        
      case 1: // Target Platforms (MOVED UP - Select platforms FIRST)
        return (
          <PlatformSelector
            selectedPlatforms={config.defaultTargets || []}
            onChange={(platforms) => setConfig({ ...config, defaultTargets: platforms })}
          />
        );
        
      case 2: // Build Pipelines (MOVED DOWN - Configure based on selected platforms)
        return (
          <PipelineList
            pipelines={config.buildPipelines || []}
            onChange={(pipelines) => setConfig({ ...config, buildPipelines: pipelines })}
            availableIntegrations={{
              jenkins: availableIntegrations.jenkins,
              github: availableIntegrations.github,
            }}
            selectedPlatforms={config.defaultTargets || []}
          />
        );
        
      case 3: // Test Management
        return (
          <TestManagementSelector
            config={config.testManagement!}
            onChange={(testManagement) => setConfig({ ...config, testManagement })}
            availableIntegrations={{
              checkmate: availableIntegrations.checkmate,
            }}
          />
        );
        
      case 4: // Scheduling
        return (
          <SchedulingConfig
            config={config.scheduling!}
            onChange={(scheduling) => setConfig({ ...config, scheduling })}
          />
        );
        
      case 5: // Communication
        return (
          <CommunicationConfig
            config={config.communication!}
            onChange={(communication) => setConfig({ ...config, communication })}
            availableIntegrations={{
              slack: availableIntegrations.slack,
            }}
          />
        );
        
      case 6: // Review
        return <ConfigSummary config={config} />;
        
      default:
        return null;
    }
  };
  
  return (
    <Container size="lg" className="py-8">
      <Paper shadow="sm" padding="xl" radius="md">
        <div className="mb-6">
          <Text size="xl" fw={700} className="mb-2">
            Release Configuration
          </Text>
          <Text size="sm" c="dimmed">
            Configure your release management process step by step
          </Text>
        </div>
        
        <WizardStepIndicator
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
        
        <div className="min-h-[500px] mb-6">{renderStepContent()}</div>
        
        <WizardNavigation
          currentStep={currentStep}
          totalSteps={steps.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onFinish={handleFinish}
          canProceed={canProceedFromStep(currentStep)}
          isLoading={isSubmitting}
        />
      </Paper>
    </Container>
  );
}

