/**
 * Workflow Create Modal Component
 * Modal for creating or editing CI/CD workflows (standalone, not tied to release config)
 * Reuses JenkinsConfigForm and GitHubActionsConfigForm components
 */

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Modal,
  Button,
  TextInput,
  Select,
  Stack,
  Group,
  Text,
  Alert,
  useMantineTheme,
  ThemeIcon,
  Divider,
} from '@mantine/core';
import { IconInfoCircle, IconRocket, IconAlertCircle } from '@tabler/icons-react';
import type { CICDWorkflow, WorkflowParameter } from '~/.server/services/ReleaseManagement/integrations';
import { PipelineProviderSelect } from '~/components/ReleaseConfig/BuildPipeline/PipelineProviderSelect';
import { JenkinsConfigForm } from '~/components/ReleaseConfig/BuildPipeline/JenkinsConfigForm';
import { GitHubActionsConfigForm } from '~/components/ReleaseConfig/BuildPipeline/GitHubActionsConfigForm';
import { PLATFORMS, BUILD_ENVIRONMENTS, BUILD_PROVIDERS } from '~/types/release-config-constants';
import type { BuildProvider, Platform, BuildEnvironment } from '~/types/release-config';
import {
  PLATFORM_LABELS,
  ENVIRONMENT_LABELS,
  BUTTON_LABELS,
  FIELD_LABELS,
  PLACEHOLDERS,
} from '~/constants/release-config-ui';
import { workflowTypeToEnvironment, environmentToWorkflowType, getEnvironmentsForPlatform } from '~/types/workflow-mappings';
import { validateWorkflowName } from '~/utils/workflow-validation';

const platformOptions = [
  { value: PLATFORMS.ANDROID, label: PLATFORM_LABELS.ANDROID },
  { value: PLATFORMS.IOS, label: PLATFORM_LABELS.IOS },
];

// System supports: PRE_REGRESSION, REGRESSION, TESTFLIGHT (iOS only), AAB_BUILD (Android)
const environmentOptions = [
  { value: BUILD_ENVIRONMENTS.PRE_REGRESSION, label: ENVIRONMENT_LABELS.PRE_REGRESSION },
  { value: BUILD_ENVIRONMENTS.REGRESSION, label: ENVIRONMENT_LABELS.REGRESSION },
  { value: BUILD_ENVIRONMENTS.TESTFLIGHT, label: ENVIRONMENT_LABELS.TESTFLIGHT },
  { value: BUILD_ENVIRONMENTS.AAB_BUILD, label: ENVIRONMENT_LABELS.AAB_BUILD },
];

export interface WorkflowCreateModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (workflowData: any) => Promise<void>;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    githubActions: Array<{ id: string; name: string }>;
  };
  tenantId: string;
  existingWorkflow?: CICDWorkflow | null;
  workflows?: CICDWorkflow[];
  fixedPlatform?: string; // Pre-fill platform (from PipelineEditModal)
  fixedEnvironment?: string; // Pre-fill environment (from PipelineEditModal)
}

function WorkflowCreateModalComponent({
  opened,
  onClose,
  onSave,
  availableIntegrations,
  tenantId,
  existingWorkflow,
  workflows = [],
  fixedPlatform,
  fixedEnvironment,
}: WorkflowCreateModalProps) {
  const theme = useMantineTheme();
  const isEditing = !!existingWorkflow;

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<string>(fixedPlatform || PLATFORMS.ANDROID);
  const [environment, setEnvironment] = useState<string>(fixedEnvironment || BUILD_ENVIRONMENTS.PRE_REGRESSION);
  const [provider, setProvider] = useState<BuildProvider>(BUILD_PROVIDERS.JENKINS as BuildProvider);
  const [providerConfig, setProviderConfig] = useState<any>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Determine available providers based on connected integrations
  const availableProviders = useMemo(() => {
    const providers: BuildProvider[] = [];
    if (availableIntegrations.jenkins.length > 0) {
      providers.push(BUILD_PROVIDERS.JENKINS as BuildProvider);
    }
    if (availableIntegrations.githubActions.length > 0) {
      providers.push(BUILD_PROVIDERS.GITHUB_ACTIONS as BuildProvider);
    }
    return providers;
  }, [availableIntegrations]);

  const defaultProvider: BuildProvider = useMemo(
    () => (availableProviders[0] || BUILD_PROVIDERS.JENKINS) as BuildProvider,
    [availableProviders]
  );

  // Initialize form from existing workflow
  useEffect(() => {
    if (opened) {
      if (existingWorkflow) {
        setName(existingWorkflow.displayName || '');
        setPlatform(existingWorkflow.platform || PLATFORMS.ANDROID);
        setEnvironment(workflowTypeToEnvironment[existingWorkflow.workflowType] || BUILD_ENVIRONMENTS.PRE_REGRESSION);
        setProvider((existingWorkflow.providerType || defaultProvider) as BuildProvider);

        // Reconstruct providerConfig from workflow data
        if (existingWorkflow.providerType === BUILD_PROVIDERS.JENKINS) {
          const params = existingWorkflow.parameters;
          const parametersRecord = Array.isArray(params)
            ? params.reduce((acc, param) => {
                acc[param.name] = param.defaultValue?.toString() || '';
                return acc;
              }, {} as Record<string, string>)
            : (params as Record<string, string>) || {};
          
          // Extract parameterDefinitions if params is an array
          const parameterDefinitions = Array.isArray(params) ? params : undefined;
          
          setProviderConfig({
            type: BUILD_PROVIDERS.JENKINS,
            integrationId: existingWorkflow.integrationId,
            jobUrl: existingWorkflow.workflowUrl,
            parameters: parametersRecord,
            parameterDefinitions, // Add this to restore fetched parameters
          });
        } else if (existingWorkflow.providerType === BUILD_PROVIDERS.GITHUB_ACTIONS) {
          const params = existingWorkflow.parameters;
          let inputsRecord: Record<string, string> = {};
          
          if (Array.isArray(params)) {
            inputsRecord = params.reduce((acc, param) => {
              acc[param.name] = param.defaultValue?.toString() || '';
              return acc;
            }, {} as Record<string, string>);
          } else if (params && typeof params === 'object') {
            inputsRecord = (params as any).inputs || {};
          }
          
          // Extract parameterDefinitions if params is an array
          const parameterDefinitions = Array.isArray(params) ? params : undefined;
          
          setProviderConfig({
            type: BUILD_PROVIDERS.GITHUB_ACTIONS,
            integrationId: existingWorkflow.integrationId,
            workflowUrl: existingWorkflow.workflowUrl,
            inputs: inputsRecord,
            parameterDefinitions, // Add this to restore fetched parameters
          });
        }
      } else {
        // Reset for new workflow
        setName('');
        setPlatform(fixedPlatform || PLATFORMS.ANDROID);
        setEnvironment(fixedEnvironment || BUILD_ENVIRONMENTS.PRE_REGRESSION);
        setProvider(defaultProvider);
        setProviderConfig({
          type: defaultProvider,
          ...(defaultProvider === BUILD_PROVIDERS.JENKINS
            ? { parameters: {} }
            : { inputs: {} }),
        });
      }
      setErrors({});
      setIsSaving(false);
    }
  }, [opened, existingWorkflow, defaultProvider, fixedPlatform, fixedEnvironment]);

  // Reset provider config when provider changes and auto-inject integrationId
  useEffect(() => {
    if (!opened) return;
    
    if (provider === BUILD_PROVIDERS.JENKINS) {
      // Auto-select integration if only one exists
      const jenkinsIntegrations = availableIntegrations.jenkins || [];
      const autoIntegrationId = jenkinsIntegrations.length === 1 
        ? jenkinsIntegrations[0].id 
        : providerConfig.integrationId || '';
      
      setProviderConfig((prev: any) => ({
        type: BUILD_PROVIDERS.JENKINS,
        integrationId: autoIntegrationId,
        jobUrl: prev.jobUrl || '',
        parameters: prev.parameters || {},
      }));
    } else if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
      // Auto-select integration if only one exists
      const githubIntegrations = availableIntegrations.githubActions || [];
      const autoIntegrationId = githubIntegrations.length === 1 
        ? githubIntegrations[0].id 
        : providerConfig.integrationId || '';
      
      setProviderConfig((prev: any) => ({
        type: BUILD_PROVIDERS.GITHUB_ACTIONS,
        integrationId: autoIntegrationId,
        workflowUrl: prev.workflowUrl || '',
        inputs: prev.inputs || {},
      }));
    }
  }, [provider, availableIntegrations, opened, providerConfig.integrationId]);

  // Filter environment options based on platform using centralized mapping
  const filteredEnvironmentOptions = useMemo(() => {
    // If fixed environment is provided (from PipelineEditModal), only show that
    if (fixedEnvironment) {
      return environmentOptions.filter(opt => opt.value === fixedEnvironment);
    }
    
    // Use centralized platform-to-environment mapping
    const validEnvironments = getEnvironmentsForPlatform(platform as Platform);
    return environmentOptions.filter(opt => validEnvironments.includes(opt.value as BuildEnvironment));
  }, [platform, fixedEnvironment]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate workflow name using utility function
    const nameError = validateWorkflowName(name, workflows, {
      existingWorkflow,
      isEditMode: !!existingWorkflow,
    });
    if (nameError) {
      newErrors.name = nameError;
    }

    if (provider === BUILD_PROVIDERS.JENKINS) {
      const config = providerConfig as any;
      if (!config || !config.integrationId) {
        newErrors.integration = 'Jenkins instance is required';
      }
      if (!config || !config.jobUrl || !config.jobUrl.trim()) {
        newErrors.jobUrl = 'Job URL is required';
      } else if (!config.jobUrl.startsWith('http://') && !config.jobUrl.startsWith('https://')) {
        newErrors.jobUrl = 'Job URL must be a valid URL (starting with http:// or https://)';
      }
    } else if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
      const config = providerConfig as any;
      if (!config || !config.integrationId) {
        newErrors.integration = 'GitHub integration is required';
      }
      const workflowUrl = config?.workflowUrl || config?.workflowPath;
      if (!workflowUrl || !workflowUrl.trim()) {
        newErrors.workflowUrl = 'Workflow URL is required';
      } else if (!workflowUrl.startsWith('http://') && !workflowUrl.startsWith('https://')) {
        newErrors.workflowUrl = 'Workflow URL must be a valid GitHub URL (starting with https://)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, provider, providerConfig, existingWorkflow, workflows]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      return;
    }

    // Prevent double submission
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      // Build workflow data for backend API
      const workflowData: any = {
        providerType: provider,
        integrationId: providerConfig.integrationId,
        displayName: name.trim(),
        platform: platform,
        workflowType: environmentToWorkflowType[environment] || 'REGRESSION_BUILD',
      };

    if (provider === BUILD_PROVIDERS.JENKINS) {
      workflowData.workflowUrl = providerConfig.jobUrl;
      const params = providerConfig.parameters || {};
      const paramDefinitions = (providerConfig as any).parameterDefinitions as WorkflowParameter[] | undefined;
      
      if (paramDefinitions && paramDefinitions.length > 0) {
        workflowData.parameters = paramDefinitions.map((def) => ({
          ...def,
          defaultValue: params[def.name] || def.defaultValue?.toString() || '',
        }));
      } else {
        workflowData.parameters = Object.entries(params).map(([name, value]): WorkflowParameter => ({
          name,
          type: 'string',
          defaultValue: value as string,
        }));
      }
    } else if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
      const workflowUrl = providerConfig.workflowUrl || providerConfig.workflowPath;
      workflowData.workflowUrl = workflowUrl;
      
      let workflowFileName = '';
      if (workflowUrl) {
        const fileNameMatch = workflowUrl.match(/\/([^/]+\.ya?ml)$/);
        if (fileNameMatch) {
          workflowFileName = fileNameMatch[1];
        }
      }
      
      const inputs = providerConfig.inputs || {};
      const paramDefinitions = (providerConfig as any).parameterDefinitions as WorkflowParameter[] | undefined;
      
      if (paramDefinitions && paramDefinitions.length > 0) {
        workflowData.parameters = paramDefinitions.map((def) => ({
          ...def,
          defaultValue: inputs[def.name] || def.defaultValue?.toString() || '',
        }));
      } else {
        workflowData.parameters = Object.entries(inputs).map(([name, value]): WorkflowParameter => ({
          name,
          type: 'string',
          defaultValue: value as string,
        }));
      }
      
      workflowData.providerIdentifiers = {
        workflowPath: workflowUrl,
        ...(workflowFileName && { workflowFileName }),
      };
    }

      await onSave(workflowData);
      // Modal will be closed by parent component after successful save
    } catch (error) {
      // Error will be handled by parent component via toast
      setIsSaving(false);
    }
  }, [validate, provider, providerConfig, name, platform, environment, onSave, isSaving]);

  const handlePlatformChange = useCallback((val: string | null) => {
    const newPlatform = (val || PLATFORMS.ANDROID) as Platform;
    setPlatform(newPlatform);
    
    // Reset environment if current environment is not valid for new platform
    const validEnvironments = getEnvironmentsForPlatform(newPlatform);
    setEnvironment(prevEnv => {
      if (!validEnvironments.includes(prevEnv as BuildEnvironment)) {
        // Set to first valid environment for the new platform
        return validEnvironments[0] || BUILD_ENVIRONMENTS.PRE_REGRESSION;
      }
      return prevEnv;
    });
  }, []);

  const handleEnvironmentChange = useCallback((val: string | null) => {
    setEnvironment(val || BUILD_ENVIRONMENTS.PRE_REGRESSION);
  }, []);

  const handleProviderChange = useCallback((val: BuildProvider) => {
    setProvider(val);
  }, []);


  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <ThemeIcon size={28} radius="md" variant="light" color="brand">
            <IconRocket size={16} />
          </ThemeIcon>
          <Text fw={600} size="lg" c={theme.colors.slate[9]}>
            {isEditing ? 'Edit Workflow' : 'Create Workflow'}
          </Text>
        </Group>
      }
      size="lg"
      radius="md"
    >
      <Stack gap="lg">
        <TextInput
          label={FIELD_LABELS.WORKFLOW_NAME}
          placeholder={PLACEHOLDERS.WORKFLOW_NAME}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            // Clear name error when user types
            if (errors.name) {
              setErrors((prev) => {
                const updated = { ...prev };
                delete updated.name;
                return updated;
              });
            }
          }}
          required
          error={errors.name}
          description="A descriptive name for this CI/CD workflow"
          size="sm"
        />

        <Group grow>
          <Select
            label={FIELD_LABELS.PLATFORM}
            data={platformOptions}
            value={platform}
            onChange={handlePlatformChange}
            required
            disabled={!!fixedPlatform}
            description={fixedPlatform ? 'Platform is fixed for this category' : undefined}
            size="sm"
          />

          <Select
            label={FIELD_LABELS.ENVIRONMENT}
            data={filteredEnvironmentOptions}
            value={environment}
            onChange={handleEnvironmentChange}
            required
            error={errors.environment}
            disabled={!!fixedEnvironment}
            description={fixedEnvironment ? 'Environment is fixed for this category' : undefined}
            size="sm"
          />
        </Group>

        <Divider />

        {/* Show error if no CI/CD integrations are available */}
        {availableProviders.length === 0 && (
          <Alert
            icon={<IconAlertCircle size={18} />}
            color="red"
            variant="light"
            radius="md"
            title="No CI/CD Integrations Connected"
          >
            <Text size="sm" mb="xs">
              To configure CI/CD workflows, you need to connect at least one provider:
            </Text>
            <Stack gap="xs" mb="xs">
              <Text size="sm" c={theme.colors.slate[6]}>
                • Jenkins
              </Text>
              <Text size="sm" c={theme.colors.slate[6]}>
                • GitHub Actions
              </Text>
            </Stack>
            <Text size="sm" c={theme.colors.slate[6]}>
              Go to <strong>Organization → Integrations</strong> to connect a provider.
            </Text>
          </Alert>
        )}

        {availableProviders.length > 0 && (
          <>
            <PipelineProviderSelect
              value={provider}
              onChange={handleProviderChange}
              availableProviders={availableProviders as any}
            />

            {errors.integration && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                <Text size="sm">{errors.integration}</Text>
              </Alert>
            )}

            {/* Provider-specific configuration forms */}
            {provider === BUILD_PROVIDERS.JENKINS && (
              <Stack gap="sm">
                <JenkinsConfigForm
                  config={providerConfig}
                  onChange={(newConfig) => {
                    setProviderConfig(newConfig);
                    // Clear jobUrl error when user types
                    if (errors.jobUrl && newConfig.jobUrl) {
                      setErrors((prev) => {
                        const updated = { ...prev };
                        delete updated.jobUrl;
                        return updated;
                      });
                    }
                  }}
                  availableIntegrations={availableIntegrations.jenkins}
                  workflows={workflows}
                  tenantId={tenantId}
                />
                {errors.jobUrl && (
                  <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                    <Text size="sm">{errors.jobUrl}</Text>
                  </Alert>
                )}
              </Stack>
            )}

            {provider === BUILD_PROVIDERS.GITHUB_ACTIONS && (
              <Stack gap="sm">
                <GitHubActionsConfigForm
                  config={providerConfig}
                  onChange={(newConfig) => {
                    setProviderConfig(newConfig);
                    // Clear workflowUrl error when user types
                    if (errors.workflowUrl && (newConfig.workflowUrl || newConfig.workflowPath)) {
                      setErrors((prev) => {
                        const updated = { ...prev };
                        delete updated.workflowUrl;
                        return updated;
                      });
                    }
                  }}
                  availableIntegrations={availableIntegrations.githubActions}
                  workflows={workflows}
                  tenantId={tenantId}
                />
                {errors.workflowUrl && (
                  <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                    <Text size="sm">{errors.workflowUrl}</Text>
                  </Alert>
                )}
              </Stack>
            )}
          </>
        )}

        <Divider />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="brand"
            disabled={availableProviders.length === 0 || isSaving}
            loading={isSaving}
            leftSection={!isSaving && <IconRocket size={16} />}
          >
            {isEditing ? 'Save Changes' : 'Create Workflow'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Export the component directly (memo can be added later if needed for performance)
// Temporarily removing memo to fix HMR issues
export function WorkflowCreateModal(props: WorkflowCreateModalProps) {
  return <WorkflowCreateModalComponent {...props} />;
}

