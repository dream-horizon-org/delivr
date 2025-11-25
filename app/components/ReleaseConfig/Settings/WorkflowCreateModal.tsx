/**
 * Workflow Create Modal Component
 * Modal for creating or editing CI/CD workflows (standalone, not tied to release config)
 * Reuses JenkinsConfigForm and GitHubActionsConfigForm components
 */

import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, TextInput, Select, Stack, Group, Text, Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { PipelineProviderSelect } from '../BuildPipeline/PipelineProviderSelect';
import { JenkinsConfigForm } from '../BuildPipeline/JenkinsConfigForm';
import { GitHubActionsConfigForm } from '../BuildPipeline/GitHubActionsConfigForm';
import { PLATFORMS, BUILD_ENVIRONMENTS, BUILD_PROVIDERS } from '~/types/release-config-constants';
import {
  PLATFORM_LABELS,
  ENVIRONMENT_LABELS,
  BUTTON_LABELS,
  FIELD_LABELS,
  PLACEHOLDERS,
} from '~/constants/release-config-ui';

// Map backend WorkflowType to UI BuildEnvironment
const workflowTypeToEnvironment: Record<string, string> = {
  PRE_REGRESSION_BUILD: BUILD_ENVIRONMENTS.PRE_REGRESSION,
  REGRESSION_BUILD: BUILD_ENVIRONMENTS.REGRESSION,
  TEST_FLIGHT_BUILD: BUILD_ENVIRONMENTS.TESTFLIGHT,
  AUTOMATION_BUILD: BUILD_ENVIRONMENTS.PRODUCTION,
  CUSTOM: BUILD_ENVIRONMENTS.PRODUCTION,
};

// Map UI BuildEnvironment to backend WorkflowType
const environmentToWorkflowType: Record<string, string> = {
  [BUILD_ENVIRONMENTS.PRE_REGRESSION]: 'PRE_REGRESSION_BUILD',
  [BUILD_ENVIRONMENTS.REGRESSION]: 'REGRESSION_BUILD',
  [BUILD_ENVIRONMENTS.TESTFLIGHT]: 'TEST_FLIGHT_BUILD',
  [BUILD_ENVIRONMENTS.PRODUCTION]: 'CUSTOM',
};

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

export interface WorkflowCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (workflowData: any) => Promise<void>;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
  };
  tenantId: string;
  existingWorkflow?: CICDWorkflow | null;
  workflows?: CICDWorkflow[];
}

export function WorkflowCreateModal({
  opened,
  onClose,
  onSave,
  availableIntegrations,
  tenantId,
  existingWorkflow,
  workflows = [],
}: WorkflowCreateModalProps) {
  const isEditing = !!existingWorkflow;

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<string>(PLATFORMS.ANDROID);
  const [environment, setEnvironment] = useState<string>(BUILD_ENVIRONMENTS.PRE_REGRESSION);
  const [provider, setProvider] = useState<string>(BUILD_PROVIDERS.JENKINS);
  const [providerConfig, setProviderConfig] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Determine available providers based on connected integrations
  const availableProviders = useMemo(() => {
    const providers: string[] = [];
    if (availableIntegrations.jenkins.length > 0) {
      providers.push(BUILD_PROVIDERS.JENKINS);
    }
    if (availableIntegrations.github.length > 0) {
      providers.push(BUILD_PROVIDERS.GITHUB_ACTIONS);
    }
    return providers;
  }, [availableIntegrations]);

  const defaultProvider = availableProviders[0] || BUILD_PROVIDERS.JENKINS;

  // Initialize form from existing workflow
  useEffect(() => {
    if (opened) {
      if (existingWorkflow) {
        setName(existingWorkflow.displayName || '');
        setPlatform(existingWorkflow.platform || PLATFORMS.ANDROID);
        setEnvironment(workflowTypeToEnvironment[existingWorkflow.workflowType] || BUILD_ENVIRONMENTS.PRE_REGRESSION);
        setProvider(existingWorkflow.providerType || defaultProvider);

        // Reconstruct providerConfig from workflow data
        if (existingWorkflow.providerType === BUILD_PROVIDERS.JENKINS) {
          setProviderConfig({
            type: BUILD_PROVIDERS.JENKINS,
            integrationId: existingWorkflow.integrationId,
            jobUrl: existingWorkflow.workflowUrl,
            jobName: existingWorkflow.displayName,
            parameters: existingWorkflow.parameters || {},
          });
        } else if (existingWorkflow.providerType === BUILD_PROVIDERS.GITHUB_ACTIONS) {
          setProviderConfig({
            type: BUILD_PROVIDERS.GITHUB_ACTIONS,
            integrationId: existingWorkflow.integrationId,
            workflowUrl: existingWorkflow.workflowUrl,
            inputs: (existingWorkflow.parameters as any)?.inputs || {},
          });
        }
      } else {
        // Reset for new workflow
        setName('');
        setPlatform(PLATFORMS.ANDROID);
        setEnvironment(BUILD_ENVIRONMENTS.PRE_REGRESSION);
        setProvider(defaultProvider);
        setProviderConfig({
          type: defaultProvider,
          ...(defaultProvider === BUILD_PROVIDERS.JENKINS
            ? { parameters: {} }
            : { inputs: {} }),
        });
      }
      setErrors({});
    }
  }, [opened, existingWorkflow, defaultProvider]);

  // Reset provider config when provider changes and auto-inject integrationId
  useEffect(() => {
    if (provider === BUILD_PROVIDERS.JENKINS) {
      // Auto-select integration if only one exists
      const jenkinsIntegrations = availableIntegrations.jenkins || [];
      const autoIntegrationId = jenkinsIntegrations.length === 1 
        ? jenkinsIntegrations[0].id 
        : providerConfig.integrationId || '';
      
      setProviderConfig({
        type: BUILD_PROVIDERS.JENKINS,
        integrationId: autoIntegrationId,
        jobUrl: providerConfig.jobUrl || '',
        jobName: providerConfig.jobName || '',
        parameters: providerConfig.parameters || {},
      });
    } else if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
      // Auto-select integration if only one exists
      const githubIntegrations = availableIntegrations.github || [];
      const autoIntegrationId = githubIntegrations.length === 1 
        ? githubIntegrations[0].id 
        : providerConfig.integrationId || '';
      
      setProviderConfig({
        type: BUILD_PROVIDERS.GITHUB_ACTIONS,
        integrationId: autoIntegrationId,
        workflowUrl: providerConfig.workflowUrl || '',
        inputs: providerConfig.inputs || {},
      });
    }
  }, [provider, availableIntegrations]);

  // Filter environment options based on platform
  const filteredEnvironmentOptions = environmentOptions.filter((opt) => {
    if (platform === PLATFORMS.IOS) {
      return true; // All environments available for iOS
    } else {
      return opt.value !== BUILD_ENVIRONMENTS.TESTFLIGHT; // No TestFlight for Android
    }
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Workflow name is required';
    }

    if (provider === BUILD_PROVIDERS.JENKINS) {
      const config = providerConfig as any;
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
      const config = providerConfig as any;
      if (!config.integrationId) {
        newErrors.integration = 'GitHub integration is required';
      }
      const workflowUrl = config.workflowUrl || config.workflowPath;
      if (!workflowUrl || !workflowUrl.trim()) {
        newErrors.workflowUrl = 'Workflow URL is required';
      } else if (!workflowUrl.startsWith('http') && !workflowUrl.startsWith('https')) {
        newErrors.workflowUrl = 'Workflow URL must be a full GitHub URL (starting with https://)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    // Build workflow data for backend API
    const workflowData: any = {
      providerType: provider,
      integrationId: providerConfig.integrationId,
      displayName: name.trim(),
      platform: platform,
      workflowType: environmentToWorkflowType[environment] || 'CUSTOM',
    };

    if (provider === BUILD_PROVIDERS.JENKINS) {
      workflowData.workflowUrl = providerConfig.jobUrl;
      workflowData.parameters = {
        jobName: providerConfig.jobName,
        ...(providerConfig.parameters && { buildParameters: providerConfig.parameters }),
      };
      workflowData.providerIdentifiers = {
        jobName: providerConfig.jobName,
      };
    } else if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
      // Use workflowUrl (full URL) - backend expects full GitHub URL
      const workflowUrl = providerConfig.workflowUrl || providerConfig.workflowPath;
      workflowData.workflowUrl = workflowUrl;
      
      // Extract branch from URL if present, otherwise use default
      let branch = 'main';
      if (workflowUrl) {
        const branchMatch = workflowUrl.match(/\/blob\/([^/]+)\//);
        if (branchMatch) {
          branch = branchMatch[1];
        }
      }
      
      // Extract workflow file name from URL for providerIdentifiers
      let workflowFileName = '';
      if (workflowUrl) {
        const fileNameMatch = workflowUrl.match(/\/([^/]+\.ya?ml)$/);
        if (fileNameMatch) {
          workflowFileName = fileNameMatch[1];
        }
      }
      
      workflowData.parameters = {
        branch: branch,
        ...(providerConfig.inputs && { inputs: providerConfig.inputs }),
      };
      workflowData.providerIdentifiers = {
        workflowPath: workflowUrl,
        ...(workflowFileName && { workflowFileName }),
      };
    }

    await onSave(workflowData);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditing ? 'Edit Workflow' : 'Create Workflow'}
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
              setPlatform(val || PLATFORMS.ANDROID);
              // Reset environment if TestFlight selected for Android
              if (val === PLATFORMS.ANDROID && environment === BUILD_ENVIRONMENTS.TESTFLIGHT) {
                setEnvironment(BUILD_ENVIRONMENTS.PRE_REGRESSION);
              }
            }}
            required
          />

          <Select
            label={FIELD_LABELS.ENVIRONMENT}
            data={filteredEnvironmentOptions}
            value={environment}
            onChange={(val) => setEnvironment(val || BUILD_ENVIRONMENTS.PRE_REGRESSION)}
            required
            error={errors.environment}
          />
        </Group>

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
          <>
            <PipelineProviderSelect
              value={provider}
              onChange={setProvider}
              availableProviders={availableProviders as any}
            />

            {errors.integration && (
              <div className="text-sm text-red-600">{errors.integration}</div>
            )}

            {/* Provider-specific configuration forms */}
            {provider === BUILD_PROVIDERS.JENKINS && (
              <JenkinsConfigForm
                config={providerConfig}
                onChange={setProviderConfig}
                availableIntegrations={availableIntegrations.jenkins}
                workflows={workflows}
                tenantId={tenantId}
              />
            )}

            {provider === BUILD_PROVIDERS.GITHUB_ACTIONS && (
              <GitHubActionsConfigForm
                config={providerConfig}
                onChange={setProviderConfig}
                availableIntegrations={availableIntegrations.github}
                workflows={workflows}
                tenantId={tenantId}
              />
            )}
          </>
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
            {isEditing ? 'Save Changes' : 'Create Workflow'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

