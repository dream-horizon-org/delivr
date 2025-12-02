/**
 * Configurations Tab Component
 * Displays release configurations with stats
 */

import { memo, useMemo, useCallback, useState } from 'react';
import { Container } from '@mantine/core';
import { useNavigate } from '@remix-run/react';
import { ConfigurationList } from '~/components/ReleaseSettings/ConfigurationList';
import { ConfigurationStats } from './ConfigurationStats';
import { apiDelete, apiPut, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast, showInfoToast } from '~/utils/toast';
import { RELEASE_CONFIG_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import type { ReleaseConfiguration } from '~/types/release-config';
import { generateStorageKey } from '~/hooks/useDraftStorage';
import { useConfig } from '~/contexts/ConfigContext';

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
  const { updateReleaseConfigInCache } = useConfig(); // ✅ For optimistic updates
  
  // State to trigger re-render when localStorage draft changes
  const [draftVersion, setDraftVersion] = useState(0);

  // Merge backend configs with localStorage draft
  const configurations = useMemo(() => {
    const backendConfigs = releaseConfigs;
    
    // One-time migration: Clean up old localStorage keys (if they exist)
    if (typeof window !== 'undefined') {
      try {
        const oldDraftKey = `delivr_release_config_draft_${org}`;
        const oldStepKey = `delivr_release_config_wizard_step_${org}`;
        if (localStorage.getItem(oldDraftKey) || localStorage.getItem(oldStepKey)) {
          console.log('[Settings] Cleaning up old localStorage keys from previous version');
          localStorage.removeItem(oldDraftKey);
          localStorage.removeItem(oldStepKey);
        }
      } catch (error) {
        console.error('[Settings] Failed to clean up old keys:', error);
      }
    }
    
    // Load draft config from localStorage using same key as wizard
    // Uses generateStorageKey for consistency with ConfigurationWizard and useDraftStorage
    const draftKey = generateStorageKey('release-config', org);
    let draftConfig = null;
    
    if (typeof window !== 'undefined') {
      try {
        const draftData = localStorage.getItem(draftKey);
        
        if (draftData) {
          // Parse the draft metadata structure used by useDraftStorage
          const draft = JSON.parse(draftData);
          const configData = draft.data || draft; // Support both hook format and legacy format
          const metadata = draft.metadata || {};
          const currentStep = metadata.wizardStep || 0; // Use wizardStep (matches ConfigurationWizard)
          
          // Only show draft if user has progressed past step 0
          // Step > 0 means user clicked "Next" at least once, indicating real progress
          if (currentStep > 0) {
            draftConfig = configData;
            // Mark as draft and ensure it has required fields
            draftConfig.status = 'DRAFT';
            draftConfig.isActive = false; // Draft is not active
            draftConfig.id = draftConfig.id || 'draft-temp-id';
          }
        }
      } catch (error) {
        console.error('[Settings] Failed to load draft config:', error);
      }
    }
    
    // Merge draft with backend configs
    return draftConfig ? [draftConfig, ...backendConfigs] : backendConfigs;
  }, [releaseConfigs, org, draftVersion]); // ✅ Re-run when draftVersion changes (after draft deletion)
  
  // Calculate stats from configs (backend only, drafts not counted in stats)
  // Backend configs use isActive: true (ACTIVE) or false (ARCHIVED)
  const stats = useMemo(() => ({
    total: configurations.filter((c: any) => c.status !== 'DRAFT').length,
    active: configurations.filter((c: any) => c.isActive === true).length,
    archived: configurations.filter((c: any) => c.isActive === false && c.status !== 'DRAFT').length,
  }), [configurations]);

  // Configuration handlers
  const handleCreate = useCallback(() => {
    navigate(`/dashboard/${org}/releases/configure`);
  }, [navigate, org]);
  
  const handleEdit = useCallback((config: ReleaseConfiguration) => {
    // If it's a draft (from localStorage), don't pass edit param
    // The wizard will automatically load it from localStorage
    const isDraft = config.status === 'DRAFT' || config.id === 'draft-temp-id' || config.id.startsWith('draft-');
    
    if (isDraft) {
      // Navigate without edit param - wizard will load from localStorage
      navigate(`/dashboard/${org}/releases/configure`);
    } else {
      // Backend config - use edit parameter to fetch from API
      navigate(`/dashboard/${org}/releases/configure?edit=${config.id}`);
    }
  }, [navigate, org]);
  
  const handleDuplicate = useCallback(async (config: ReleaseConfiguration) => {
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
        const draftKey = generateStorageKey('release-config', org);
        localStorage.removeItem(draftKey);
        
        // ✅ Trigger re-render by updating draftVersion
        setDraftVersion((prev: number) => prev + 1);
        
        showSuccessToast({ 
          title: 'Draft Deleted', 
          message: 'Draft configuration has been deleted successfully' 
        });
      } catch (error) {
        console.error('[Settings] Failed to delete draft:', error);
        showErrorToast(RELEASE_CONFIG_MESSAGES.DELETE_DRAFT_ERROR);
      }
      return;
    }
    
    // Handle backend config archival (soft delete by setting isActive: false)
    try {
      // ✅ Optimistic update: Update UI immediately before API call
      updateReleaseConfigInCache(configId, (config) => ({
        ...config,
        isActive: false,
      }));
      
      // Use PUT to update isActive flag instead of DELETE (soft delete)
      const result = await apiPut<ReleaseConfiguration>(
        `/api/v1/tenants/${org}/release-config/${configId}`,
        {
          isActive: false, // Archive by setting isActive to false
        }
      );
      
      if (result.success) {
        // ⚠️ KNOWN ISSUE: Backend list endpoint doesn't return archived configs even with ?includeArchived=true
        // So we DON'T invalidate cache here - we keep the optimistic update
        // The optimistic update already set isActive=false in the cache, which is correct
        showSuccessToast(RELEASE_CONFIG_MESSAGES.ARCHIVE_SUCCESS);
      } else {
        // ❌ Rollback optimistic update on failure
        updateReleaseConfigInCache(configId, (config) => ({
          ...config,
          isActive: true,
        }));
        showErrorToast(getErrorMessage(
          result.error || 'Unknown error',
          RELEASE_CONFIG_MESSAGES.ARCHIVE_ERROR.title
        ));
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to archive configuration');
      console.error('[Settings] Archive failed:', errorMessage);
      // ❌ Rollback optimistic update on error
      updateReleaseConfigInCache(configId, (config) => ({
        ...config,
        isActive: true,
      }));
      showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.ARCHIVE_ERROR.title));
    }
  }, [org, configurations, invalidateReleaseConfigs, updateReleaseConfigInCache]);
  
  const handleSetDefault = useCallback(async (configId: string) => {
    console.log('[Settings] Set default config:', configId);
    
    try {
      const result = await apiPut<{ success: boolean; error?: string }>(
        `/api/v1/tenants/${org}/release-config/${configId}`,
        {
          isDefault: true,
        }
      );
      if (result.success) {
        // ✅ Invalidate cache to refresh all routes
        invalidateReleaseConfigs();
        console.log('[Settings] Default configuration set, cache invalidated');
        showSuccessToast(RELEASE_CONFIG_MESSAGES.SET_DEFAULT_SUCCESS);
      } else {
        showErrorToast(getErrorMessage(
          result.error || 'Unknown error',
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
      {stats && <ConfigurationStats stats={stats} />}
      
      <ConfigurationList
        configurations={configurations}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onSetDefault={handleSetDefault}
        onCreate={handleCreate}
      />
    </Container>
  );
});

