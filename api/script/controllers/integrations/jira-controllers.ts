import { Request, Response } from "express";
import { JiraIntegrationController, JiraConfigurationController } from "../../storage/integrations/jira/jira-controller";
import { 
  JiraIntegrationType,
  JiraVerificationStatus,
  CreateJiraIntegrationDto, 
  UpdateJiraIntegrationDto,
  SafeJiraIntegration,
  CreateJiraConfigurationDto,
  UpdateJiraConfigurationDto,
  PlatformsConfigMap,
  EpicPlatform
} from "../../storage/integrations/jira/jira-types";
import { isValidJiraUrl, isValidProjectKey } from "../../utils/jira-utils";
import { getStorage } from "../../storage/storage-instance";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getJiraIntegrationController(): JiraIntegrationController {
  const storage = getStorage();
  return (storage as any).jiraIntegrationController;
}

function getJiraConfigurationController(): JiraConfigurationController {
  const storage = getStorage();
  return (storage as any).jiraConfigurationController;
}

function getJiraEpicService(): any {
  const storage = getStorage();
  const jiraIntegrationController = (storage as any).jiraIntegrationController;
  return jiraIntegrationController?.epicService;
}

// ============================================================================
// JIRA INTEGRATION CONTROLLERS (Credentials)
// ============================================================================

/**
 * Controller: Create or Update JIRA Integration
 * POST /tenants/:tenantId/integrations/jira
 */
export async function createOrUpdateJiraIntegration(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;
  const accountId: string = req.user.id;
  const { 
    jiraInstanceUrl,
    apiToken,
    email,
    jiraType = JiraIntegrationType.JIRA_CLOUD,
    isEnabled = true
  } = req.body;

  // Validation
  if (!jiraInstanceUrl || !apiToken) {
    return res.status(400).json({
      success: false,
      error: "jiraInstanceUrl and apiToken are required"
    });
  }

  // Validate JIRA instance URL format
  if (!isValidJiraUrl(jiraInstanceUrl)) {
    return res.status(400).json({
      success: false,
      error: "Invalid JIRA instance URL format. Must be a valid HTTP(S) URL."
    });
  }

  // Validate email for JIRA Cloud
  if (jiraType === JiraIntegrationType.JIRA_CLOUD && !email) {
    return res.status(400).json({
      success: false,
      error: "Email is required for JIRA Cloud authentication"
    });
  }

  try {
    const jiraController = getJiraIntegrationController();
    const existing = await jiraController.findByTenantId(tenantId);
    
    if (existing) {
      // Update existing integration
      const updateData: UpdateJiraIntegrationDto = {
        jiraInstanceUrl,
        apiToken,
        email,
        jiraType: jiraType as JiraIntegrationType,
        isEnabled
      };

      const updated = await jiraController.update(tenantId, updateData);
      
      return res.status(200).json({
        success: true,
        message: "JIRA integration updated successfully",
        integration: updated
      });
    } else {
      // Create new integration
      const createData: CreateJiraIntegrationDto = {
        tenantId,
        jiraInstanceUrl,
        apiToken,
        email,
        jiraType: jiraType as JiraIntegrationType,
        isEnabled,
        createdByAccountId: accountId
      };

      const created = await jiraController.create(createData);
      
      return res.status(201).json({
        success: true,
        message: "JIRA integration created successfully",
        integration: created
      });
    }
  } catch (error: any) {
    console.error(`[JIRA] Error saving integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to save JIRA integration"
    });
  }
}

/**
 * Controller: Get JIRA Integration for Tenant
 * GET /tenants/:tenantId/integrations/jira
 */
export async function getJiraIntegration(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const jiraController = getJiraIntegrationController();
    const integration = await jiraController.findByTenantId(tenantId);

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: "No JIRA integration found for this tenant"
      });
    }

    return res.status(200).json({
      success: true,
      integration: integration
    });
  } catch (error: any) {
    console.error(`[JIRA] Error fetching integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch JIRA integration"
    });
  }
}

/**
 * Controller: Delete JIRA Integration
 * DELETE /tenants/:tenantId/integrations/jira
 */
export async function deleteJiraIntegration(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const jiraController = getJiraIntegrationController();
    const existing = await jiraController.findByTenantId(tenantId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "No JIRA integration found for this tenant"
      });
    }

    await jiraController.softDelete(tenantId);

    return res.status(200).json({
      success: true,
      message: "JIRA integration deleted successfully"
    });
  } catch (error: any) {
    console.error(`[JIRA] Error deleting integration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete JIRA integration"
    });
  }
}

/**
 * Controller: Test JIRA Connection
 * POST /tenants/:tenantId/integrations/jira/test
 */
export async function testJiraConnection(
  req: Request, 
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const jiraController = getJiraIntegrationController();
    const integration = await jiraController.findByTenantId(tenantId, true);  // includeTokens

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: "No JIRA integration found for this tenant"
      });
    }

    // TODO: Implement actual JIRA API connection test if needed in the future
    // For now, just return success if integration exists and is enabled
    
    return res.status(200).json({
      success: true,
      message: "JIRA integration is configured",
      details: {
        configured: true,
        enabled: integration.isEnabled,
        jiraInstanceUrl: (integration as any).jiraInstanceUrl,
        jiraType: (integration as any).jiraType
      }
    });
  } catch (error: any) {
    console.error(`[JIRA] Error testing connection:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to test JIRA connection"
    });
  }
}

// ============================================================================
// JIRA CONFIGURATION CONTROLLERS (Reusable Configs)
// ============================================================================

/**
 * Controller: Create JIRA Configuration
 * POST /tenants/:tenantId/jira/configurations
 */
export async function createJiraConfiguration(
  req: Request,
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;
  const accountId: string = req.user.id;
  const { configName, description, platformsConfig } = req.body;

  // Validation
  if (!configName || !platformsConfig) {
    return res.status(400).json({
      success: false,
      error: "configName and platformsConfig are required"
    });
  }

  // Validate platformsConfig structure
  if (typeof platformsConfig !== 'object') {
    return res.status(400).json({
      success: false,
      error: "platformsConfig must be an object with platform keys"
    });
  }

  // Validate each platform config
  for (const [platform, config] of Object.entries(platformsConfig)) {
    if (!['WEB', 'IOS', 'ANDROID'].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: `Invalid platform: ${platform}. Must be WEB, IOS, or ANDROID`
      });
    }

    const platformConfig = config as any;
    if (!platformConfig.projectKey || !platformConfig.readyToReleaseState) {
      return res.status(400).json({
        success: false,
        error: `Platform ${platform} must have projectKey and readyToReleaseState`
      });
    }

    // Validate project key format
    if (!isValidProjectKey(platformConfig.projectKey)) {
      return res.status(400).json({
        success: false,
        error: `Invalid project key format for ${platform}: ${platformConfig.projectKey}`
      });
    }
  }

  try {
    const configController = getJiraConfigurationController();
    
    // Check if config name already exists
    const existing = await configController.findByName(tenantId, configName);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Configuration with name "${configName}" already exists`
      });
    }

    const createData: CreateJiraConfigurationDto = {
      tenantId,
      configName,
      description,
      platformsConfig: platformsConfig as PlatformsConfigMap,
      createdByAccountId: accountId
    };

    const created = await configController.create(createData);

    return res.status(201).json({
      success: true,
      message: "JIRA configuration created successfully",
      configuration: created
    });
  } catch (error: any) {
    console.error(`[JIRA] Error creating configuration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to create JIRA configuration"
    });
  }
}

/**
 * Controller: Get all JIRA Configurations for Tenant
 * GET /tenants/:tenantId/jira/configurations
 */
export async function getJiraConfigurations(
  req: Request,
  res: Response
): Promise<any> {
  const tenantId: string = req.params.tenantId;

  try {
    const configController = getJiraConfigurationController();
    const configurations = await configController.findByTenantId(tenantId);

    return res.status(200).json({
      success: true,
      configurations
    });
  } catch (error: any) {
    console.error(`[JIRA] Error fetching configurations:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch JIRA configurations"
    });
  }
}

/**
 * Controller: Get JIRA Configuration by ID
 * GET /tenants/:tenantId/jira/configurations/:configId
 */
export async function getJiraConfigurationById(
  req: Request,
  res: Response
): Promise<any> {
  const { configId } = req.params;

  try {
    const configController = getJiraConfigurationController();
    const configuration = await configController.findById(configId);

    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: "Configuration not found"
      });
    }

    return res.status(200).json({
      success: true,
      configuration
    });
  } catch (error: any) {
    console.error(`[JIRA] Error fetching configuration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch JIRA configuration"
    });
  }
}

/**
 * Controller: Update JIRA Configuration
 * PUT /tenants/:tenantId/jira/configurations/:configId
 */
export async function updateJiraConfiguration(
  req: Request,
  res: Response
): Promise<any> {
  const { configId } = req.params;
  const { configName, description, platformsConfig, isActive } = req.body;

  // Validate platformsConfig if provided
  if (platformsConfig) {
    if (typeof platformsConfig !== 'object') {
      return res.status(400).json({
        success: false,
        error: "platformsConfig must be an object with platform keys"
      });
    }

    // Validate each platform config
    for (const [platform, config] of Object.entries(platformsConfig)) {
      if (!['WEB', 'IOS', 'ANDROID'].includes(platform)) {
        return res.status(400).json({
          success: false,
          error: `Invalid platform: ${platform}`
        });
      }

      const platformConfig = config as any;
      if (!platformConfig.projectKey || !platformConfig.readyToReleaseState) {
        return res.status(400).json({
          success: false,
          error: `Platform ${platform} must have projectKey and readyToReleaseState`
        });
      }

      if (!isValidProjectKey(platformConfig.projectKey)) {
        return res.status(400).json({
          success: false,
          error: `Invalid project key format for ${platform}: ${platformConfig.projectKey}`
        });
      }
    }
  }

  try {
    const configController = getJiraConfigurationController();
    
    const updateData: UpdateJiraConfigurationDto = {
      configName,
      description,
      platformsConfig: platformsConfig as PlatformsConfigMap,
      isActive
    };

    const updated = await configController.update(configId, updateData);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Configuration not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "JIRA configuration updated successfully",
      configuration: updated
    });
  } catch (error: any) {
    console.error(`[JIRA] Error updating configuration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to update JIRA configuration"
    });
  }
}

/**
 * Controller: Delete JIRA Configuration
 * DELETE /tenants/:tenantId/jira/configurations/:configId
 */
export async function deleteJiraConfiguration(
  req: Request,
  res: Response
): Promise<any> {
  const { configId } = req.params;

  try {
    const configController = getJiraConfigurationController();
    
    const config = await configController.findById(configId);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: "Configuration not found"
      });
    }

    await configController.softDelete(configId);

    return res.status(200).json({
      success: true,
      message: "JIRA configuration deleted successfully"
    });
  } catch (error: any) {
    console.error(`[JIRA] Error deleting configuration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to delete JIRA configuration"
    });
  }
}

/**
 * Controller: Verify JIRA Configuration
 * POST /tenants/:tenantId/jira/configurations/:configId/verify
 * 
 * Validates that project keys exist in Jira and are accessible
 */
export async function verifyJiraConfiguration(
  req: Request,
  res: Response
): Promise<any> {
  const { tenantId, configId } = req.params;

  try {
    // Get configuration
    const configController = getJiraConfigurationController();
    const config = await configController.findById(configId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: "Configuration not found"
      });
    }

    if (!config.isActive) {
      return res.status(400).json({
        success: false,
        error: "Configuration is inactive"
      });
    }

    // Get integration to access Jira API
    const integrationController = getJiraIntegrationController();
    const integration = await integrationController.findByTenantId(tenantId, true);
    
    if (!integration) {
      return res.status(404).json({
        success: false,
        error: "JIRA integration not found. Please configure JIRA credentials first."
      });
    }

    if (!integration.isEnabled) {
      return res.status(400).json({
        success: false,
        error: "JIRA integration is disabled"
      });
    }

    // Create Jira client
    const { createJiraClientForTenant } = require('../../utils/jira-utils');
    const jiraClient = await createJiraClientForTenant(tenantId);
    
    if (!jiraClient) {
      return res.status(500).json({
        success: false,
        error: "Failed to create JIRA client"
      });
    }

    // Verify each platform configuration
    const verificationResults: any = {};
    let allValid = true;

    for (const [platform, platformConfig] of Object.entries(config.platformsConfig)) {
      const { projectKey, readyToReleaseState } = platformConfig as any;
      
      try {
        // Try to get projects to verify access
        const projects = await jiraClient.getProjects();
        const projectExists = projects.some((p: any) => p.key === projectKey);
        
        if (!projectExists) {
          verificationResults[platform] = {
            valid: false,
            projectKey,
            error: `Project ${projectKey} not found or not accessible`
          };
          allValid = false;
        } else {
          verificationResults[platform] = {
            valid: true,
            projectKey,
            readyToReleaseState,
            message: `Project ${projectKey} is accessible`
          };
        }
      } catch (error: any) {
        verificationResults[platform] = {
          valid: false,
          projectKey,
          error: error.message
        };
        allValid = false;
      }
    }

    return res.status(200).json({
      success: true,
      valid: allValid,
      configurationId: configId,
      configurationName: config.configName,
      results: verificationResults,
      message: allValid 
        ? "All platform configurations are valid"
        : "Some platform configurations have issues"
    });
  } catch (error: any) {
    console.error(`[JIRA] Error verifying configuration:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to verify JIRA configuration"
    });
  }
}

// ============================================================================
// JIRA EPIC MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * Controller: Create Jira epics for a release
 * POST /tenants/:tenantId/releases/:releaseId/jira/epics
 * 
 * Now uses jiraConfigId to reference the configuration
 */
export async function createEpicsForRelease(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { releaseId } = req.params;
    const { jiraConfigId, platforms, version, description } = req.body;
    const tenantId = req.params.tenantId;

    // Validation
    if (!jiraConfigId || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'jiraConfigId and platforms (array) are required'
      });
    }

    if (platforms.length === 0) {
      return res.status(400).json({
        error: 'Invalid platforms',
        details: 'At least one platform must be specified'
      });
    }

    if (!version) {
      return res.status(400).json({
        error: 'Missing required field',
        details: 'version is required'
      });
    }

    // Check if Jira integration exists and is enabled
    const jiraIntegrationController = getJiraIntegrationController();
    const integration = await jiraIntegrationController.findByTenantId(tenantId, false);
    if (!integration) {
      return res.status(404).json({
        error: 'Jira integration not configured',
        details: 'Please configure Jira integration before creating epics'
      });
    }

    if (!integration.isEnabled) {
      return res.status(400).json({
        error: 'Jira integration is disabled',
        details: 'Enable Jira integration before creating epics'
      });
    }

    // Check if configuration exists
    const configController = getJiraConfigurationController();
    const config = await configController.findById(jiraConfigId);
    if (!config) {
      return res.status(404).json({
        error: 'Jira configuration not found',
        details: `Configuration with ID ${jiraConfigId} does not exist`
      });
    }

    if (!config.isActive) {
      return res.status(400).json({
        error: 'Jira configuration is inactive',
        details: 'Please activate the configuration before creating epics'
      });
    }

    // Validate that platforms exist in configuration
    for (const platform of platforms) {
      if (!config.platformsConfig[platform as EpicPlatform]) {
        return res.status(400).json({
          error: `Platform ${platform} not configured`,
          details: `Configuration "${config.configName}" does not have settings for platform ${platform}`
        });
      }
    }

    // Get the epic service
    const epicService = getJiraEpicService();
    if (!epicService) {
      return res.status(500).json({
        error: 'Epic service not initialized',
        details: 'Epic management is not properly configured'
      });
    }

    // Create epic records in database
    const epics = await epicService.createEpicsForRelease(
      releaseId,
      jiraConfigId,
      version,
      platforms,
      description
    );

    // Trigger background job to create epics in Jira
    createEpicsInJiraAsync(tenantId, epics, epicService).catch(err => {
      console.error('[Jira] Failed to create epics in Jira (background):', err);
    });

    res.status(201).json({
      success: true,
      message: 'Epic creation initiated',
      epics: epics
    });
  } catch (error: any) {
    console.error('[Jira] Create epics error:', error);
    res.status(500).json({
      error: 'Failed to create epics',
      message: error.message
    });
  }
}

/**
 * Controller: Get Jira epics for a release
 * GET /tenants/:tenantId/releases/:releaseId/jira/epics
 */
export async function getEpicsForRelease(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { releaseId } = req.params;
    const epicService = getJiraEpicService();

    if (!epicService) {
      return res.status(500).json({
        error: 'Epic service not initialized'
      });
    }

    const epics = await epicService.findEpicsByReleaseId(releaseId);

    res.status(200).json({
      success: true,
      epics
    });
  } catch (error: any) {
    console.error('[Jira] Get epics error:', error);
    res.status(500).json({
      error: 'Failed to fetch epics',
      message: error.message
    });
  }
}

/**
 * Controller: Check if epic status matches ready-to-release state
 * GET /tenants/:tenantId/jira/epics/:epicId/check-status
 */
export async function checkEpicStatus(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { epicId, tenantId } = req.params;

    const epicService = getJiraEpicService();
    if (!epicService) {
      return res.status(500).json({
        error: 'Epic service not initialized'
      });
    }

    // Check epic status (resolves config and compares with Jira)
    const result = await epicService.checkEpicReadyStatus(tenantId, epicId);

    if (result.error) {
      return res.status(400).json({
        error: result.error,
        details: 'Failed to check epic status'
      });
    }

    const message = result.approved 
      ? `✅ Epic ${result.epicKey} is ready for release. Status: "${result.currentStatus}" matches required state "${result.requiredStatus}".`
      : `⏳ Epic ${result.epicKey} is NOT ready for release. Current status: "${result.currentStatus}", required: "${result.requiredStatus}".`;

    res.status(200).json({
      success: true,
      approved: result.approved,
      currentStatus: result.currentStatus,
      requiredStatus: result.requiredStatus,
      epicKey: result.epicKey,
      message
    });
  } catch (error: any) {
    console.error('[Jira] Check epic status error:', error);
    res.status(500).json({
      error: 'Failed to check epic status',
      message: error.message
    });
  }
}

/**
 * Controller: Get a single epic by ID
 * GET /tenants/:tenantId/jira/epics/:epicId
 */
export async function getEpicById(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { epicId } = req.params;

    const epicService = getJiraEpicService();
    if (!epicService) {
      return res.status(500).json({
        error: 'Epic service not initialized'
      });
    }

    const epic = await epicService.findEpicById(epicId);

    if (!epic) {
      return res.status(404).json({
        error: 'Epic not found',
        epicId
      });
    }

    res.status(200).json({
      success: true,
      epic
    });
  } catch (error: any) {
    console.error('[Jira] Get epic error:', error);
    res.status(500).json({
      error: 'Failed to fetch epic',
      message: error.message
    });
  }
}

/**
 * Controller: Update an epic
 * PUT /tenants/:tenantId/jira/epics/:epicId
 */
export async function updateEpic(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { epicId } = req.params;
    const { epicTitle, epicDescription } = req.body;

    const epicService = getJiraEpicService();
    if (!epicService) {
      return res.status(500).json({
        error: 'Epic service not initialized'
      });
    }

    // Validate input
    if (!epicTitle && !epicDescription) {
      return res.status(400).json({
        error: 'No update data provided',
        details: 'Provide at least epicTitle or epicDescription'
      });
    }

    // Check if epic exists
    const existingEpic = await epicService.findEpicById(epicId);
    if (!existingEpic) {
      return res.status(404).json({
        error: 'Epic not found',
        epicId
      });
    }

    // Update epic
    const updatedEpic = await epicService.updateEpic(epicId, {
      epicTitle,
      epicDescription
    });

    res.status(200).json({
      success: true,
      message: 'Epic updated successfully',
      epic: updatedEpic
    });
  } catch (error: any) {
    console.error('[Jira] Update epic error:', error);
    res.status(500).json({
      error: 'Failed to update epic',
      message: error.message
    });
  }
}

/**
 * Controller: Delete an epic
 * DELETE /tenants/:tenantId/jira/epics/:epicId
 */
export async function deleteEpic(
  req: Request,
  res: Response
): Promise<any> {
  try {
    const { epicId } = req.params;

    const epicService = getJiraEpicService();
    if (!epicService) {
      return res.status(500).json({
        error: 'Epic service not initialized'
      });
    }

    // Check if epic exists
    const existingEpic = await epicService.findEpicById(epicId);
    if (!existingEpic) {
      return res.status(404).json({
        error: 'Epic not found',
        epicId
      });
    }

    // Delete epic
    const deleted = await epicService.deleteEpic(epicId);

    if (!deleted) {
      return res.status(500).json({
        error: 'Failed to delete epic'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Epic deleted successfully',
      epicId
    });
  } catch (error: any) {
    console.error('[Jira] Delete epic error:', error);
    res.status(500).json({
      error: 'Failed to delete epic',
      message: error.message
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Background async function to create epics in Jira
 */
async function createEpicsInJiraAsync(
  tenantId: string,
  epics: any[],
  epicService: any
): Promise<void> {
  console.log(`[Jira] Creating ${epics.length} epics in Jira for tenant ${tenantId}`);

  for (const epic of epics) {
    try {
      console.log(`[Jira] Creating epic ${epic.id} (${epic.platform}) in Jira...`);
      const result = await epicService.createEpicInJira(tenantId, epic);

      if (result.success) {
        console.log(`[Jira] Epic ${epic.id} created successfully: ${result.epicKey}`);
      } else {
        console.error(`[Jira] Failed to create epic ${epic.id}:`, result.error);
      }
    } catch (error: any) {
      console.error(`[Jira] Exception creating epic ${epic.id}:`, error.message);
    }
  }

  console.log(`[Jira] Finished creating epics for tenant ${tenantId}`);
}
