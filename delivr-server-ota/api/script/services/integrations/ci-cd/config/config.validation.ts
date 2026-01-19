import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import { CreateWorkflowDto, WorkflowType } from '~types/integrations/ci-cd/workflow.interface';
import { CICD_CONFIG_ALLOWED_PLATFORMS, CICD_CONFIG_ERROR_MESSAGES } from './config.constants';
import { fetchWithTimeout, parseGitHubWorkflowUrl } from '../utils/cicd.utils';
import { getStorage } from '../../../../storage/storage-instance';
import { ERROR_MESSAGES, HEADERS } from '../../../../controllers/integrations/ci-cd/constants';

type FieldError = { field: string; message: string };

const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  const trimmed = isString ? value.trim() : '';
  const isNonEmpty = trimmed.length > 0;
  return isString && isNonEmpty;
};

const toUpper = (value: string): string => value.trim().toUpperCase();

const isValidPlatform = (value: unknown): boolean => {
  if (!isNonEmptyString(value)) return false;
  const upper = toUpper(value);
  return (CICD_CONFIG_ALLOWED_PLATFORMS as readonly string[]).includes(upper);
};

const isValidWorkflowType = (value: unknown): boolean => {
  if (!isNonEmptyString(value)) return false;
  const values = Object.values(WorkflowType) as string[];
  return values.includes(value);
};

const isValidProviderType = (value: unknown): value is CICDProviderType => {
  const values = Object.values(CICDProviderType) as string[];
  return typeof value === 'string' && values.includes(value);
};

const getGithubTokenForTenant = async (tenantId: string): Promise<string | null> => {
  const storage = getStorage() as any;
  const repo = storage?.cicdIntegrationRepository;
  if (!repo) return null;
  const gha = await repo.findByTenantAndProvider(tenantId, CICDProviderType.GITHUB_ACTIONS);
  const hasToken = !!gha && isNonEmptyString((gha as any).apiToken);
  return hasToken ? (gha as any).apiToken as string : null;
};

const fetchGithubWorkflowContent = async (token: string, workflowUrl: string, timeoutMs: number): Promise<string | null> => {
  const parsed = parseGitHubWorkflowUrl(workflowUrl);
  if (!parsed) {
    return null;
  }
  const { owner, repo, path, ref } = parsed;
  const contentUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;
  const headers = { 'Authorization': `Bearer ${token}`, 'Accept': HEADERS.ACCEPT_GITHUB_JSON, 'User-Agent': HEADERS.USER_AGENT };
  const resp = await fetchWithTimeout(contentUrl, { headers }, timeoutMs);
  const ok = !!resp && typeof resp.ok === 'boolean' ? resp.ok : false;
  if (!ok) return null;
  const json: any = await resp.json();
  const content: unknown = json?.content;
  const encoding: unknown = json?.encoding;
  const isBase64 = isNonEmptyString(encoding) && encoding.toLowerCase() === 'base64';
  const hasContent = typeof content === 'string' && content.length > 0;
  if (!isBase64 || !hasContent) return '';
  return Buffer.from(content as string, 'base64').toString('utf8');
};

const containsWorkflowDispatch = (yaml: string): boolean => {
  const regex = /(^|\n)\s*workflow_dispatch\s*:/;
  return regex.test(yaml);
};

const validateGithubWorkflow = async (
  wf: CreateWorkflowDto,
  index: number,
  tenantId: string
): Promise<FieldError[]> => {
  const errors: FieldError[] = [];

  const urlValue = wf.workflowUrl;
  const urlMissing = !isNonEmptyString(urlValue);
  if (urlMissing) {
    errors.push({ field: `workflows[${index}].workflowUrl`, message: ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL });
    return errors;
  }

  const parsed = parseGitHubWorkflowUrl(urlValue as string);
  const urlInvalid = !parsed;
  if (urlInvalid) {
    errors.push({ field: `workflows[${index}].workflowUrl`, message: ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL });
    return errors;
  }

  const token = await getGithubTokenForTenant(tenantId);
  const noToken = !isNonEmptyString(token);
  if (noToken) {
    errors.push({ field: `workflows[${index}].workflowUrl`, message: ERROR_MESSAGES.GHA_NO_TOKEN_AVAILABLE });
    return errors;
  }

  const content = await fetchGithubWorkflowContent(token as string, urlValue as string, Number(process.env.GHA_INPUTS_TIMEOUT_MS || 8000));
  const failedFetch = content === null;
  if (failedFetch) {
    errors.push({ field: `workflows[${index}].workflowUrl`, message: ERROR_MESSAGES.GHA_REPO_ACCESS_FAILED });
    return errors;
  }

  const yaml = content ?? '';
  const hasDispatch = containsWorkflowDispatch(yaml);
  if (!hasDispatch) {
    errors.push({ field: `workflows[${index}].workflowUrl`, message: CICD_CONFIG_ERROR_MESSAGES.WORKFLOW_DISPATCH_REQUIRED });
  }

  return errors;
};

export class CICDConfigValidationError extends Error {
  readonly errors: FieldError[];
  constructor(errors: FieldError[]) {
    super('CI/CD config validation failed');
    this.name = 'CICDConfigValidationError';
    this.errors = errors;
  }
}

export const validateWorkflowsForCreateConfig = async (
  inputWorkflows: CreateWorkflowDto[],
  tenantId: string
): Promise<{ errors: FieldError[] }> => {
  const errors: FieldError[] = [];

  const isArray = Array.isArray(inputWorkflows);
  if (!isArray || inputWorkflows.length === 0) {
    errors.push({ field: 'workflows', message: CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED });
    return { errors };
  }

  const requiredFields = ['providerType', 'integrationId', 'displayName', 'workflowUrl', 'platform', 'workflowType'] as const;

  for (let i = 0; i < inputWorkflows.length; i++) {
    const wf = inputWorkflows[i];
    const isObject = wf !== null && typeof wf === 'object';
    if (!isObject) {
      errors.push({ field: `workflows[${i}]`, message: CICD_CONFIG_ERROR_MESSAGES.WORKFLOW_FIELDS_REQUIRED });
      continue;
    }

    // Required checks
    for (const key of requiredFields) {
      const value = wf[key as string];
      const missing = !isNonEmptyString(value);
      if (missing) {
        errors.push({ field: `workflows[${i}].${key}`, message: CICD_CONFIG_ERROR_MESSAGES.WORKFLOW_FIELDS_REQUIRED });
      }
    }

    // Tenant mismatch if provided
    const wfTenantId = wf.tenantId;
    const tenantProvided = isNonEmptyString(wfTenantId);
    const mismatch = tenantProvided && (wfTenantId as string) !== tenantId;
    if (mismatch) {
      errors.push({ field: `workflows[${i}].tenantId`, message: CICD_CONFIG_ERROR_MESSAGES.TENANT_MISMATCH });
    }

    // Provider/workflow type enum validation
    const providerType = wf.providerType;
    const workflowType = wf.workflowType;
    const providerInvalid = !isValidProviderType(providerType);
    const typeInvalid = !isValidWorkflowType(workflowType);
    if (providerInvalid || typeInvalid) {
      errors.push({ field: `workflows[${i}]`, message: CICD_CONFIG_ERROR_MESSAGES.WORKFLOW_PROVIDER_OR_TYPE_INVALID });
    }

    // Platform validation (ANDROID/IOS only, case-insensitive)
    const platform = wf.platform;
    const platformInvalid = !isValidPlatform(platform);
    if (platformInvalid) {
      errors.push({ field: `workflows[${i}].platform`, message: CICD_CONFIG_ERROR_MESSAGES.INVALID_PLATFORM });
    }

    // Provider-specific validations
    if (isValidProviderType(providerType) && providerType === CICDProviderType.GITHUB_ACTIONS) {
      const ghaErrors = await validateGithubWorkflow(wf, i, tenantId);
      if (ghaErrors.length) {
        errors.push(...ghaErrors);
      }
    }
  }

  return { errors };
};


