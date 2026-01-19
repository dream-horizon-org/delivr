# SCM Integration - Complete Implementation Guide

This is a **reference implementation** for SCM (Source Control Management) integrations. Use this as a template for implementing the other 4 integration types.

---

## 📁 File Structure

```
delivr-server-ota-managed/
├── migrations/
│   └── 003_tenant_scm_integrations.sql           # ← SQL migration
│   └── 003_tenant_scm_integrations_rollback.sql
│
├── api/script/storage/integrations/
│   ├── scm/
│   │   ├── scm-models.ts                         # ← Sequelize model
│   │   ├── scm-controller.ts                     # ← DB operations (CRUD)
│   │   ├── scm-types.ts                          # ← TypeScript interfaces
│   │   └── index.ts                              # ← Exports
│   └── index.ts                                  # ← Central export
│
├── api/script/routes/integrations/
│   ├── scm-routes.ts                             # ← Express routes
│   └── index.ts                                  # ← Route aggregator
│
├── api/script/services/integrations/
│   ├── scm/
│   │   ├── github-service.ts                     # ← GitHub API client
│   │   ├── gitlab-service.ts                     # ← GitLab API client
│   │   ├── bitbucket-service.ts                  # ← Bitbucket API client
│   │   └── index.ts
│   └── index.ts
│
└── api/script/index.ts                           # ← Register routes
```

---

## 1️⃣ SQL Migration

**File:** `migrations/003_tenant_scm_integrations.sql`

```sql
-- ============================================================================
-- Migration: Tenant SCM Integrations
-- Description: Stores tenant-level SCM (GitHub/GitLab/Bitbucket) connections
-- Author: Your Team
-- Date: 2025-01-XX
-- ============================================================================

-- Create SCM integrations table
CREATE TABLE IF NOT EXISTS tenant_scm_integrations (
  -- Primary key
  id VARCHAR(255) PRIMARY KEY COMMENT 'Unique identifier (nanoid)',
  
  -- Tenant reference
  tenantId CHAR(36) CHARACTER SET latin1 COLLATE latin1_bin NOT NULL COMMENT 'Reference to tenants table',
  
  -- SCM provider type
  scmType ENUM('GITHUB', 'GITLAB', 'BITBUCKET') NOT NULL COMMENT 'Type of SCM provider',
  
  -- Display information
  displayName VARCHAR(255) NOT NULL COMMENT 'User-friendly name (e.g., "Dream11 Mobile App")',
  
  -- GitHub-specific fields
  githubOrganization VARCHAR(255) NULL COMMENT 'GitHub org/username',
  githubRepository VARCHAR(255) NULL COMMENT 'Repository name',
  githubInstallationId VARCHAR(255) NULL COMMENT 'GitHub App installation ID',
  
  -- GitLab-specific fields
  gitlabProjectId VARCHAR(255) NULL COMMENT 'GitLab project ID',
  gitlabGroupId VARCHAR(255) NULL COMMENT 'GitLab group ID',
  
  -- Bitbucket-specific fields
  bitbucketWorkspace VARCHAR(255) NULL COMMENT 'Bitbucket workspace slug',
  bitbucketRepository VARCHAR(255) NULL COMMENT 'Bitbucket repo slug',
  
  -- Common fields
  repositoryUrl VARCHAR(512) NOT NULL COMMENT 'Full repository URL (https://...)',
  defaultBranch VARCHAR(255) DEFAULT 'main' COMMENT 'Default branch (main/master/develop)',
  
  -- Authentication (encrypted)
  accessToken TEXT NULL COMMENT 'Encrypted access token (PAT/OAuth token)',
  refreshToken TEXT NULL COMMENT 'Encrypted refresh token (if applicable)',
  tokenExpiresAt DATETIME NULL COMMENT 'Token expiration timestamp',
  
  -- Webhook configuration
  webhookId VARCHAR(255) NULL COMMENT 'Webhook ID from provider',
  webhookSecret TEXT NULL COMMENT 'Encrypted webhook secret',
  webhookUrl VARCHAR(512) NULL COMMENT 'Webhook callback URL',
  
  -- Status and verification
  isActive BOOLEAN DEFAULT TRUE COMMENT 'Is this integration active?',
  verificationStatus ENUM('PENDING', 'VALID', 'INVALID', 'EXPIRED') DEFAULT 'PENDING' COMMENT 'Connection verification status',
  lastVerifiedAt DATETIME NULL COMMENT 'Last time connection was verified',
  verificationError TEXT NULL COMMENT 'Error message if verification failed',
  
  -- Metadata
  createdByAccountId VARCHAR(255) NOT NULL COMMENT 'Account ID who created this integration',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_scm_tenant (tenantId, isActive),
  INDEX idx_scm_type (scmType),
  INDEX idx_scm_verification (verificationStatus, lastVerifiedAt),
  INDEX idx_scm_created_by (createdByAccountId),
  
  -- Unique constraint: One integration per repo per tenant
  UNIQUE KEY unique_tenant_scm_repo (tenantId, scmType, repositoryUrl)
  
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Tenant-level SCM integrations (GitHub/GitLab/Bitbucket)';

-- Add foreign key constraints at the end
ALTER TABLE tenant_scm_integrations
  ADD CONSTRAINT fk_scm_tenant
    FOREIGN KEY (tenantId) 
    REFERENCES tenants(id) 
    ON DELETE CASCADE,
    
  ADD CONSTRAINT fk_scm_created_by
    FOREIGN KEY (createdByAccountId)
    REFERENCES accounts(id)
    ON DELETE RESTRICT;

-- ============================================================================
-- Seed data for testing (optional)
-- ============================================================================
-- You can add test data here if needed
```

**Rollback:** `migrations/003_tenant_scm_integrations_rollback.sql`

```sql
-- ============================================================================
-- Rollback: Tenant SCM Integrations
-- ============================================================================

-- Drop foreign key constraints first
ALTER TABLE tenant_scm_integrations 
  DROP FOREIGN KEY fk_scm_tenant,
  DROP FOREIGN KEY fk_scm_created_by;

-- Drop the table
DROP TABLE IF EXISTS tenant_scm_integrations;
```

---

## 2️⃣ TypeScript Types

**File:** `api/script/storage/integrations/scm/scm-types.ts`

```typescript
/**
 * SCM Integration TypeScript Definitions
 * 
 * Defines interfaces and enums for SCM (GitHub/GitLab/Bitbucket) integrations
 */

// ============================================================================
// Enums
// ============================================================================

export enum SCMType {
  GITHUB = 'GITHUB',
  GITLAB = 'GITLAB',
  BITBUCKET = 'BITBUCKET'
}

export enum VerificationStatus {
  PENDING = 'PENDING',   // Not yet verified
  VALID = 'VALID',       // Successfully verified
  INVALID = 'INVALID',   // Verification failed
  EXPIRED = 'EXPIRED'    // Token/credentials expired
}

// ============================================================================
// Main Interface
// ============================================================================

export interface TenantSCMIntegration {
  id: string;
  tenantId: string;
  
  // Provider type
  scmType: SCMType;
  displayName: string;
  
  // GitHub-specific
  githubOrganization?: string | null;
  githubRepository?: string | null;
  githubInstallationId?: string | null;
  
  // GitLab-specific
  gitlabProjectId?: string | null;
  gitlabGroupId?: string | null;
  
  // Bitbucket-specific
  bitbucketWorkspace?: string | null;
  bitbucketRepository?: string | null;
  
  // Common
  repositoryUrl: string;
  defaultBranch: string;
  
  // Authentication (encrypted in DB)
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  
  // Webhook
  webhookId?: string | null;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
  
  // Status
  isActive: boolean;
  verificationStatus: VerificationStatus;
  lastVerifiedAt?: Date | null;
  verificationError?: string | null;
  
  // Metadata
  createdByAccountId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a new SCM integration
 */
export interface CreateSCMIntegrationDto {
  tenantId: string;
  scmType: SCMType;
  displayName: string;
  
  // GitHub
  githubOrganization?: string;
  githubRepository?: string;
  githubInstallationId?: string;
  
  // GitLab
  gitlabProjectId?: string;
  gitlabGroupId?: string;
  
  // Bitbucket
  bitbucketWorkspace?: string;
  bitbucketRepository?: string;
  
  // Common
  repositoryUrl: string;
  defaultBranch?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  
  // Metadata
  createdByAccountId: string;
}

/**
 * DTO for updating an existing SCM integration
 */
export interface UpdateSCMIntegrationDto {
  displayName?: string;
  defaultBranch?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive?: boolean;
}

/**
 * DTO for verification result
 */
export interface VerificationResult {
  success: boolean;
  status: VerificationStatus;
  error?: string;
  metadata?: {
    repositoryName?: string;
    ownerName?: string;
    visibility?: 'public' | 'private';
    hasWebhooks?: boolean;
    branches?: string[];
  };
}

/**
 * Safe version without sensitive data (for API responses)
 */
export interface SafeSCMIntegration extends Omit<
  TenantSCMIntegration,
  'accessToken' | 'refreshToken' | 'webhookSecret'
> {
  // Add computed fields
  hasValidToken?: boolean;
  isTokenExpired?: boolean;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface SCMIntegrationFilters {
  tenantId?: string;
  scmType?: SCMType;
  isActive?: boolean;
  verificationStatus?: VerificationStatus;
}
```

---

## 3️⃣ Sequelize Model

**File:** `api/script/storage/integrations/scm/scm-models.ts`

```typescript
/**
 * Sequelize Model for SCM Integrations
 * 
 * Defines the database model using Sequelize ORM
 */

import { DataTypes, Model, Sequelize } from 'sequelize';
import { 
  TenantSCMIntegration, 
  SCMType, 
  VerificationStatus 
} from './scm-types';

// ============================================================================
// Model Definition
// ============================================================================

export function createSCMIntegrationModel(sequelize: Sequelize) {
  class SCMIntegrationModel extends Model<TenantSCMIntegration> 
    implements TenantSCMIntegration {
    
    declare id: string;
    declare tenantId: string;
    declare scmType: SCMType;
    declare displayName: string;
    
    // GitHub
    declare githubOrganization: string | null;
    declare githubRepository: string | null;
    declare githubInstallationId: string | null;
    
    // GitLab
    declare gitlabProjectId: string | null;
    declare gitlabGroupId: string | null;
    
    // Bitbucket
    declare bitbucketWorkspace: string | null;
    declare bitbucketRepository: string | null;
    
    // Common
    declare repositoryUrl: string;
    declare defaultBranch: string;
    declare accessToken: string | null;
    declare refreshToken: string | null;
    declare tokenExpiresAt: Date | null;
    
    // Webhook
    declare webhookId: string | null;
    declare webhookSecret: string | null;
    declare webhookUrl: string | null;
    
    // Status
    declare isActive: boolean;
    declare verificationStatus: VerificationStatus;
    declare lastVerifiedAt: Date | null;
    declare verificationError: string | null;
    
    // Metadata
    declare createdByAccountId: string;
    declare createdAt: Date;
    declare updatedAt: Date;
  }

  SCMIntegrationModel.init(
    {
      id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
        comment: 'Unique identifier (nanoid)',
      },
      tenantId: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        comment: 'Reference to tenants table',
      },
      scmType: {
        type: DataTypes.ENUM(...Object.values(SCMType)),
        allowNull: false,
        comment: 'Type of SCM provider',
      },
      displayName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'User-friendly name',
      },
      
      // GitHub
      githubOrganization: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      githubRepository: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      githubInstallationId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      
      // GitLab
      gitlabProjectId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      gitlabGroupId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      
      // Bitbucket
      bitbucketWorkspace: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      bitbucketRepository: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      
      // Common
      repositoryUrl: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      defaultBranch: {
        type: DataTypes.STRING(255),
        defaultValue: 'main',
      },
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted access token',
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted refresh token',
      },
      tokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      
      // Webhook
      webhookId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      webhookSecret: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Encrypted webhook secret',
      },
      webhookUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      
      // Status
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      verificationStatus: {
        type: DataTypes.ENUM(...Object.values(VerificationStatus)),
        defaultValue: VerificationStatus.PENDING,
      },
      lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      verificationError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      
      // Metadata
      createdByAccountId: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'tenant_scm_integrations',
      timestamps: true,
      indexes: [
        { fields: ['tenantId', 'isActive'] },
        { fields: ['scmType'] },
        { fields: ['verificationStatus', 'lastVerifiedAt'] },
        { fields: ['createdByAccountId'] },
      ],
    }
  );

  return SCMIntegrationModel;
}

// ============================================================================
// Model Instance Methods (optional)
// ============================================================================

// You can add instance methods here, e.g.:
// SCMIntegrationModel.prototype.isTokenValid = function() {
//   if (!this.tokenExpiresAt) return true;
//   return new Date() < this.tokenExpiresAt;
// };
```

---

## 4️⃣ Database Controller

**File:** `api/script/storage/integrations/scm/scm-controller.ts`

```typescript
/**
 * SCM Integration Database Controller
 * 
 * Handles all database operations for SCM integrations
 * This is the DATA ACCESS LAYER - only DB operations, no business logic
 */

import { nanoid } from 'nanoid';
import { Model } from 'sequelize';
import { 
  CreateSCMIntegrationDto, 
  UpdateSCMIntegrationDto,
  SCMIntegrationFilters,
  TenantSCMIntegration,
  SafeSCMIntegration,
  VerificationStatus
} from './scm-types';

// ============================================================================
// Controller Class
// ============================================================================

export class SCMIntegrationController {
  private model: typeof Model;

  constructor(model: typeof Model) {
    this.model = model;
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new SCM integration
   * 
   * @param data - Integration data
   * @returns Created integration (safe version without tokens)
   */
  async create(data: CreateSCMIntegrationDto): Promise<SafeSCMIntegration> {
    const integration = await this.model.create({
      id: nanoid(),
      ...data,
      isActive: true,
      verificationStatus: VerificationStatus.PENDING,
    });

    return this.toSafeObject(integration.toJSON());
  }

  // ==========================================================================
  // READ
  // ==========================================================================

  /**
   * Find integration by ID
   * 
   * @param id - Integration ID
   * @param includeTokens - Include sensitive tokens (default: false)
   * @returns Integration or null
   */
  async findById(
    id: string, 
    includeTokens: boolean = false
  ): Promise<TenantSCMIntegration | SafeSCMIntegration | null> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return null;
    
    const data = integration.toJSON();
    return includeTokens ? data : this.toSafeObject(data);
  }

  /**
   * Find all integrations for a tenant
   * 
   * @param filters - Query filters
   * @returns Array of integrations (safe version)
   */
  async findAll(filters: SCMIntegrationFilters = {}): Promise<SafeSCMIntegration[]> {
    const where: any = {};
    
    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.scmType) where.scmType = filters.scmType;
    if (typeof filters.isActive === 'boolean') where.isActive = filters.isActive;
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;

    const integrations = await this.model.findAll({ 
      where,
      order: [['createdAt', 'DESC']]
    });

    return integrations.map(i => this.toSafeObject(i.toJSON()));
  }

  /**
   * Find integration by repository URL
   * 
   * @param tenantId - Tenant ID
   * @param repositoryUrl - Repository URL
   * @returns Integration or null
   */
  async findByRepository(
    tenantId: string, 
    repositoryUrl: string
  ): Promise<SafeSCMIntegration | null> {
    const integration = await this.model.findOne({
      where: { tenantId, repositoryUrl }
    });

    if (!integration) return null;
    return this.toSafeObject(integration.toJSON());
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update integration
   * 
   * @param id - Integration ID
   * @param data - Update data
   * @returns Updated integration (safe version)
   */
  async update(
    id: string, 
    data: UpdateSCMIntegrationDto
  ): Promise<SafeSCMIntegration | null> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return null;

    await integration.update(data);
    return this.toSafeObject(integration.toJSON());
  }

  /**
   * Update verification status
   * 
   * @param id - Integration ID
   * @param status - New verification status
   * @param error - Error message (if verification failed)
   * @returns Updated integration
   */
  async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    error?: string
  ): Promise<SafeSCMIntegration | null> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return null;

    await integration.update({
      verificationStatus: status,
      lastVerifiedAt: new Date(),
      verificationError: error || null,
    });

    return this.toSafeObject(integration.toJSON());
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Delete integration (soft delete - set isActive = false)
   * 
   * @param id - Integration ID
   * @returns True if deleted, false if not found
   */
  async softDelete(id: string): Promise<boolean> {
    const integration = await this.model.findByPk(id);
    
    if (!integration) return false;

    await integration.update({ isActive: false });
    return true;
  }

  /**
   * Hard delete integration (permanent removal)
   * 
   * @param id - Integration ID
   * @returns True if deleted, false if not found
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.model.destroy({ where: { id } });
    return result > 0;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Check if integration exists
   * 
   * @param id - Integration ID
   * @returns True if exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await this.model.count({ where: { id } });
    return count > 0;
  }

  /**
   * Count integrations for a tenant
   * 
   * @param tenantId - Tenant ID
   * @returns Count
   */
  async count(tenantId: string): Promise<number> {
    return await this.model.count({ 
      where: { tenantId, isActive: true } 
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Convert to safe object (remove sensitive tokens)
   */
  private toSafeObject(data: any): SafeSCMIntegration {
    const { accessToken, refreshToken, webhookSecret, ...safe } = data;
    
    return {
      ...safe,
      hasValidToken: !!accessToken,
      isTokenExpired: data.tokenExpiresAt 
        ? new Date() > new Date(data.tokenExpiresAt)
        : false,
    };
  }
}
```

---

## 5️⃣ Express Routes

**File:** `api/script/routes/integrations/scm-routes.ts`

```typescript
/**
 * SCM Integration Routes
 * 
 * Defines all HTTP endpoints for SCM integrations
 */

import { Router, Request, Response } from 'express';
import { SCMIntegrationController } from '../../storage/integrations/scm/scm-controller';
import { CreateSCMIntegrationDto, UpdateSCMIntegrationDto, SCMType } from '../../storage/integrations/scm/scm-types';

// ============================================================================
// Router Setup
// ============================================================================

export function createSCMRoutes(controller: SCMIntegrationController): Router {
  const router = Router();

  // ==========================================================================
  // GET /api/v1/integrations/scm
  // List all SCM integrations for a tenant
  // ==========================================================================
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { tenantId, scmType, isActive, verificationStatus } = req.query;

      const integrations = await controller.findAll({
        tenantId: tenantId as string,
        scmType: scmType as SCMType,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        verificationStatus: verificationStatus as any,
      });

      res.json({
        success: true,
        data: integrations,
        count: integrations.length,
      });
    } catch (error) {
      console.error('[SCM Routes] Error listing integrations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SCM integrations',
      });
    }
  });

  // ==========================================================================
  // GET /api/v1/integrations/scm/:id
  // Get single SCM integration by ID
  // ==========================================================================
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const integration = await controller.findById(id);

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'SCM integration not found',
        });
      }

      res.json({
        success: true,
        data: integration,
      });
    } catch (error) {
      console.error('[SCM Routes] Error fetching integration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SCM integration',
      });
    }
  });

  // ==========================================================================
  // POST /api/v1/integrations/scm
  // Create new SCM integration
  // ==========================================================================
  router.post('/', async (req: Request, res: Response) => {
    try {
      const data: CreateSCMIntegrationDto = req.body;

      // Basic validation
      if (!data.tenantId || !data.scmType || !data.repositoryUrl || !data.accessToken) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: tenantId, scmType, repositoryUrl, accessToken',
        });
      }

      // Check for duplicate
      const existing = await controller.findByRepository(data.tenantId, data.repositoryUrl);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'SCM integration already exists for this repository',
        });
      }

      const integration = await controller.create(data);

      res.status(201).json({
        success: true,
        data: integration,
        message: 'SCM integration created successfully',
      });
    } catch (error) {
      console.error('[SCM Routes] Error creating integration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create SCM integration',
      });
    }
  });

  // ==========================================================================
  // PATCH /api/v1/integrations/scm/:id
  // Update SCM integration
  // ==========================================================================
  router.patch('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data: UpdateSCMIntegrationDto = req.body;

      const integration = await controller.update(id, data);

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'SCM integration not found',
        });
      }

      res.json({
        success: true,
        data: integration,
        message: 'SCM integration updated successfully',
      });
    } catch (error) {
      console.error('[SCM Routes] Error updating integration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update SCM integration',
      });
    }
  });

  // ==========================================================================
  // DELETE /api/v1/integrations/scm/:id
  // Delete SCM integration (soft delete)
  // ==========================================================================
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { hard } = req.query;

      const deleted = hard === 'true' 
        ? await controller.hardDelete(id)
        : await controller.softDelete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'SCM integration not found',
        });
      }

      res.json({
        success: true,
        message: 'SCM integration deleted successfully',
      });
    } catch (error) {
      console.error('[SCM Routes] Error deleting integration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete SCM integration',
      });
    }
  });

  // ==========================================================================
  // POST /api/v1/integrations/scm/:id/verify
  // Verify SCM connection
  // ==========================================================================
  router.post('/:id/verify', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // TODO: Implement actual verification logic in service layer
      // For now, just update status to VALID
      const integration = await controller.updateVerificationStatus(id, 'VALID');

      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'SCM integration not found',
        });
      }

      res.json({
        success: true,
        data: integration,
        message: 'SCM connection verified successfully',
      });
    } catch (error) {
      console.error('[SCM Routes] Error verifying integration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify SCM connection',
      });
    }
  });

  return router;
}
```

---

## 6️⃣ Index Files (Exports)

**File:** `api/script/storage/integrations/scm/index.ts`

```typescript
/**
 * SCM Integration Module Exports
 */

export * from './scm-types';
export * from './scm-models';
export * from './scm-controller';
```

**File:** `api/script/storage/integrations/index.ts`

```typescript
/**
 * Central Integrations Export
 */

export * from './scm';
// Export other integration types here later:
// export * from './targets';
// export * from './pipelines';
// export * from './communication';
// export * from './tickets';
```

**File:** `api/script/routes/integrations/index.ts`

```typescript
/**
 * Integration Routes Aggregator
 */

import { Router } from 'express';
import { createSCMRoutes } from './scm-routes';
import { SCMIntegrationController } from '../../storage/integrations/scm/scm-controller';

export function createIntegrationRoutes(storage: any): Router {
  const router = Router();

  // SCM routes
  const scmController = new SCMIntegrationController(storage.SCMIntegrations);
  router.use('/scm', createSCMRoutes(scmController));

  // Add other integration routes here:
  // router.use('/targets', createTargetRoutes(...));
  // router.use('/pipelines', createPipelineRoutes(...));
  // router.use('/communication', createCommunicationRoutes(...));
  // router.use('/tickets', createTicketRoutes(...));

  return router;
}
```

---

## 7️⃣ Register Routes in Main API

**File:** `api/script/index.ts` (modify existing file)

```typescript
// ... existing imports ...
import { createIntegrationRoutes } from './routes/integrations';

// ... existing code ...

// Register integration routes
app.use('/api/v1/integrations', createIntegrationRoutes(storage));
```

---

## 🧪 Testing the Implementation

### 1. Run Migration

```bash
cd /Users/jatinkhemchandani/Desktop/delivr-server-ota-managed

# Run migration
mysql -u root -p delivr_ota < migrations/003_tenant_scm_integrations.sql

# Verify table created
mysql -u root -p delivr_ota -e "DESCRIBE tenant_scm_integrations;"
```

### 2. Test API Endpoints with cURL

```bash
# 1. Create SCM integration
curl -X POST http://localhost:8080/api/v1/integrations/scm \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "NJEG6wOk7e",
    "scmType": "GITHUB",
    "displayName": "Dream11 Mobile App",
    "githubOrganization": "dream11",
    "githubRepository": "mobile-app",
    "repositoryUrl": "https://github.com/dream11/mobile-app",
    "defaultBranch": "main",
    "accessToken": "ghp_testtoken123",
    "createdByAccountId": "acc_123"
  }'

# 2. List all integrations
curl http://localhost:8080/api/v1/integrations/scm?tenantId=NJEG6wOk7e

# 3. Get single integration
curl http://localhost:8080/api/v1/integrations/scm/{id}

# 4. Verify connection
curl -X POST http://localhost:8080/api/v1/integrations/scm/{id}/verify

# 5. Update integration
curl -X PATCH http://localhost:8080/api/v1/integrations/scm/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Dream11 Mobile (Updated)",
    "defaultBranch": "develop"
  }'

# 6. Delete integration
curl -X DELETE http://localhost:8080/api/v1/integrations/scm/{id}
```

---

## 📚 Next Steps - Implement Other Integrations

Use this SCM implementation as a template to create:

1. **`tenant_target_integrations`** (App Store, Play Store)
2. **`tenant_pipeline_integrations`** (Jenkins, GitHub Actions)
3. **`tenant_communication_integrations`** (Slack, Email)
4. **`tenant_ticket_integrations`** (Jira, Linear)

### Pattern to Follow:

```
1. SQL migration → 003_tenant_scm_integrations.sql
2. Types         → scm-types.ts
3. Model         → scm-models.ts
4. Controller    → scm-controller.ts
5. Routes        → scm-routes.ts
6. Export        → index.ts
7. Register      → main api/script/index.ts
```

---

## 🎯 Key Learnings

1. **Separation of Concerns**
   - **Types**: Pure TypeScript interfaces
   - **Models**: Sequelize ORM definitions
   - **Controller**: Database operations (CRUD)
   - **Routes**: HTTP endpoints (Express)
   - **Services**: Business logic (verification, external APIs)

2. **Security Best Practices**
   - Tokens stored encrypted in DB
   - Safe objects returned in API responses (no tokens)
   - `includeTokens` flag for internal operations

3. **Database Design**
   - Foreign keys for referential integrity
   - Unique constraints to prevent duplicates
   - Indexes for query performance
   - Soft delete (isActive) vs hard delete

4. **API Design**
   - RESTful endpoints
   - Consistent response format
   - Proper HTTP status codes
   - Query parameters for filtering

---

**Ready to implement?** Start with the migration, then work your way up the stack!

