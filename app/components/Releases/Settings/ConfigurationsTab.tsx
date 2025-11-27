/**
 * Configurations Tab Component
 * Displays release configurations with stats
 */

import { memo, useMemo, useCallback } from 'react';
import { Container } from '@mantine/core';
import { useNavigate } from '@remix-run/react';
import { ConfigurationList } from '~/components/ReleaseConfig/Settings/ConfigurationList';
import { apiDelete, apiPut, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast, showInfoToast } from '~/utils/toast';
import { RELEASE_CONFIG_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import type { ReleaseConfiguration } from '~/types/release-config';

interface ConfigurationsTabProps {
  org: string;
  releaseConfigs: ReleaseConfiguration[];
  invalidateReleaseConfigs: () => void;
}

export const ConfigurationsTab = memo(function ConfigurationsTab({
  org,
  releaseConfigs,
  invalidateReleaseConfigs,
}: ConfigurationsTabProps) {
  const navigate = useNavigate();

  // Merge backend configs with localStorage draft
  const configurations = useMemo(() => {
    const backendConfigs = releaseConfigs;
    
    // Load draft config from localStorage
    // Only consider it a valid draft if user has progressed past step 0
    const draftKey = `delivr_release_config_draft_${org}`;
    const stepKey = `delivr_release_config_wizard_step_${org}`;
    let draftConfig = null;
    
    if (typeof window !== 'undefined') {
      try {
        const draftData = localStorage.getItem(draftKey);
        const savedStep = localStorage.getItem(stepKey);
        const currentStep = savedStep ? parseInt(savedStep, 10) : 0;
        
        // Only show draft if user has clicked "Next" at least once (step > 0)
        if (draftData && currentStep > 0) {
          draftConfig = JSON.parse(draftData);
          // Mark as draft and ensure it has required fields
          draftConfig.status = 'DRAFT';
          draftConfig.isActive = false; // Draft is not active
          draftConfig.id = draftConfig.id || 'draft-temp-id';
          console.log('[Settings] Loaded draft config at step:', currentStep);
        } else if (draftData && currentStep === 0) {
          console.log('[Settings] Draft exists but user is still on step 0, not showing as draft');
        }
      } catch (error) {
        console.error('[Settings] Failed to load draft config:', error);
      }
    }
    
    // Merge draft with backend configs
    return draftConfig ? [draftConfig, ...backendConfigs] : backendConfigs;
  }, [releaseConfigs, org]);
  
  // Calculate stats from merged configs (backend + localStorage draft)
  // Backend configs use isActive: true (ACTIVE) or false (ARCHIVED)
  // Draft configs have status: 'DRAFT'
  const stats = useMemo(() => ({
    total: configurations.length,
    active: configurations.filter((c: any) => c.isActive === true).length,
    draft: configurations.filter((c: any) => c.status === 'DRAFT').length,
    archived: configurations.filter((c: any) => c.isActive === false && c.status !== 'DRAFT').length,
  }), [configurations]);

  // Configuration handlers
  const handleCreate = useCallback(() => {
    navigate(`/dashboard/${org}/releases/configure`);
  }, [navigate, org]);
  
  const handleEdit = useCallback((config: ReleaseConfiguration) => {
    console.log('[Settings] Edit config:', config.id);
    navigate(`/dashboard/${org}/releases/configure?edit=${config.id}`);
  }, [navigate, org]);
  
  const handleDuplicate = useCallback(async (config: ReleaseConfiguration) => {
    console.log('[Settings] Duplicate config:', config.id);
    // TODO: Implement duplicate via API
    showInfoToast(RELEASE_CONFIG_MESSAGES.DUPLICATE_INFO);
  }, []);
  
  const handleArchive = useCallback(async (configId: string) => {
    // Check if it's a draft config (localStorage)
    const config = configurations.find((c: any) => c.id === configId);
    const isDraft = config?.status === 'DRAFT';
    
    const confirmMessage = isDraft 
      ? 'Are you sure you want to delete this draft configuration?' 
      : 'Are you sure you want to archive this configuration?';
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    // Handle draft deletion (localStorage)
    if (isDraft) {
      try {
        const draftKey = `delivr_release_config_draft_${org}`;
        localStorage.removeItem(draftKey);
        console.log('[Settings] Draft deleted from localStorage');
        
        // Force re-render by invalidating cache
        invalidateReleaseConfigs();
      } catch (error) {
        console.error('[Settings] Failed to delete draft:', error);
        showErrorToast(RELEASE_CONFIG_MESSAGES.DELETE_DRAFT_ERROR);
      }
      return;
    }
    
    // Handle backend config archival
    console.log('[Settings] Archive config:', configId);
    
    try {
      const result = await apiDelete<{ message?: string }>(
        `/api/v1/tenants/${org}/release-config/${configId}`
      );
      
      if (result.success) {
        // ✅ Invalidate cache to refresh all routes
        invalidateReleaseConfigs();
        console.log('[Settings] Configuration archived, cache invalidated');
        showSuccessToast(RELEASE_CONFIG_MESSAGES.ARCHIVE_SUCCESS);
      } else {
        showErrorToast(getErrorMessage(
          result.error || 'Unknown error',
          RELEASE_CONFIG_MESSAGES.ARCHIVE_ERROR.title
        ));
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to archive configuration');
      console.error('[Settings] Archive failed:', errorMessage);
      showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.ARCHIVE_ERROR.title));
    }
  }, [org, configurations, invalidateReleaseConfigs]);
  
  const handleSetDefault = useCallback(async (configId: string) => {
    console.log('[Settings] Set default config:', configId);
    
    try {
      const result = await apiPut<{ success: boolean; error?: string }>(
        `/api/v1/tenants/${org}/release-config/${configId}`,
        {
          isDefault: true,
        }
      );
      
      if (result.data?.success) {
        // ✅ Invalidate cache to refresh all routes
        invalidateReleaseConfigs();
        console.log('[Settings] Default configuration set, cache invalidated');
        showSuccessToast(RELEASE_CONFIG_MESSAGES.SET_DEFAULT_SUCCESS);
      } else {
        showErrorToast(getErrorMessage(
          result.data?.error || 'Unknown error',
          RELEASE_CONFIG_MESSAGES.SET_DEFAULT_ERROR.title
        ));
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to set as default');
      console.error('[Settings] Set default failed:', errorMessage);
      showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.SET_DEFAULT_ERROR.title));
    }
  }, [org, invalidateReleaseConfigs]);

  return (
    <Container size="xl" className="p-0">
      {stats && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
              <div className="text-sm text-gray-600">Draft</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
              <div className="text-sm text-gray-600">Archived</div>
            </div>
          </div>
        </div>
      )}
      
      <ConfigurationList
        configurations={configurations}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onArchive={onArchive}
        onSetDefault={onSetDefault}
        onCreate={onCreate}
      />
    </Container>
  );
});

