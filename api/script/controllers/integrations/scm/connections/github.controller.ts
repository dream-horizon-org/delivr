/**
 * GitHub SCM Controller
 * Handles GitHub-specific integration operations
 */

import { Request, Response } from "express";
import { getStorage } from "../../../../storage/storage-instance";
import { SCMIntegrationController } from "../../../../storage/integrations/scm/scm-controller";
import { 
  SCMType, 
  VerificationStatus, 
  CreateSCMIntegrationDto, 
  UpdateSCMIntegrationDto,
  SafeSCMIntegration 
} from "../../../../storage/integrations/scm/scm-types";
import fetch from "node-fetch";
import { decryptIfEncrypted } from "../../../../utils/encryption.utils";

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// HELPERS
// ============================================================================

const getSCMController = (): SCMIntegrationController => {
  const storage = getStorage();
  return (storage as any).scmController;
};

const sanitizeSCMResponse = (integration: any): SafeSCMIntegration => {
  const { accessToken, webhookSecret, ...safe } = integration;
  return {
    ...safe,
    accessToken: accessToken ? '***' + accessToken.slice(-4) : undefined,
    webhookSecret: webhookSecret ? '***' : undefined
  };
};

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * Verify GitHub Connection
 * POST /tenants/:tenantId/integrations/scm/github/verify
 */
export async function verifyGitHubConnection(
  req: Request, 
  res: Response
): Promise<any> {
  const { owner, repo, accessToken, _encrypted } = req.body;

  if (!owner || !repo || !accessToken) {
    return res.status(400).json({
      success: false,
      error: "owner, repo, and accessToken are required"
    });
  }

  try {
    // Decrypt accessToken if encrypted (frontend sends encrypted values)
    const decryptedToken = _encrypted 
      ? decryptIfEncrypted(accessToken, 'accessToken')
      : accessToken;
    
    const verificationResult = await verifyGitHub(owner, repo, decryptedToken);

    return res.status(200).json({
      success: verificationResult.isValid,
      verified: verificationResult.isValid,
      message: verificationResult.message,
      details: verificationResult.details
    });
  } catch (error: any) {
    console.error(`[GitHub] Error verifying ${owner}/${repo}:`, error.message);
    return res.status(200).json({
      success: false,
      verified: false,
      message: error.message || "Failed to verify connection",
      error: error.message
    });
  }
}

/**
 * Create GitHub Integration
 * POST /tenants/:tenantId/integrations/scm/github
 */
export async function createGitHubConnection(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;
  const accountId: string = req.user.id;
  const { 
    displayName,
    owner,
    repo,
    accessToken,
    defaultBranch = 'main',
    webhookEnabled = false,
    webhookSecret,
    webhookUrl,
    senderLogin,
    _encrypted
  } = req.body;

  if (!owner || !repo || !accessToken) {
    return res.status(400).json({
      success: false,
      error: "owner, repo, and accessToken are required"
    });
  }

  try {
    const scmController = getSCMController();
    const existing = await scmController.findActiveByTenant(tenantId);
    
    // Store the encrypted value in database (accessToken as received from frontend)
    // The frontend encrypts sensitive values before sending
    // We store as-is to keep data encrypted at rest
    console.log('[GitHub] Storing accessToken (encrypted from frontend)');
    
    if (existing) {
      const updateData: UpdateSCMIntegrationDto = {
        displayName,
        defaultBranch,
        accessToken, // Store encrypted value as-is
        webhookEnabled,
        webhookSecret,
        webhookUrl,
        senderLogin,
        isActive: true,
        verificationStatus: VerificationStatus.VALID
      };

      const updated = await scmController.update(existing.id, updateData);
      
      return res.status(200).json({
        success: true,
        message: "GitHub integration updated successfully",
        integration: sanitizeSCMResponse(updated)
      });
    } else {
      const createData: CreateSCMIntegrationDto = {
        tenantId,
        scmType: 'GITHUB' as SCMType,
        displayName: displayName || `${owner}/${repo}`,
        owner,
        repo,
        repositoryUrl: `https://github.com/${owner}/${repo}`,
        defaultBranch,
        accessToken, // Store encrypted value as-is
        webhookEnabled,
        webhookSecret,
        webhookUrl,
        senderLogin,
        verificationStatus: VerificationStatus.VALID,
        createdByAccountId: accountId
      };

      const created = await scmController.create(createData);
      
      return res.status(201).json({
        success: true,
        message: "GitHub integration created successfully",
        integration: sanitizeSCMResponse(created)
      });
    }
  } catch (error: any) {
    console.error(`[GitHub] Error saving integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save GitHub integration"
    });
  }
}

/**
 * Get GitHub Integration
 * GET /tenants/:tenantId/integrations/scm/github
 */
export async function getGitHubConnection(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const scmController = getSCMController();
    const integration = await scmController.findActiveByTenant(tenantId);

    if (!integration || integration.scmType !== 'GITHUB') {
      return res.status(404).json({
        success: false,
        error: "No GitHub integration found for this tenant"
      });
    }

    return res.status(200).json({
      success: true,
      integration: sanitizeSCMResponse(integration)
    });
  } catch (error: any) {
    console.error(`[GitHub] Error fetching integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch GitHub integration"
    });
  }
}

/**
 * Update GitHub Integration
 * PATCH /tenants/:tenantId/integrations/scm/github
 */
export async function updateGitHubConnection(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;
  const { _encrypted, ...updateData } = req.body;

  try {
    const scmController = getSCMController();
    const existing = await scmController.findActiveByTenant(tenantId);

    if (!existing || existing.scmType !== 'GITHUB') {
      return res.status(404).json({
        success: false,
        error: "No GitHub integration found for this tenant"
      });
    }

    if (updateData.accessToken) {
      // Decrypt accessToken for verification if encrypted
      const decryptedToken = _encrypted 
        ? decryptIfEncrypted(updateData.accessToken, 'accessToken')
        : updateData.accessToken;
      
      const verificationResult = await verifyGitHub(
        existing.owner, 
        existing.repo, 
        decryptedToken
      );

      if (!verificationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: "Failed to verify updated credentials",
          details: verificationResult.message
        });
      }

      await scmController.updateVerificationStatus(existing.id, VerificationStatus.VALID);
    }

    // Store encrypted value in database (updateData still has original encrypted token)
    const updated = await scmController.update(existing.id, updateData);

    return res.status(200).json({
      success: true,
      message: "GitHub integration updated successfully",
      integration: sanitizeSCMResponse(updated)
    });
  } catch (error: any) {
    console.error(`[GitHub] Error updating integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update GitHub integration"
    });
  }
}

/**
 * Delete GitHub Integration
 * DELETE /tenants/:tenantId/integrations/scm/github
 */
export async function deleteGitHubConnection(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const scmController = getSCMController();
    const existing = await scmController.findActiveByTenant(tenantId);

    if (!existing || existing.scmType !== 'GITHUB') {
      return res.status(404).json({
        success: false,
        error: "No GitHub integration found for this tenant"
      });
    }

    await scmController.softDelete(existing.id);

    return res.status(200).json({
      success: true,
      message: "GitHub integration deleted successfully"
    });
  } catch (error: any) {
    console.error(`[GitHub] Error deleting integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete GitHub integration"
    });
  }
}

/**
 * Fetch Branches from GitHub Repository
 * GET /tenants/:tenantId/integrations/scm/github/branches
 */
export async function fetchGitHubBranches(
  req: Request,
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const scmController = getSCMController();
    const integration = await scmController.findActiveByTenantWithTokens(tenantId);

    if (!integration || integration.scmType !== 'GITHUB') {
      return res.status(404).json({
        success: false,
        error: "No GitHub integration found for this tenant"
      });
    }

    if (!integration.accessToken) {
      return res.status(500).json({
        success: false,
        error: "GitHub integration is missing access token"
      });
    }
    
    // Decrypt the stored token before making API calls
    const decryptedToken = decryptIfEncrypted(integration.accessToken, 'accessToken');
    
    const branches = await fetchBranchesFromGitHub(
      integration.owner,
      integration.repo,
      decryptedToken
    );

    return res.status(200).json({
      success: true,
      branches,
      defaultBranch: integration.defaultBranch
    });
  } catch (error: any) {
    console.error(`[GitHub] Error fetching branches:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch branches"
    });
  }
}

// ============================================================================
// VERIFICATION HELPERS
// ============================================================================

async function verifyGitHub(
  owner: string, 
  repo: string, 
  accessToken: string
): Promise<{
  isValid: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Verify token by getting authenticated user
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
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

    // Verify repository access
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
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
    console.error(`[GitHub] Verification error for ${owner}/${repo}:`, error.message);
    return {
      isValid: false,
      message: `Connection failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function fetchBranchesFromGitHub(
  owner: string,
  repo: string,
  accessToken: string
): Promise<Array<{ name: string; protected: boolean; default: boolean }>> {
  try {
    let allBranches: any[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore && page <= 10) {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/branches?per_page=${perPage}&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'Delivr-App'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.status} ${response.statusText}`);
      }

      const branches = await response.json() as any[];
      allBranches = allBranches.concat(branches);

      const linkHeader = response.headers.get('link');
      hasMore = linkHeader ? linkHeader.includes('rel="next"') : false;
      page++;
    }

    // Get repository info for default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Delivr-App'
      }
    });

    const repoData = await repoResponse.json() as GitHubRepo;
    const defaultBranch = repoData.default_branch;

    return allBranches.map((branch: any) => ({
      name: branch.name,
      protected: branch.protected || false,
      default: branch.name === defaultBranch
    }));
  } catch (error: any) {
    console.error(`[GitHub] Error fetching branches:`, error.message);
    throw error;
  }
}

