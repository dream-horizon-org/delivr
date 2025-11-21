import type { CICDConfigRepository, CICDWorkflowRepository } from '~models/integrations/ci-cd';
import type { CreateCICDConfigDto, FieldError, TenantCICDConfig } from '~types/integrations/ci-cd/config.interface';
import type { TenantCICDWorkflow } from '~types/integrations/ci-cd/workflow.interface';
import { CICD_CONFIG_ERROR_MESSAGES } from './config.constants';
import * as shortid from 'shortid';
import { validateAndNormalizeWorkflowsForConfig } from './config.utils';
import { validateWorkflowsForCreateConfig } from './config.validation';

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
    const validation = await validateWorkflowsForCreateConfig(workflows as unknown[], tenantId);
    const hasValidationErrors = validation.errors.length > 0;
    if (hasValidationErrors) {
      return { "isValid": false, "errors": validation.errors, "integration": "ci" };
    }
    return { "isValid": true, "errors": [], "integration": "ci" };
  }

  async createConfig(dto: CreateCICDConfigDto): Promise<{ configId: string; workflowIds: string[] }> {
    const tenantId = dto.tenantId;
    const createdByAccountId = dto.createdByAccountId;

    const workflows = Array.isArray(dto.workflows) ? dto.workflows : [];
    const noWorkflowsProvided = workflows.length === 0;

    if (noWorkflowsProvided) {
      throw new Error(CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED);
    }

    // Validate and normalize all workflows before creating any
    const validatedWorkflows = validateAndNormalizeWorkflowsForConfig(workflows, tenantId, createdByAccountId);

    const createdWorkflows: TenantCICDWorkflow[] = [];
    for (const wf of validatedWorkflows) {
      const created = await this.workflowRepository.create(wf);
      createdWorkflows.push(created);
    }

    const workflowIds = createdWorkflows.map(w => w.id);
    const configId = shortid.generate();
    const createdConfig = await this.configRepository.create({
      id: configId,
      tenantId,
      workflowIds,
      createdByAccountId
    } as unknown as TenantCICDConfig);

    return { configId: createdConfig.id, workflowIds };
  }

  async findById(id: string): Promise<TenantCICDConfig | null> {
    return this.configRepository.findById(id);
  }

  async listByTenant(tenantId: string): Promise<TenantCICDConfig[]> {
    return this.configRepository.findByTenant(tenantId);
  }

  async updateConfig(
    id: string,
    tenantId: string,
    update: { workflowIds?: string[] }
  ): Promise<TenantCICDConfig | null> {
    const existing = await this.configRepository.findById(id);
    const notFoundOrMismatch = !existing || existing.tenantId !== tenantId;
    if (notFoundOrMismatch) {
      return null;
    }
    const updated = await this.configRepository.update(id, {
      workflowIds: Array.isArray(update.workflowIds) ? update.workflowIds : undefined
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



