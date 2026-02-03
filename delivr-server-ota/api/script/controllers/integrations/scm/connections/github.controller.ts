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
import { HTTP_STATUS } from "../../../../constants/http";
import {
  successResponse,
  successMessageResponse,
  notFoundResponse,
  simpleErrorResponse,
  detailedErrorResponse
} from "../../../../utils/response.utils";

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

/**
 * SCM Verification Result - Discriminated Union
 * Similar to CI/CD VerifyResult pattern
 */
export type SCMVerifyResult = 
  | { 
      success: true; 
      message: string;
      details?: {
        user?: string;
        repository?: string;
        defaultBranch?: string;
        private?: boolean;
        permissions?: Record<string, unknown>;
      };
    }
  | { 
      success: false; 
      message: string;
      statusCode: number;
      errorCode: string;
      details?: string[];
    };

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
    if (verificationResult.success === false) {
      return res.status(verificationResult.statusCode).json({
        ...detailedErrorResponse(
          verificationResult.message, 
          verificationResult.errorCode, 
          verificationResult.details || [verificationResult.message]
        ),
        verified: false
      });
    }

    // Return 200 if verification succeeds
    return res.status(HTTP_STATUS.OK).json({
      ...successResponse({
        verified: true,
        ...verificationResult.details
      }),
      message: verificationResult.message
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to verify connection";
    console.error(`[GitHub] Error verifying ${owner}/${repo}:`, errorMessage);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      ...detailedErrorResponse(errorMessage, 'verification_error', [errorMessage]),
      verified: false
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

  if (verificationResult.success === false) {
    return res.status(verificationResult.statusCode).json({
      ...detailedErrorResponse(
        verificationResult.message, 
        verificationResult.errorCode, 
        verificationResult.details || [verificationResult.message]
      ),
      verified: false
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
      
      return res.status(HTTP_STATUS.OK).json(
        successResponse(sanitizeSCMResponse(updated), "GitHub integration updated successfully")
      );
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
      
      return res.status(HTTP_STATUS.CREATED).json(
        successResponse(sanitizeSCMResponse(created), "GitHub integration created successfully")
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to save GitHub integration";
    console.error(`[GitHub] Error saving integration:`, errorMessage);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      detailedErrorResponse("Failed to save GitHub integration", 'internal_error', [errorMessage])
    );
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
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse("GitHub integration", 'integration_not_found')
      );
    }

    return res.status(HTTP_STATUS.OK).json(
      successResponse(sanitizeSCMResponse(integration))
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch GitHub integration";
    console.error(`[GitHub] Error fetching integration:`, errorMessage);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      detailedErrorResponse("Failed to fetch GitHub integration", 'internal_error', [errorMessage])
    );
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
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse("GitHub integration", 'integration_not_found')
      );
    }

    // Double-layer encryption: Decrypt frontend-encrypted values, then encrypt with backend storage key
    const processedUpdateData = { ...updateData };
    const isOwnerUpdated = processedUpdateData.owner !== existing.owner;
    const isRepoUpdated = processedUpdateData.repo !== existing.repo;
    const isTokenUpdated = processedUpdateData.accessToken !== undefined;
    

    if((isOwnerUpdated || isRepoUpdated)&& !(isTokenUpdated)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        simpleErrorResponse("accessToken is required when updating owner or repo", 'missing_token')
      );
    }
    if (isOwnerUpdated || isRepoUpdated || isTokenUpdated) {
      const ownerToVerify  =processedUpdateData.owner ?? existing.owner;
      const repoToVerify  =processedUpdateData.repo ?? existing.repo;

      const tokenToVerify = _encrypted
        ? decryptIfEncrypted(processedUpdateData.accessToken, 'accessToken')
        : processedUpdateData.accessToken;

      const verificationResult = await verifyGitHub(ownerToVerify, repoToVerify, tokenToVerify);

      if (verificationResult.success === false) {
        return res.status(verificationResult.statusCode).json({
          ...detailedErrorResponse(
            verificationResult.message, 
            verificationResult.errorCode, 
            verificationResult.details || [verificationResult.message]
          ),
          verified: false
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

    return res.status(HTTP_STATUS.OK).json(
      successResponse(sanitizeSCMResponse(updated), "GitHub integration updated successfully")
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update GitHub integration";
    console.error(`[GitHub] Error updating integration:`, errorMessage);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      detailedErrorResponse("Failed to update GitHub integration", 'internal_error', [errorMessage])
    );
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
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse("GitHub integration", 'integration_not_found')
      );
    }

    await scmController.hardDelete(existing.id);

    return res.status(HTTP_STATUS.OK).json(
      successMessageResponse("GitHub integration deleted successfully")
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete GitHub integration";
    console.error(`[GitHub] Error deleting integration:`, errorMessage);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      detailedErrorResponse("Failed to delete GitHub integration", 'internal_error', [errorMessage])
    );
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
      return res.status(HTTP_STATUS.NOT_FOUND).json(
        notFoundResponse("GitHub integration", 'integration_not_found')
      );
    }

    if (!integration.accessToken) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        simpleErrorResponse("GitHub integration is missing access token", 'missing_credentials')
      );
    }
    
    // Token is already decrypted by findActiveByTenantWithTokens (decryptFromStorage)
    // No need to decrypt again
    const branches = await fetchBranchesFromGitHub(
      integration.owner,
      integration.repo,
      integration.accessToken
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      branches,
      defaultBranch: integration.defaultBranch
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch branches";
    console.error(`[GitHub] Error fetching branches:`, errorMessage);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
      detailedErrorResponse("Failed to fetch branches", 'api_error', [errorMessage])
    );
  }
}

// ============================================================================
// VERIFICATION HELPERS
// ============================================================================

async function verifyGitHub(
  owner: string, 
  repo: string, 
  accessToken: string
): Promise<SCMVerifyResult> {
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
        errorCode: userResponse.status === 401 ? 'invalid_credentials' : 'api_error',
        details: [errorText]
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
          errorCode: 'repository_not_found',
          details: [`Repository ${owner}/${repo} not found or access denied`]
        };
      }
      
      const errorText = await repoResponse.text();
      return {
        success: false,
        message: `Failed to access repository: ${repoResponse.status} ${repoResponse.statusText}`,
        statusCode: repoResponse.status,
        errorCode: 'api_error',
        details: [errorText]
      };
    }

    const repoData = await repoResponse.json() as GitHubRepo;
    const permissions = repoData.permissions || {};

    if (!permissions.pull && !permissions.push) {
      return {
        success: false,
        message: 'Token does not have sufficient permissions for this repository',
        statusCode: 403,
        errorCode: 'insufficient_permissions',
        details: ['Token needs at least pull or push permissions for this repository']
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[GitHub] Verification error for ${owner}/${repo}:`, errorMessage);
    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
      statusCode: 503,
      errorCode: 'network_error',
      details: [errorMessage]
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[GitHub] Error fetching branches:`, errorMessage);
    throw error;
  }
}

