/**
 * Local Storage Utility for Release Configuration
 * Manages persistence of draft configurations until final submission
 */

import type { ReleaseConfiguration } from '~/types/release-config';

const CONFIG_STORAGE_KEY = 'delivr_release_config_draft';
const CONFIG_LIST_KEY = 'delivr_release_configs';

// ============================================================================
// Draft Configuration Management (Local Storage)
// ============================================================================

/**
 * Save draft configuration to local storage
 */
export function saveDraftConfig(
  organizationId: string,
  config: Partial<ReleaseConfiguration>
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${CONFIG_STORAGE_KEY}_${organizationId}`;
    const data = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save draft config:', error);
  }
}

/**
 * Load draft configuration from local storage
 */
export function loadDraftConfig(
  organizationId: string
): Partial<ReleaseConfiguration> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `${CONFIG_STORAGE_KEY}_${organizationId}`;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load draft config:', error);
    return null;
  }
}

/**
 * Clear draft configuration from local storage
 */
export function clearDraftConfig(organizationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${CONFIG_STORAGE_KEY}_${organizationId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear draft config:', error);
  }
}

/**
 * Check if draft configuration exists
 */
export function hasDraftConfig(organizationId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const key = `${CONFIG_STORAGE_KEY}_${organizationId}`;
    return localStorage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// Configuration List Management (for multiple configs per org)
// ============================================================================

export interface ConfigListItem {
  id: string;
  name: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'EMERGENCY';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

/**
 * Save configuration list
 */
export function saveConfigList(
  organizationId: string,
  configs: ConfigListItem[]
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${CONFIG_LIST_KEY}_${organizationId}`;
    localStorage.setItem(key, JSON.stringify(configs));
  } catch (error) {
    console.error('Failed to save config list:', error);
  }
}

/**
 * Load configuration list
 */
export function loadConfigList(organizationId: string): ConfigListItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const key = `${CONFIG_LIST_KEY}_${organizationId}`;
    const data = localStorage.getItem(key);
    
    if (!data) return [];
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load config list:', error);
    return [];
  }
}

/**
 * Add configuration to list
 */
export function addConfigToList(
  organizationId: string,
  config: ConfigListItem
): void {
  const configs = loadConfigList(organizationId);
  configs.push(config);
  saveConfigList(organizationId, configs);
}

/**
 * Update configuration in list
 */
export function updateConfigInList(
  organizationId: string,
  configId: string,
  updates: Partial<ConfigListItem>
): void {
  const configs = loadConfigList(organizationId);
  const index = configs.findIndex(c => c.id === configId);
  
  if (index !== -1) {
    configs[index] = { ...configs[index], ...updates };
    saveConfigList(organizationId, configs);
  }
}

/**
 * Remove configuration from list
 */
export function removeConfigFromList(
  organizationId: string,
  configId: string
): void {
  const configs = loadConfigList(organizationId);
  const filtered = configs.filter(c => c.id !== configId);
  saveConfigList(organizationId, filtered);
}

/**
 * Get default configuration from list
 */
export function getDefaultConfigFromList(
  organizationId: string
): ConfigListItem | null {
  const configs = loadConfigList(organizationId);
  return configs.find(c => c.isDefault && c.status === 'ACTIVE') || null;
}

// ============================================================================
// Configuration ID Generation
// ============================================================================

/**
 * Generate unique configuration ID
 */
export function generateConfigId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `config_${timestamp}_${random}`;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate build pipeline configuration
 */
export function validateBuildPipelines(
  buildPipelines: ReleaseConfiguration['buildPipelines']
): string[] {
  const errors: string[] = [];
  
  if (!buildPipelines || buildPipelines.length === 0) {
    errors.push('At least one build pipeline is required');
    return errors;
  }
  
  // Check which platforms are being used
  const hasAndroid = buildPipelines.some(p => p.platform === 'ANDROID');
  const hasIOS = buildPipelines.some(p => p.platform === 'IOS');
  
  // Android requirements: Only Regression is required, Pre-Regression is optional
  if (hasAndroid) {
    const hasAndroidRegression = buildPipelines.some(
      p => p.platform === 'ANDROID' && p.environment === 'REGRESSION' && p.enabled
    );
    
    if (!hasAndroidRegression) {
      errors.push('Android Regression pipeline is required for Play Store releases');
    }
  }
  
  // iOS requirements: Regression + TestFlight required, Pre-Regression is optional
  if (hasIOS) {
    const hasIOSRegression = buildPipelines.some(
      p => p.platform === 'IOS' && p.environment === 'REGRESSION' && p.enabled
    );
    const hasTestFlight = buildPipelines.some(
      p => p.platform === 'IOS' && p.environment === 'TESTFLIGHT' && p.enabled
    );
    
    if (!hasIOSRegression) {
      errors.push('iOS Regression pipeline is required for App Store releases');
    }
    if (!hasTestFlight) {
      errors.push('iOS TestFlight pipeline is required for App Store distribution');
    }
  }
  
  // Validate each pipeline configuration
  buildPipelines.forEach((pipeline, index) => {
    if (!pipeline.name) {
      errors.push(`Pipeline ${index + 1}: Name is required`);
    }
    
    if (pipeline.provider === 'JENKINS') {
      const config = pipeline.providerConfig as any;
      if (!config.jobUrl) {
        errors.push(`Pipeline ${pipeline.name}: Jenkins job URL is required`);
      }
      if (!config.jobName) {
        errors.push(`Pipeline ${pipeline.name}: Jenkins job name is required`);
      }
    } else if (pipeline.provider === 'GITHUB_ACTIONS') {
      const config = pipeline.providerConfig as any;
      if (!config.workflowPath) {
        errors.push(`Pipeline ${pipeline.name}: GitHub Actions workflow path is required`);
      }
    }
  });
  
  return errors;
}

/**
 * Validate scheduling configuration
 */
export function validateScheduling(
  scheduling: ReleaseConfiguration['scheduling']
): string[] {
  const errors: string[] = [];
  
  if (!scheduling) {
    errors.push('Scheduling configuration is required');
    return errors;
  }
  
  if (!scheduling.defaultReleaseTime) {
    errors.push('Default release time is required');
  }
  
  if (!scheduling.defaultKickoffTime) {
    errors.push('Default kickoff time is required');
  }
  
  if (!scheduling.workingDays || scheduling.workingDays.length === 0) {
    errors.push('At least one working day must be selected');
  }
  
  if (!scheduling.regressionSlots || scheduling.regressionSlots.length === 0) {
    errors.push('At least one regression slot is required');
  }
  
  return errors;
}

/**
 * Validate complete configuration
 */
export function validateConfiguration(
  config: Partial<ReleaseConfiguration>
): { isValid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {};
  
  // Validate required fields
  if (!config.name) {
    errors.general = ['Configuration name is required'];
  }
  
  if (!config.defaultTargets || config.defaultTargets.length === 0) {
    errors.targets = ['At least one target platform must be selected'];
  }
  
  // Validate build pipelines
  if (config.buildPipelines) {
    const pipelineErrors = validateBuildPipelines(config.buildPipelines);
    if (pipelineErrors.length > 0) {
      errors.buildPipelines = pipelineErrors;
    }
  } else {
    errors.buildPipelines = ['Build pipeline configuration is required'];
  }
  
  // Validate scheduling
  if (config.scheduling) {
    const schedulingErrors = validateScheduling(config.scheduling);
    if (schedulingErrors.length > 0) {
      errors.scheduling = schedulingErrors;
    }
  } else {
    errors.scheduling = ['Scheduling configuration is required'];
  }
  
  const isValid = Object.keys(errors).length === 0;
  
  return { isValid, errors };
}

// ============================================================================
// Export/Import Configuration
// ============================================================================

/**
 * Export configuration as JSON
 */
export function exportConfig(config: ReleaseConfiguration): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Import configuration from JSON
 */
export function importConfig(jsonString: string): ReleaseConfiguration | null {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to import config:', error);
    return null;
  }
}

/**
 * Load a specific configuration by ID
 */
export function loadConfigById(
  organizationId: string,
  configId: string
): ReleaseConfiguration | null {
  const storageKey = `${getStorageKey(organizationId)}:${configId}`;
  
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const data = localStorage.getItem(storageKey);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load configuration:', error);
  }
  
  return null;
}

