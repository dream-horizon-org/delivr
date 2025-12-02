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
  integrationId, // Optional: if provided, use this integration (one-to-one mapping)
}: CheckmateConfigFormEnhancedProps) {
  // ✅ Use provided integrationId or fallback to config
  const selectedIntegrationId = integrationId || config?.integrationId || '';
  const [projects, setProjects] = useState<CheckmateProject[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
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
      integrationId: selectedIntegrationId || config?.integrationId || '',
      projectId: 0, // No global projectId - platform-specific now
      platformConfigurations: config?.platformConfigurations || [],
      autoCreateRuns: config?.autoCreateRuns ?? false,
      passThresholdPercent: config?.passThresholdPercent ?? 100,
      filterType: config?.filterType || 'AND',
      ...updates,
    };
  };

  // Using centralized PLATFORMS from constants

  // Define fetch functions BEFORE useEffect hooks that use them
  // Single API call to fetch all projects (shared by both iOS and Android)
  const fetchProjects = useCallback(async (integrationId: string) => {
    setIsLoadingProjects(true);
    setProjectsLoaded(false);
    setError(null);

    try {
      const result = await apiGet<{ projectsList: any[] }>(
        `/api/v1/integrations/${integrationId}/metadata/projects`
      );
      
      if (result.success && result.data?.projectsList) {
        setProjects(result.data.projectsList || []);
        setProjectsLoaded(true);
      } else {
        throw new Error('Failed to fetch projects');
      }
    } catch (error) {
      setError(getApiErrorMessage(error, 'Failed to fetch projects'));
      setProjectsLoaded(false);
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

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

  // Store platform-specific metadata (projects are shared, metadata is platform-specific)
  const [platformSections, setPlatformSections] = useState<Record<string, CheckmateSection[]>>({});
  const [platformLabels, setPlatformLabels] = useState<Record<string, CheckmateLabel[]>>({});
  const [platformSquads, setPlatformSquads] = useState<Record<string, CheckmateSquad[]>>({});
  const [loadingMetadataForPlatform, setLoadingMetadataForPlatform] = useState<Record<string, boolean>>({});
  const [metadataErrorForPlatform, setMetadataErrorForPlatform] = useState<Record<string, boolean>>({});

  // Fetch platform-specific projects when needed

  // Fetch projects when integration is selected (single call, shared by all platforms)
  useEffect(() => {
    if (selectedIntegrationId && !projectsLoaded && !isLoadingProjects) {
      fetchProjects(selectedIntegrationId);
    }
  }, [selectedIntegrationId, fetchProjects, projectsLoaded, isLoadingProjects]);

  // Fetch platform-specific metadata (sequential calls to avoid parallelization issues)
  const fetchPlatformMetadata = useCallback(async (platform: string, projectId: number) => {
    if (!selectedIntegrationId || !projectId) return;
    
    setLoadingMetadataForPlatform(prev => ({ ...prev, [platform]: true }));
    setMetadataErrorForPlatform(prev => ({ ...prev, [platform]: false }));
    // Clear general error state - we'll use platform-specific error instead
    setError(null);
    
    try {
      // Sequential API calls instead of parallel to avoid failures
      const sectionsData = await apiGet<any[]>(`/api/v1/integrations/${selectedIntegrationId}/metadata/sections?projectId=${projectId}`);
      const labelsData = await apiGet<any[]>(`/api/v1/integrations/${selectedIntegrationId}/metadata/labels?projectId=${projectId}`);
      const squadsData = await apiGet<any[]>(`/api/v1/integrations/${selectedIntegrationId}/metadata/squads?projectId=${projectId}`);

      // Only update if all calls succeeded
      if (sectionsData.success && labelsData.success && squadsData.success) {
        setPlatformSections(prev => ({ ...prev, [platform]: sectionsData.data || [] }));
        setPlatformLabels(prev => ({ ...prev, [platform]: labelsData.data || [] }));
        setPlatformSquads(prev => ({ ...prev, [platform]: squadsData.data || [] }));
        setMetadataErrorForPlatform(prev => ({ ...prev, [platform]: false }));
      } else {
        throw new Error('One or more metadata API calls failed');
      }
    } catch (error) {
      // Set platform-specific error (don't set general error to avoid duplicate messages)
      setMetadataErrorForPlatform(prev => ({ ...prev, [platform]: true }));
      // Clear metadata for this platform on error
      setPlatformSections(prev => {
        const updated = { ...prev };
        delete updated[platform];
        return updated;
      });
      setPlatformLabels(prev => {
        const updated = { ...prev };
        delete updated[platform];
        return updated;
      });
      setPlatformSquads(prev => {
        const updated = { ...prev };
        delete updated[platform];
        return updated;
      });
    } finally {
      setLoadingMetadataForPlatform(prev => ({ ...prev, [platform]: false }));
    }
  }, [selectedIntegrationId]);

  // In edit mode: Fetch metadata for existing platform configurations
  // This ensures dropdowns show names instead of IDs when editing
  useEffect(() => {
    if (!selectedIntegrationId || !projectsLoaded || !config?.platformConfigurations) return;

    // For each platform configuration that has a projectId, fetch its metadata
    config.platformConfigurations.forEach((platformConfig) => {
      if (platformConfig.platform && platformConfig.projectId) {
        const projectId = typeof platformConfig.projectId === 'number' 
          ? platformConfig.projectId 
          : parseInt(String(platformConfig.projectId), 10);
        
        // Only fetch if we don't already have metadata for this platform
        if (projectId && !loadingMetadataForPlatform[platformConfig.platform] && 
            !platformSections[platformConfig.platform]) {
          fetchPlatformMetadata(platformConfig.platform, projectId);
        }
      }
    });
  }, [selectedIntegrationId, projectsLoaded, config?.platformConfigurations, fetchPlatformMetadata, loadingMetadataForPlatform, platformSections]);

  // Handle platform-specific project change
  const handlePlatformProjectChange = (platform: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS, projectId: string) => {
    const parsedProjectId = parseInt(projectId, 10);
    const platformConfigs = config?.platformConfigurations || [];
    const existingIndex = platformConfigs.findIndex(pc => pc.platform === platform);
    const newPlatforms = [...platformConfigs];

    if (existingIndex >= 0) {
      // Update existing platform config with projectId
      newPlatforms[existingIndex] = {
        ...newPlatforms[existingIndex],
        projectId: parsedProjectId,
        // Reset filters when project changes
        sectionIds: [],
        labelIds: [],
        squadIds: [],
      };
    } else {
      // Add new platform config
      newPlatforms.push({
        platform,
        projectId: parsedProjectId,
        sectionIds: [],
        labelIds: [],
        squadIds: [],
      });
    }

    // Create updated config with new platform configurations
    // Use the newPlatforms directly, not from config prop (which might be stale)
    const updatedConfig: CheckmateSettings = {
      type: 'checkmate',
      integrationId: selectedIntegrationId || config?.integrationId || '',
      projectId: 0, // No global projectId - platform-specific now
      platformConfigurations: newPlatforms, // Use the updated platforms
      autoCreateRuns: config?.autoCreateRuns ?? false,
      passThresholdPercent: config?.passThresholdPercent ?? 100,
      filterType: config?.filterType || 'AND',
    };
    
    // Update parent state
    onChange(updatedConfig);

    // Fetch metadata for the selected project
    if (parsedProjectId > 0) {
      fetchPlatformMetadata(platform, parsedProjectId);
    }
  };

  // Get or initialize platform config for a specific platform
  const getPlatformConfig = (platform: typeof PLATFORMS.ANDROID | typeof PLATFORMS.IOS): CheckmatePlatformConfiguration => {
    const platformConfigs = config?.platformConfigurations || [];
    const found = platformConfigs.find(pc => pc.platform === platform);
    if (found) {
      return found;
    }
    // Return default config if not found
    return {
      platform,
      projectId: undefined,
      sectionIds: [],
      labelIds: [],
      squadIds: [],
    };
  };

  // Get projects (shared by all platforms - same list for iOS and Android)
  const getPlatformProjects = (): CheckmateProject[] => {
    return projects;
  };

  // Get platform-specific metadata
  const getPlatformMetadata = (platform: string) => {
    return {
      sections: platformSections[platform] || sections,
      labels: platformLabels[platform] || labels,
      squads: platformSquads[platform] || squads,
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

  // Don't show form until projects are loaded
  if (selectedIntegrationId && (!projectsLoaded || isLoadingProjects)) {
    return (
      <Stack gap="md">
        <div className="flex items-center justify-center py-8">
          <Loader size="md" />
          <Text size="sm" c="dimmed" className="ml-3">
            Loading projects...
          </Text>
        </div>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {selectedIntegrationId && projectsLoaded && (
        <>
          {/* Platform Configurations - Project selection is now platform-specific */}
          <div className="mt-4">
            <div className="mb-3">
              <Text fw={600} size="sm">
                Platform Configurations
              </Text>
              <Text size="xs" c="dimmed">
                Configure test filters for each platform. Each platform can select its own project.
              </Text>
            </div>

            <Stack gap="md">
              {/* Map over platforms to avoid code duplication */}
              {[
                { platform: PLATFORMS.ANDROID, label: 'Android', color: 'green', hasTarget: hasAndroidTarget },
                { platform: PLATFORMS.IOS, label: 'iOS', color: 'blue', hasTarget: hasIOSTarget },
              ]
                .filter(({ hasTarget }) => hasTarget)
                .map(({ platform, label, color }) => {
                  const platformConfig = getPlatformConfig(platform);
                  const platformMetadata = getPlatformMetadata(platform);
                  const isLoadingMetadata = loadingMetadataForPlatform[platform];

                  return (
                    <Card key={platform} shadow="sm" padding="md" radius="md" withBorder>
                      <Group gap="xs" className="mb-3">
                        <Badge color={color} size="lg" variant="filled">
                          {label}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          Configure test selection for {label} builds
                        </Text>
                      </Group>

                      <Stack gap="sm">
                        {/* Project Selection (shared list for all platforms) */}
                        <Select
                          label="Checkmate Project"
                          placeholder={`Select project for ${label}`}
                          data={getPlatformProjects().map(p => ({ 
                            value: p.projectId.toString(), 
                            label: p.projectName 
                          }))}
                          value={platformConfig.projectId?.toString() || ''}
                          onChange={(val) => {
                            if (val) {
                              handlePlatformProjectChange(platform, val);
                            }
                          }}
                          required
                          description={`Select the Checkmate project for ${label} tests`}
                          searchable
                        />
                        
                        {/* Show general error only if it's not a metadata error (to avoid duplicates) */}
                        {error && !metadataErrorForPlatform[platform] && (
                          <Alert color="red" icon={<IconAlertCircle size={16} />}>
                            {error}
                          </Alert>
                        )}

                        {/* Metadata dropdowns - only show if project is selected and metadata loaded successfully */}
                        {platformConfig.projectId && (
                          <>
                            {loadingMetadataForPlatform[platform] ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader size="sm" />
                                <Text size="sm" c="dimmed" className="ml-2">
                                  Loading metadata...
                                </Text>
                              </div>
                            ) : metadataErrorForPlatform[platform] ? (
                              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                                <Text size="sm">
                                  Failed to load metadata for {label}. Please try selecting the project again.
                                </Text>
                              </Alert>
                            ) : (
                              <Stack gap="sm">
                                <MultiSelect
                                  label="Sections"
                                  placeholder={`Select sections for ${label}`}
                                  data={platformMetadata.sections.map(s => ({ 
                                    value: s.sectionId.toString(), 
                                    label: s.sectionName 
                                  }))}
                                  value={platformConfig.sectionIds?.map(id => id.toString()) || []}
                                  onChange={(val) =>
                                    handlePlatformConfigChange(
                                      platform,
                                      'sectionIds',
                                      val.map(v => parseInt(v, 10))
                                    )
                                  }
                                  searchable
                                  description="Filter tests by sections (optional)"
                                />

                                <MultiSelect
                                  label="Labels"
                                  placeholder={`Select labels for ${label}`}
                                  data={platformMetadata.labels.map(l => ({ 
                                    value: l.labelId.toString(), 
                                    label: l.labelName 
                                  }))}
                                  value={platformConfig.labelIds?.map(id => id.toString()) || []}
                                  onChange={(val) =>
                                    handlePlatformConfigChange(
                                      platform,
                                      'labelIds',
                                      val.map(v => parseInt(v, 10))
                                    )
                                  }
                                  searchable
                                  description="Filter tests by labels (optional)"
                                />

                                <MultiSelect
                                  label="Squads"
                                  placeholder={`Select squads for ${label}`}
                                  data={platformMetadata.squads.map(s => ({ 
                                    value: s.squadId.toString(), 
                                    label: s.squadName 
                                  }))}
                                  value={platformConfig.squadIds?.map(id => id.toString()) || []}
                                  onChange={(val) =>
                                    handlePlatformConfigChange(
                                      platform,
                                      'squadIds',
                                      val.map(v => parseInt(v, 10))
                                    )
                                  }
                                  searchable
                                  description="Filter tests by squads (optional)"
                                />
                              </Stack>
                            )}
                          </>
                        )}
                      </Stack>
                    </Card>
                  );
                })}
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
    </Stack>
  );
}

