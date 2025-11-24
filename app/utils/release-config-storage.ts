/**
 * Local Storage Utility for Release Configuration
 * Manages persistence of draft configurations until final submission
 */

import type { ReleaseConfiguration } from '~/types/release-config';
import { PLATFORMS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';

const CONFIG_STORAGE_KEY = 'delivr_release_config_draft';
const CONFIG_LIST_KEY = 'delivr_release_configs';
const WIZARD_STEP_KEY = 'delivr_release_config_wizard_step';

// ============================================================================
// Draft Configuration Management (Local Storage)
// ============================================================================

/**
 * Save draft configuration to local storage
 * 
 * IMPORTANT: Only call this for NEW configs being created!
 * - ✅ NEW config creation: Auto-saves during wizard (allows resume)
 * - ❌ EDIT mode: Should NEVER be called (separate flow)
 * 
 * Draft is automatically cleared after successful submission.
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
 * 
 * IMPORTANT: Only call this for NEW configs!
 * - ✅ NEW config creation: Checks for draft to resume
 * - ❌ EDIT mode: Should NEVER be called (use existingConfig instead)
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
 * Also clears the saved wizard step
 * 
 * Called when:
 * - ✅ User successfully submits a NEW config
 * - ✅ User explicitly chooses "Start New" (discarding draft)
 * - ✅ User navigates to create with ?new=true query param
 * 
 * NOT called when:
 * - ❌ User is in EDIT mode (edit never touches drafts)
 */
export function clearDraftConfig(organizationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${CONFIG_STORAGE_KEY}_${organizationId}`;
    console.log('[clearDraftConfig] Clearing draft config for organizationId:', organizationId, 'key:', key);
    localStorage.removeItem(key);
    
    // Also clear the wizard step
    clearWizardStep(organizationId);
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

/**
 * Save last active wizard step for draft configuration
 */
export function saveWizardStep(
  organizationId: string,
  stepIndex: number
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${WIZARD_STEP_KEY}_${organizationId}`;
    localStorage.setItem(key, stepIndex.toString());
  } catch (error) {
    console.error('Failed to save wizard step:', error);
  }
}

/**
 * Load last active wizard step for draft configuration
 * Returns 0 (first step) if no saved step exists
 */
export function loadWizardStep(organizationId: string): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const key = `${WIZARD_STEP_KEY}_${organizationId}`;
    const saved = localStorage.getItem(key);
    
    if (!saved) return 0;
    
    const stepIndex = parseInt(saved, 10);
    return isNaN(stepIndex) ? 0 : stepIndex;
  } catch (error) {
    console.error('Failed to load wizard step:', error);
    return 0;
  }
}

/**
 * Clear saved wizard step
 */
export function clearWizardStep(organizationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${WIZARD_STEP_KEY}_${organizationId}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear wizard step:', error);
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
 * Validate build pipeline configuration based on target platforms
 */
export function validateBuildPipelines(
  workflows: ReleaseConfiguration['workflows'],
  targetPlatforms: ReleaseConfiguration['targets']
): string[] {
  const errors: string[] = [];
  
  if (!workflows || workflows.length === 0) {
    errors.push('At least one build pipeline is required');
    return errors;
  }
  
  // Determine required platforms from target platforms
  const needsAndroid = targetPlatforms.includes('PLAY_STORE');
  const needsIOS = targetPlatforms.includes('APP_STORE');
  
  // Android requirements: Regression is mandatory
  if (needsAndroid) {
    const hasAndroidRegression = workflows.some(
      p => p.platform === PLATFORMS.ANDROID && p.environment === BUILD_ENVIRONMENTS.REGRESSION && p.enabled
    );
    
    if (!hasAndroidRegression) {
      errors.push('Android Regression pipeline is required for Play Store releases');
    }
  }
  
  // iOS requirements: Regression + TestFlight are mandatory
  if (needsIOS) {
    const hasIOSRegression = workflows.some(
      p => p.platform === PLATFORMS.IOS && p.environment === BUILD_ENVIRONMENTS.REGRESSION && p.enabled
    );
    const hasTestFlight = workflows.some(
      p => p.platform === PLATFORMS.IOS && p.environment === BUILD_ENVIRONMENTS.TESTFLIGHT && p.enabled
    );
    
    if (!hasIOSRegression) {
      errors.push('iOS Regression pipeline is required for App Store releases');
    }
    if (!hasTestFlight) {
      errors.push('iOS TestFlight pipeline is required for App Store distribution');
    }
  }
  
  // Validate each pipeline configuration
  workflows.forEach((pipeline, index) => {
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
 * Note: Scheduling is optional. Only validate if user has started filling it out.
 */
export function validateScheduling(
  scheduling: ReleaseConfiguration['scheduling']
): string[] {
  const errors: string[] = [];
  
  if (!scheduling) {
    // Scheduling is optional, no error if not provided
    return errors;
  }
  
  // Only validate if firstReleaseKickoffDate is set (indicates user wants to use scheduling)
  if (!scheduling.firstReleaseKickoffDate) {
    // Not filled out yet, skip validation
    return errors;
  }
  
  if (!scheduling.targetReleaseTime) {
    errors.push('Target release time is required');
  }
  
  if (!scheduling.kickoffTime) {
    errors.push('Kickoff time is required');
  }
  
  if (!scheduling.workingDays || scheduling.workingDays.length === 0) {
    errors.push('At least one working day must be selected');
  }
  
  if (!scheduling.timezone) {
    errors.push('Timezone is required');
  }
  
  // Regression slots are optional - not required
  
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
  
  if (!config.targets || config.targets.length === 0) {
    errors.targets = ['At least one target platform must be selected'];
  }
  
  // Validate build pipelines (optional - manual upload is the default)
  if (config.workflows && config.workflows.length > 0 && config.targets) {
    const pipelineErrors = validateBuildPipelines(config.workflows, config.targets);
    if (pipelineErrors.length > 0) {
      errors.workflows = pipelineErrors;
    }
  }
  // Note: Build pipelines are optional. Manual upload is supported as default.
  
  // Validate scheduling (optional - only validate if provided)
  if (config.scheduling) {
    const schedulingErrors = validateScheduling(config.scheduling);
    if (schedulingErrors.length > 0) {
      errors.scheduling = schedulingErrors;
    }
  }
  // Note: Scheduling is optional. If not provided, configuration can still be saved.
  // Scheduled configs become "release trains" that trigger automatically.
  
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
  const storageKey = `${CONFIG_LIST_KEY}_${organizationId}:${configId}`;
  
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

