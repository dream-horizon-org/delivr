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
import { apiGet, getApiErrorMessage } from '~/utils/api-client';
import type {
  CheckmateSettings,
  CheckmatePlatformConfiguration,
  TargetPlatform,
} from '~/types/release-config';
import type { CheckmateConfigFormEnhancedProps } from '~/types/release-config-props';
import { PLATFORMS } from '~/types/release-config-constants';
import { isAndroidTarget, isIOSTarget } from '~/utils/platform-mapper';

// Backend API response structures - match Checkmate API exactly
interface CheckmateProject {
  projectId: number;
  projectName: string;
  projectDescription: string | null;
  orgId: number;
  createdByName: string | null;
  createdOn: string;
}

interface CheckmateSection {
  sectionId: number;
  sectionName: string;
  projectId: number;
  parentSectionId: number | null;
  sectionDepth: number;
}

interface CheckmateLabel {
  labelId: number;
  labelName: string;
  labelType: 'System' | 'Custom';
  projectId: number;
  createdOn: string | null;
}

interface CheckmateSquad {
  squadId: number;
  squadName: string;
  projectId: number;
  createdOn: string | null;
  createdBy: number | null;
}

// Using CheckmateConfigFormEnhancedProps from centralized types
export function CheckmateConfigFormEnhanced({
  config,
  onChange,
  availableIntegrations,
  selectedTargets, // NEW: Receive selected targets
}: CheckmateConfigFormEnhancedProps) {
  // ✅ Initialize selectedIntegrationId from config immediately
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>(config?.integrationId || '');
  const [projects, setProjects] = useState<CheckmateProject[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  // ✅ Initialize selectedProject from config.projectId
  const [selectedProject, setSelectedProject] = useState<number | null>(config?.projectId || null);
  // Determine which platforms to show based on selected targets
  const hasAndroidTarget = selectedTargets.some(isAndroidTarget);
  const hasIOSTarget = selectedTargets.some(isIOSTarget);
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
      integrationId: config?.integrationId || '',
      projectId: config?.projectId || 0,
      platformConfigurations: config?.platformConfigurations || [],
      autoCreateRuns: config?.autoCreateRuns ?? false,
      passThresholdPercent: config?.passThresholdPercent ?? 100,
      filterType: config?.filterType || 'AND',
      ...updates,
    };
  };

  // Using centralized PLATFORMS from constants

  // Define fetch functions BEFORE useEffect hooks that use them
  const fetchProjects = useCallback(async (integrationId: string) => {
    setIsLoadingProjects(true);
    setProjectsLoaded(false); // ✅ Reset flag
    setError(null);

    try {
      const result = await apiGet<{ projectsList: any[] }>(
        `/api/v1/integrations/${integrationId}/metadata/projects`
      );
      
      if (result.success && result.data?.projectsList) {
        setProjects(result.data.projectsList || []);
        if(config.projectId && result.data.projectsList.some((p: any) => p.projectId === config.projectId)) {
          setSelectedProject(config.projectId);
        }
        setProjectsLoaded(true); // ✅ Mark projects as loaded
      } else {
        throw new Error('Failed to fetch projects');
      }
    } catch (error) {
      setError(getApiErrorMessage(error, 'Failed to fetch projects'));
      setProjectsLoaded(false);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [config.projectId]); // ✅ Add config.projectId as dependency

  const fetchMetadata = useCallback(async (integrationId: string, projectId: number) => {
    setIsLoadingMetadata(true);
    setError(null);

    try {
      const [sectionsData, labelsData, squadsData] = await Promise.all([
        apiGet<any[]>(`/api/v1/integrations/${integrationId}/metadata/sections?projectId=${projectId}`),
        apiGet<any[]>(`/api/v1/integrations/${integrationId}/metadata/labels?projectId=${projectId}`),
        apiGet<any[]>(`/api/v1/integrations/${integrationId}/metadata/squads?projectId=${projectId}`),
      ]);

      setSections(sectionsData.data || []);
      setLabels(labelsData.data || []);
      setSquads(squadsData.data || []);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Failed to fetch metadata'));
    } finally {
      setIsLoadingMetadata(false);
    }
  }, []);

  // ✅ Sync selectedIntegrationId with config.integrationId (for edit mode)
  useEffect(() => {
    
    if (config?.integrationId && config.integrationId !== selectedIntegrationId) {
      setSelectedIntegrationId(config.integrationId);
    }
  }, [config?.integrationId, selectedIntegrationId]); // ✅ Added selectedIntegrationId to deps

  // Fetch projects when integration is selected
  useEffect(() => {
    if (selectedIntegrationId) {
      fetchProjects(selectedIntegrationId);
    }
  }, [selectedIntegrationId, fetchProjects]);

  // ✅ Fetch metadata ONLY AFTER projects are loaded and projectId is valid
  useEffect(() => {
    if (
      selectedIntegrationId &&
      projectsLoaded && // ✅ Wait for projects to load first
      config.projectId &&
      config.projectId > 0
    ) {
      fetchMetadata(selectedIntegrationId, config.projectId);
    }
  }, [selectedIntegrationId, projectsLoaded, config.projectId, fetchMetadata]);

  const handleIntegrationChange = (integrationId: string) => {
    setSelectedIntegrationId(integrationId);
    setProjectsLoaded(false); // ✅ Reset when integration changes
    setProjects([]); // ✅ Clear previous projects
    
    onChange(createCompleteConfig({
      integrationId: integrationId, // Store the integration ID
      projectId: 0,
      platformConfigurations: [],
    }));
  };

  const handleProjectChange = (projectId: string) => {
    const parsedProjectId = parseInt(projectId, 10);
    setSelectedProject(parsedProjectId); // ✅ Update selectedProject state
    onChange(createCompleteConfig({
      projectId: parsedProjectId,
      platformConfigurations: [],
    }));
  };

  // Get or initialize platform config for a specific platform
  const getPlatformConfig = (platform: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS): CheckmatePlatformConfiguration => {
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
    platform: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS,
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
        data={availableIntegrations.map((i: { id: string; name: string }) => ({ value: i.id, label: i.name }))}
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
                data={projects.map(p => ({ value: p.projectId.toString(), label: p.projectName }))}
                value={config.projectId?.toString() || selectedProject?.toString() || ''} 
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
                          {/* ANDROID Configuration - Only show if Android target is selected */}
                          {hasAndroidTarget && (
                            <Card shadow="sm" padding="md" radius="md" withBorder>
                              <Group gap="xs" className="mb-3">
                                <Badge color="green" size="lg" variant="filled">
                                  Android
                                </Badge>
                                <Text size="xs" c="dimmed">
                                  Configure test selection for Android builds
                                </Text>
                              </Group>

                            <Stack gap="sm">
                              <MultiSelect
                                label="Sections"
                                placeholder="Select sections for Android"
                                data={sections.map(s => ({ 
                                  value: s.sectionId.toString(), 
                                  label: s.sectionName 
                                }))}
                                value={getPlatformConfig(PLATFORMS.ANDROID).sectionIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    PLATFORMS.ANDROID,
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
                                  value: l.labelId.toString(), 
                                  label: l.labelName 
                                }))}
                                value={getPlatformConfig(PLATFORMS.ANDROID).labelIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    PLATFORMS.ANDROID,
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
                                  value: s.squadId.toString(), 
                                  label: s.squadName 
                                }))}
                                value={getPlatformConfig(PLATFORMS.ANDROID).squadIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    PLATFORMS.ANDROID,
                                    'squadIds',
                                    val.map(v => parseInt(v, 10))
                                  )
                                }
                                searchable
                                description="Filter tests by squads (optional)"
                              />
                            </Stack>
                          </Card>
                          )}

                          {/* iOS Configuration - Only show if iOS target is selected */}
                          {hasIOSTarget && (
                            <Card shadow="sm" padding="md" radius="md" withBorder>
                              <Group gap="xs" className="mb-3">
                                <Badge color="blue" size="lg" variant="filled">
                                  iOS
                                </Badge>
                                <Text size="xs" c="dimmed">
                                  Configure test selection for iOS builds
                                </Text>
                              </Group>

                            <Stack gap="sm">
                              <MultiSelect
                                label="Sections"
                                placeholder="Select sections for iOS"
                                data={sections.map(s => ({ 
                                  value: s.sectionId.toString(), 
                                  label: s.sectionName 
                                }))}
                                value={getPlatformConfig(PLATFORMS.IOS).sectionIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    PLATFORMS.IOS,
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
                                  value: l.labelId.toString(), 
                                  label: l.labelName 
                                }))}
                                value={getPlatformConfig(PLATFORMS.IOS).labelIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    PLATFORMS.IOS,
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
                                  value: s.squadId.toString(), 
                                  label: s.squadName 
                                }))}
                                value={getPlatformConfig(PLATFORMS.IOS).squadIds?.map(id => id.toString()) || []}
                                onChange={(val) =>
                                  handlePlatformConfigChange(
                                    PLATFORMS.IOS,
                                    'squadIds',
                                    val.map(v => parseInt(v, 10))
                                  )
                                }
                                searchable
                                description="Filter tests by squads (optional)"
                              />
                            </Stack>
                          </Card>
                          )}
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

