/**
 * Pipeline Edit Modal Component
 * Modal for creating or editing build pipelines
 */

import { useState, useEffect } from 'react';
import { Modal, Button, TextInput, Select, Stack, Group } from '@mantine/core';
import type { 
  BuildPipelineJob, 
  BuildProvider, 
  Platform, 
  BuildEnvironment,
  JenkinsConfig,
  GitHubActionsConfig,
  ManualUploadConfig,
} from '~/types/release-config';
import { PipelineProviderSelect } from './PipelineProviderSelect';
import { JenkinsConfigForm } from './JenkinsConfigForm';
import { GitHubActionsConfigForm } from './GitHubActionsConfigForm';
import { ManualUploadConfigForm } from './ManualUploadConfigForm';
import { generateConfigId } from '~/utils/release-config-storage';

interface PipelineEditModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (pipeline: BuildPipelineJob) => void;
  pipeline?: BuildPipelineJob; // If editing existing pipeline
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
  };
  existingPipelines: BuildPipelineJob[]; // For validation
  fixedPlatform?: 'ANDROID' | 'IOS'; // Fixed platform (cannot be changed)
  fixedEnvironment?: BuildEnvironment; // Fixed environment (cannot be changed)
}

const platformOptions = [
  { value: 'ANDROID', label: 'Android' },
  { value: 'IOS', label: 'iOS' },
];

const environmentOptions = [
  { value: 'PRE_REGRESSION', label: 'Pre-Regression' },
  { value: 'REGRESSION', label: 'Regression' },
  { value: 'TESTFLIGHT', label: 'TestFlight' },
  { value: 'PRODUCTION', label: 'Production' },
];

export function PipelineEditModal({
  opened,
  onClose,
  onSave,
  pipeline,
  availableIntegrations,
  existingPipelines,
  fixedPlatform,
  fixedEnvironment,
}: PipelineEditModalProps) {
  const isEditing = !!pipeline;
  console.log('fixedPlatform', fixedPlatform, 'fixedEnvironment', fixedEnvironment);
  
  const [name, setName] = useState(pipeline?.name || '');
  const [platform, setPlatform] = useState<Platform>(
    pipeline?.platform || fixedPlatform || 'ANDROID'
  );
  const [environment, setEnvironment] = useState<BuildEnvironment>(
    pipeline?.environment || fixedEnvironment || 'PRE_REGRESSION'
  );
  const [provider, setProvider] = useState<BuildProvider>(
    pipeline?.provider || 'JENKINS'
  );
  const [providerConfig, setProviderConfig] = useState<
    Partial<JenkinsConfig> | Partial<GitHubActionsConfig> | Partial<ManualUploadConfig>
  >(pipeline?.providerConfig || { type: 'JENKINS' });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Determine available providers based on integrations
  const availableProviders: BuildProvider[] = [];
  if (availableIntegrations.jenkins.length > 0) availableProviders.push('JENKINS');
  if (availableIntegrations.github.length > 0) availableProviders.push('GITHUB_ACTIONS');
  availableProviders.push('MANUAL_UPLOAD'); // Always available
  
  // Reset form when modal opens or pipeline/fixedPlatform/fixedEnvironment changes
  useEffect(() => {
    if (opened) {
      setName(pipeline?.name || '');
      setPlatform(pipeline?.platform || fixedPlatform || 'ANDROID');
      setEnvironment(pipeline?.environment || fixedEnvironment || 'PRE_REGRESSION');
      setProvider(pipeline?.provider || 'JENKINS');
      setProviderConfig(pipeline?.providerConfig || { type: 'JENKINS' });
      setErrors({});
    }
  }, [opened, pipeline, fixedPlatform, fixedEnvironment]);
  
  // Reset provider config when provider changes
  useEffect(() => {
    if (provider === 'JENKINS') {
      setProviderConfig({ type: 'JENKINS', parameters: {} } as Partial<JenkinsConfig>);
    } else if (provider === 'GITHUB_ACTIONS') {
      setProviderConfig({ type: 'GITHUB_ACTIONS', inputs: {}, branch: 'main' } as Partial<GitHubActionsConfig>);
    } else {
      setProviderConfig({ type: 'MANUAL_UPLOAD' } as Partial<ManualUploadConfig>);
    }
  }, [provider]);
  
  // Filter environment options based on platform
  const filteredEnvironmentOptions = environmentOptions.filter(opt => {
    if (platform === 'IOS') {
      return true; // All environments available for iOS
    } else {
      return opt.value !== 'TESTFLIGHT'; // No TestFlight for Android
    }
  });
  
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Pipeline name is required';
    }
    
    // Check for duplicate pipeline (same platform + environment)
    const duplicate = existingPipelines.find(
      p => 
        p.platform === platform && 
        p.environment === environment && 
        p.id !== pipeline?.id
    );
    
    if (duplicate) {
      newErrors.environment = `A pipeline for ${platform} ${environment} already exists`;
    }
    
    if (provider === 'JENKINS') {
      const config = providerConfig as Partial<JenkinsConfig>;
      if (!config.integrationId) {
        newErrors.integration = 'Jenkins instance is required';
      }
      if (!config.jobUrl) {
        newErrors.jobUrl = 'Job URL is required';
      }
      if (!config.jobName) {
        newErrors.jobName = 'Job name is required';
      }
    } else if (provider === 'GITHUB_ACTIONS') {
      const config = providerConfig as Partial<GitHubActionsConfig>;
      if (!config.integrationId) {
        newErrors.integration = 'GitHub repository is required';
      }
      if (!config.workflowPath) {
        newErrors.workflowPath = 'Workflow path is required';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = () => {
    if (!validate()) return;
    
    const pipelineData: BuildPipelineJob = {
      id: pipeline?.id || generateConfigId(),
      name: name.trim(),
      platform,
      environment,
      provider,
      providerConfig: providerConfig as any,
      enabled: pipeline?.enabled ?? true,
      timeout: pipeline?.timeout || 3600,
      retryAttempts: pipeline?.retryAttempts || 3,
    };
    
    onSave(pipelineData);
    onClose();
  };
  
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Edit Build Pipeline' : 'Add Build Pipeline'}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Pipeline Name"
          placeholder="e.g., Android Pre-Regression Build"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          error={errors.name}
          description="A descriptive name for this build pipeline"
        />
        
        <Group grow>
          <Select
            label="Platform"
            data={platformOptions}
            value={platform}
            onChange={(val) => {
              setPlatform(val as Platform);
              // Reset environment if TestFlight selected for Android
              if (val === 'ANDROID' && environment === 'TESTFLIGHT') {
                setEnvironment('PRE_REGRESSION');
              }
            }}
            required
            disabled={!!fixedPlatform}
            description={fixedPlatform ? 'Platform is fixed for this category' : undefined}
          />
          
          <Select
            label="Environment"
            data={filteredEnvironmentOptions}
            value={environment}
            onChange={(val) => setEnvironment(val as BuildEnvironment)}
            required
            error={errors.environment}
            disabled={!!fixedEnvironment}
            description={fixedEnvironment ? 'Environment is fixed for this category' : undefined}
          />
        </Group>
        
        <PipelineProviderSelect
          value={provider}
          onChange={setProvider}
          availableProviders={availableProviders}
        />
        
        {errors.integration && (
          <div className="text-sm text-red-600">{errors.integration}</div>
        )}
        
        {/* Provider-specific configuration forms */}
        {provider === 'JENKINS' && (
          <JenkinsConfigForm
            config={providerConfig as Partial<JenkinsConfig>}
            onChange={setProviderConfig}
            availableIntegrations={availableIntegrations.jenkins}
          />
        )}
        
        {provider === 'GITHUB_ACTIONS' && (
          <GitHubActionsConfigForm
            config={providerConfig as Partial<GitHubActionsConfig>}
            onChange={setProviderConfig}
            availableIntegrations={availableIntegrations.github}
          />
        )}
        
        {provider === 'MANUAL_UPLOAD' && (
          <ManualUploadConfigForm
            config={providerConfig as Partial<ManualUploadConfig>}
            onChange={setProviderConfig}
          />
        )}
        
        <Group justify="flex-end" className="mt-4">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            {isEditing ? 'Save Changes' : 'Add Pipeline'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

