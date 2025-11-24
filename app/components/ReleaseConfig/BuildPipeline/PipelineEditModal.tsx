/**
 * Pipeline Edit Modal Component
 * Modal for creating or editing build pipelines
 */

import { useState, useEffect } from 'react';
import { Modal, Button, TextInput, Select, Stack, Group, SegmentedControl, Text, Card, Badge, Alert } from '@mantine/core';
import { IconServer, IconBrandGithub, IconInfoCircle } from '@tabler/icons-react';
import type { 
  Workflow, 
  BuildProvider, 
  Platform, 
  BuildEnvironment,
  JenkinsConfig,
  GitHubActionsConfig,
  ManualUploadConfig,
} from '~/types/release-config';
import type { PipelineEditModalProps } from '~/types/release-config-props';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { PipelineProviderSelect } from './PipelineProviderSelect';
import { JenkinsConfigForm } from './JenkinsConfigForm';
import { GitHubActionsConfigForm } from './GitHubActionsConfigForm';
import { ManualUploadConfigForm } from './ManualUploadConfigForm';
import { generateConfigId } from '~/utils/release-config-storage';
import { PLATFORMS, BUILD_ENVIRONMENTS, BUILD_PROVIDERS, CONFIG_MODES } from '~/types/release-config-constants';
import {
  PLATFORM_LABELS,
  ENVIRONMENT_LABELS,
  BUTTON_LABELS,
  ERROR_MESSAGES,
  INFO_MESSAGES,
  SECTION_TITLES,
  FIELD_LABELS,
  PLACEHOLDERS,
} from '~/constants/release-config-ui';

const platformOptions = [
  { value: PLATFORMS.ANDROID, label: PLATFORM_LABELS.ANDROID },
  { value: PLATFORMS.IOS, label: PLATFORM_LABELS.IOS },
];

const environmentOptions = [
  { value: BUILD_ENVIRONMENTS.PRE_REGRESSION, label: ENVIRONMENT_LABELS.PRE_REGRESSION },
  { value: BUILD_ENVIRONMENTS.REGRESSION, label: ENVIRONMENT_LABELS.REGRESSION },
  { value: BUILD_ENVIRONMENTS.TESTFLIGHT, label: ENVIRONMENT_LABELS.TESTFLIGHT },
  { value: BUILD_ENVIRONMENTS.PRODUCTION, label: ENVIRONMENT_LABELS.PRODUCTION },
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
  workflows = [],
  tenantId,
}: PipelineEditModalProps) {
  const isEditing = !!pipeline;
  
  // Configuration mode: existing or new
  const [configMode, setConfigMode] = useState<typeof CONFIG_MODES[keyof typeof CONFIG_MODES]>(CONFIG_MODES.EXISTING);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>();
  
  const [name, setName] = useState(pipeline?.name || '');
  const [platform, setPlatform] = useState<Platform>(
    pipeline?.platform || fixedPlatform || PLATFORMS.ANDROID
  );
  const [environment, setEnvironment] = useState<BuildEnvironment>(
    pipeline?.environment || fixedEnvironment || BUILD_ENVIRONMENTS.PRE_REGRESSION
  );
  const [provider, setProvider] = useState<BuildProvider>(
    pipeline?.provider || BUILD_PROVIDERS.JENKINS
  );
  const [providerConfig, setProviderConfig] = useState<
    Partial<JenkinsConfig> | Partial<GitHubActionsConfig> | Partial<ManualUploadConfig>
  >(pipeline?.providerConfig || { type: BUILD_PROVIDERS.JENKINS });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Filter workflows by platform and environment
  const relevantWorkflows = workflows.filter(w => {
    if (fixedPlatform && w.platform !== fixedPlatform) return false;
    if (fixedEnvironment && w.workflowType !== fixedEnvironment) return false;
    return true;
  });
  
  const selectedWorkflow = relevantWorkflows.find(w => w.id === selectedWorkflowId);
  console.log('availableIntegrations', availableIntegrations);
  // Determine available providers based on connected integrations
  // NOTE: Manual Upload is NOT available in CI/CD workflows - only Jenkins and GitHub Actions
  const availableProviders: BuildProvider[] = [];
  if (availableIntegrations.jenkins.length > 0) availableProviders.push(BUILD_PROVIDERS.JENKINS);
  if (availableIntegrations.github.length > 0) availableProviders.push(BUILD_PROVIDERS.GITHUB_ACTIONS);
  
  // Get the first available provider
  const defaultProvider = availableProviders[0] || BUILD_PROVIDERS.JENKINS; // Fallback to JENKINS (will show error if not available)
  
  // Reset form when modal opens or pipeline/fixedPlatform/fixedEnvironment changes
  useEffect(() => {
    if (opened) {
      setName(pipeline?.name || '');
      setPlatform(pipeline?.platform || fixedPlatform || PLATFORMS.ANDROID);
      setEnvironment(pipeline?.environment || fixedEnvironment || BUILD_ENVIRONMENTS.PRE_REGRESSION);
      
      // Set provider: use existing pipeline's provider if valid, otherwise use first available
      const initialProvider = pipeline?.provider && availableProviders.includes(pipeline.provider) 
        ? pipeline.provider 
        : defaultProvider;
      setProvider(initialProvider);
      
      // Set provider config based on the selected provider
      if (pipeline?.providerConfig && pipeline.provider === initialProvider) {
        setProviderConfig(pipeline.providerConfig);
      } else {
        // Create default config for the selected provider
        if (initialProvider === BUILD_PROVIDERS.JENKINS) {
          setProviderConfig({ type: BUILD_PROVIDERS.JENKINS, parameters: {} });
        } else if (initialProvider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
          setProviderConfig({ type: BUILD_PROVIDERS.GITHUB_ACTIONS, inputs: {}, branch: 'main' });
        } else {
          setProviderConfig({ type: BUILD_PROVIDERS.MANUAL_UPLOAD });
        }
      }
      
      setErrors({});
      setSelectedWorkflowId(undefined);
      // Default to existing if workflows available, otherwise new
      setConfigMode(relevantWorkflows.length > 0 ? CONFIG_MODES.EXISTING : CONFIG_MODES.NEW);
    }
  }, [opened, pipeline, fixedPlatform, fixedEnvironment, relevantWorkflows.length, availableProviders, defaultProvider]);
  
  // Reset provider config when provider changes
  useEffect(() => {
    if (provider === BUILD_PROVIDERS.JENKINS) {
      setProviderConfig({ type: BUILD_PROVIDERS.JENKINS, parameters: {} } as Partial<JenkinsConfig>);
    } else if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
      setProviderConfig({ type: BUILD_PROVIDERS.GITHUB_ACTIONS, inputs: {}, branch: 'main' } as Partial<GitHubActionsConfig>);
    } else {
      setProviderConfig({ type: BUILD_PROVIDERS.MANUAL_UPLOAD } as Partial<ManualUploadConfig>);
    }
  }, [provider]);
  
  // Filter environment options based on platform
  const filteredEnvironmentOptions = environmentOptions.filter(opt => {
    if (platform === PLATFORMS.IOS) {
      return true; // All environments available for iOS
    } else {
      return opt.value !== BUILD_ENVIRONMENTS.TESTFLIGHT; // No TestFlight for Android
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
    
    // Validate based on config mode
    if (configMode === CONFIG_MODES.EXISTING) {
      if (!selectedWorkflowId) {
        newErrors.workflow = 'Please select a workflow';
      }
    } else {
      // Validate new configuration
      if (provider === BUILD_PROVIDERS.JENKINS) {
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
      } else if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
        const config = providerConfig as Partial<GitHubActionsConfig>;
        if (!config.integrationId) {
          newErrors.integration = 'GitHub repository is required';
        }
        if (!config.workflowPath) {
          newErrors.workflowPath = 'Workflow path is required';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = () => {
    // if (!validate()) return;
    
    let finalProvider: BuildProvider;
    let finalProviderConfig: JenkinsConfig | GitHubActionsConfig | ManualUploadConfig;
    
    if (configMode === 'existing' && selectedWorkflow) {
      // Use workflow configuration
      finalProvider = selectedWorkflow.providerType === BUILD_PROVIDERS.JENKINS ? BUILD_PROVIDERS.JENKINS : BUILD_PROVIDERS.GITHUB_ACTIONS;
      
      if (selectedWorkflow.providerType === BUILD_PROVIDERS.JENKINS) {
        finalProviderConfig = {
          type: BUILD_PROVIDERS.JENKINS,
          integrationId: selectedWorkflow.integrationId,
          jobUrl: selectedWorkflow.workflowUrl,
          jobName: selectedWorkflow.displayName,
          parameters: selectedWorkflow.parameters || {},
        };
      } else {
        finalProviderConfig = {
          type: BUILD_PROVIDERS.GITHUB_ACTIONS,
          integrationId: selectedWorkflow.integrationId,
          workflowId: selectedWorkflow.id,
          workflowPath: selectedWorkflow.workflowUrl,
          branch: 'main',
          inputs: selectedWorkflow.parameters || {},
        };
      }
    } else {
      // Use new configuration
      finalProvider = provider;
      finalProviderConfig = providerConfig as any;
    }
    
    const pipelineData: Workflow = {
      id: pipeline?.id || generateConfigId(),
      name: name.trim(),
      platform,
      environment,
      provider: finalProvider,
      providerConfig: finalProviderConfig,
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
      title={isEditing ? 'Edit Workflow' : 'Add Workflow'}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label={FIELD_LABELS.WORKFLOW_NAME}
          placeholder={PLACEHOLDERS.WORKFLOW_NAME}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          error={errors.name}
          description="A descriptive name for this CI/CD workflow"
        />
        
        <Group grow>
          <Select
            label={FIELD_LABELS.PLATFORM}
            data={platformOptions}
            value={platform}
            onChange={(val) => {
              setPlatform(val as Platform);
              // Reset environment if TestFlight selected for Android
              if (val === PLATFORMS.ANDROID && environment === BUILD_ENVIRONMENTS.TESTFLIGHT) {
                setEnvironment(BUILD_ENVIRONMENTS.PRE_REGRESSION);
              }
            }}
            required
            disabled={!!fixedPlatform}
            description={fixedPlatform ? 'Platform is fixed for this category' : undefined}
          />
          
          <Select
            label={FIELD_LABELS.ENVIRONMENT}
            data={filteredEnvironmentOptions}
            value={environment}
            onChange={(val) => setEnvironment(val as BuildEnvironment)}
            required
            error={errors.environment}
            disabled={!!fixedEnvironment}
            description={fixedEnvironment ? 'Environment is fixed for this category' : undefined}
          />
        </Group>
        
        {/* Configuration Mode Selection */}
        {relevantWorkflows.length > 0 && (
          <div>
            <Text size="sm" fw={500} className="mb-2">
              Workflow Configuration
            </Text>
            <SegmentedControl
              value={configMode}
              onChange={(val) => setConfigMode(val as typeof configMode)}
              data={[
                { value: CONFIG_MODES.EXISTING, label: `Use Existing (${relevantWorkflows.length})` },
                { value: CONFIG_MODES.NEW, label: 'Create New' },
              ]}
              fullWidth
            />
          </div>
        )}
        
        {/* Existing Workflow Selection */}
          {configMode === CONFIG_MODES.EXISTING && relevantWorkflows.length > 0 && (
          <Stack gap="sm">
            <Select
              label={FIELD_LABELS.SELECT_WORKFLOW}
              placeholder={PLACEHOLDERS.SELECT_WORKFLOW}
              data={relevantWorkflows.map(w => ({
                value: w.id,
                label: w.displayName,
              }))}
              value={selectedWorkflowId}
              onChange={(val) => {
                setSelectedWorkflowId(val || undefined);
                // Auto-fill pipeline name if empty
                const workflow = relevantWorkflows.find(w => w.id === val);
                if (workflow && !name) {
                  setName(workflow.displayName);
                }
              }}
              required
              error={errors.workflow}
              searchable
            />
            
            {/* Workflow Preview */}
            {selectedWorkflow && (
              <Card withBorder className="bg-gray-50">
                <Stack gap="xs">
                  <Group gap="xs">
                    {selectedWorkflow.providerType === BUILD_PROVIDERS.JENKINS ? (
                      <IconServer size={18} className="text-red-600" />
                    ) : (
                      <IconBrandGithub size={18} />
                    )}
                    <Text size="sm" fw={600}>
                      {selectedWorkflow.displayName}
                    </Text>
                  </Group>
                  
                  <Group gap="xs">
                    <Badge size="sm" color={selectedWorkflow.providerType === 'JENKINS' ? 'red' : 'dark'}>
                      {selectedWorkflow.providerType.replace('_', ' ')}
                    </Badge>
                    <Badge size="sm" color="blue">
                      {selectedWorkflow.platform}
                    </Badge>
                  </Group>
                  
                  <div className="bg-white rounded p-2 border border-gray-200">
                    <Text size="xs" c="dimmed" className="font-mono break-all">
                      {selectedWorkflow.workflowUrl}
                    </Text>
                  </div>
                  
                  {selectedWorkflow.parameters && Object.keys(selectedWorkflow.parameters).length > 0 && (
                    <div>
                      <Text size="xs" fw={500} c="dimmed" className="mb-1">
                        Parameters:
                      </Text>
                      <div className="bg-white rounded p-2 border border-gray-200 space-y-1">
                        {Object.entries(selectedWorkflow.parameters).slice(0, 3).map(([key, value]) => (
                          <Text key={key} size="xs" className="font-mono">
                            <span className="text-gray-600">{key}:</span>{' '}
                            <span className="text-blue-600">{String(value)}</span>
                          </Text>
                        ))}
                        {Object.keys(selectedWorkflow.parameters).length > 3 && (
                          <Text size="xs" c="dimmed">
                            +{Object.keys(selectedWorkflow.parameters).length - 3} more...
                          </Text>
                        )}
                      </div>
                    </div>
                  )}
                </Stack>
              </Card>
            )}
          </Stack>
        )}
        
        {/* New Configuration Form */}
          {configMode === CONFIG_MODES.NEW && (
          <Stack gap="md">
            {/* Show error if no CI/CD integrations are available */}
            {availableProviders.length === 0 && (
              <Alert
                icon={<IconInfoCircle size={18} />}
                color="red"
                variant="light"
                title="No CI/CD Integrations Connected"
              >
                <Text size="sm" className="mb-2">
                  To configure CI/CD workflows, you need to connect at least one provider:
                </Text>
                <ul className="list-disc list-inside text-sm mb-2">
                  <li>Jenkins</li>
                  <li>GitHub Actions</li>
                </ul>
                <Text size="sm">
                  Go to <strong>Settings → Integrations</strong> to connect a provider.
                </Text>
              </Alert>
            )}
            
            {availableProviders.length > 0 && (
              <PipelineProviderSelect
                value={provider}
                onChange={setProvider}
                availableProviders={availableProviders}
              />
            )}
            
            {errors.integration && (
              <div className="text-sm text-red-600">{errors.integration}</div>
            )}
            
            {/* Provider-specific configuration forms */}
            {provider === BUILD_PROVIDERS.JENKINS && (
              <JenkinsConfigForm
                config={providerConfig as Partial<JenkinsConfig>}
                onChange={setProviderConfig}
                availableIntegrations={availableIntegrations.jenkins}
                tenantId={tenantId}
              />
            )}
            
            {provider === BUILD_PROVIDERS.GITHUB_ACTIONS && (
              <GitHubActionsConfigForm
                config={providerConfig as Partial<GitHubActionsConfig>}
                onChange={setProviderConfig}
                availableIntegrations={availableIntegrations.github}
                tenantId={tenantId}
              />
            )}
            
            {/* Manual Upload is not supported in CI/CD workflows */}
          </Stack>
        )}
        
        <Group justify="flex-end" className="mt-4">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={availableProviders.length === 0}
          >
            {isEditing ? 'Save Changes' : 'Add Workflow'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

