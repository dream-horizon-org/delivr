/**
 * Pipeline Edit Modal Component
 * Modal for creating or editing build pipelines within a release config
 * Uses WorkflowCreateModal internally for creating new workflows
 */

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Modal, Button, Stack, Group, Alert, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import type { 
  Workflow, 
  BuildProvider, 
  Platform, 
  BuildEnvironment,
  JenkinsConfig,
  GitHubActionsConfig,
} from '~/types/release-config';
import type { PipelineEditModalProps } from '~/types/release-config-props';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';
import { WorkflowCreateModal } from '~/components/ReleaseSettings/WorkflowCreateModal';
import { PLATFORMS, BUILD_ENVIRONMENTS, BUILD_PROVIDERS, CONFIG_MODES } from '~/types/release-config-constants';
import {
  PLATFORM_LABELS,
  ENVIRONMENT_LABELS,
} from '~/constants/release-config-ui';
import { apiPost, apiGet, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { workflowTypeToEnvironment } from '~/types/workflow-mappings';
import { WorkflowModeSelector } from './WorkflowModeSelector';
import { ExistingWorkflowSelector } from './ExistingWorkflowSelector';
import { CreateNewWorkflowInfo } from './CreateNewWorkflowInfo';
import { NoIntegrationsAlert } from './NoIntegrationsAlert';

/**
 * Convert CICDWorkflow (backend) to Workflow (frontend config)
 */
const convertCICDWorkflowToWorkflow = (cicdWorkflow: CICDWorkflow, name?: string): Workflow => {
  const environment = workflowTypeToEnvironment[cicdWorkflow.workflowType] || BUILD_ENVIRONMENTS.PRE_REGRESSION;
  
  let providerConfig: JenkinsConfig | GitHubActionsConfig;
  
  if (cicdWorkflow.providerType === BUILD_PROVIDERS.JENKINS) {
    providerConfig = {
      type: BUILD_PROVIDERS.JENKINS,
      integrationId: cicdWorkflow.integrationId,
      jobUrl: cicdWorkflow.workflowUrl,
      parameters: (cicdWorkflow.parameters as Record<string, string>) || {},
    };
  } else {
    providerConfig = {
      type: BUILD_PROVIDERS.GITHUB_ACTIONS,
      integrationId: cicdWorkflow.integrationId,
      workflowUrl: cicdWorkflow.workflowUrl,
      inputs: ((cicdWorkflow.parameters as any)?.inputs || {}) as Record<string, string>,
    };
  }
  
  return {
    id: cicdWorkflow.id,
    name: name || cicdWorkflow.displayName,
    // Normalize platform to uppercase (backend may return lowercase)
    platform: (cicdWorkflow.platform?.toUpperCase() || PLATFORMS.ANDROID) as Platform,
    environment: environment,
    provider: cicdWorkflow.providerType as BuildProvider,
    providerConfig: providerConfig,
    enabled: true,
    timeout: 3600,
    retryAttempts: 3,
  };
};

function PipelineEditModalComponent({
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
  const [workflowCreateModalOpened, setWorkflowCreateModalOpened] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  // Use ref to prevent duplicate submissions (more reliable than state for race conditions)
  const isCreatingRef = useRef(false);
  
  // Filter workflows by platform and environment
  // System supports: PRE_REGRESSION, REGRESSION, TESTFLIGHT (iOS only), AAB_BUILD (Android)
  const relevantWorkflows = useMemo(() => {
    return workflows.filter(w => {
      const wfEnv = workflowTypeToEnvironment[w.workflowType];
      
      // Only include workflows with valid environments (exclude PRODUCTION)
      const validEnvironments: BuildEnvironment[] = [
        BUILD_ENVIRONMENTS.PRE_REGRESSION,
        BUILD_ENVIRONMENTS.REGRESSION,
        BUILD_ENVIRONMENTS.TESTFLIGHT,
        BUILD_ENVIRONMENTS.AAB_BUILD,
      ];
      if (!validEnvironments.includes(wfEnv as BuildEnvironment)) return false;
      
      // Normalize platform comparison (backend may return lowercase)
      if (fixedPlatform && w.platform?.toUpperCase() !== fixedPlatform.toUpperCase()) return false;
      if (fixedEnvironment) {
        if (wfEnv !== fixedEnvironment) return false;
      }
      return true;
    });
  }, [workflows, fixedPlatform, fixedEnvironment]);
  
  const selectedWorkflow = useMemo(
    () => relevantWorkflows.find(w => w.id === selectedWorkflowId),
    [relevantWorkflows, selectedWorkflowId]
  );
  
  // Determine available providers based on connected integrations
  const availableProviders: BuildProvider[] = useMemo(() => {
    const result: BuildProvider[] = [];
    if (availableIntegrations.jenkins.length > 0) result.push(BUILD_PROVIDERS.JENKINS);
    if (availableIntegrations.githubActions.length > 0) result.push(BUILD_PROVIDERS.GITHUB_ACTIONS);
    return result;
  }, [availableIntegrations]);
  

  // Reset form when modal opens/closes
  useEffect(() => {
    if (opened) {
      // If editing existing pipeline, check if it references a workflow
      if (pipeline) {
        // Try to find matching workflow
        const matchingWorkflow = workflows.find(w => {
          const wfEnv = workflowTypeToEnvironment[w.workflowType];
          // Normalize platform comparison (backend may return lowercase)
          return w.platform?.toUpperCase() === pipeline.platform?.toUpperCase() && 
                 wfEnv === pipeline.environment &&
                 w.providerType === pipeline.provider;
        });
        
        if (matchingWorkflow) {
          setConfigMode(CONFIG_MODES.EXISTING);
          setSelectedWorkflowId(matchingWorkflow.id);
        } else {
          setConfigMode(CONFIG_MODES.NEW);
          setSelectedWorkflowId(undefined);
        }
      } else {
        // New pipeline - default to existing if workflows available
        setConfigMode(relevantWorkflows.length > 0 ? CONFIG_MODES.EXISTING : CONFIG_MODES.NEW);
        setSelectedWorkflowId(undefined);
      }
      setWorkflowCreateModalOpened(false);
    } else {
      // Reset creation state when modal closes
      isCreatingRef.current = false;
      setIsCreatingWorkflow(false);
    }
  }, [opened, pipeline, relevantWorkflows.length, workflows, workflowTypeToEnvironment]);

  // Handle creating a new workflow via WorkflowCreateModal
  const handleCreateWorkflow = useCallback(async (workflowData: any) => {
    if (!tenantId) {
      return;
    }
    
    // Prevent double submission using ref (more reliable than state for race conditions)
    if (isCreatingRef.current) {
      return;
    }
    
    // Set both ref and state immediately to prevent race conditions
    isCreatingRef.current = true;
    setIsCreatingWorkflow(true);
    
    try {
      // Create workflow via API
      const result = await apiPost<{ success: boolean; error?: string; workflow?: CICDWorkflow }>(
        `/api/v1/tenants/${tenantId}/workflows`,
        workflowData
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow created successfully' });
        
        // The API doesn't return the workflow ID, so we need to fetch it
        // by matching the newly created workflow's properties
        let workflowId = result.data?.workflow?.id;
        
        if (!workflowId) {
          // Retry mechanism: The workflow might not be immediately available in the list
          // Try up to 3 times with increasing delays
          const maxRetries = 3;
          const retryDelays = [200, 500, 1000]; // ms
          
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              // Wait before fetching (except first attempt)
              if (attempt > 0) {
                await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
              }
              
              // Fetch workflows and find the one we just created
              const workflowsResult = await apiGet<{ workflows?: CICDWorkflow[] }>(
                `/api/v1/tenants/${tenantId}/workflows`
              );
              
              if (workflowsResult.success && workflowsResult.data?.workflows) {
                // Find the workflow by matching displayName, workflowUrl, and providerType
                const matchingWorkflow = workflowsResult.data.workflows.find((wf: CICDWorkflow) => 
                  wf.displayName === workflowData.displayName &&
                  wf.workflowUrl === workflowData.workflowUrl &&
                  wf.providerType === workflowData.providerType
                );
                
                if (matchingWorkflow) {
                  workflowId = matchingWorkflow.id;
                  break; // Found it, exit retry loop
                }
              }
            } catch (fetchError) {
              // Continue to next retry attempt
              if (attempt === maxRetries - 1) {
                // Last attempt failed
              }
            }
          }
        }
        
        // Ensure providerIdentifiers includes workflowFileName for GitHub Actions
        let providerIdentifiers = workflowData.providerIdentifiers || null;
        if (workflowData.providerType === BUILD_PROVIDERS.GITHUB_ACTIONS && workflowData.workflowUrl) {
          // Extract workflow file name from URL if not already present
          if (!providerIdentifiers?.workflowFileName) {
            const fileNameMatch = workflowData.workflowUrl.match(/\/([^/]+\.ya?ml)$/);
            if (fileNameMatch) {
              providerIdentifiers = {
                ...(providerIdentifiers || {}),
                workflowPath: workflowData.workflowUrl,
                workflowFileName: fileNameMatch[1],
              };
            } else {
              providerIdentifiers = {
                ...(providerIdentifiers || {}),
                workflowPath: workflowData.workflowUrl,
              };
            }
          }
        }
        
        // CRITICAL: We must have a workflow ID to prevent duplicate creation
        // If we couldn't fetch the ID after retries, show an error and don't proceed
        if (!workflowId) {
          showErrorToast({ 
            title: 'Error', 
            message: 'Workflow was created but we could not retrieve its ID. Please refresh the page and try adding it again, or contact support if the issue persists.' 
          });
          
          // Don't close modals - let user try again or manually add the workflow
          return;
        }
        
        const createdWorkflow: CICDWorkflow = {
          id: workflowId,
          tenantId,
          providerType: workflowData.providerType,
          integrationId: workflowData.integrationId,
          displayName: workflowData.displayName,
          workflowUrl: workflowData.workflowUrl,
          providerIdentifiers: providerIdentifiers,
          platform: workflowData.platform,
          workflowType: workflowData.workflowType,
          parameters: workflowData.parameters || null,
          createdAt: result.data?.workflow?.createdAt || "",
          updatedAt: result.data?.workflow?.updatedAt || "",
        };
        
        // Convert to Workflow and attach to pipeline config
        const workflowConfig = convertCICDWorkflowToWorkflow(createdWorkflow);
        
        // If we have fixed platform/environment, ensure they match
        if (fixedPlatform) {
          workflowConfig.platform = fixedPlatform;
        }
        if (fixedEnvironment) {
          workflowConfig.environment = fixedEnvironment;
        }
        
        // Save the pipeline config
        onSave(workflowConfig);
        setWorkflowCreateModalOpened(false);
        onClose();
      } else {
        showErrorToast({ 
          title: 'Error', 
          message: result.error || 'Failed to create workflow' 
        });
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to create workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    } finally {
      // Reset both ref and state
      isCreatingRef.current = false;
      setIsCreatingWorkflow(false);
    }
  }, [tenantId, fixedPlatform, fixedEnvironment, onSave, onClose]);

  // Handle selecting existing workflow
  const handleSelectExisting = useCallback(() => {
    if (!selectedWorkflow) return;
    
    // Convert CICDWorkflow to Workflow
    // This already sets the correct ID from the selected workflow
    const workflowConfig = convertCICDWorkflowToWorkflow(selectedWorkflow);
    
    // If we have fixed platform/environment, ensure they match
    if (fixedPlatform) {
      workflowConfig.platform = fixedPlatform;
    }
    if (fixedEnvironment) {
      workflowConfig.environment = fixedEnvironment;
    }
    
    // Don't preserve old pipeline ID - use the selected workflow's ID
    // This ensures the ID matches the actual workflow being used
    
    onSave(workflowConfig);
    onClose();
  }, [selectedWorkflow, fixedPlatform, fixedEnvironment, onSave, onClose]);

  const validate = useCallback((): boolean => {
    if (configMode === CONFIG_MODES.EXISTING) {
      if (!selectedWorkflowId) {
        return false;
      }
    }
    return true;
  }, [configMode, selectedWorkflowId]);

  const handleSave = useCallback(() => {
    if (configMode === CONFIG_MODES.EXISTING) {
      handleSelectExisting();
    } else {
      // Open WorkflowCreateModal
      setWorkflowCreateModalOpened(true);
    }
  }, [configMode, handleSelectExisting]);

  const handleConfigModeChange = useCallback((mode: typeof CONFIG_MODES[keyof typeof CONFIG_MODES]) => {
    setConfigMode(mode);
    setSelectedWorkflowId(undefined);
  }, []);

  const handleCloseWorkflowModal = useCallback(() => {
    setWorkflowCreateModalOpened(false);
  }, []);

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={isEditing ? 'Edit Pipeline' : 'Add Pipeline'}
        size="lg"
      >
        <Stack gap="md">
          {/* Show fixed platform/environment info */}
          {(fixedPlatform || fixedEnvironment) && (
            <Alert icon={<IconInfoCircle size={18} />} color="blue" variant="light">
              <Text size="sm">
                <strong>Category:</strong> {fixedPlatform && PLATFORM_LABELS[fixedPlatform]}{' '}
                {fixedEnvironment && ENVIRONMENT_LABELS[fixedEnvironment]}
              </Text>
            </Alert>
          )}
          
          {/* Configuration Mode Selection */}
          <WorkflowModeSelector
            configMode={configMode}
            onChange={handleConfigModeChange}
            existingWorkflowCount={relevantWorkflows.length}
          />
          
          {/* Existing Workflow Selection */}
          {configMode === CONFIG_MODES.EXISTING && (
            <ExistingWorkflowSelector
              workflows={relevantWorkflows}
              selectedWorkflowId={selectedWorkflowId}
              onSelect={setSelectedWorkflowId}
            />
          )}
          
          {/* Create New Mode - Info */}
          {configMode === CONFIG_MODES.NEW && <CreateNewWorkflowInfo />}
          
          {/* Show error if no CI/CD integrations are available */}
          {availableProviders.length === 0 && <NoIntegrationsAlert />}
          
          <Group justify="flex-end" className="mt-4">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={availableProviders.length === 0 || (configMode === CONFIG_MODES.EXISTING && !selectedWorkflowId)}
              loading={isCreatingWorkflow}
            >
              {configMode === CONFIG_MODES.EXISTING ? 'Attach Workflow' : 'Create New Workflow'}
            </Button>
          </Group>
        </Stack>
      </Modal>
      
      {/* Nested WorkflowCreateModal */}
      <WorkflowCreateModal
        opened={workflowCreateModalOpened}
        onClose={handleCloseWorkflowModal}
        onSave={handleCreateWorkflow}
        availableIntegrations={availableIntegrations}
        tenantId={tenantId || ''}
        workflows={workflows}
        existingWorkflow={null}
        fixedPlatform={fixedPlatform}
        fixedEnvironment={fixedEnvironment}
      />
    </>
  );
}

// Export the component directly (memo can be added later if needed for performance)
// Temporarily removing memo to fix HMR issues
export function PipelineEditModal(props: PipelineEditModalProps) {
  return <PipelineEditModalComponent {...props} />;
}
