/**
 * useConfigurationsData Hook
 * Handles data processing for configurations: merging drafts and filtering
 */

import { useMemo } from 'react';
import { CONFIG_STATUSES } from '~/types/release-config-constants';
import { CONFIG_STATUS } from '~/constants/release-config-ui';
import type { ReleaseConfiguration } from '~/types/release-config';
import type { ConfigStatusFilter, ConfigTypeFilter } from '~/components/ReleaseSettings/ConfigurationsFilter';

interface UseConfigurationsDataParams {
  releaseConfigs: ReleaseConfiguration[];
  org: string;
  searchQuery: string;
  statusFilter: ConfigStatusFilter;
  typeFilter: ConfigTypeFilter;
}

export function useConfigurationsData({
  releaseConfigs,
  org,
  searchQuery,
  statusFilter,
  typeFilter,
}: UseConfigurationsDataParams) {
  // Merge backend configs with localStorage draft
  const configurations = useMemo(() => {
    // Load draft config from localStorage
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
          draftConfig.status = CONFIG_STATUSES.DRAFT;
          draftConfig.isActive = false;
          draftConfig.id = draftConfig.id || 'draft-temp-id';
        }
      } catch (error) {
        console.error('[useConfigurationsData] Failed to load draft config:', error);
      }
    }
    
    return draftConfig ? [draftConfig, ...releaseConfigs] : releaseConfigs;
  }, [releaseConfigs, org]);

  // Filter configurations
  const filteredConfigs = useMemo(() => {
    return configurations.filter((config) => {
      const matchesSearch =
        !searchQuery ||
        config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        config.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || 
        (statusFilter === CONFIG_STATUS.ACTIVE && config.isActive === true) ||
        (statusFilter === CONFIG_STATUS.ARCHIVED && config.isActive === false && config.status !== CONFIG_STATUSES.DRAFT);
      
      const matchesType = !typeFilter || config.releaseType === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [configurations, searchQuery, statusFilter, typeFilter]);

  // Count non-draft configurations
  const configCount = useMemo(() => {
    return configurations.filter((c) => c.status !== CONFIG_STATUSES.DRAFT).length;
  }, [configurations]);

  return {
    configurations,
    filteredConfigs,
    configCount,
  };
}

