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
import { decryptIfEncrypted, decryptFields, encryptForStorage } from "../../../../utils/encryption";

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

  try {
    // Decrypt accessToken if encrypted (frontend sends encrypted values)
    const decryptedToken = _encrypted 
      ? decryptIfEncrypted(accessToken, 'accessToken')
      : accessToken;
    
    const verificationResult = await verifyGitHub(owner, repo, decryptedToken);

    // Return error if verification fails
    if (!verificationResult.success) {
      // Read statusCode from result
      const statusCode = verificationResult.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        verified: false,
        error: verificationResult.message,
        details: verificationResult.details
      });
    }

    // Return 200 if verification succeeds
    return res.status(200).json({
      success: true,
      verified: true,
      message: verificationResult.message,
      details: verificationResult.details
    });
  } catch (error: any) {
    console.error(`[GitHub] Error verifying ${owner}/${repo}:`, error.message);
    return res.status(400).json({
      success: false,
      verified: false,
      error: error.message || "Failed to verify connection",
      details: { message : error.message }
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

  // Verify credentials before saving
  const decryptedToken = _encrypted 
  ? decryptIfEncrypted(accessToken, 'accessToken')
  : accessToken;

  const verificationResult = await verifyGitHub(owner, repo, decryptedToken);

  if (!verificationResult.success) {
    // Read statusCode from result
    const statusCode = verificationResult.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      verified: false,
      error: verificationResult.message,
      details: verificationResult.details
    });
  }
  
  try {
    const scmController = getSCMController();
    const existing = await scmController.findActiveByTenant(tenantId);
    
    // Double-layer encryption: Decrypt frontend-encrypted values, then encrypt with backend storage key
    const { decrypted: decryptedData } = decryptFields(
      { accessToken, webhookSecret },
      ['accessToken', 'webhookSecret']
    );
    
    // Re-encrypt with backend storage encryption (double-layer security)
    const backendEncryptedAccessToken = encryptForStorage(decryptedData.accessToken);
    const backendEncryptedWebhookSecret = decryptedData.webhookSecret 
      ? encryptForStorage(decryptedData.webhookSecret)
      : webhookSecret;
    
    if (existing) {
      const updateData: UpdateSCMIntegrationDto = {
        displayName,
        defaultBranch,
        accessToken: backendEncryptedAccessToken, // Backend-encrypted value
        webhookEnabled,
        webhookSecret: backendEncryptedWebhookSecret, // Backend-encrypted value (if provided)
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
        accessToken: backendEncryptedAccessToken, // Backend-encrypted value
        webhookEnabled,
        webhookSecret: backendEncryptedWebhookSecret, // Backend-encrypted value (if provided)
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
      error: "Failed to save GitHub integration",
      details: { 
        errorCode: 'internal_error',
        message: error.message 
      },
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
        error: "No GitHub integration found for this tenant",
        details: {
          errorCode: 'integration_not_found',
          message: 'Set up a GitHub integration first'
        }
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
      error: "Failed to fetch GitHub integration",
      details: { 
        errorCode: 'internal_error',
        message: error.message  
      },
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

    // Double-layer encryption: Decrypt frontend-encrypted values, then encrypt with backend storage key
    const processedUpdateData = { ...updateData };
    const isOwnerUpdated = processedUpdateData.owner !== existing.owner;
    const isRepoUpdated = processedUpdateData.repo !== existing.repo;
    const isTokenUpdated = processedUpdateData.accessToken !== undefined;
    

    if((isOwnerUpdated || isRepoUpdated)&& !(isTokenUpdated)) {
      return res.status(400).json({
        success: false,
        error: "accessToken is required when updating owner or repo",
      });
    }
    if (isOwnerUpdated || isRepoUpdated || isTokenUpdated) {
      const ownerToVerify  =processedUpdateData.owner ?? existing.owner;
      const repoToVerify  =processedUpdateData.repo ?? existing.repo;

      const tokenToVerify = _encrypted
        ? decryptIfEncrypted(processedUpdateData.accessToken, 'accessToken')
        : processedUpdateData.accessToken;

      const verificationResult = await verifyGitHub(ownerToVerify, repoToVerify, tokenToVerify);

      if (!verificationResult.success) {
        // Read statusCode from result
        const statusCode = verificationResult.statusCode || 500;
        return res.status(statusCode).json({
          success: false,
          verified: false,
          error: verificationResult.message,
          details: verificationResult.details
        });
      }

      // Re-encrypt with backend storage encryption (double-layer security)
      processedUpdateData.accessToken = encryptForStorage(tokenToVerify);
      
      await scmController.updateVerificationStatus(existing.id, VerificationStatus.VALID);
    }
    
    if (processedUpdateData.webhookSecret) {
      // Decrypt frontend-encrypted webhookSecret if provided
      const { decrypted: decryptedData } = decryptFields({ webhookSecret: processedUpdateData.webhookSecret }, ['webhookSecret']);
      processedUpdateData.webhookSecret = encryptForStorage(decryptedData.webhookSecret);
    }

    // Store backend-encrypted values in database
    const updated = await scmController.update(existing.id, processedUpdateData);

    return res.status(200).json({
      success: true,
      message: "GitHub integration updated successfully",
      integration: sanitizeSCMResponse(updated)
    });
  } catch (error: any) {
    console.error(`[GitHub] Error updating integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to update GitHub integration",
      details: { 
        errorCode: 'internal_error',
        message: error.message 
      },
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
        error: "No GitHub integration found for this tenant",
        details: {
          errorCode: 'integration_not_found',
          message: 'No GitHub integration exists to delete'
        }
      });
    }

    await scmController.hardDelete(existing.id);

    return res.status(200).json({
      success: true,
      message: "GitHub integration deleted successfully"
    });
  } catch (error: any) {
    console.error(`[GitHub] Error deleting integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to delete GitHub integration",
      details: { 
        errorCode: 'internal_error',
        message: error.message 
      },
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
        error: "No GitHub integration found for this tenant",
        details: {
          errorCode: 'integration_not_found',
          message: 'Set up a GitHub integration first'
        }
      });
    }

    if (!integration.accessToken) {
      return res.status(500).json({
        success: false,
        error: "GitHub integration is missing access token",
        details: {
          errorCode: 'missing_credentials',
          message: 'Integration is missing access token. Update the integration with a valid token.'
        }
      });
    }
    
    // Token is already decrypted by findActiveByTenantWithTokens (decryptFromStorage)
    // No need to decrypt again
    const branches = await fetchBranchesFromGitHub(
      integration.owner,
      integration.repo,
      integration.accessToken
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
      error: "Failed to fetch branches",
      details: { 
        errorCode: 'api_error',
        message: error.message 
      },
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
  success: boolean;
  message: string;
  statusCode?: number;
  details?: {
    errorCode?: string;
    message?: string;
    [key: string]: any;
  };
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
        success: false,
        message: `Invalid GitHub token: ${userResponse.status} ${userResponse.statusText}`,
        statusCode: userResponse.status === 401 ? 401 : 500,
        details: { 
          errorCode: userResponse.status === 401 ? 'invalid_credentials' : 'api_error',
          message: errorText 
        },
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
          success: false,
          message: `Repository ${owner}/${repo} not found or access denied`,
          statusCode: 404,
          details: { 
            errorCode: 'repository_not_found',
            message: `Repository ${owner}/${repo} not found or access denied` 
          }
        };
      }
      
      const errorText = await repoResponse.text();
      return {
        success: false,
        message: `Failed to access repository: ${repoResponse.status} ${repoResponse.statusText}`,
        statusCode: repoResponse.status,
        details: { 
          errorCode: 'api_error',
          message: errorText 
        },
      };
    }

    const repoData = await repoResponse.json() as GitHubRepo;
    const permissions = repoData.permissions || {};

    if (!permissions.pull && !permissions.push) {
      return {
        success: false,
        message: 'Token does not have sufficient permissions for this repository',
        statusCode: 403,
        details: { 
          errorCode: 'insufficient_permissions',
          message: 'Token needs at least pull or push permissions for this repository',
          permissions 
        },
      };
    }

    return {
      success: true,
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
      success: false,
      message: `Connection failed: ${error.message}`,
      statusCode: 503,
      details: { 
        errorCode: 'network_error',
        message: error.message 
      },
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

