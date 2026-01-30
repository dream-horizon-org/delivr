import type { CICDConfigRepository, CICDWorkflowRepository, CICDIntegrationRepository } from '~models/integrations/ci-cd';
import type { CreateCICDConfigDto, FieldError, AppCICDConfig, AppCICDConfigWithWorkflows } from '~types/integrations/ci-cd/config.interface';
import type { AppCICDWorkflow } from '~types/integrations/ci-cd/workflow.interface';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import { CICD_CONFIG_ERROR_MESSAGES } from './config.constants';
import * as shortid from 'shortid';
import { validateAndNormalizeWorkflowsForConfig, dedupeIds, splitWorkflows } from './config.utils';
import { validateWorkflowsForCreateConfig, CICDConfigValidationError } from './config.validation';
import { WorkflowService } from '../workflows/workflow.service';
import { GitHubActionsWorkflowService } from '../workflows/github-actions-workflow.service';
import { JenkinsWorkflowService } from '../workflows/jenkins-workflow.service';
import { normalizePlatform, normalizeWorkflowType } from '../utils/cicd.utils';

/**
 * Input for triggering a workflow by config ID
 */
export type TriggerWorkflowByConfigInput = {
  configId: string;
  appId: string;
  platform: string;
  workflowType: string;
  jobParameters?: Record<string, unknown>;
};

/**
 * Result from triggering a workflow
 */
export type TriggerWorkflowResult = {
  queueLocation: string;
  workflowId: string;
  providerType: CICDProviderType;
  workflowType: string;
};

export class CICDConfigService {
  private readonly configRepository: CICDConfigRepository;
  private readonly workflowRepository: CICDWorkflowRepository;
  private readonly integrationRepository?: CICDIntegrationRepository;

  constructor(
    configRepository: CICDConfigRepository,
    workflowRepository: CICDWorkflowRepository,
    integrationRepository?: CICDIntegrationRepository
  ) {
    this.configRepository = configRepository;
    this.workflowRepository = workflowRepository;
    this.integrationRepository = integrationRepository;
  }

  async validateConfig(dto: CreateCICDConfigDto): Promise<{ isValid: boolean; errors: FieldError[]; integration: 'ci' }> {
    const appId = dto.appId;
    const workflows = Array.isArray(dto.workflows) ? dto.workflows : [];
    const noWorkflowsProvided = workflows.length === 0;
    if (noWorkflowsProvided) {
      return { "isValid": false, "errors": [{ field: 'workflows', message: CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED }], "integration": "ci" };
    }
    const validation = await validateWorkflowsForCreateConfig(workflows, appId);
    const hasValidationErrors = validation.errors.length > 0;
    if (hasValidationErrors) {
      return { "isValid": false, "errors": validation.errors, "integration": "ci" };
    }
    return { "isValid": true, "errors": [], "integration": "ci" };
  }

  async createConfig(dto: CreateCICDConfigDto): Promise<{ configId: string; workflowIds: string[] }> {
    const appId = dto.appId;
    const createdByAccountId = dto.createdByAccountId;

    const inputWorkflows = Array.isArray(dto.workflows) ? dto.workflows : [];
    if (inputWorkflows.length === 0) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED);
    }
    const { existingIds, workflowsToCreate } = splitWorkflows(inputWorkflows);
    let finalWorkflowIds: string[] = dedupeIds([...existingIds]);

    if (workflowsToCreate.length > 0) {
      const validation = await validateWorkflowsForCreateConfig(workflowsToCreate, appId);
      const hasValidationErrors = validation.errors.length > 0;
      if (hasValidationErrors) {
        throw new CICDConfigValidationError(validation.errors);
      }

      // Validate and normalize all workflows before creating any
      const validatedWorkflows = validateAndNormalizeWorkflowsForConfig(workflowsToCreate, appId, createdByAccountId);

      const createdWorkflows: AppCICDWorkflow[] = [];
      for (const wf of validatedWorkflows) {
        const created = await this.workflowRepository.create(wf);
        createdWorkflows.push(created);
      }

      const newlyCreatedIds = createdWorkflows.map(w => w.id);

      finalWorkflowIds = dedupeIds([...finalWorkflowIds, ...newlyCreatedIds]);
    }

    const configId = shortid.generate();

    const createdConfig = await this.configRepository.create({
      id: configId,
      appId,
      workflowIds: finalWorkflowIds,
      createdByAccountId
    } as unknown as AppCICDConfig);

    return { configId: createdConfig.id, workflowIds: createdConfig.workflowIds };
  }

  async findById(id: string): Promise<AppCICDConfig | null> {
    return this.configRepository.findById(id);
  }

  /**
   * Get config by ID with hydrated workflows
   * Returns AppCICDConfigWithWorkflows with full workflow objects populated
   * 
   * @param id - Config ID
   * @returns Config with workflows array populated, or null if not found
   */
  async getByIdVerbose(id: string): Promise<AppCICDConfigWithWorkflows | null> {
    const config = await this.configRepository.findById(id);
    
    if (!config) {
      return null;
    }

    // Load all workflows from the config's workflowIds
    const workflowIds: string[] = Array.isArray(config.workflowIds) ? config.workflowIds : [];
    const loadedWorkflows = await Promise.all(
      workflowIds.map((workflowId) => this.workflowRepository.findById(workflowId))
    );
    
    // Filter out any null results (workflows that may have been deleted)
    const workflows = loadedWorkflows.filter((w): w is AppCICDWorkflow => w !== null);

    return {
      ...config,
      workflows
    };
  }

  async listByApp(appId: string): Promise<AppCICDConfig[]> {
    return this.configRepository.findByApp(appId);
  }

  /**

  async updateConfig(dto: UpdateCICDConfigDto): Promise<AppCICDConfig | null> {
    const configId = dto.configId;
    const appId = dto.appId;
    const createdByAccountId = dto.createdByAccountId;

    const existing = await this.configRepository.findById(configId);
    const notFoundOrMismatch = !existing || existing.appId !== appId;
    if (notFoundOrMismatch) {
      return null;
    }

    const inputWorkflows = Array.isArray(dto.workflows) ? dto.workflows : [];
    const { existingIds, workflowsToCreate } = splitWorkflows(inputWorkflows);

    let finalWorkflowIds: string[] = dedupeIds(existingIds);

    if (workflowsToCreate.length > 0) {
      // Validate incoming workflows first; throw structured validation error if any
      const validation = await validateWorkflowsForCreateConfig(workflowsToCreate, appId);
      const hasValidationErrors = validation.errors.length > 0;
      if (hasValidationErrors) {
        throw new CICDConfigValidationError(validation.errors);
      }

      const normalizedWorkflows = validateAndNormalizeWorkflowsForConfig(workflowsToCreate as unknown[], appId, createdByAccountId);

      const createdWorkflows: AppCICDWorkflow[] = [];
      for (const workflow of normalizedWorkflows) {
        const created = await this.workflowRepository.create(workflow);
        createdWorkflows.push(created);
      }

      const newlyCreatedIds = createdWorkflows.map(w => w.id);
      
      finalWorkflowIds = dedupeIds([...finalWorkflowIds, ...newlyCreatedIds]);
    }

    const noIncomingChanges = finalWorkflowIds.length === 0
    if (noIncomingChanges) {
      // Nothing to update; return the existing config unchanged
      return existing;
    }

    const updated = await this.configRepository.update(configId, {
      workflowIds: finalWorkflowIds
    });
    
    return updated;
  }

  async deleteConfig(id: string, appId: string): Promise<boolean> {
    const existing = await this.configRepository.findById(id);
    const notFoundOrMismatch = !existing || existing.appId !== appId;
    if (notFoundOrMismatch) {
      return false;
    }
    await this.configRepository.delete(id);
    return true;
  }

  /**
   * Trigger a workflow by config ID.
   * 
   * Resolves the correct workflow from the config based on platform and workflowType,
   * then triggers it using the appropriate provider service.
   * 
   * @param input - Trigger parameters including configId, platform, workflowType
   * @returns Trigger result with queueLocation and workflow details
   */
  async triggerWorkflowByConfig(input: TriggerWorkflowByConfigInput): Promise<TriggerWorkflowResult> {
    const { configId, appId, jobParameters } = input;
    const platform = normalizePlatform(input.platform);
    const workflowType = normalizeWorkflowType(input.workflowType);

    // 1. Load the config
    const config = await this.configRepository.findById(configId);
    const configNotFound = !config;
    if (configNotFound) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.CONFIG_NOT_FOUND);
    }

    const configTenantMismatch = config.appId !== appId;
    if (configTenantMismatch) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.CONFIG_NOT_FOUND);
    }

    // 2. Load all workflows from the config
    const workflowIds: string[] = Array.isArray(config.workflowIds) ? config.workflowIds : [];
    const loadedWorkflows = await Promise.all(
      workflowIds.map((id) => this.workflowRepository.findById(id))
    );
    const workflows = loadedWorkflows.filter((w): w is AppCICDWorkflow => w !== null);

    // 3. Filter to matching platform and workflowType
    const matches = workflows.filter((w) => {
      const tenantMatches = w.appId === appId;
      const platformMatches = normalizePlatform(w.platform) === platform;
      const typeMatches = normalizeWorkflowType(w.workflowType) === workflowType;
      return tenantMatches && platformMatches && typeMatches;
    });

    const noMatchFound = matches.length === 0;
    if (noMatchFound) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.NO_MATCHING_WORKFLOW);
    }

    const multipleMatchesFound = matches.length > 1;
    if (multipleMatchesFound) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.MULTIPLE_WORKFLOWS_FOUND);
    }

    // 4. Get the selected workflow and its integration
    const selectedWorkflow = matches[0];
    const workflowService = this.createWorkflowService(selectedWorkflow.providerType);

    // 5. Trigger the workflow
    const result = await workflowService.trigger(appId, {
      workflowId: selectedWorkflow.id,
      workflowType: selectedWorkflow.workflowType,
      platform: platform ?? undefined,
      jobParameters
    });

    return {
      queueLocation: result.queueLocation,
      workflowId: selectedWorkflow.id,
      providerType: selectedWorkflow.providerType,
      workflowType: selectedWorkflow.workflowType
    };
  }

  /**
   * Create the appropriate workflow service based on provider type
   */
  private createWorkflowService(providerType: CICDProviderType): WorkflowService {
    const isGitHubActions = providerType === CICDProviderType.GITHUB_ACTIONS;
    if (isGitHubActions) {
      return new GitHubActionsWorkflowService(
        this.integrationRepository,
        this.workflowRepository
      );
    }

    const isJenkins = providerType === CICDProviderType.JENKINS;
    if (isJenkins) {
      return new JenkinsWorkflowService(
        this.integrationRepository,
        this.workflowRepository
      );
    }

    throw new Error(CICD_CONFIG_ERROR_MESSAGES.TRIGGER_NOT_SUPPORTED);
  }
}



