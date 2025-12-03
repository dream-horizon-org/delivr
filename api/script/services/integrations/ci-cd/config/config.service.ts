import type { CICDConfigRepository, CICDWorkflowRepository } from '~models/integrations/ci-cd';
import type { CreateCICDConfigDto, FieldError, TenantCICDConfig, UpdateCICDConfigDto } from '~types/integrations/ci-cd/config.interface';
import type { TenantCICDWorkflow } from '~types/integrations/ci-cd/workflow.interface';
import { CICD_CONFIG_ERROR_MESSAGES } from './config.constants';
import * as shortid from 'shortid';
import { validateAndNormalizeWorkflowsForConfig, dedupeIds, splitWorkflows } from './config.utils';
import { validateWorkflowsForCreateConfig, CICDConfigValidationError } from './config.validation';

export class CICDConfigService {
  private readonly configRepository: CICDConfigRepository;
  private readonly workflowRepository: CICDWorkflowRepository;

  constructor(configRepository: CICDConfigRepository, workflowRepository: CICDWorkflowRepository) {
    this.configRepository = configRepository;
    this.workflowRepository = workflowRepository;
  }

  async validateConfig(dto: CreateCICDConfigDto): Promise<{ isValid: boolean; errors: FieldError[]; integration: 'ci' }> {
    const tenantId = dto.tenantId;
    const workflows = Array.isArray(dto.workflows) ? dto.workflows : [];
    const noWorkflowsProvided = workflows.length === 0;
    if (noWorkflowsProvided) {
      return { "isValid": false, "errors": [{ field: 'workflows', message: CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED }], "integration": "ci" };
    }
    const validation = await validateWorkflowsForCreateConfig(workflows, tenantId);
    const hasValidationErrors = validation.errors.length > 0;
    if (hasValidationErrors) {
      return { "isValid": false, "errors": validation.errors, "integration": "ci" };
    }
    return { "isValid": true, "errors": [], "integration": "ci" };
  }

  async createConfig(dto: CreateCICDConfigDto): Promise<{ configId: string; workflowIds: string[] }> {
    const tenantId = dto.tenantId;
    const createdByAccountId = dto.createdByAccountId;

    const inputWorkflows = Array.isArray(dto.workflows) ? dto.workflows : [];
    if (inputWorkflows.length === 0) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED);
    }
    const { existingIds, workflowsToCreate } = splitWorkflows(inputWorkflows);
    let finalWorkflowIds: string[] = dedupeIds([...existingIds]);

    if (workflowsToCreate.length > 0) {
      const validation = await validateWorkflowsForCreateConfig(workflowsToCreate, tenantId);
      const hasValidationErrors = validation.errors.length > 0;
      if (hasValidationErrors) {
        throw new CICDConfigValidationError(validation.errors);
      }

      // Validate and normalize all workflows before creating any
      const validatedWorkflows = validateAndNormalizeWorkflowsForConfig(workflowsToCreate, tenantId, createdByAccountId);

      const createdWorkflows: TenantCICDWorkflow[] = [];
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
      tenantId,
      workflowIds: finalWorkflowIds,
      createdByAccountId
    } as unknown as TenantCICDConfig);

    return { configId: createdConfig.id, workflowIds: createdConfig.workflowIds };
  }

  async findById(id: string): Promise<TenantCICDConfig | null> {
    return this.configRepository.findById(id);
  }

  async listByTenant(tenantId: string): Promise<TenantCICDConfig[]> {
    return this.configRepository.findByTenant(tenantId);
  }

  async updateConfig(dto: UpdateCICDConfigDto): Promise<TenantCICDConfig | null> {
    const configId = dto.configId;
    const tenantId = dto.tenantId;
    const createdByAccountId = dto.createdByAccountId;

    const existing = await this.configRepository.findById(configId);
    const notFoundOrMismatch = !existing || existing.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return null;
    }

    const inputWorkflows = Array.isArray(dto.workflows) ? dto.workflows : [];
    const { existingIds, workflowsToCreate } = splitWorkflows(inputWorkflows);

    let finalWorkflowIds: string[] = dedupeIds(existingIds);

    if (workflowsToCreate.length > 0) {
      // Validate incoming workflows first; throw structured validation error if any
      const validation = await validateWorkflowsForCreateConfig(workflowsToCreate, tenantId);
      const hasValidationErrors = validation.errors.length > 0;
      if (hasValidationErrors) {
        throw new CICDConfigValidationError(validation.errors);
      }

      const normalizedWorkflows = validateAndNormalizeWorkflowsForConfig(workflowsToCreate as unknown[], tenantId, createdByAccountId);

      const createdWorkflows: TenantCICDWorkflow[] = [];
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

  async deleteConfig(id: string, tenantId: string): Promise<boolean> {
    const existing = await this.configRepository.findById(id);
    const notFoundOrMismatch = !existing || existing.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return false;
    }
    await this.configRepository.delete(id);
    return true;
  }
}



