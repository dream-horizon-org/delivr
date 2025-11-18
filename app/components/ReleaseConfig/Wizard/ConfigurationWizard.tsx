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
import { WizardNavigation } from './WizardNavigation';
import { ConfigSummary } from './ConfigSummary';
import { VerticalStepper, type Step } from '~/components/Common/VerticalStepper';
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

const steps: Step[] = [
  { 
    id: 'basic', 
    title: 'Basic Information', 
    description: 'Name and type',
    icon: IconSettings 
  },
  { 
    id: 'platforms', 
    title: 'Target Platforms', 
    description: 'Select platforms',
    icon: IconTarget 
  },
  { 
    id: 'pipelines', 
    title: 'Build Pipelines', 
    description: 'Configure builds',
    icon: IconSettings 
  },
  { 
    id: 'testing', 
    title: 'Test Management', 
    description: 'Optional',
    icon: IconTestPipe 
  },
  { 
    id: 'scheduling', 
    title: 'Scheduling', 
    description: 'Timings & slots',
    icon: IconCalendar 
  },
  { 
    id: 'communication', 
    title: 'Communication', 
    description: 'Slack & email',
    icon: IconBell 
  },
  { 
    id: 'review', 
    title: 'Review & Submit', 
    description: 'Final check',
    icon: IconFileCheck 
  },
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
    <Container size="xl" className="py-8">
      <div className="grid grid-cols-12 gap-6">
        {/* Vertical Stepper - Left Side */}
        <div className="col-span-3">
          <Paper shadow="sm" padding="lg" radius="md" className="sticky top-8" style={{ minHeight: '700px' }}>
            <Text size="sm" fw={600} c="dimmed" className="mb-4 uppercase tracking-wide">
              Configuration Steps
            </Text>
            
            <VerticalStepper
              steps={steps}
              currentStep={currentStep}
              completedSteps={completedSteps}
              allowNavigation={false}
            />
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <Text size="xs" c="dimmed">
                Step {currentStep + 1} of {steps.length}
              </Text>
            </div>
          </Paper>
        </div>
        
        {/* Main Content - Right Side */}
        <div className="col-span-9">
          <Paper shadow="sm" padding="xl" radius="md">
            <div className="mb-6 px-4">
              <Text size="xl" fw={700} className="mb-2">
                {steps[currentStep].title}
              </Text>
              <Text size="sm" c="dimmed">
                {steps[currentStep].description}
              </Text>
            </div>
            
            <div className="min-h-[600px] mb-6 px-4">{renderStepContent()}</div>
            
            <div className="px-4">
              <WizardNavigation
                currentStep={currentStep}
                totalSteps={steps.length}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onFinish={handleFinish}
                canProceed={canProceedFromStep(currentStep)}
                isLoading={isSubmitting}
              />
            </div>
          </Paper>
        </div>
      </div>
    </Container>
  );
}

