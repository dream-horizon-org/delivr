/**
 * useConfigurationsActions Hook
 * Handles all action logic for configurations: archive, unarchive, delete, set default, export
 */

import { useState, useCallback } from 'react';
import { useNavigate } from '@remix-run/react';
import { CONFIG_STATUSES } from '~/types/release-config-constants';
import { CONFIG_STATUS } from '~/constants/release-config-ui';
import { RELEASE_CONFIG_OPERATION_TYPES } from '~/constants/release-config';
import type { ReleaseConfiguration } from '~/types/release-config';
import { apiDelete, apiPut, getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showInfoToast, showSuccessToast } from '~/utils/toast';
import { RELEASE_CONFIG_MESSAGES, getErrorMessage } from '~/constants/toast-messages';
import { extractApiErrorMessage } from '~/utils/api-error-utils';
import { exportConfig } from '~/utils/release-config-storage';
import { generateStorageKey } from '~/hooks/useDraftStorage';

interface UseConfigurationsActionsParams {
  org: string;
  configurations: ReleaseConfiguration[];
  invalidateReleaseConfigs: () => void;
  updateReleaseConfigInCache: (configId: string, updater: (config: ReleaseConfiguration) => ReleaseConfiguration) => void;
}

export function useConfigurationsActions({
  org,
  configurations,
  invalidateReleaseConfigs,
  updateReleaseConfigInCache,
}: UseConfigurationsActionsParams) {
  const navigate = useNavigate();

  // Modal states
  const [archiveModal, setArchiveModal] = useState<{ opened: boolean; configId: string | null }>({ 
    opened: false, 
    configId: null 
  });
  const [unarchiveModal, setUnarchiveModal] = useState<{ opened: boolean; configId: string | null }>({ 
    opened: false, 
    configId: null 
  });
  const [deleteModal, setDeleteModal] = useState<{ opened: boolean; configId: string | null }>({ 
    opened: false, 
    configId: null 
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Navigation handlers
  const handleCreate = useCallback(() => {
    navigate(`/dashboard/${org}/releases/configure`);
  }, [navigate, org]);
  
  const handleEdit = useCallback((config: ReleaseConfiguration) => {
    navigate(`/dashboard/${org}/releases/configure?edit=${config.id}`);
  }, [navigate, org]);
  
  const handleDuplicate = useCallback(async (config: ReleaseConfiguration) => {
    showInfoToast(RELEASE_CONFIG_MESSAGES.DUPLICATE_INFO);
  }, []);

  // Archive handlers
  const handleArchive = useCallback((configId: string) => {
    setArchiveModal({ opened: true, configId });
  }, []);

  const confirmArchive = useCallback(async () => {
    if (!archiveModal.configId) return;
    
    const config = configurations.find((c) => c.id === archiveModal.configId);
    const isDraft = config?.status === CONFIG_STATUSES.DRAFT;
    
    setIsProcessing(true);
    
    if (isDraft) {
      try {
        const draftKey = generateStorageKey('release-config', org);
        localStorage.removeItem(draftKey);
        invalidateReleaseConfigs();
        setArchiveModal({ opened: false, configId: null });
      } catch (error) {
        showErrorToast(RELEASE_CONFIG_MESSAGES.DELETE_DRAFT_ERROR);
      } finally {
        setIsProcessing(false);
      }
      return;
    }
    
    try {
      const archivePayload: any = {
        type: RELEASE_CONFIG_OPERATION_TYPES.ARCHIVE,
        isActive: false,
        status: CONFIG_STATUS.ARCHIVED,
      };
      
      if (config?.releaseSchedule?.id) {
        archivePayload.releaseSchedule = {
          id: config.releaseSchedule.id,
          isEnabled: false,
        };
      }
      
      const result = await apiPut<{ success: boolean; data?: any; error?: string }>(
        `/api/v1/apps/${org}/release-config/${archiveModal.configId}`,
        archivePayload
      );
      
      if (result.success) {
        invalidateReleaseConfigs();
        setArchiveModal({ opened: false, configId: null });
      } else {
        updateReleaseConfigInCache(archiveModal.configId, (config) => ({
          ...config,
          isActive: true,
          status: CONFIG_STATUS.ACTIVE,
        }));
        showErrorToast(getErrorMessage(
          extractApiErrorMessage(result.error, 'Unknown error'),
          RELEASE_CONFIG_MESSAGES.ARCHIVE_ERROR.title
        ));
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to archive configuration');
      showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.ARCHIVE_ERROR.title));
    } finally {
      setIsProcessing(false);
    }
  }, [archiveModal.configId, org, configurations, invalidateReleaseConfigs, updateReleaseConfigInCache]);

  // Unarchive handlers
  const handleUnarchive = useCallback((configId: string) => {
    setUnarchiveModal({ opened: true, configId });
  }, []);

  const confirmUnarchive = useCallback(async () => {
    if (!unarchiveModal.configId) return;
    
    setIsProcessing(true);
    
    try {
      const config = configurations.find((c) => c.id === unarchiveModal.configId);
      
      const unarchivePayload: any = {
        type: RELEASE_CONFIG_OPERATION_TYPES.UNARCHIVE,
        isActive: true,
        status: CONFIG_STATUS.ACTIVE,
      };
      
      if (config?.releaseSchedule?.id) {
        unarchivePayload.releaseSchedule = {
          id: config.releaseSchedule.id,
          isEnabled: true,
        };
      }
      
      const result = await apiPut<{ success: boolean; data?: any; error?: string }>(
        `/api/v1/apps/${org}/release-config/${unarchiveModal.configId}`,
        unarchivePayload
      );
      
      if (result.success) {
        invalidateReleaseConfigs();
        setUnarchiveModal({ opened: false, configId: null });
      } else {
        updateReleaseConfigInCache(unarchiveModal.configId, (config) => ({
          ...config,
          isActive: false,
          status: CONFIG_STATUS.ARCHIVED,
        }));
        showErrorToast(getErrorMessage(
          extractApiErrorMessage(result.error, 'Unknown error'),
          RELEASE_CONFIG_MESSAGES.UNARCHIVE_ERROR.title
        ));
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to unarchive configuration');
      showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.UNARCHIVE_ERROR.title));
    } finally {
      setIsProcessing(false);
    }
  }, [unarchiveModal.configId, org, configurations, invalidateReleaseConfigs, updateReleaseConfigInCache]);

  // Delete handlers
  const handleDelete = useCallback((configId: string) => {
    setDeleteModal({ opened: true, configId });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteModal.configId) return;
    
    const config = configurations.find((c) => c.id === deleteModal.configId);
    
    if (!config) {
      showErrorToast(RELEASE_CONFIG_MESSAGES.DELETE_ERROR);
      setDeleteModal({ opened: false, configId: null });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const result = await apiDelete<{ success: boolean; error?: string }>(
        `/api/v1/apps/${org}/release-config/${deleteModal.configId}`
      );
      
      if (result.success) {
        invalidateReleaseConfigs();
        setDeleteModal({ opened: false, configId: null });
      } else {
        const errorMessage = extractApiErrorMessage(result.error, 'Unknown error');
        const isForeignKeyError = 
          errorMessage.includes('foreign key constraint') ||
          errorMessage.includes('releaseConfigId') ||
          errorMessage.includes('Cannot delete or update a parent row');
        
        if (isForeignKeyError) {
          showErrorToast(RELEASE_CONFIG_MESSAGES.DELETE_IN_USE_ERROR);
        } else {
          showErrorToast(getErrorMessage(
            errorMessage,
            RELEASE_CONFIG_MESSAGES.DELETE_ERROR.title
          ));
        }
      }
    } catch (error) {
      const errorMessage = getApiErrorMessage(error, 'Failed to delete configuration');
      
      const isForeignKeyError = 
        errorMessage.includes('foreign key constraint') ||
        errorMessage.includes('releaseConfigId') ||
        errorMessage.includes('Cannot delete or update a parent row');
      
      if (isForeignKeyError) {
        showErrorToast(RELEASE_CONFIG_MESSAGES.DELETE_IN_USE_ERROR);
      } else {
        showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.DELETE_ERROR.title));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [deleteModal.configId, org, configurations, invalidateReleaseConfigs]);

  // Set default handler
  const handleSetDefault = useCallback(async (configId: string) => {
    try {
      const currentDefault = configurations.find((c) => c.isDefault && c.status !== CONFIG_STATUSES.DRAFT);
      const configToSetDefault = configurations.find((c) => c.id === configId);
      
      if (!configToSetDefault) {
        showErrorToast(getErrorMessage('Configuration not found', RELEASE_CONFIG_MESSAGES.SET_DEFAULT_ERROR.title));
        return;
      }
      
      if (currentDefault && currentDefault.id !== configId) {
        updateReleaseConfigInCache(currentDefault.id, (config) => ({
          ...config,
          isDefault: false,
        }));
      }
      updateReleaseConfigInCache(configId, (config) => ({
        ...config,
        isDefault: true,
      }));
      
      if (currentDefault && currentDefault.id !== configId) {
        const unsetResult = await apiPut(
          `/api/v1/apps/${org}/release-config/${currentDefault.id}`,
          { ...currentDefault, isDefault: false }
        );
        
        if (!unsetResult.success) {
          updateReleaseConfigInCache(currentDefault.id, (config) => ({
            ...config,
            isDefault: true,
          }));
          updateReleaseConfigInCache(configId, (config) => ({
            ...config,
            isDefault: false,
          }));
          showErrorToast(getErrorMessage(
            extractApiErrorMessage(unsetResult.error, 'Failed to unset previous default'),
            RELEASE_CONFIG_MESSAGES.SET_DEFAULT_ERROR.title
          ));
          return;
        }
      }
      
      const result = await apiPut(
        `/api/v1/apps/${org}/release-config/${configId}`,
        { ...configToSetDefault, isDefault: true }
      );
      
      if (result.success) {
        showSuccessToast(RELEASE_CONFIG_MESSAGES.SET_DEFAULT_SUCCESS);
        setTimeout(() => {
          invalidateReleaseConfigs();
        }, 100);
      } else {
        updateReleaseConfigInCache(configId, (config) => ({
          ...config,
          isDefault: false,
        }));
        if (currentDefault) {
          updateReleaseConfigInCache(currentDefault.id, (config) => ({
            ...config,
            isDefault: true,
          }));
        }
        showErrorToast(getErrorMessage(
          extractApiErrorMessage(result.error, 'Unknown error'),
          RELEASE_CONFIG_MESSAGES.SET_DEFAULT_ERROR.title
        ));
      }
    } catch (error) {
      const currentDefault = configurations.find((c) => c.isDefault && c.status !== 'DRAFT' && c.id !== configId);
      updateReleaseConfigInCache(configId, (config) => ({
        ...config,
        isDefault: false,
      }));
      if (currentDefault) {
        updateReleaseConfigInCache(currentDefault.id, (config) => ({
          ...config,
          isDefault: true,
        }));
      }
      
      const errorMessage = getApiErrorMessage(error, 'Failed to set as default');
      showErrorToast(getErrorMessage(errorMessage, RELEASE_CONFIG_MESSAGES.SET_DEFAULT_ERROR.title));
    }
  }, [org, configurations, invalidateReleaseConfigs, updateReleaseConfigInCache]);

  // Export handler
  const handleExport = useCallback((config: ReleaseConfiguration) => {
    const jsonString = exportConfig(config);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name.replace(/\s+/g, '-').toLowerCase()}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Modal close handlers
  const closeArchiveModal = useCallback(() => {
    if (!isProcessing) {
      setArchiveModal({ opened: false, configId: null });
    }
  }, [isProcessing]);

  const closeUnarchiveModal = useCallback(() => {
    if (!isProcessing) {
      setUnarchiveModal({ opened: false, configId: null });
    }
  }, [isProcessing]);

  const closeDeleteModal = useCallback(() => {
    if (!isProcessing) {
      setDeleteModal({ opened: false, configId: null });
    }
  }, [isProcessing]);

  return {
    // Navigation
    handleCreate,
    handleEdit,
    handleDuplicate,
    
    // Archive
    handleArchive,
    confirmArchive,
    archiveModal,
    closeArchiveModal,
    
    // Unarchive
    handleUnarchive,
    confirmUnarchive,
    unarchiveModal,
    closeUnarchiveModal,
    
    // Delete
    handleDelete,
    confirmDelete,
    deleteModal,
    closeDeleteModal,
    
    // Other actions
    handleSetDefault,
    handleExport,
    
    // State
    isProcessing,
  };
}

