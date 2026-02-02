import * as yup from 'yup';
import type { Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import { CICDProviderType } from '~types/integrations/ci-cd/connection.interface';
import { CreateWorkflowDto, WorkflowType } from '~types/integrations/ci-cd/workflow.interface';
import { CICD_CONFIG_ALLOWED_PLATFORMS, CICD_CONFIG_ERROR_MESSAGES } from './config.constants';
import { fetchWithTimeout, parseGitHubWorkflowUrl } from '../utils/cicd.utils';
import { getStorage } from '../../../../storage/storage-instance';
import { ERROR_MESSAGES, HEADERS } from '../../../../controllers/integrations/ci-cd/constants';

type FieldError = { field: string; message: string };

/**
 * Generic Yup validation helper
 * Validates data against schema and sends error response if validation fails
 */
const validateWithYup = async <T>(
  schema: yup.Schema<T>,
  data: unknown,
  res: Response
): Promise<T | null> => {
  try {
    const validated = await schema.validate(data, { abortEarly: false });
    return validated;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      // Group errors by field
      const errorsByField = new Map<string, string[]>();
      error.inner.forEach((err) => {
        const field = err.path || 'unknown';
        if (!errorsByField.has(field)) {
          errorsByField.set(field, []);
        }
        errorsByField.get(field)!.push(err.message);
      });

      // Convert to array format with messages (plural)
      const details = Array.from(errorsByField.entries()).map(([field, messages]) => ({
        field,
        messages
      }));

      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Request validation failed',
        details
      });
      return null;
    }
    throw error;
  }
};

// Helper functions for GitHub validation
const isNonEmptyString = (value: unknown): value is string => {
  const isString = typeof value === 'string';
  const trimmed = isString ? value.trim() : '';
  const isNonEmpty = trimmed.length > 0;
  return isString && isNonEmpty;
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

/**
 * Workflow Schema with comprehensive validation
 */
const workflowSchema = yup.object().shape({
  providerType: yup
    .string()
    .required('providerType is required')
    .oneOf(
      Object.values(CICDProviderType),
      `providerType must be one of: ${Object.values(CICDProviderType).join(', ')}`
    ),
  integrationId: yup
    .string()
    .required('integrationId is required')
    .min(1, 'integrationId cannot be empty'),
  displayName: yup
    .string()
    .required('displayName is required')
    .min(1, 'displayName cannot be empty'),
  workflowUrl: yup
    .string()
    .required('workflowUrl is required')
    .url('workflowUrl must be a valid URL'),
  platform: yup
    .string()
    .required('platform is required')
    .transform((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
    .oneOf(
      CICD_CONFIG_ALLOWED_PLATFORMS as unknown as string[],
      `platform must be one of: ${CICD_CONFIG_ALLOWED_PLATFORMS.join(', ')}`
    ),
  workflowType: yup
    .string()
    .required('workflowType is required')
    .oneOf(
      Object.values(WorkflowType),
      `workflowType must be one of: ${Object.values(WorkflowType).join(', ')}`
    ),
  tenantId: yup.string().optional()
});

/**
 * Workflows Config Schema
 */
const createConfigSchema = (tenantId: string) =>
  yup.object().shape({
    workflows: yup
      .array()
      .of(workflowSchema)
      .min(1, CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED)
      .required(CICD_CONFIG_ERROR_MESSAGES.WORKFLOWS_REQUIRED)
      .test(
        'tenant-match',
        CICD_CONFIG_ERROR_MESSAGES.TENANT_MISMATCH,
        function (workflows) {
          if (!workflows) return true;
          
          for (let i = 0; i < workflows.length; i++) {
            const wf = workflows[i];
            if (wf.tenantId && wf.tenantId !== tenantId) {
              return this.createError({
                path: `workflows[${i}].tenantId`,
                message: CICD_CONFIG_ERROR_MESSAGES.TENANT_MISMATCH
              });
            }
          }
          return true;
        }
      )
      .test(
        'github-workflow-dispatch',
        CICD_CONFIG_ERROR_MESSAGES.WORKFLOW_DISPATCH_REQUIRED,
        async function (workflows) {
          if (!workflows) return true;

          for (let i = 0; i < workflows.length; i++) {
            const wf = workflows[i];
            
            // Only validate GitHub Actions workflows
            if (wf.providerType !== CICDProviderType.GITHUB_ACTIONS) {
              continue;
            }

            const urlValue = wf.workflowUrl;
            
            // Parse GitHub URL
            const parsed = parseGitHubWorkflowUrl(urlValue);
            if (!parsed) {
              return this.createError({
                path: `workflows[${i}].workflowUrl`,
                message: ERROR_MESSAGES.GHA_INVALID_WORKFLOW_URL
              });
            }

            // Get GitHub token
            const token = await getGithubTokenForTenant(tenantId);
            if (!isNonEmptyString(token)) {
              return this.createError({
                path: `workflows[${i}].workflowUrl`,
                message: ERROR_MESSAGES.GHA_NO_TOKEN_AVAILABLE
              });
            }

            // Fetch workflow content
            const content = await fetchGithubWorkflowContent(
              token as string,
              urlValue,
              Number(process.env.GHA_INPUTS_TIMEOUT_MS || 8000)
            );
            
            if (content === null) {
              return this.createError({
                path: `workflows[${i}].workflowUrl`,
                message: ERROR_MESSAGES.GHA_REPO_ACCESS_FAILED
              });
            }

            // Check for workflow_dispatch
            const yaml = content ?? '';
            const hasDispatch = containsWorkflowDispatch(yaml);
            if (!hasDispatch) {
              return this.createError({
                path: `workflows[${i}].workflowUrl`,
                message: CICD_CONFIG_ERROR_MESSAGES.WORKFLOW_DISPATCH_REQUIRED
              });
            }
          }
          
          return true;
        }
      )
  });

/**
 * Validate workflows for create config
 */
export const validateCreateConfig = async (
  data: unknown,
  res: Response,
  tenantId: string
) => {
  const schema = createConfigSchema(tenantId);
  return await validateWithYup(schema, data, res);
};

/**
 * Validate workflows for update config
 */
export const validateUpdateConfig = async (
  data: unknown,
  res: Response,
  tenantId: string
) => {
  const schema = createConfigSchema(tenantId);
  return await validateWithYup(schema, data, res);
};


