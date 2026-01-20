/**
 * Fixed Workflow Categories Component
 * Shows fixed workflow categories based on selected platforms
 */

import { useState, useEffect } from 'react';
import { Stack, Card, Text, Button, Group, LoadingOverlay } from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { apiGet } from '~/utils/api-client';
import type { Workflow } from '~/types/release-config';
import type { FixedPipelineCategoriesProps, PipelineCategoryConfig } from '~/types/release-config-props';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { PipelineEditModal } from './PipelineEditModal';
import { ANDROID_PIPELINE_CATEGORIES, IOS_PIPELINE_CATEGORIES } from '~/constants/release-config';
import { PLATFORMS, BUILD_PROVIDERS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import {
  BUILD_UPLOAD_LABELS,
  STATUS_LABELS,
  BUTTON_LABELS,
  SECTION_TITLES,
  SECTION_DESCRIPTIONS,
  ERROR_MESSAGES,
  TARGET_PLATFORM_LABELS,
  BADGE_COLORS,
  ICON_SIZES,
  FIELD_LABELS,
} from '~/constants/release-config-ui';
import { getBuildProviderLabel } from '~/utils/ui-utils';
import { TargetBadge, AppBadge } from '~/components/Common/AppBadge';

export function FixedPipelineCategories({
  pipelines,
  onChange,
  availableIntegrations,
  selectedPlatforms,
  tenantId,
  showValidation = false,
}: FixedPipelineCategoriesProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PipelineCategoryConfig | null>(null);
  const [editingPipeline, setEditingPipeline] = useState<Workflow | undefined>();
  
  // Workflows state
  const [workflows, setWorkflows] = useState<CICDWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);

  // Determine which platforms are needed
  const needsAndroid = selectedPlatforms.includes(PLATFORMS.ANDROID);
  const needsIOS = selectedPlatforms.includes(PLATFORMS.IOS);
  
  console.log("pipelines", pipelines, "selectedPlatforms", selectedPlatforms, "needsAndroid", needsAndroid, "needsIOS", needsIOS);
  // Fetch workflows when component mounts
  useEffect(() => {
    if (tenantId) {
      fetchWorkflows();
    }
  }, [tenantId]);
  
  const fetchWorkflows = async () => {
    if (!tenantId) return;
    
    setLoadingWorkflows(true);
    
    try {
      const result = await apiGet<{ workflows: CICDWorkflow[] }>(
        `/api/v1/tenants/${tenantId}/workflows`
      );
      
      if (result.success && result.data?.workflows) {
        setWorkflows(result.data.workflows);
      }
    } catch (error) {
      // Silently fail - workflows may not be available
    } finally {
      setLoadingWorkflows(false);
    }
  };

  // Define all possible pipeline categories (imported from constants)
  const androidCategories = ANDROID_PIPELINE_CATEGORIES;
  const iosCategories = IOS_PIPELINE_CATEGORIES;

  // Get categories to show based on selected platforms
  const categoriesToShow = [
    ...(needsAndroid ? androidCategories : []),
    ...(needsIOS ? iosCategories : []),
  ];

  // Find pipeline for a category
  const getPipelineForCategory = (category: PipelineCategoryConfig): Workflow | undefined => {
    return pipelines.find(
      p => p.platform.toUpperCase() === category.platform.toUpperCase() && p.environment === category.environment
    );
  };

  // Check if all required pipelines are configured
  const getMissingRequired = (): string[] => {
    return categoriesToShow
      .filter(cat => cat.required)
      .filter(cat => !getPipelineForCategory(cat))
      .map(cat => cat.label);
  };

  const handleAddPipeline = (category: PipelineCategoryConfig) => {
    setEditingCategory(category);
    setEditingPipeline(undefined);
    setEditModalOpened(true);
  };

  const handleEditPipeline = (category: PipelineCategoryConfig, pipeline: Workflow) => {
    setEditingCategory(category);
    setEditingPipeline(pipeline);
    setEditModalOpened(true);
  };

  const handleDeletePipeline = (category: PipelineCategoryConfig, pipeline: Workflow) => {
    // Remove pipeline by matching platform and environment (more reliable than ID)
    onChange(pipelines.filter(p => 
      !(p.platform === category.platform && p.environment === category.environment)
    ));
  };

  const handleSavePipeline = (pipeline: Workflow) => {
    if (editingPipeline) {
      // Update existing - match by platform + environment (not ID, since ID changes when selecting different workflow)
      // Find the pipeline that matches the category we were editing
      const updatedPipelines = pipelines.map(p => {
        // Match by platform and environment to find the pipeline we're editing
        if (editingCategory && 
            p.platform === editingCategory.platform && 
            p.environment === editingCategory.environment) {
          return pipeline; // Replace with new workflow
        }
        return p;
      });
      onChange(updatedPipelines);
    } else {
      // Add new
      onChange([...pipelines, pipeline]);
    }
    setEditModalOpened(false);
    setEditingCategory(null);
    setEditingPipeline(undefined);
  };

  // Get provider display name

  const missingRequired = getMissingRequired();

  if (selectedPlatforms.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <Group gap="sm">
          <IconAlertCircle size={ICON_SIZES.MEDIUM} className="text-yellow-600" />
          <Text size="sm" c="orange" className="font-medium">
            {ERROR_MESSAGES.PLATFORM_NOT_SELECTED}
          </Text>
        </Group>
      </div>
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay visible={loadingWorkflows} />
      
      <Stack gap="md">
      {/* Header with validation status */}
      <div>
        {/* <Text fw={600} size="lg" className="mb-1">
          {SECTION_TITLES.CI_CD_WORKFLOWS}
        </Text>
        <Text size="sm" c="dimmed" className="mb-3">
          {SECTION_DESCRIPTIONS.CI_CD_WORKFLOWS}
        </Text> */}
        
        <Group gap="sm" className="mb-4">
          <AppBadge
            type="target"
            value="PLAY_STORE"
            title={`${needsAndroid ? '✓ ' : ''}${TARGET_PLATFORM_LABELS.PLAY_STORE}: ${androidCategories.length} pipelines`}
            size="sm"
            color={needsAndroid ? 'blue' : 'gray'}
          />
          <AppBadge
            type="target"
            value="APP_STORE"
            title={`${needsIOS ? '✓ ' : ''}${TARGET_PLATFORM_LABELS.APP_STORE}: ${iosCategories.length} pipelines`}
            size="sm"
            color={needsIOS ? 'blue' : 'gray'}
          />
        </Group>

        {showValidation && missingRequired.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Group gap="sm">
              <IconAlertCircle size={18} className="text-red-600" />
              <div>
                <Text size="sm" fw={600} c="red">
                  {ERROR_MESSAGES.REQUIRED_PIPELINES_MISSING}
                </Text>
                <Text size="sm" c="red">
                  {missingRequired.join(', ')}
                </Text>
              </div>
            </Group>
          </div>
        )}
      </div>

      {/* Pipeline Categories */}
      <Stack gap="md">
        {categoriesToShow.map(category => {
          const pipeline = getPipelineForCategory(category);
          console.log("pipeline", pipeline, "category", category);
          const isConfigured = !!pipeline;

          return (
            <Card
              key={category.id}
              shadow="sm"
              padding="lg"
              radius="md"
              withBorder
              className={!isConfigured && category.required ? 'border-red-300' : ''}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Group gap="sm" className="mb-2">
                    <Text fw={600} size="md">
                      {category.label}
                    </Text>
                    {category.environment === BUILD_ENVIRONMENTS.AAB_BUILD && (
                      <AppBadge
                        type="status"
                        value="neutral"
                        title=".aab"
                        size="sm"
                        variant="outline"
                      />
                    )}
                    {category.required && (
                      <AppBadge
                        type="status"
                        value="error"
                        title={STATUS_LABELS.REQUIRED}
                        size="sm"
                      />
                    )}
                    {isConfigured && (
                      <AppBadge
                        type="status"
                        value="success"
                        title={STATUS_LABELS.CONFIGURED}
                        size="sm"
                        leftSection={<IconCheck size={12} />}
                      />
                    )}
                  </Group>
                  
                  <Text size="sm" c="dimmed" className="mb-3">
                    {category.description}
                  </Text>

                  {isConfigured && pipeline ? (
                    <div className="bg-gray-50 rounded p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <Text size="xs" c="dimmed">{FIELD_LABELS.NAME}</Text>
                          <Text size="sm" fw={500}>{pipeline.name}</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">{FIELD_LABELS.PROVIDER}</Text>
                          <Text size="sm" fw={500}>
                            {getBuildProviderLabel(pipeline.provider)}
                          </Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">{FIELD_LABELS.STATUS}</Text>
                          <AppBadge
                            type="status"
                            value={pipeline.enabled ? 'success' : 'neutral'}
                            title={pipeline.enabled ? STATUS_LABELS.ENABLED : STATUS_LABELS.DISABLED}
                            size="sm"
                          />
                        </div>
                        {pipeline.provider === BUILD_PROVIDERS.JENKINS && (
                          <div>
                            <Text size="xs" c="dimmed">{FIELD_LABELS.INTEGRATION}</Text>
                            <Text size="sm" fw={500}>
                              {availableIntegrations.jenkins.find(
                                j => j.id === (pipeline.providerConfig as any).integrationId
                              )?.name || 'Unknown'}
                            </Text>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  {isConfigured && pipeline ? (
                    <Group gap="xs">
                      <Button
                        size="sm"
                        variant="light"
                        onClick={() => handleEditPipeline(category, pipeline)}
                        title={BUTTON_LABELS.EDIT}
                      >
                        <IconPencil size={ICON_SIZES.SMALL} />
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => handleDeletePipeline(category, pipeline)}
                        title={category.required ? 'Remove workflow (will show as missing)' : 'Remove workflow'}
                      >
                        <IconTrash size={ICON_SIZES.SMALL} />
                      </Button>
                    </Group>
                  ) : (
                    <Button
                      size="sm"
                      variant="filled"
                      leftSection={<IconPlus size={ICON_SIZES.SMALL} />}
                      onClick={() => handleAddPipeline(category)}
                      className={category.required ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      {BUTTON_LABELS.ADD_PIPELINE}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </Stack>

      {/* Edit Modal */}
      <PipelineEditModal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setEditingCategory(null);
          setEditingPipeline(undefined);
        }}
        onSave={handleSavePipeline}
        pipeline={editingPipeline}
        availableIntegrations={availableIntegrations}
        existingPipelines={pipelines}
        fixedPlatform={editingCategory?.platform}
        fixedEnvironment={editingCategory?.environment}
        workflows={workflows}
        tenantId={tenantId}
      />
      </Stack>
    </div>
  );
}
