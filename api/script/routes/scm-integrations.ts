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

export function createSCMIntegrationRoutes(storage: Storage): Router {
  const router = Router();
  
  // Helper to get SCM controller from storage
  const getSCMController = (): SCMIntegrationController => {
    return (storage as any).scmController;
  };

  router.post(
    "/tenants/:tenantId/integrations/scm/verify",
    tenantPermissions.requireOwner({ storage }),
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
      const tenantId: string = req.params.tenantId;
      const { owner, repo, accessToken, scmType = 'GITHUB' } = req.body;

      console.log(`[SCM-VERIFY] Starting verification for tenant: ${tenantId}, owner: ${owner}, repo: ${repo}, scmType: ${scmType}`);

      // Validation
      if (!owner || !repo || !accessToken) {
        console.log(`[SCM-VERIFY] Validation failed - missing required fields`);
        return res.status(400).json({
          success: false,
          error: "owner, repo, and accessToken are required"
        });
      }

      if (scmType !== 'GITHUB') {
        console.log(`[SCM-VERIFY] Unsupported scmType: ${scmType}`);
        return res.status(400).json({
          success: false,
          error: "Only GITHUB is currently supported"
        });
      }

      try {
        console.log(`[SCM-VERIFY] Calling verifyGitHubConnection for ${owner}/${repo}`);
        // Verify GitHub token and repository access
        const verificationResult = await verifyGitHubConnection(owner, repo, accessToken);

        console.log(`[SCM-VERIFY] Verification result: ${verificationResult.isValid ? 'SUCCESS' : 'FAILED'} - ${verificationResult.message}`);

        return res.status(200).json({
          success: verificationResult.isValid,
          verified: verificationResult.isValid,
          message: verificationResult.message,
          details: verificationResult.details
        });
      } catch (error: any) {
        console.error(`[SCM-VERIFY] Error verifying SCM connection for ${owner}/${repo}:`, error);
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
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
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
        
        // Check if integration already exists
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
        console.error("Error saving SCM integration:", error);
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
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
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
        console.error("Error fetching SCM integration:", error);
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
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
      const tenantId: string = req.params.tenantId;
      const updateData = req.body;

      console.log(`[SCM-UPDATE] Starting update for tenant: ${tenantId}, updating fields:`, Object.keys(updateData));

      try {
        const scmController = getSCMController();
        const existing = await scmController.findActiveByTenant(tenantId);

        if (!existing) {
          console.log(`[SCM-UPDATE] No existing SCM integration found for tenant: ${tenantId}`);
          return res.status(404).json({
            success: false,
            error: "No SCM integration found for this tenant"
          });
        }

        console.log(`[SCM-UPDATE] Found existing integration: ${existing.owner}/${existing.repo} (ID: ${existing.id})`);

        // If updating accessToken, re-verify
        if (updateData.accessToken) {
          console.log(`[SCM-UPDATE] Access token is being updated, re-verifying connection for ${existing.owner}/${existing.repo}`);
          const verificationResult = await verifyGitHubConnection(existing.owner, existing.repo, updateData.accessToken);
          
          console.log(`[SCM-UPDATE] Re-verification result: ${verificationResult.isValid ? 'SUCCESS' : 'FAILED'} - ${verificationResult.message}`);

          if (!verificationResult.isValid) {
            return res.status(400).json({
              success: false,
              error: "Failed to verify updated credentials",
              details: verificationResult.message
            });
          }

          // Update verification status separately
          console.log(`[SCM-UPDATE] Updating verification status to VALID for integration ID: ${existing.id}`);
          await scmController.updateVerificationStatus(existing.id, VerificationStatus.VALID);
        }

        console.log(`[SCM-UPDATE] Updating integration ID: ${existing.id}`);
        const updated = await scmController.update(existing.id, updateData);

        console.log(`[SCM-UPDATE] Successfully updated integration for tenant: ${tenantId}`);

        return res.status(200).json({
          success: true,
          message: "SCM integration updated successfully",
          integration: sanitizeSCMResponse(updated)
        });
      } catch (error: any) {
        console.error(`[SCM-UPDATE] Error updating SCM integration for tenant ${tenantId}:`, error);
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
    async (req: Request, res: Response, next: (err?: any) => void): Promise<any> => {
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
        console.error("Error deleting SCM integration:", error);
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
  const maskedToken = accessToken ? `${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}` : 'N/A';
  console.log(`[VERIFY-GITHUB] Starting verification for ${owner}/${repo} with token: ${maskedToken}`);

  try {
    // 1. Verify token by getting authenticated user
    console.log(`[VERIFY-GITHUB] Step 1: Verifying token with GitHub API /user endpoint`);
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Delivr-App'
      }
    });

    console.log(`[VERIFY-GITHUB] GitHub /user API response status: ${userResponse.status} ${userResponse.statusText}`);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`[VERIFY-GITHUB] Token verification failed: ${userResponse.status} ${userResponse.statusText}`, errorText);
      return {
        isValid: false,
        message: `Invalid GitHub token: ${userResponse.status} ${userResponse.statusText}`,
        details: { error: errorText }
      };
    }

    const userData = await userResponse.json();
    console.log(`[VERIFY-GITHUB] Token verified successfully for user: ${(userData as any).login}`);

    // 2. Verify repository access
    console.log(`[VERIFY-GITHUB] Step 2: Verifying repository access for ${owner}/${repo}`);
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Delivr-App'
      }
    });

    console.log(`[VERIFY-GITHUB] GitHub /repos API response status: ${repoResponse.status} ${repoResponse.statusText}`);

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        console.error(`[VERIFY-GITHUB] Repository ${owner}/${repo} not found or access denied (404)`);
        return {
          isValid: false,
          message: `Repository ${owner}/${repo} not found or access denied`,
          details: { status: 404 }
        };
      }
      
      const errorText = await repoResponse.text();
      console.error(`[VERIFY-GITHUB] Failed to access repository: ${repoResponse.status} ${repoResponse.statusText}`, errorText);
      return {
        isValid: false,
        message: `Failed to access repository: ${repoResponse.status} ${repoResponse.statusText}`,
        details: { error: errorText }
      };
    }

    const repoData = await repoResponse.json();
    console.log(`[VERIFY-GITHUB] Repository access verified: ${(repoData as any).full_name}, private: ${(repoData as any).private}`);

    // 3. Check required permissions
    console.log(`[VERIFY-GITHUB] Step 3: Checking repository permissions`);
    const permissions = (repoData as any).permissions || {};
    console.log(`[VERIFY-GITHUB] Permissions:`, { pull: permissions.pull, push: permissions.push, admin: permissions.admin });

    if (!permissions.pull && !permissions.push) {
      console.error(`[VERIFY-GITHUB] Insufficient permissions - token does not have pull or push access`);
      return {
        isValid: false,
        message: 'Token does not have sufficient permissions for this repository',
        details: { permissions }
      };
    }

    console.log(`[VERIFY-GITHUB] ✅ Verification successful for ${owner}/${repo} - User: ${(userData as any).login}, Branch: ${(repoData as any).default_branch}`);

    return {
      isValid: true,
      message: 'Connection verified successfully',
      details: {
        user: (userData as any).login,
        repository: (repoData as any).full_name,
        defaultBranch: (repoData as any).default_branch,
        private: (repoData as any).private,
        permissions
      }
    };
  } catch (error: any) {
    console.error(`[VERIFY-GITHUB] ❌ Verification failed for ${owner}/${repo} with error:`, error);
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

