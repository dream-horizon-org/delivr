import { Router, Request, Response } from "express";
import { Storage } from "../storage/storage";
import * as tenantPermissions from "../middleware/tenant-permissions";
import { SCMIntegrationController } from "../storage/integrations/scm/scm-controller";
import { 
  SCMType, 
  VerificationStatus, 
  CreateSCMIntegrationDto, 
  UpdateSCMIntegrationDto,
  SafeSCMIntegration 
} from "../storage/integrations/scm/scm-types";
import fetch from "node-fetch";

// GitHub API response types
interface GitHubUser {
  login: string;
  id: number;
  [key: string]: any;
}

interface GitHubRepo {
  full_name: string;
  default_branch: string;
  private: boolean;
  permissions?: {
    pull?: boolean;
    push?: boolean;
    admin?: boolean;
  };
  [key: string]: any;
}

export function createSCMIntegrationRoutes(storage: Storage): Router {
  const router = Router();
  
  // Helper to get SCM controller from storage
  const getSCMController = (): SCMIntegrationController => {
    return (storage as any).scmController;
  };

  router.post(
    "/tenants/:tenantId/integrations/scm/verify",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      const { owner, repo, accessToken, scmType = 'GITHUB' } = req.body;

      // Validation
      if (!owner || !repo || !accessToken) {
        return res.status(400).json({
          success: false,
          error: "owner, repo, and accessToken are required"
        });
      }

      if (scmType !== 'GITHUB') {
        return res.status(400).json({
          success: false,
          error: "Only GITHUB is currently supported"
        });
      }

      try {
        const verificationResult = await verifyGitHubConnection(owner, repo, accessToken);

        return res.status(200).json({
          success: verificationResult.isValid,
          verified: verificationResult.isValid,
          message: verificationResult.message,
          details: verificationResult.details
        });
      } catch (error: any) {
        console.error(`[SCM] Error verifying ${owner}/${repo}:`, error.message);
        return res.status(200).json({
          success: false,
          verified: false,
          message: error.message || "Failed to verify connection",
          error: error.message
        });
      }
    }
  );

  // ============================================================================
  // CREATE or UPDATE SCM Integration (save after verification)
  // ============================================================================
  router.post(
    "/tenants/:tenantId/integrations/scm",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      const tenantId: string = req.params.tenantId;
      const accountId: string = req.user.id;
      const { 
        scmType = 'GITHUB',
        displayName,
        owner,
        repo,
        accessToken,
        defaultBranch = 'main',
        webhookEnabled = false,
        webhookSecret,
        webhookUrl,
        senderLogin
      } = req.body;

      // Validation
      if (!owner || !repo || !accessToken) {
        return res.status(400).json({
          success: false,
          error: "owner, repo, and accessToken are required"
        });
      }

      try {
        const scmController = getSCMController();
        const existing = await scmController.findActiveByTenant(tenantId);
        
        if (existing) {
          // Update existing integration
          const updateData: UpdateSCMIntegrationDto = {
            displayName,
            defaultBranch,
            accessToken,
            webhookEnabled,
            webhookSecret,
            webhookUrl,
            senderLogin,
            isActive: true
          };

          const updated = await scmController.update(existing.id, updateData);
          
          return res.status(200).json({
            success: true,
            message: "SCM integration updated successfully",
            integration: sanitizeSCMResponse(updated)
          });
        } else {
          // Create new integration
          const createData: CreateSCMIntegrationDto = {
            tenantId,
            scmType: scmType as SCMType,
            displayName: displayName || `${owner}/${repo}`,
            owner,
            repo,
            repositoryUrl: `https://github.com/${owner}/${repo}`,
            defaultBranch,
            accessToken,
            webhookEnabled,
            webhookSecret,
            webhookUrl,
            senderLogin,
            createdByAccountId: accountId
          };

          const created = await scmController.create(createData);
          
          return res.status(201).json({
            success: true,
            message: "SCM integration created successfully",
            integration: sanitizeSCMResponse(created)
          });
        }
      } catch (error: any) {
        console.error(`[SCM] Error saving integration:`, error.message);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to save SCM integration"
        });
      }
    }
  );

  // ============================================================================
  // GET SCM Integration for Tenant
  // ============================================================================
  router.get(
    "/tenants/:tenantId/integrations/scm",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      const tenantId: string = req.params.tenantId;

      try {
        const scmController = getSCMController();
        const integration = await scmController.findActiveByTenant(tenantId);

        if (!integration) {
          return res.status(404).json({
            success: false,
            error: "No SCM integration found for this tenant"
          });
        }

        return res.status(200).json({
          success: true,
          integration: sanitizeSCMResponse(integration)
        });
      } catch (error: any) {
        console.error(`[SCM] Error fetching integration:`, error.message);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to fetch SCM integration"
        });
      }
    }
  );

  // ============================================================================
  // UPDATE SCM Integration
  // ============================================================================
  router.patch(
    "/tenants/:tenantId/integrations/scm",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      const tenantId: string = req.params.tenantId;
      const updateData = req.body;

      try {
        const scmController = getSCMController();
        const existing = await scmController.findActiveByTenant(tenantId);

        if (!existing) {
          return res.status(404).json({
            success: false,
            error: "No SCM integration found for this tenant"
          });
        }

        // If updating accessToken, re-verify
        if (updateData.accessToken) {
          const verificationResult = await verifyGitHubConnection(existing.owner, existing.repo, updateData.accessToken);

          if (!verificationResult.isValid) {
            return res.status(400).json({
              success: false,
              error: "Failed to verify updated credentials",
              details: verificationResult.message
            });
          }

          await scmController.updateVerificationStatus(existing.id, VerificationStatus.VALID);
        }

        const updated = await scmController.update(existing.id, updateData);

        return res.status(200).json({
          success: true,
          message: "SCM integration updated successfully",
          integration: sanitizeSCMResponse(updated)
        });
      } catch (error: any) {
        console.error(`[SCM] Error updating integration:`, error.message);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to update SCM integration"
        });
      }
    }
  );

  // ============================================================================
  // DELETE SCM Integration
  // ============================================================================
  router.delete(
    "/tenants/:tenantId/integrations/scm",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response): Promise<any> => {
      const tenantId: string = req.params.tenantId;

      try {
        const scmController = getSCMController();
        const existing = await scmController.findActiveByTenant(tenantId);

        if (!existing) {
          return res.status(404).json({
            success: false,
            error: "No SCM integration found for this tenant"
          });
        }

        await scmController.softDelete(existing.id);

        return res.status(200).json({
          success: true,
          message: "SCM integration deleted successfully"
        });
      } catch (error: any) {
        console.error(`[SCM] Error deleting integration:`, error.message);
        return res.status(500).json({
          success: false,
          error: error.message || "Failed to delete SCM integration"
        });
      }
    }
  );

  return router;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify GitHub connection by testing token and repository access
 */
async function verifyGitHubConnection(
  owner: string, 
  repo: string, 
  accessToken: string
): Promise<{
  isValid: boolean;
  message: string;
  details?: any;
}> {
  try {
    // 1. Verify token by getting authenticated user
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Delivr-App'
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      return {
        isValid: false,
        message: `Invalid GitHub token: ${userResponse.status} ${userResponse.statusText}`,
        details: { error: errorText }
      };
    }

    const userData = await userResponse.json() as GitHubUser;

    // 2. Verify repository access
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Delivr-App'
      }
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return {
          isValid: false,
          message: `Repository ${owner}/${repo} not found or access denied`,
          details: { status: 404 }
        };
      }
      
      const errorText = await repoResponse.text();
      return {
        isValid: false,
        message: `Failed to access repository: ${repoResponse.status} ${repoResponse.statusText}`,
        details: { error: errorText }
      };
    }

    const repoData = await repoResponse.json() as GitHubRepo;

    // 3. Check required permissions
    const permissions = repoData.permissions || {};

    if (!permissions.pull && !permissions.push) {
      return {
        isValid: false,
        message: 'Token does not have sufficient permissions for this repository',
        details: { permissions }
      };
    }

    return {
      isValid: true,
      message: 'Connection verified successfully',
      details: {
        user: userData.login,
        repository: repoData.full_name,
        defaultBranch: repoData.default_branch,
        private: repoData.private,
        permissions
      }
    };
  } catch (error: any) {
    console.error(`[SCM] Verification error for ${owner}/${repo}:`, error.message);
    return {
      isValid: false,
      message: `Connection failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Remove sensitive fields from SCM integration response
 */
function sanitizeSCMResponse(integration: any): SafeSCMIntegration {
  const { accessToken, webhookSecret, ...safe } = integration;
  return {
    ...safe,
    // Return masked versions of sensitive fields
    accessToken: accessToken ? '***' + accessToken.slice(-4) : undefined,
    webhookSecret: webhookSecret ? '***' : undefined
  };
}

