/**
 * Workflow Form Component
 * Full page form for creating or editing CI/CD workflows
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from '@remix-run/react';
import {
  Box,
  Card,
  Stack,
  Text,
  TextInput,
  Select,
  Group,
  Button,
  Alert,
  Divider,
  Breadcrumbs,
  Anchor,
  useMantineTheme,
  ThemeIcon,
  Paper,
} from '@mantine/core';
import {
  IconRocket,
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
} from '@tabler/icons-react';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { PipelineProviderSelect } from '~/components/ReleaseConfig/BuildPipeline/PipelineProviderSelect';
import { JenkinsConfigForm } from '~/components/ReleaseConfig/BuildPipeline/JenkinsConfigForm';
import { GitHubActionsConfigForm } from '~/components/ReleaseConfig/BuildPipeline/GitHubActionsConfigForm';
import { PLATFORMS, BUILD_ENVIRONMENTS, BUILD_PROVIDERS } from '~/types/release-config-constants';
import type { BuildProvider, Platform, BuildEnvironment } from '~/types/release-config';
import {
  PLATFORM_LABELS,
  ENVIRONMENT_LABELS,
  FIELD_LABELS,
  PLACEHOLDERS,
} from '~/constants/release-config-ui';
import { workflowTypeToEnvironment, environmentToWorkflowType, getEnvironmentsForPlatform } from '~/types/workflow-mappings';
import { apiPost, apiPatch, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';

const platformOptions = [
  { value: PLATFORMS.ANDROID, label: PLATFORM_LABELS.ANDROID },
  { value: PLATFORMS.IOS, label: PLATFORM_LABELS.IOS },
];

const environmentOptions = [
  { value: BUILD_ENVIRONMENTS.PRE_REGRESSION, label: ENVIRONMENT_LABELS.PRE_REGRESSION },
  { value: BUILD_ENVIRONMENTS.REGRESSION, label: ENVIRONMENT_LABELS.REGRESSION },
  { value: BUILD_ENVIRONMENTS.TESTFLIGHT, label: ENVIRONMENT_LABELS.TESTFLIGHT },
];

export interface WorkflowFormProps {
  tenantId: string;
  onSubmit: () => void;
  onCancel: () => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    githubActions: Array<{ id: string; name: string }>;
  };
  existingWorkflow?: CICDWorkflow | null;
  isEditMode?: boolean;
}

export function WorkflowForm({
  tenantId,
  onSubmit,
  onCancel,
  availableIntegrations,
  existingWorkflow,
  isEditMode = false,
}: WorkflowFormProps) {
  const theme = useMantineTheme();

  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<string>(PLATFORMS.ANDROID);
  const [environment, setEnvironment] = useState<string>(BUILD_ENVIRONMENTS.PRE_REGRESSION);
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
    if (existingWorkflow) {
      setName(existingWorkflow.displayName || '');
      setPlatform(existingWorkflow.platform || PLATFORMS.ANDROID);
      setEnvironment(workflowTypeToEnvironment[existingWorkflow.workflowType] || BUILD_ENVIRONMENTS.PRE_REGRESSION);
      setProvider((existingWorkflow.providerType || defaultProvider) as BuildProvider);

      // Reconstruct providerConfig from workflow data
      if (existingWorkflow.providerType === BUILD_PROVIDERS.JENKINS) {
        setProviderConfig({
          type: BUILD_PROVIDERS.JENKINS,
          integrationId: existingWorkflow.integrationId,
          jobUrl: existingWorkflow.workflowUrl,
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
    setIsSaving(false);
  }, [existingWorkflow, defaultProvider]);

  // Reset provider config when provider changes and auto-inject integrationId
  useEffect(() => {
    if (provider === BUILD_PROVIDERS.JENKINS) {
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
  }, [provider, availableIntegrations, providerConfig.integrationId]);

  // Filter environment options based on platform
  const filteredEnvironmentOptions = useMemo(() => {
    const validEnvironments = getEnvironmentsForPlatform(platform as Platform);
    return environmentOptions.filter(opt => validEnvironments.includes(opt.value as BuildEnvironment));
  }, [platform]);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name || !name.trim()) {
      newErrors.name = 'Workflow name is required';
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
  }, [name, provider, providerConfig]);

  const handleSave = useCallback(async () => {
    if (!validate()) {
      return;
    }

    if (isSaving) return;

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
        workflowData.parameters = providerConfig.parameters || {};
      } else if (provider === BUILD_PROVIDERS.GITHUB_ACTIONS) {
        const workflowUrl = providerConfig.workflowUrl || providerConfig.workflowPath;
        workflowData.workflowUrl = workflowUrl;
        
        let branch = 'main';
        if (workflowUrl) {
          const branchMatch = workflowUrl.match(/\/blob\/([^/]+)\//);
          if (branchMatch) {
            branch = branchMatch[1];
          }
        }
        
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

      if (isEditMode && existingWorkflow) {
        const result = await apiPatch<{ success: boolean; error?: string }>(
          `/api/v1/tenants/${tenantId}/workflows/${existingWorkflow.id}`,
          workflowData
        );

        if (result.success) {
          showSuccessToast({ title: 'Success', message: 'Workflow updated successfully' });
          onSubmit();
        } else {
          showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to update workflow' });
          setIsSaving(false);
        }
      } else {
        const result = await apiPost<{ success: boolean; error?: string }>(
          `/api/v1/tenants/${tenantId}/workflows`,
          workflowData
        );

        if (result.success) {
          showSuccessToast({ title: 'Success', message: 'Workflow created successfully' });
          onSubmit();
        } else {
          showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to create workflow' });
          setIsSaving(false);
        }
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, isEditMode ? 'Failed to update workflow' : 'Failed to create workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
      setIsSaving(false);
    }
  }, [validate, provider, providerConfig, name, platform, environment, isSaving, isEditMode, existingWorkflow, tenantId, onSubmit]);

  const handlePlatformChange = useCallback((val: string | null) => {
    const newPlatform = (val || PLATFORMS.ANDROID) as Platform;
    setPlatform(newPlatform);
    
    const validEnvironments = getEnvironmentsForPlatform(newPlatform);
    setEnvironment(prevEnv => {
      if (!validEnvironments.includes(prevEnv as BuildEnvironment)) {
        return validEnvironments[0] || BUILD_ENVIRONMENTS.PRE_REGRESSION;
      }
      return prevEnv;
    });
  }, []);

  // Breadcrumb items
  const breadcrumbItems = [
    { title: 'Release Management', href: `/dashboard/${tenantId}/releases` },
    { title: 'Workflows', href: `/dashboard/${tenantId}/releases/workflows` },
    { title: isEditMode ? 'Edit' : 'Create', href: '#' },
  ].map((item, index) => (
    item.href === '#' ? (
      <Text key={index} size="sm" c={theme.colors.slate[6]}>
        {item.title}
      </Text>
    ) : (
      <Anchor
        key={index}
        component={Link}
        to={item.href}
        size="sm"
        c={theme.colors.slate[5]}
      >
        {item.title}
      </Anchor>
    )
  ));

  return (
    <Box p={32}>
      {/* Breadcrumbs */}
      <Breadcrumbs mb={24}>{breadcrumbItems}</Breadcrumbs>

      {/* Header */}
      <Group justify="space-between" align="flex-start" mb={32}>
        <Box>
          <Group gap="sm" mb={8}>
            <ThemeIcon size={36} radius="md" variant="light" color="brand">
              <IconRocket size={20} />
            </ThemeIcon>
            <Text size="xl" fw={700} c={theme.colors.slate[9]}>
              {isEditMode ? 'Edit Workflow' : 'Create Workflow'}
            </Text>
          </Group>
          <Text size="sm" c={theme.colors.slate[5]}>
            {isEditMode 
              ? 'Update your CI/CD workflow configuration'
              : 'Configure a new CI/CD workflow for Jenkins or GitHub Actions'}
          </Text>
        </Box>
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </Group>

      {/* Form Card */}
      <Card shadow="sm" padding="xl" radius="md" withBorder maw={800} mx="auto">
        <Stack gap="xl">
          {/* Basic Information */}
          <Box>
            <Text fw={600} size="md" c={theme.colors.slate[8]} mb="md">
              Basic Information
            </Text>
            <Stack gap="md">
              <TextInput
                label={FIELD_LABELS.WORKFLOW_NAME}
                placeholder={PLACEHOLDERS.WORKFLOW_NAME}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
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
                  size="sm"
                />

                <Select
                  label={FIELD_LABELS.ENVIRONMENT}
                  data={filteredEnvironmentOptions}
                  value={environment}
                  onChange={(val) => setEnvironment(val || BUILD_ENVIRONMENTS.PRE_REGRESSION)}
                  required
                  error={errors.environment}
                  size="sm"
                />
              </Group>
            </Stack>
          </Box>

          <Divider />

          {/* CI/CD Provider Selection */}
          {availableProviders.length === 0 ? (
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
          ) : (
            <>
              <Box>
                <Text fw={600} size="md" c={theme.colors.slate[8]} mb="md">
                  CI/CD Provider
                </Text>
                <PipelineProviderSelect
                  value={provider}
                  onChange={setProvider}
                  availableProviders={availableProviders as any}
                />
              </Box>

              {errors.integration && (
                <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                  <Text size="sm">{errors.integration}</Text>
                </Alert>
              )}

              <Divider />

              {/* Provider-specific configuration */}
              <Box>
                <Text fw={600} size="md" c={theme.colors.slate[8]} mb="md">
                  Provider Configuration
                </Text>
                {provider === BUILD_PROVIDERS.JENKINS && (
                  <Stack gap="sm">
                    <JenkinsConfigForm
                      config={providerConfig}
                      onChange={(newConfig) => {
                        setProviderConfig(newConfig);
                        if (errors.jobUrl && newConfig.jobUrl) {
                          setErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.jobUrl;
                            return updated;
                          });
                        }
                      }}
                      availableIntegrations={availableIntegrations.jenkins}
                      workflows={[]}
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
                        if (errors.workflowUrl && (newConfig.workflowUrl || newConfig.workflowPath)) {
                          setErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.workflowUrl;
                            return updated;
                          });
                        }
                      }}
                      availableIntegrations={availableIntegrations.githubActions}
                      workflows={[]}
                      tenantId={tenantId}
                    />
                    {errors.workflowUrl && (
                      <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                        <Text size="sm">{errors.workflowUrl}</Text>
                      </Alert>
                    )}
                  </Stack>
                )}
              </Box>
            </>
          )}

          {/* Action Buttons */}
          <Divider />

          <Group justify="flex-end" gap="md">
            <Button variant="subtle" color="gray" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              color="brand"
              disabled={availableProviders.length === 0 || isSaving}
              loading={isSaving}
              leftSection={!isSaving && <IconCheck size={16} />}
            >
              {isEditMode ? 'Save Changes' : 'Create Workflow'}
            </Button>
          </Group>
        </Stack>
      </Card>
    </Box>
  );
}

