/**
 * Jira Epic Service
 * 
 * Business logic layer for Jira epic management
 * Handles epic creation, updates, and synchronization with Jira API
 * 
 * Updated to use jira_configurations table via jiraConfigId
 */

import { customAlphabet } from 'nanoid';
import { Model, ModelStatic } from 'sequelize';
import {
  CreateEpicDto,
  ReleaseJiraEpic,
  EpicCreationStatus,
  EpicPlatform,
  PlatformJiraConfig
} from './jira-types';
import { JiraConfigurationController } from './jira-controller';

// Create nanoid generator
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 21);

// Type for Jira client factory function
type JiraClientFactory = (tenantId: string) => Promise<any>;

/**
 * Jira Epic Service Class
 * Manages epic CRUD operations and Jira API interactions
 */
export class JiraEpicService {
  private epicModel: ModelStatic<Model<any, any>>
  private releaseModel: ModelStatic<Model<any, any>> | null;
  private configController: JiraConfigurationController | null = null;
  private jiraClientFactory: JiraClientFactory | null = null;

  constructor(
    epicModel: ModelStatic<Model<any, any>>,
    releaseModel?: ModelStatic<Model<any, any>>
  ) {
    this.epicModel = epicModel;
    this.releaseModel = releaseModel || null;
  }

  /**
   * Set the Jira configuration controller (for resolving configs)
   */
  setConfigController(controller: JiraConfigurationController): void {
    this.configController = controller;
  }

  /**
   * Set the Jira client factory (used to avoid circular dependency)
   */
  setJiraClientFactory(factory: JiraClientFactory): void {
    this.jiraClientFactory = factory;
  }

  // ==========================================================================
  // CREATE
  // ==========================================================================

  /**
   * Create a new epic record in the database
   * 
   * Uses jiraConfigId to reference the configuration,
   * which contains the platform-specific project key and ready state
   * 
   * @param data - Epic creation data
   * @returns Created epic
   */
  async createEpic(data: CreateEpicDto): Promise<ReleaseJiraEpic> {
    const epic = await this.epicModel.create({
      id: nanoid(),
      releaseId: data.releaseId,
      platform: data.platform,
      jiraConfigId: data.jiraConfigId,
      epicTitle: data.epicTitle,
      epicDescription: data.epicDescription,
      creationStatus: EpicCreationStatus.PENDING,
      creationError: null,
      jiraEpicKey: null,
      jiraEpicId: null,
      jiraEpicUrl: null,
      jiraCreatedAt: null
    });

    return epic.toJSON() as ReleaseJiraEpic;
  }

  /**
   * Create multiple epics for a release
   * 
   * Uses jiraConfigId to reference the configuration,
   * which contains the platform-specific settings
   * 
   * @param releaseId - Release ID
   * @param jiraConfigId - Configuration ID
   * @param version - Release version
   * @param platforms - Platforms to create epics for
   * @param description - Epic description (optional)
   * @returns Array of created epics
   */
  async createEpicsForRelease(
    releaseId: string,
    jiraConfigId: string,
    version: string,
    platforms: EpicPlatform[],
    description?: string
  ): Promise<ReleaseJiraEpic[]> {
    const epics: ReleaseJiraEpic[] = [];

    for (const platform of platforms) {
      const epicTitle = `Release ${version} - ${platform}`;
      const epicDescription = description || `Epic for ${platform} release ${version}`;

      const epic = await this.createEpic({
        releaseId,
        platform,
        jiraConfigId,
        epicTitle,
        epicDescription
      });

      epics.push(epic);
    }

    return epics;
  }

  // ==========================================================================
  // READ
  // ==========================================================================

  /**
   * Find epic by ID
   * 
   * @param id - Epic ID
   * @returns Epic or null
   */
  async findEpicById(id: string): Promise<ReleaseJiraEpic | null> {
    const epic = await this.epicModel.findOne({
      where: { id }
    });

    if (!epic) return null;
    return epic.toJSON() as ReleaseJiraEpic;
  }

  /**
   * Find all epics for a release
   * 
   * @param releaseId - Release ID
   * @returns Array of epics
   */
  async findEpicsByReleaseId(releaseId: string): Promise<ReleaseJiraEpic[]> {
    const epics = await this.epicModel.findAll({
      where: { releaseId },
      order: [['createdAt', 'ASC']]
    });

    return epics.map(e => e.toJSON() as ReleaseJiraEpic);
  }

  /**
   * Find epic by release ID and platform
   * 
   * @param releaseId - Release ID
   * @param platform - Platform
   * @returns Epic or null
   */
  async findEpicByReleaseAndPlatform(
    releaseId: string,
    platform: EpicPlatform
  ): Promise<ReleaseJiraEpic | null> {
    const epic = await this.epicModel.findOne({
      where: { 
        releaseId,
        platform 
      }
    });

    if (!epic) return null;
    return epic.toJSON() as ReleaseJiraEpic;
  }

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  /**
   * Update epic status
   * 
   * @param id - Epic ID
   * @param status - New status
   * @param error - Error message (optional)
   * @returns Updated epic
   */
  async updateEpicStatus(
    id: string,
    status: EpicCreationStatus,
    error?: string
  ): Promise<ReleaseJiraEpic | null> {
    const epic = await this.epicModel.findOne({
      where: { id }
    });

    if (!epic) return null;

    await epic.update({
        creationStatus: status,
        creationError: error || null
    });

    return epic.toJSON() as ReleaseJiraEpic;
  }

  /**
   * Update epic with Jira response data
   * 
   * @param id - Epic ID
   * @param jiraEpicKey - Jira epic key (e.g., "FE-123")
   * @param jiraEpicId - Jira epic ID
   * @param jiraEpicUrl - Jira epic URL
   * @returns Updated epic
   */
  async updateEpicWithJiraData(
    id: string,
    jiraEpicKey: string,
    jiraEpicId: string,
    jiraEpicUrl: string
  ): Promise<ReleaseJiraEpic | null> {
    const epic = await this.epicModel.findOne({
      where: { id }
    });

    if (!epic) return null;

    await epic.update({
      jiraEpicKey,
      jiraEpicId,
      jiraEpicUrl,
        creationStatus: EpicCreationStatus.CREATED,
        jiraCreatedAt: new Date()
    });

    return epic.toJSON() as ReleaseJiraEpic;
  }

  /**
   * Update epic details (title, description)
   * 
   * @param id - Epic ID
   * @param data - Update data (epicTitle, epicDescription)
   * @returns Updated epic or null
   */
  async updateEpic(
    id: string,
    data: { epicTitle?: string; epicDescription?: string }
  ): Promise<ReleaseJiraEpic | null> {
    const epic = await this.epicModel.findOne({
      where: { id }
    });

    if (!epic) return null;

    const updateData: any = {};
    if (data.epicTitle !== undefined) updateData.epicTitle = data.epicTitle;
    if (data.epicDescription !== undefined) updateData.epicDescription = data.epicDescription;

    if (Object.keys(updateData).length === 0) {
      return epic.toJSON() as ReleaseJiraEpic;
    }

    await epic.update(updateData);
    return epic.toJSON() as ReleaseJiraEpic;
  }

  // ==========================================================================
  // JIRA API INTEGRATION
  // ==========================================================================

  /**
   * Create epic in Jira using the API
   * 
   * Resolves the platform-specific project key from the configuration
   * 
   * @param tenantId - Tenant ID
   * @param epic - Epic record
   * @returns Result with epic key or error
   */
  async createEpicInJira(
    tenantId: string,
    epic: ReleaseJiraEpic
  ): Promise<{ success: boolean; epicKey?: string; epicId?: string; epicUrl?: string; error?: string }> {
    try {
      // Update status to CREATING
      await this.updateEpicStatus(epic.id, EpicCreationStatus.CREATING);

      // Resolve platform config from jiraConfigId
      if (!this.configController) {
        throw new Error('Configuration controller not initialized');
      }

      const platformConfig = await this.configController.resolvePlatformConfig(
        epic.jiraConfigId,
        epic.platform
      );

      if (!platformConfig) {
        throw new Error(`No configuration found for platform ${epic.platform} in config ${epic.jiraConfigId}`);
      }

      const projectKey = platformConfig.projectKey;

      // Get Jira API client
      if (!this.jiraClientFactory) {
        throw new Error('Jira client factory not initialized');
      }

      const jiraClient = await this.jiraClientFactory(tenantId);

      if (!jiraClient) {
        throw new Error('Failed to create Jira client. Check integration configuration.');
      }

      // Create epic in Jira
      console.log(`[JiraEpicService] Creating epic in Jira project ${projectKey}:`, epic.epicTitle);

      const result = await jiraClient.createEpic(
        projectKey,
        epic.epicTitle,
        epic.epicDescription
      );

      // Update epic with Jira data
      await this.updateEpicWithJiraData(
        epic.id,
        result.key,
        result.id,
        result.url
      );

      console.log(`[JiraEpicService] Epic created successfully:`, result.key);

      return {
        success: true,
        epicKey: result.key,
        epicId: result.id,
        epicUrl: result.url
      };
    } catch (error: any) {
      console.error(`[JiraEpicService] Failed to create epic in Jira:`, error.message);

      // Update epic status to FAILED
      await this.updateEpicStatus(epic.id, EpicCreationStatus.FAILED, error.message);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if epic is ready for release
   * Compares Jira epic status with the ready-to-release state from configuration
   * 
   * @param tenantId - Tenant ID
   * @param epicId - Epic ID
   * @returns Status check result
   */
  async checkEpicReadyStatus(
    tenantId: string,
    epicId: string
  ): Promise<{ 
    approved: boolean; 
    currentStatus: string; 
    requiredStatus: string;
    epicKey: string;
    error?: string;
  }> {
    try {
      // Get epic from database
      const epic = await this.findEpicById(epicId);

      if (!epic) {
        throw new Error('Epic not found');
      }

      if (epic.creationStatus !== EpicCreationStatus.CREATED) {
        throw new Error(`Epic is not created in Jira yet. Status: ${epic.creationStatus}`);
      }

      if (!epic.jiraEpicKey) {
        throw new Error('Epic does not have a Jira key');
      }

      // Resolve platform config to get ready-to-release state
      if (!this.configController) {
        throw new Error('Configuration controller not initialized');
      }

      const platformConfig = await this.configController.resolvePlatformConfig(
        epic.jiraConfigId,
        epic.platform
      );

      if (!platformConfig) {
        throw new Error(`No configuration found for platform ${epic.platform}`);
      }

      const readyToReleaseState = platformConfig.readyToReleaseState;

      // Get Jira client
      if (!this.jiraClientFactory) {
        throw new Error('Jira client factory not initialized');
      }

      const jiraClient = await this.jiraClientFactory(tenantId);

      if (!jiraClient) {
        throw new Error('Failed to create Jira client');
      }

      // Get current status from Jira
      const statusInfo = await jiraClient.getEpicStatus(epic.jiraEpicKey);
      const currentStatus = statusInfo.name;

      // Compare status (case-insensitive)
      const approved = currentStatus.toLowerCase().trim() === readyToReleaseState.toLowerCase().trim();

      return {
        approved,
        currentStatus,
        requiredStatus: readyToReleaseState,
        epicKey: epic.jiraEpicKey
      };
    } catch (error: any) {
      console.error('[JiraEpicService] Error checking epic status:', error.message);
      
      return {
        approved: false,
        currentStatus: 'Unknown',
        requiredStatus: 'Unknown',
        epicKey: '',
        error: error.message
      };
    }
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  /**
   * Delete epic by ID
   * 
   * @param id - Epic ID
   * @returns True if deleted
   */
  async deleteEpic(id: string): Promise<boolean> {
    const result = await this.epicModel.destroy({
      where: { id }
    });

    return result > 0;
  }

  /**
   * Delete all epics for a release
   * 
   * @param releaseId - Release ID
   * @returns Number of deleted epics
   */
  async deleteEpicsByReleaseId(releaseId: string): Promise<number> {
    const result = await this.epicModel.destroy({
      where: { releaseId }
    });

    return result;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  /**
   * Count epics by release ID
   * 
   * @param releaseId - Release ID
   * @returns Count
   */
  async countEpicsByReleaseId(releaseId: string): Promise<number> {
    return await this.epicModel.count({
      where: { releaseId }
    });
  }

  /**
   * Count epics by status
   * 
   * @param releaseId - Release ID
   * @param status - Creation status
   * @returns Count
   */
  async countEpicsByStatus(
    releaseId: string,
    status: EpicCreationStatus
  ): Promise<number> {
    return await this.epicModel.count({
      where: { 
        releaseId,
        creationStatus: status 
      }
    });
  }

  /**
   * Resolve platform configuration for an epic
   * Helper method to get the platform-specific config from jiraConfigId
   * 
   * @param epic - Epic record
   * @returns Platform configuration or null
   */
  async resolvePlatformConfigForEpic(epic: ReleaseJiraEpic): Promise<PlatformJiraConfig | null> {
    if (!this.configController) {
      console.error('[JiraEpicService] Configuration controller not initialized');
      return null;
    }

    return await this.configController.resolvePlatformConfig(
      epic.jiraConfigId,
      epic.platform
    );
  }
}
