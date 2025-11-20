import { Request, Response } from "express";
import { getStorage } from "../../storage/storage-instance";
import { SCMIntegrationController } from "../../storage/integrations/scm/scm-controller";
import { 
  SCMType, 
  VerificationStatus, 
  CreateSCMIntegrationDto, 
  UpdateSCMIntegrationDto,
  SafeSCMIntegration 
} from "../../storage/integrations/scm/scm-types";
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

// ============================================================================
// SCM CONTROLLERS
// ============================================================================

/**
 * Helper to get SCM controller from storage singleton
 */
const getSCMController = (): SCMIntegrationController => {
  const storage = getStorage();
  return (storage as any).scmController;
};

/**
 * Controller: Verify SCM Connection
 * POST /tenants/:tenantId/integrations/scm/verify
 * Note: This controller doesn't need storage parameter (only does GitHub API calls)
 */
export async function verifySCMConnection(
  req: Request, 
  res: Response
): Promise<any> {
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

/**
 * Controller: Create or Update SCM Integration
 * POST /tenants/:tenantId/integrations/scm
 */
export async function createOrUpdateSCMIntegration(
  req: Request, 
  res: Response
): Promise<any> {
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
      // Update existing integration (include verification status in single update)
      const updateData: UpdateSCMIntegrationDto = {
        displayName,
        defaultBranch,
        accessToken,
        webhookEnabled,
        webhookSecret,
        webhookUrl,
        senderLogin,
        isActive: true,
        verificationStatus: VerificationStatus.VALID  // Set to VALID since frontend already verified
      };

      const updated = await scmController.update(existing.id, updateData);
      
      return res.status(200).json({
        success: true,
        message: "SCM integration updated successfully",
        integration: sanitizeSCMResponse(updated)
      });
    } else {
      // Create new integration (include verification status since frontend already verified)
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
        verificationStatus: VerificationStatus.VALID,  // Set to VALID since frontend already verified
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

/**
 * Controller: Get SCM Integration for Tenant
 * GET /tenants/:tenantId/integrations/scm
 */
export async function getSCMIntegration(
  req: Request, 
  res: Response
): Promise<any> {
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

/**
 * Controller: Update SCM Integration
 * PATCH /tenants/:tenantId/integrations/scm
 */
export async function updateSCMIntegration(
  req: Request, 
  res: Response
): Promise<any> {
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

/**
 * Controller: Delete SCM Integration
 * DELETE /tenants/:tenantId/integrations/scm
 */
export async function deleteSCMIntegration(
  req: Request, 
  res: Response
): Promise<any> {
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

// ============================================================================
// HELPER FUNCTIONS
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

    // 2. Verify repository access
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
 * Controller: Fetch Branches from SCM Repository
 * GET /tenants/:tenantId/integrations/scm/branches
 */
export async function fetchSCMBranches(
  req: Request,
  res: Response
): Promise<any> {
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

    // Only GitHub is supported for now
    if (integration.scmType !== 'GITHUB') {
      return res.status(400).json({
        success: false,
        error: "Only GitHub repositories are currently supported"
      });
    }

    // Fetch branches from GitHub API
    // Note: integration object from DB has accessToken (not sanitized yet)
    const accessToken = (integration as any).accessToken;
    
    // Debug logging
    console.log('[SCM] fetchSCMBranches - integration:', {
      id: integration.id,
      owner: integration.owner,
      repo: integration.repo,
      hasAccessToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}` : 'MISSING'
    });
    
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: "SCM integration is missing access token"
      });
    }
    
    const branches = await fetchGitHubBranches(
      integration.owner,
      integration.repo,
      accessToken
    );

    return res.status(200).json({
      success: true,
      branches,
      defaultBranch: integration.defaultBranch
    });
  } catch (error: any) {
    console.error(`[SCM] Error fetching branches:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch branches"
    });
  }
}

/**
 * Fetch branches from GitHub repository
 */
async function fetchGitHubBranches(
  owner: string,
  repo: string,
  accessToken: string
): Promise<Array<{ name: string; protected: boolean; default: boolean }>> {
  try {
    // Fetch all branches (paginated)
    let allBranches: any[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limit to 10 pages (1000 branches max)
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
        const errorBody = await response.text();
        console.error(`[SCM] GitHub API error (branches):`, {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new Error(`Failed to fetch branches: ${response.status} ${response.statusText}`);
      }

      const branches = await response.json() as any[];
      allBranches = allBranches.concat(branches);

      // Check if there are more pages
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

    if (!repoResponse.ok) {
      const errorBody = await repoResponse.text();
      console.error(`[SCM] GitHub API error (repo info):`, {
        status: repoResponse.status,
        statusText: repoResponse.statusText,
        body: errorBody
      });
    }

    const repoData = await repoResponse.json() as GitHubRepo;
    const defaultBranch = repoData.default_branch;

    // Format branch data
    return allBranches.map((branch: any) => ({
      name: branch.name,
      protected: branch.protected || false,
      default: branch.name === defaultBranch
    }));
  } catch (error: any) {
    console.error(`[SCM] Error fetching GitHub branches:`, error.message);
    throw error;
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

