/**
 * Fixed Workflow Categories Component
 * Shows fixed workflow categories based on selected platforms
 */

import { useState, useEffect } from 'react';
import { Stack, Card, Text, Button, Badge, Group, LoadingOverlay } from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import type { Workflow, Platform } from '~/types/release-config';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { PipelineEditModal } from './PipelineEditModal';
import { ANDROID_PIPELINE_CATEGORIES, IOS_PIPELINE_CATEGORIES } from '../release-config-constants';

interface FixedPipelineCategoriesProps {
  pipelines: Workflow[];
  onChange: (pipelines: Workflow[]) => void;
  availableIntegrations: {
    jenkins: Array<{ id: string; name: string }>;
    github: Array<{ id: string; name: string }>;
  };
  selectedPlatforms: Platform[]; // ✅ Workflows are platform-specific (ANDROID/IOS), not target-specific
  tenantId: string;
}

interface PipelineCategory {
  id: string;
  platform: 'ANDROID' | 'IOS';
  environment: 'PRE_REGRESSION' | 'REGRESSION' | 'TESTFLIGHT';
  label: string;
  description: string;
  required: boolean;
}

export function FixedPipelineCategories({
  pipelines,
  onChange,
  availableIntegrations,
  selectedPlatforms,
  tenantId,
}: FixedPipelineCategoriesProps) {
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [editingCategory, setEditingCategory] = useState<PipelineCategory | null>(null);
  const [editingPipeline, setEditingPipeline] = useState<Workflow | undefined>();
  
  // Workflows state
  const [workflows, setWorkflows] = useState<CICDWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);

  // Determine which platforms are needed
  const needsAndroid = selectedPlatforms.includes('ANDROID');
  const needsIOS = selectedPlatforms.includes('IOS');
  
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
      const response = await fetch(`/api/v1/tenants/${tenantId}/workflows`);
      const result = await response.json();
      
      if (result.success && result.workflows) {
        setWorkflows(result.workflows);
      } else {
        console.error('Failed to fetch workflows:', result.error);
      }
    } catch (error) {
      console.error('Error fetching workflows:', error);
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
  const getPipelineForCategory = (category: PipelineCategory): Workflow | undefined => {
    return pipelines.find(
      p => p.platform === category.platform && p.environment === category.environment
    );
  };

  // Check if all required pipelines are configured
  const getMissingRequired = (): string[] => {
    return categoriesToShow
      .filter(cat => cat.required)
      .filter(cat => !getPipelineForCategory(cat))
      .map(cat => cat.label);
  };

  const handleAddPipeline = (category: PipelineCategory) => {
    setEditingCategory(category);
    setEditingPipeline(undefined);
    setEditModalOpened(true);
  };

  const handleEditPipeline = (category: PipelineCategory, pipeline: Workflow) => {
    setEditingCategory(category);
    setEditingPipeline(pipeline);
    setEditModalOpened(true);
  };

  const handleDeletePipeline = (pipeline: Workflow) => {
    onChange(pipelines.filter(p => p.id !== pipeline.id));
  };

  const handleSavePipeline = (pipeline: Workflow) => {
    if (editingPipeline) {
      // Update existing
      onChange(pipelines.map(p => (p.id === pipeline.id ? pipeline : p)));
    } else {
      // Add new
      onChange([...pipelines, pipeline]);
    }
    setEditModalOpened(false);
    setEditingCategory(null);
    setEditingPipeline(undefined);
  };

  const missingRequired = getMissingRequired();

  if (selectedPlatforms.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <Group gap="sm">
          <IconAlertCircle size={20} className="text-yellow-600" />
          <Text size="sm" c="orange" className="font-medium">
            Please select platforms first (previous step) to configure CI/CD workflows.
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
        <Text fw={600} size="lg" className="mb-1">
          CI/CD Workflows
        </Text>
        <Text size="sm" c="dimmed" className="mb-3">
          Configure automated CI/CD workflows for your selected platforms
        </Text>
        
        <Group gap="sm" className="mb-4">
          <Badge color={needsAndroid ? 'blue' : 'gray'} variant="light">
            {needsAndroid ? '✓ Play Store' : 'Play Store'}: {androidCategories.length} pipelines
          </Badge>
          <Badge color={needsIOS ? 'blue' : 'gray'} variant="light">
            {needsIOS ? '✓ App Store' : 'App Store'}: {iosCategories.length} pipelines
          </Badge>
        </Group>

        {missingRequired.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <Group gap="sm">
              <IconAlertCircle size={18} className="text-red-600" />
              <div>
                <Text size="sm" fw={600} c="red">
                  Required pipelines missing:
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
                    {category.required && (
                      <Badge color="red" size="sm" variant="light">
                        Required
                      </Badge>
                    )}
                    {isConfigured && (
                      <Badge color="green" size="sm" variant="light">
                        <IconCheck size={12} className="mr-1" />
                        Configured
                      </Badge>
                    )}
                  </Group>
                  
                  <Text size="sm" c="dimmed" className="mb-3">
                    {category.description}
                  </Text>

                  {isConfigured && pipeline ? (
                    <div className="bg-gray-50 rounded p-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <Text size="xs" c="dimmed">Name</Text>
                          <Text size="sm" fw={500}>{pipeline.name}</Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">Provider</Text>
                          <Text size="sm" fw={500}>
                            {pipeline.provider === 'JENKINS' ? 'Jenkins' : 
                             pipeline.provider === 'GITHUB_ACTIONS' ? 'GitHub Actions' : 
                             'Manual Upload'}
                          </Text>
                        </div>
                        <div>
                          <Text size="xs" c="dimmed">Status</Text>
                          <Badge color={pipeline.enabled ? 'green' : 'gray'} size="sm">
                            {pipeline.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        {pipeline.provider === 'JENKINS' && (
                          <div>
                            <Text size="xs" c="dimmed">Integration</Text>
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
                        leftSection={<IconPencil size={16} />}
                        onClick={() => handleEditPipeline(category, pipeline)}
                      >
                        Edit
                      </Button>
                      {!category.required && (
                        <Button
                          size="sm"
                          variant="light"
                          color="red"
                          leftSection={<IconTrash size={16} />}
                          onClick={() => handleDeletePipeline(pipeline)}
                        >
                          Remove
                        </Button>
                      )}
                    </Group>
                  ) : (
                    <Button
                      size="sm"
                      variant="filled"
                      leftSection={<IconPlus size={16} />}
                      onClick={() => handleAddPipeline(category)}
                      className={category.required ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                      Add Pipeline
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

