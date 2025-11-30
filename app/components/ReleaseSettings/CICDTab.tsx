/**
 * CI/CD Tab Component
 * Displays CI/CD workflows
 */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { Loader as MantineLoader } from '@mantine/core';
import { WorkflowList } from '~/components/ReleaseSettings/WorkflowList';
import { apiGet, apiPost, apiDelete, getApiErrorMessage, apiPatch } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';
import { IntegrationCategory } from '~/types/integrations';
import { useConfig } from '~/contexts/ConfigContext';
import type { CICDWorkflow } from '~/.server/services/ReleaseManagement/integrations';

interface CICDTabProps {
  org: string;
}

export const CICDTab = memo(function CICDTab({ org }: CICDTabProps) {
  const { getConnectedIntegrations } = useConfig();
  const [workflows, setWorkflows] = useState<CICDWorkflow[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);

  // Get CI/CD integrations
  const cicdIntegrations = getConnectedIntegrations(IntegrationCategory.CI_CD);
  
  // Extract Jenkins and GitHub integrations
  const availableIntegrations = useMemo(() => ({
    jenkins: cicdIntegrations
      .filter(i => i.providerId.toLowerCase() === 'jenkins')
      .map(i => ({ id: i.id, name: i.name || 'Jenkins' })),
    githubActions: cicdIntegrations
      .filter(i => i.providerId.toLowerCase() === 'github_actions' || i.providerId.toLowerCase() === 'github')
      .map(i => ({ id: i.id, name: i.name || 'GitHub Actions' })),
  }), [cicdIntegrations]);

  // Fetch workflows
  const fetchWorkflows = useCallback(async () => {
    setLoadingWorkflows(true);
    try {
      const result = await apiGet<{ success: boolean; workflows?: CICDWorkflow[] }>(
        `/api/v1/tenants/${org}/workflows`
      );
      
      if (result.success && result.data?.workflows) {
        setWorkflows(result.data.workflows);
      }
    } catch (error) {
      console.error('[Settings] Failed to fetch workflows:', error);
    } finally {
      setLoadingWorkflows(false);
    }
  }, [org]);

  // Load workflows when component mounts
  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Handle workflow creation
  const handleCreateWorkflow = useCallback(async (workflowData: any) => {
    try {
      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/v1/tenants/${org}/workflows`,
        workflowData
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow created successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to create workflow' });
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to create workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  // Handle workflow update
  const handleUpdateWorkflow = useCallback(async (workflowId: string, workflowData: any) => {
    try {
      const result = await apiPatch<{ success: boolean; error?: string }>(
        `/api/v1/tenants/${org}/workflows/${workflowId}`,
        workflowData
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow updated successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to update workflow' });
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to update workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  // Handle workflow deletion
  const handleDeleteWorkflow = useCallback(async (workflowId: string) => {
    try {
      const result = await apiDelete<{ success: boolean; error?: string }>(
        `/api/v1/tenants/${org}/workflows/${workflowId}`
      );

      if (result.success) {
        showSuccessToast({ title: 'Success', message: 'Workflow deleted successfully' });
        await fetchWorkflows();
      } else {
        showErrorToast({ title: 'Error', message: result.data?.error || 'Failed to delete workflow' });
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to delete workflow');
      showErrorToast({ title: 'Error', message: errorMessage });
    }
  }, [org, fetchWorkflows]);

  if (loadingWorkflows) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <MantineLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <WorkflowList
        workflows={workflows}
        availableIntegrations={availableIntegrations}
        tenantId={org}
        onRefresh={fetchWorkflows}
        onCreate={handleCreateWorkflow}
        onUpdate={handleUpdateWorkflow}
        onDelete={handleDeleteWorkflow}
      />
    </div>
  );
});

