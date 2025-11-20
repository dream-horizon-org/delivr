/**
 * Release Config Type Definitions
 * Release configuration profiles linking to various integration configs
 */

/**
 * Release Configuration
 */
export type ReleaseConfiguration = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  targets: string[];
  sourceCodeManagementConfigId: string | null;
  ciConfigId: string | null;
  testManagementConfigId: string | null;
  projectManagementConfigId: string | null;
  commsConfigId: string | null;
  scheduling: any;
  isActive: boolean;
  isDefault: boolean;
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * DTO for creating release config
 */
export type CreateReleaseConfigDto = {
  tenantId: string;
  name: string;
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  targets: string[];
  sourceCodeManagementConfigId?: string;
  ciConfigId?: string;
  testManagementConfigId?: string;
  projectManagementConfigId?: string;
  commsConfigId?: string;
  scheduling?: any;
  isDefault?: boolean;
  isActive?: boolean;
  createdByAccountId: string;
};

/**
 * DTO for updating release config
 */
export type UpdateReleaseConfigDto = {
  name?: string;
  description?: string;
  releaseType?: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  targets?: string[];
  sourceCodeManagementConfigId?: string | null;
  ciConfigId?: string | null;
  testManagementConfigId?: string | null;
  projectManagementConfigId?: string | null;
  commsConfigId?: string | null;
  scheduling?: any;
  isDefault?: boolean;
  isActive?: boolean;
};

/**
 * Request body structure from client for creating release configuration
 */
export type CreateReleaseConfigRequest = {
  organizationId: string;      // Maps to tenantId
  name: string;
  description?: string;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  isDefault?: boolean;
  defaultTargets: string[];    // Maps to targets
  
  // Integration configurations (will be processed to generate config IDs)
  ciConfigId?: string;         // Optional: existing CI config ID to reuse
  buildPipelines?: any[];      // Will be sent to CI integration service if no ciConfigId
  testManagement?: any;        // Will be sent to TCM integration service
  communication?: any;         // Will be sent to Communications integration service
  
  scheduling?: any;            // Stored directly as JSON
  status?: string;             // Not stored in release config
};

/**
 * Safe version of ReleaseConfiguration for API responses
 * Contains only metadata without any integration details
 */
export type SafeReleaseConfiguration = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  releaseType: 'PLANNED' | 'HOTFIX' | 'MAJOR';
  targets: string[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: {
    id: string;
    name?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
};


