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
import { IconAlertCircle } from '@tabler/icons-react';
import type {
  CheckmateSettings,
  CheckmatePlatformConfiguration,
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
  config: Partial<CheckmateSettings>;
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

  // Helper to ensure we always have a complete CheckmateSettings object
  const createCompleteConfig = (updates: Partial<CheckmateSettings>): CheckmateSettings => {
    return {
      type: 'checkmate',
      integrationId: config.integrationId || '',
      projectId: config.projectId || 0,
      platformConfigurations: config.platformConfigurations || [],
      autoCreateRuns: config.autoCreateRuns ?? false,
      passThresholdPercent: config.passThresholdPercent ?? 100,
      filterType: config.filterType || 'AND',
      ...updates,
    };
  };

  // Platforms are HARDCODED - these are global system constants, not Checkmate metadata
  const PLATFORMS = {
    ANDROID: 'ANDROID',
    IOS: 'IOS',
  } as const;

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
    
    onChange(createCompleteConfig({
      integrationId: integrationId, // Store the integration ID
      projectId: 0,
      platformConfigurations: [],
    }));
  };

  const handleProjectChange = (projectId: string) => {
    onChange(createCompleteConfig({
      projectId: parseInt(projectId, 10),
      platformConfigurations: [],
    }));
  };

  // Get or initialize platform config for a specific platform
  const getPlatformConfig = (platform: 'ANDROID' | 'IOS'): CheckmatePlatformConfiguration => {
    const platformConfigs = config.platformConfigurations || [];
    return platformConfigs.find(pc => pc.platform === platform) || {
      platform,
      sectionIds: [],
      labelIds: [],
      squadIds: [],
    };
  };

  // Update platform-specific configuration
  const handlePlatformConfigChange = (
    platform: 'ANDROID' | 'IOS',
    field: keyof Omit<CheckmatePlatformConfiguration, 'platform'>,
    value: number[]
  ) => {
    const platformConfigs = config.platformConfigurations || [];
    const existingIndex = platformConfigs.findIndex(pc => pc.platform === platform);
    const newPlatforms = [...platformConfigs];

    if (existingIndex >= 0) {
      // Update existing platform config
      newPlatforms[existingIndex] = {
        ...newPlatforms[existingIndex],
        [field]: value,
      };
    } else {
      // Add new platform config
      newPlatforms.push({
        platform,
        sectionIds: [],
        labelIds: [],
        squadIds: [],
        [field]: value,
      });
    }

    onChange(createCompleteConfig({
      platformConfigurations: newPlatforms,
    }));
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

              {config.projectId? (
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
                      {/* Platform Configurations - FIXED (Android & iOS only) */}
                      <div className="mt-4">
                        <div className="mb-3">
                          <Text fw={600} size="sm">
                            Platform Configurations
                          </Text>
                          <Text size="xs" c="dimmed">
                            Configure test filters for Android and iOS platforms
                          </Text>
                        </div>

                        <Stack gap="md">
                          {/* ANDROID Configuration */}
                          <Card shadow="sm" padding="md" radius="md" withBorder>
                            <Group gap="xs" className="mb-3">
                              <Badge color="green" size="lg" variant="filled">
                                Android
                              </Badge>
                              <Text size="xs" c="dimmed">
                                (Global platform)
                              </Text>
                            </Group>

                            <Stack gap="sm">
                              <MultiSelect
                                label="Sections"
                                placeholder="Select sections for Android"
                                data={sections.map(s => ({ 
                                  value: s.id.toString(), 
                                  label: s.name 
                                }))}
                                value={getPlatformConfig('ANDROID').sectionIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    'ANDROID',
                                    'sectionIds',
                                    val.map(v => parseInt(v, 10))
                                  )
                                }
                                searchable
                                description="Filter tests by sections (optional)"
                              />

                              <MultiSelect
                                label="Labels"
                                placeholder="Select labels for Android"
                                data={labels.map(l => ({ 
                                  value: l.id.toString(), 
                                  label: l.name 
                                }))}
                                value={getPlatformConfig('ANDROID').labelIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    'ANDROID',
                                    'labelIds',
                                    val.map(v => parseInt(v, 10))
                                  )
                                }
                                searchable
                                description="Filter tests by labels (optional)"
                              />

                              <MultiSelect
                                label="Squads"
                                placeholder="Select squads for Android"
                                data={squads.map(s => ({ 
                                  value: s.id.toString(), 
                                  label: s.name 
                                }))}
                                value={getPlatformConfig('ANDROID').squadIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    'ANDROID',
                                    'squadIds',
                                    val.map(v => parseInt(v, 10))
                                  )
                                }
                                searchable
                                description="Filter tests by squads (optional)"
                              />
                            </Stack>
                          </Card>

                          {/* iOS Configuration */}
                          <Card shadow="sm" padding="md" radius="md" withBorder>
                            <Group gap="xs" className="mb-3">
                              <Badge color="blue" size="lg" variant="filled">
                                iOS
                              </Badge>
                              <Text size="xs" c="dimmed">
                                (Global platform)
                              </Text>
                            </Group>

                            <Stack gap="sm">
                              <MultiSelect
                                label="Sections"
                                placeholder="Select sections for iOS"
                                data={sections.map(s => ({ 
                                  value: s.id.toString(), 
                                  label: s.name 
                                }))}
                                value={getPlatformConfig('IOS').sectionIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    'IOS',
                                    'sectionIds',
                                    val.map(v => parseInt(v, 10))
                                  )
                                }
                                searchable
                                description="Filter tests by sections (optional)"
                              />

                              <MultiSelect
                                label="Labels"
                                placeholder="Select labels for iOS"
                                data={labels.map(l => ({ 
                                  value: l.id.toString(), 
                                  label: l.name 
                                }))}
                                value={getPlatformConfig('IOS').labelIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    'IOS',
                                    'labelIds',
                                    val.map(v => parseInt(v, 10))
                                  )
                                }
                                searchable
                                description="Filter tests by labels (optional)"
                              />

                              <MultiSelect
                                label="Squads"
                                placeholder="Select squads for iOS"
                                data={squads.map(s => ({ 
                                  value: s.id.toString(), 
                                  label: s.name 
                                }))}
                                value={getPlatformConfig('IOS').squadIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    'IOS',
                                    'squadIds',
                                    val.map(v => parseInt(v, 10))
                                  )
                                }
                                searchable
                                description="Filter tests by squads (optional)"
                              />
                            </Stack>
                          </Card>
                        </Stack>
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
                            value={config.passThresholdPercent ?? 100}
                            onChange={(val) =>
                              onChange(createCompleteConfig({ passThresholdPercent: Number(val) }))
                            }
                            min={0}
                            max={100}
                            required
                            description="Minimum pass percentage to consider test run successful"
                          />

                          <Radio.Group
                            label="Filter Type"
                            description="How to combine section, label, and squad filters"
                            value={config.filterType || 'AND'}
                            onChange={(val) =>
                              onChange(createCompleteConfig({ filterType: val as 'AND' | 'OR' }))
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
                            checked={config.autoCreateRuns ?? false}
                            onChange={(e) =>
                              onChange(createCompleteConfig({ autoCreateRuns: e.currentTarget.checked }))
                            }
                          />
                        </Stack>
                      </Card>

                    </>
                  )}
                </>
              ): null}
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

