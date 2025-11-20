/**
 * Enhanced Checkmate Configuration Form
 * Supports platform-specific configurations with sections, labels, and squads
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Text,
  Select,
  NumberInput,
  Switch,
  Card,
  Group,
  Button,
  MultiSelect,
  Loader,
  Alert,
  Radio,
  Badge,
} from '@mantine/core';
import { IconTestPipe, IconTrash, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import type {
  CheckmateSettings,
  CheckmatePlatformConfiguration,
  CheckmateRules,
} from '~/types/release-config';

interface CheckmateProject {
  id: number;
  name: string;
  description?: string;
}

interface CheckmateSection {
  id: number;
  name: string;
  projectId: number;
}

interface CheckmateLabel {
  id: number;
  name: string;
  projectId: number;
}

interface CheckmateSquad {
  id: number;
  name: string;
  projectId: number;
}

interface CheckmateConfigFormEnhancedProps {
  config: CheckmateSettings;
  onChange: (config: CheckmateSettings) => void;
  availableIntegrations: Array<{ 
    id: string; 
    name: string; 
    workspaceId?: string;
    baseUrl?: string;
    orgId?: string;
  }>;
}

export function CheckmateConfigFormEnhanced({
  config,
  onChange,
  availableIntegrations,
}: CheckmateConfigFormEnhancedProps) {
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('');
  const [projects, setProjects] = useState<CheckmateProject[]>([]);
  const [sections, setSections] = useState<CheckmateSection[]>([]);
  const [labels, setLabels] = useState<CheckmateLabel[]>([]);
  const [squads, setSquads] = useState<CheckmateSquad[]>([]);
  
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const platformOptions = [
    { value: 'IOS_APP_STORE', label: 'iOS App Store' },
    { value: 'ANDROID_PLAY_STORE', label: 'Android Play Store' },
    { value: 'IOS_TESTFLIGHT', label: 'iOS TestFlight' },
    { value: 'ANDROID_INTERNAL_TESTING', label: 'Android Internal Testing' },
  ];

  // Define fetch functions BEFORE useEffect hooks that use them
  const fetchProjects = useCallback(async (integrationId: string) => {
    setIsLoadingProjects(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/integrations/${integrationId}/metadata/projects`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const result = await response.json();
      
      if (result.success && result.data?.data) {
        setProjects(result.data.data);
      } else {
        throw new Error(result.error || 'Failed to fetch projects');
      }
    } catch (error) {
      console.error('[Checkmate] Error fetching projects:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch projects');
    } finally {
      setIsLoadingProjects(false);
    }
  }, []); // No dependencies - this function doesn't change

  const fetchMetadata = useCallback(async (integrationId: string, projectId: number) => {
    setIsLoadingMetadata(true);
    setError(null);

    try {
      // Fetch sections, labels, and squads in parallel
      const [sectionsRes, labelsRes, squadsRes] = await Promise.all([
        fetch(`/api/v1/integrations/${integrationId}/metadata/sections?projectId=${projectId}`),
        fetch(`/api/v1/integrations/${integrationId}/metadata/labels?projectId=${projectId}`),
        fetch(`/api/v1/integrations/${integrationId}/metadata/squads?projectId=${projectId}`),
      ]);

      if (!sectionsRes.ok || !labelsRes.ok || !squadsRes.ok) {
        throw new Error('Failed to fetch metadata');
      }

      const [sectionsData, labelsData, squadsData] = await Promise.all([
        sectionsRes.json(),
        labelsRes.json(),
        squadsRes.json(),
      ]);

      setSections(sectionsData.data?.data || []);
      setLabels(labelsData.data?.data || []);
      setSquads(squadsData.data?.data || []);
    } catch (error) {
      console.error('[Checkmate] Error fetching metadata:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch metadata');
    } finally {
      setIsLoadingMetadata(false);
    }
  }, []); // No dependencies - this function doesn't change

  // Initialize selectedIntegrationId from config on mount
  useEffect(() => {
    if (config.integrationId && availableIntegrations.length > 0 && !selectedIntegrationId) {
      setSelectedIntegrationId(config.integrationId);
    }
  }, [config.integrationId, availableIntegrations, selectedIntegrationId]);

  // Fetch projects when integration is selected
  useEffect(() => {
    if (selectedIntegrationId) {
      fetchProjects(selectedIntegrationId);
    }
  }, [selectedIntegrationId, fetchProjects]);

  // Fetch metadata when project is selected
  useEffect(() => {
    if (selectedIntegrationId && config.projectId) {
      fetchMetadata(selectedIntegrationId, config.projectId);
    }
  }, [selectedIntegrationId, config.projectId, fetchMetadata]);

  const handleIntegrationChange = (integrationId: string) => {
    setSelectedIntegrationId(integrationId);
    const integration = availableIntegrations.find(i => i.id === integrationId);
    
    onChange({
      ...config,
      integrationId: integrationId, // Store the integration ID
      workspaceId: integration?.workspaceId || '', // Store the workspaceId from integration metadata
      projectId: 0,
      platformConfigurations: [],
    });
  };

  const handleProjectChange = (projectId: string) => {
    onChange({
      ...config,
      projectId: parseInt(projectId, 10),
      platformConfigurations: [],
    });
  };

  const handleAddPlatform = () => {
    onChange({
      ...config,
      platformConfigurations: [
        ...config.platformConfigurations,
        {
          platform: 'IOS_APP_STORE',
          sectionIds: [],
          labelIds: [],
          squadIds: [],
        },
      ],
    });
  };

  const handleRemovePlatform = (index: number) => {
    const newPlatforms = [...config.platformConfigurations];
    newPlatforms.splice(index, 1);
    onChange({
      ...config,
      platformConfigurations: newPlatforms,
    });
  };

  const handlePlatformConfigChange = (
    index: number,
    field: keyof CheckmatePlatformConfiguration,
    value: any
  ) => {
    const newPlatforms = [...config.platformConfigurations];
    newPlatforms[index] = {
      ...newPlatforms[index],
      [field]: value,
    };
    onChange({
      ...config,
      platformConfigurations: newPlatforms,
    });
  };

  const handleRulesChange = (field: keyof CheckmateRules, value: any) => {
    onChange({
      ...config,
      rules: {
        ...config.rules,
        [field]: value,
      },
    });
  };

  return (
    <Stack gap="md">
      {/* Integration Selection */}
      <Select
        label="Checkmate Integration"
        placeholder="Select Checkmate integration"
        data={availableIntegrations.map(i => ({ value: i.id, label: i.name }))}
        value={selectedIntegrationId}
        onChange={(val) => handleIntegrationChange(val || '')}
        required
        description="Choose the connected Checkmate integration"
      />

      {selectedIntegrationId && (
        <>
          {/* Project Selection */}
          {isLoadingProjects ? (
            <div className="flex items-center justify-center py-4">
              <Loader size="sm" />
              <Text size="sm" c="dimmed" className="ml-2">
                Loading projects...
              </Text>
            </div>
          ) : error ? (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
          ) : projects.length > 0 ? (
            <>
              <Select
                label="Checkmate Project"
                placeholder="Select project"
                data={projects.map(p => ({ value: p.id.toString(), label: p.name }))}
                value={config.projectId?.toString() || ''}
                onChange={(val) => handleProjectChange(val || '')}
                required
                description="Select the Checkmate project for this configuration"
                searchable
              />

              {config.projectId && (
                <>
                  {isLoadingMetadata ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader size="sm" />
                      <Text size="sm" c="dimmed" className="ml-2">
                        Loading metadata...
                      </Text>
                    </div>
                  ) : (
                    <>
                      {/* Platform Configurations */}
                      <div className="mt-4">
                        <Group justify="space-between" className="mb-3">
                          <div>
                            <Text fw={600} size="sm">
                              Platform Configurations
                            </Text>
                            <Text size="xs" c="dimmed">
                              Configure test filters for each platform
                            </Text>
                          </div>
                          <Button
                            leftSection={<IconPlus size={16} />}
                            size="xs"
                            onClick={handleAddPlatform}
                          >
                            Add Platform
                          </Button>
                        </Group>

                        {config.platformConfigurations.length === 0 ? (
                          <Alert color="blue" className="mb-4">
                            No platform configurations added. Click "Add Platform" to configure test filters.
                          </Alert>
                        ) : (
                          <Stack gap="md">
                            {config.platformConfigurations.map((platformConfig, index) => (
                              <Card
                                key={index}
                                shadow="sm"
                                padding="md"
                                radius="md"
                                withBorder
                              >
                                <Group justify="space-between" className="mb-3">
                                  <Badge color="blue" size="lg">
                                    Platform {index + 1}
                                  </Badge>
                                  <Button
                                    color="red"
                                    size="xs"
                                    variant="subtle"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={() => handleRemovePlatform(index)}
                                  >
                                    Remove
                                  </Button>
                                </Group>

                                <Stack gap="sm">
                                  <Select
                                    label="Platform"
                                    placeholder="Select platform"
                                    data={platformOptions}
                                    value={platformConfig.platform}
                                    onChange={(val) =>
                                      handlePlatformConfigChange(index, 'platform', val)
                                    }
                                    required
                                  />

                                  <MultiSelect
                                    label="Sections"
                                    placeholder="Select sections"
                                    data={sections.map(s => ({ 
                                      value: s.id.toString(), 
                                      label: s.name 
                                    }))}
                                    value={platformConfig.sectionIds?.map(id => id.toString()) || []}
                                    onChange={(val) =>
                                      handlePlatformConfigChange(
                                        index,
                                        'sectionIds',
                                        val.map(v => parseInt(v, 10))
                                      )
                                    }
                                    searchable
                                    description="Filter tests by sections (optional)"
                                  />

                                  <MultiSelect
                                    label="Labels"
                                    placeholder="Select labels"
                                    data={labels.map(l => ({ 
                                      value: l.id.toString(), 
                                      label: l.name 
                                    }))}
                                    value={platformConfig.labelIds?.map(id => id.toString()) || []}
                                    onChange={(val) =>
                                      handlePlatformConfigChange(
                                        index,
                                        'labelIds',
                                        val.map(v => parseInt(v, 10))
                                      )
                                    }
                                    searchable
                                    description="Filter tests by labels (optional)"
                                  />

                                  <MultiSelect
                                    label="Squads"
                                    placeholder="Select squads"
                                    data={squads.map(s => ({ 
                                      value: s.id.toString(), 
                                      label: s.name 
                                    }))}
                                    value={platformConfig.squadIds?.map(id => id.toString()) || []}
                                    onChange={(val) =>
                                      handlePlatformConfigChange(
                                        index,
                                        'squadIds',
                                        val.map(v => parseInt(v, 10))
                                      )
                                    }
                                    searchable
                                    description="Filter tests by squads (optional)"
                                  />
                                </Stack>
                              </Card>
                            ))}
                          </Stack>
                        )}
                      </div>

                      {/* Test Configuration Settings */}
                      <Card shadow="sm" padding="md" radius="md" withBorder className="mt-4">
                        <Text fw={600} size="sm" className="mb-3">
                          Test Configuration Settings
                        </Text>

                        <Stack gap="md">
                          <NumberInput
                            label="Pass Threshold (%)"
                            placeholder="95"
                            value={config.passThresholdPercent}
                            onChange={(val) =>
                              onChange({ ...config, passThresholdPercent: Number(val) })
                            }
                            min={0}
                            max={100}
                            required
                            description="Minimum pass percentage to consider test run successful"
                          />

                          <Radio.Group
                            label="Filter Type"
                            description="How to combine section, label, and squad filters"
                            value={config.filterType}
                            onChange={(val) =>
                              onChange({ ...config, filterType: val as 'AND' | 'OR' })
                            }
                          >
                            <Stack gap="xs" className="mt-2">
                              <Radio
                                value="AND"
                                label="AND - All filters must match"
                                description="Tests must match all selected sections, labels, and squads"
                              />
                              <Radio
                                value="OR"
                                label="OR - Any filter matches"
                                description="Tests can match any selected section, label, or squad"
                              />
                            </Stack>
                          </Radio.Group>

                          <Switch
                            label="Auto-create Test Runs"
                            description="Automatically create test runs for each release"
                            checked={config.autoCreateRuns}
                            onChange={(e) =>
                              onChange({ ...config, autoCreateRuns: e.currentTarget.checked })
                            }
                          />
                        </Stack>
                      </Card>

                      {/* Validation Rules */}
                      <Card shadow="sm" padding="md" radius="md" withBorder>
                        <Group gap="sm" className="mb-3">
                          <IconTestPipe size={20} className="text-purple-600" />
                          <Text fw={600} size="sm">
                            Validation Rules
                          </Text>
                        </Group>

                        <Stack gap="md">
                          <NumberInput
                            label="Maximum Failed Tests"
                            placeholder="0"
                            value={config.rules.maxFailedTests}
                            onChange={(val) => handleRulesChange('maxFailedTests', Number(val))}
                            min={0}
                            description="Maximum number of failed tests allowed (0 = none)"
                          />

                          <NumberInput
                            label="Maximum Untested Cases"
                            placeholder="0"
                            value={config.rules.maxUntestedCases}
                            onChange={(val) => handleRulesChange('maxUntestedCases', Number(val))}
                            min={0}
                            description="Maximum number of untested cases allowed (0 = none)"
                          />

                          <Switch
                            label="Require All Platforms"
                            description="All configured platforms must pass validation"
                            checked={config.rules.requireAllPlatforms}
                            onChange={(e) =>
                              handleRulesChange('requireAllPlatforms', e.currentTarget.checked)
                            }
                          />

                          <Switch
                            label="Allow Override"
                            description="Allow users to proceed despite failed validation rules"
                            checked={config.rules.allowOverride}
                            onChange={(e) =>
                              handleRulesChange('allowOverride', e.currentTarget.checked)
                            }
                          />
                        </Stack>
                      </Card>
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <Alert color="blue">
              No projects found for this integration.
            </Alert>
          )}
        </>
      )}
    </Stack>
  );
}

