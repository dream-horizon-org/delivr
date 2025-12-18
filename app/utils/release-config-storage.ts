/**
 * Local Storage Utility for Release Configuration
 * Provides helper functions for draft checking and validation
 * 
 * Note: Draft config data and wizard steps are managed by useDraftStorage hook.
 * These utilities are for:
 * - Pre-wizard draft checking (for route-level dialogs)
 * - Validation logic
 * - Export/Import functionality
 */

import type { ReleaseConfiguration, Workflow } from '~/types/release-config';
import { PLATFORMS, BUILD_ENVIRONMENTS } from '~/types/release-config-constants';
import { generateStorageKey } from '~/hooks/useDraftStorage';

// ============================================================================
// Draft Configuration Management (Local Storage)
// ============================================================================

/**
 * Load draft configuration from local storage
 * Used by route to check if draft exists before showing resume dialog
 * 
 * Note: Uses same storage key as useDraftStorage hook for consistency
 */
export function loadDraftConfig(
  organizationId: string
): Partial<ReleaseConfiguration> | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = generateStorageKey('release-config', organizationId);
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    // Parse the draft metadata structure used by useDraftStorage
    const draft = JSON.parse(data);
    return draft.data || draft; // Support both hook format and legacy format
  } catch (error) {
    console.error('Failed to load draft config:', error);
    return null;
  }
}

/**
 * Clear draft configuration from local storage
 * 
 * Called when:
 * - User explicitly chooses "Start New" (discarding draft)
 * - User navigates to create with ?new=true query param
 * 
 * Note: useDraftStorage hook also clears draft on successful save
 */
export function clearDraftConfig(organizationId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = generateStorageKey('release-config', organizationId);
    console.log('[clearDraftConfig] Clearing draft config for organizationId:', organizationId);
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
    const key = generateStorageKey('release-config', organizationId);
    return localStorage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate build pipeline configuration based on target platforms
 */
export function validateBuildPipelines(
  workflows: Workflow[],
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
      (p: Workflow) => p.platform.toUpperCase() === PLATFORMS.ANDROID.toUpperCase() && p.environment === BUILD_ENVIRONMENTS.REGRESSION && p.enabled
    );
    
    if (!hasAndroidRegression) {
      errors.push('Android Regression pipeline is required for Play Store releases');
    }
  }
  
  // iOS requirements: Regression + TestFlight are mandatory
  if (needsIOS) {
    const hasIOSRegression = workflows.some(
      (p: Workflow) => p.platform.toUpperCase() === PLATFORMS.IOS.toUpperCase() && p.environment === BUILD_ENVIRONMENTS.REGRESSION && p.enabled
    );
    const hasTestFlight = workflows.some(
      (p: Workflow) => p.platform.toUpperCase() === PLATFORMS.IOS.toUpperCase() && p.environment === BUILD_ENVIRONMENTS.TESTFLIGHT && p.enabled
    );
    
    if (!hasIOSRegression) {
      errors.push('iOS Regression pipeline is required for App Store releases');
    }
    if (!hasTestFlight) {
      errors.push('iOS TestFlight pipeline is required for App Store distribution');
    }
  }
  
  // Validate each pipeline configuration
  workflows.forEach((pipeline: Workflow, index: number) => {
    if (!pipeline.name) {
      errors.push(`Pipeline ${index + 1}: Name is required`);
    }
    
    if (pipeline.provider === 'JENKINS') {
      const config = pipeline.providerConfig as any;
      if (!config.jobUrl) {
        errors.push(`Pipeline ${pipeline.name}: Jenkins job URL is required`);
      }
    } else if (pipeline.provider === 'GITHUB_ACTIONS') {
      const config = pipeline.providerConfig as any;
      if (!config.workflowUrl) {
        errors.push(`Pipeline ${pipeline.name}: GitHub Actions workflow url is required`);
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
  scheduling: ReleaseConfiguration['releaseSchedule']
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
  
  if (!config.baseBranch || !config.baseBranch.trim()) {
    errors.general = [...(errors.general || []), 'Base branch is required'];
  }
  
  if (!config.targets || config.targets.length === 0) {
    errors.targets = ['At least one target platform must be selected'];
  }
  
  // Validate build pipelines (optional - manual upload is the default)
  const workflows = config.ciConfig?.workflows || [];
  if (workflows.length > 0 && config.targets) {
    const pipelineErrors = validateBuildPipelines(workflows, config.targets);
    if (pipelineErrors.length > 0) {
      errors.workflows = pipelineErrors;
    }
  }
  // Note: Build pipelines are optional. Manual upload is supported as default.
  
  // Validate scheduling (optional - only validate if provided)
  if (config.releaseSchedule) {
    const schedulingErrors = validateScheduling(config.releaseSchedule);
    if (schedulingErrors.length > 0) {
      errors.releaseSchedule = schedulingErrors;
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
