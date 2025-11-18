/**
 * Release Creation Types
 * Types for creating releases with or without configurations
 */

import type { ReleaseConfiguration, RegressionSlot } from './release-config';

export interface ReleaseCreationMode {
  type: 'WITH_CONFIG' | 'MANUAL';
  configId?: string; // If WITH_CONFIG
}

export interface ReleaseBasicDetails {
  version: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'EMERGENCY';
  baseVersion?: string;
  kickoffDate: string;
  releaseDate: string;
  description?: string;
}

export interface ReleaseCustomizations {
  // Platform overrides
  platforms?: {
    web: boolean;
    playStore: boolean;
    appStore: boolean;
  };
  
  // Build pipeline customizations
  buildPipelines?: {
    enablePreRegression: boolean; // Can disable pre-regression builds
    enabledPipelineIds: string[]; // Which pipelines to actually run
  };
  
  // Test management customizations
  testManagement?: {
    enabled: boolean; // Can disable Checkmate/test management
    createTestRuns?: boolean;
  };
  
  // Scheduling customizations (override config)
  scheduling?: {
    kickoffTime?: string;
    releaseTime?: string;
    regressionSlots?: RegressionSlot[]; // Can customize slots
  };
  
  // Communication customizations
  communication?: {
    enableSlack: boolean;
    enableEmail: boolean;
  };
}

export interface CompleteReleaseData {
  tenantId: string;
  configId?: string; // Reference to configuration used
  
  basicDetails: ReleaseBasicDetails;
  customizations: ReleaseCustomizations;
  
  // Merged data (for backend)
  mergedConfig?: Partial<ReleaseConfiguration>;
}

export interface ReleaseCreationStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
}

