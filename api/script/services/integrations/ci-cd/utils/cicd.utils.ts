export const normalizePlatform = (platform: unknown): string | undefined => {
  if (typeof platform !== 'string') {
    return undefined;
  }
  const trimmed = platform.trim();
  const isEmpty = trimmed.length === 0;
  if (isEmpty) {
    return undefined;
  }
  return trimmed.toUpperCase();
};

import { WorkflowType, WorkflowParameter } from '~types/integrations/ci-cd/workflow.interface';

export const normalizeWorkflowType = (value: unknown): WorkflowType | undefined => {
  const isString = typeof value === 'string';
  if (!isString) {
    return undefined;
  }

  const raw = value.trim();
  const isEmpty = raw.length === 0;
  if (isEmpty) {
    return undefined;
  }

  const workflowValues = Object.values(WorkflowType) as string[];

  const isExactMatch = workflowValues.includes(raw);
  if (isExactMatch) {
    return raw as WorkflowType;
  }

  const withUnderscores = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')     // camelCase → snake
    .replace(/[\s\-]+/g, '_')                   // spaces/hyphens → underscore
    .toUpperCase();

  const isNormalizedMatch = workflowValues.includes(withUnderscores);
  if (isNormalizedMatch) {
    return withUnderscores as WorkflowType;
  }

  return undefined;
};

export const fetchWithTimeout = (url: string, options: any, timeoutMs: number): Promise<any> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return (fetch as any)(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

export const sanitizeJoin = (base: string, path: string): string => {
  if (!base.endsWith('/') && !path.startsWith('/')) return `${base}/${path}`;
  if (base.endsWith('/') && path.startsWith('/')) return base + path.substring(1);
  return base + path;
};

export const appendApiJson = (workflowUrl: string, tree: string): string => {
  const url = new URL(workflowUrl);
  if (!url.pathname.endsWith('/')) {
    url.pathname = url.pathname + '/';
  }
  url.pathname = url.pathname + 'api/json';
  url.searchParams.set('tree', tree);
  return url.toString();
};

export const extractJenkinsParameters = (payload: any): Array<{
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
  choices?: string[];
}> => {
  const props = payload?.property || [];
  const paramsProp = props.find((p: any) => Array.isArray(p?.parameterDefinitions)) || {};
  const defs = paramsProp.parameterDefinitions || [];
  return defs.map((d: any) => {
    const rawClass = d?._class || d?.type || '';
    const choices = Array.isArray(d?.choices) ? d.choices : undefined;
    const normalizedType = normalizeJenkinsParamType(rawClass, choices);
    return {
      name: d?.name,
      type: normalizedType,
      description: d?.description,
      defaultValue: d?.defaultParameterValue?.value,
      choices
    };
  }).filter((p: any) => !!p.name);
};

export const normalizeJenkinsParamType = (rawClass: string, choices?: string[]): 'boolean' | 'string' | 'choice' => {
  if (choices && choices.length) return 'choice';
  const cls = (rawClass || '').toLowerCase();
  if (cls.includes('booleanparameterdefinition')) return 'boolean';
  return 'string';
};

export const extractDefaultsFromWorkflow = (parameters: WorkflowParameter[] | null | undefined): Record<string, unknown> => {
  const isParametersNull = parameters === null;
  const isParametersUndefined = parameters === undefined;
  const isParametersNullOrUndefined = isParametersNull || isParametersUndefined;
  if (isParametersNullOrUndefined) {
    return {};
  }

  const isParametersArray = Array.isArray(parameters);
  if (!isParametersArray) {
    return {};
  }

  const defaults: Record<string, unknown> = {};

  for (const param of parameters) {
    const isParamDefined = param !== null && param !== undefined;
    const isNameString = typeof param?.name === 'string';
    const hasValidName = isParamDefined && isNameString;
    
    if (hasValidName) {
      defaults[param.name] = param.defaultValue;
    }
  }

  return defaults;
};

/**
 * Merge workflow parameter defaults with job parameter overrides.
 * Only processes keys defined in workflow parameters (ignores extra keys from overrides).
 *
 * @param workflowParameters - Workflow parameter definitions from the database
 * @param jobParameterOverrides - User-provided overrides for workflow parameters
 * @param transform - Optional function to transform values (e.g., String for Jenkins form params)
 * @returns Merged parameters with overrides applied
 */
export const mergeWorkflowInputs = <T = unknown>(
  workflowParameters: WorkflowParameter[] | null | undefined,
  jobParameterOverrides: Record<string, unknown> | undefined,
  transform?: (value: unknown) => T
): Record<string, T> => {
  const defaults = extractDefaultsFromWorkflow(workflowParameters);
  const overrides = jobParameterOverrides ?? {};
  const result: Record<string, T> = {};

  const workflowParameterKeys = Object.keys(defaults);

  for (const key of workflowParameterKeys) {
    // Use override if defined (not null/undefined), otherwise fall back to default
    const value = overrides[key] ?? defaults[key];

    const isValueDefined = value !== undefined && value !== null;
    if (isValueDefined) {
      result[key] = transform ? transform(value) : (value as T);
    }
  }

  return result;
};

export const ensureTrailingSlash = (u: string): string => {
  return u.endsWith('/') ? u : (u + '/');
};

export const parseGitHubWorkflowUrl = (url: string): { owner: string; repo: string; path: string; ref?: string } | null => {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 5 && parts[2] === 'blob') {
      const owner = parts[0];
      const repo = parts[1];
      // Find where the path starts (usually .github/workflows/...)
      // The ref is everything between 'blob' and the path start
      const githubIndex = parts.indexOf('.github');
      if (githubIndex > 3) {
        // Branch name contains slashes (e.g., feat/frontend_integration_changes)
        const ref = parts.slice(3, githubIndex).join('/');
        const path = parts.slice(githubIndex).join('/');
        return { owner, repo, path, ref };
      } else if (parts.length >= 5) {
        // Simple branch name (no slashes)
        const ref = parts[3];
        const path = parts.slice(4).join('/');
        return { owner, repo, path, ref };
      }
    }
    const idx = parts.indexOf('workflows');
    if (parts.length >= 4 && parts[2] === 'actions' && idx > -1) {
      const owner = parts[0];
      const repo = parts[1];
      const path = `.github/workflows/${parts[idx + 1]}`;
      return { owner, repo, path };
    }
    return null;
  } catch {
    return null;
  }
};

export const extractWorkflowDispatchInputs = (yaml: string): Array<{
  name: string;
  type: string;
  description?: string;
  defaultValue?: any;
  options?: string[];
  required?: boolean;
}> => {
  const lines = yaml.split(/\r?\n/);
  const inputs: any[] = [];
  let inDispatch = false;
  let inInputs = false;
  let currentInput: any = null;
  let inputIndent = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, '  ');
    if (!inDispatch && /^\s*workflow_dispatch\s*:/.test(line)) {
      inDispatch = true;
      continue;
    }
    if (inDispatch && !inInputs && /^\s*inputs\s*:/.test(line)) {
      inInputs = true;
      inputIndent = line.search(/\S|$/);
      continue;
    }
    if (!inInputs) continue;

    const indent = line.search(/\S|$/);
    if (indent <= inputIndent) {
      if (currentInput) {
        inputs.push(currentInput);
        currentInput = null;
      }
      break;
    }

    const mKey = line.match(/^\s*([A-Za-z0-9_\-]+)\s*:/);
    if (mKey && indent === inputIndent + 2) {
      if (currentInput) inputs.push(currentInput);
      currentInput = { name: mKey[1], type: 'string' };
      continue;
    }

    if (!currentInput) continue;

    const mDesc = line.match(/^\s*description\s*:\s*(.*)\s*$/);
    if (mDesc) {
      currentInput.description = mDesc[1].replace(/^["']|["']$/g, '');
      continue;
    }
    const mReq = line.match(/^\s*required\s*:\s*(true|false)\s*$/i);
    if (mReq) {
      currentInput.required = /^true$/i.test(mReq[1]);
      continue;
    }
    const mDefault = line.match(/^\s*default\s*:\s*(.*)\s*$/);
    if (mDefault) {
      currentInput.defaultValue = mDefault[1].replace(/^["']|["']$/g, '');
      continue;
    }
    const mType = line.match(/^\s*type\s*:\s*(choice|boolean|string)\s*$/i);
    if (mType) {
      currentInput.type = mType[1].toLowerCase();
      continue;
    }
    if (/^\s*options\s*:\s*\[/.test(line)) {
      const arr = line.substring(line.indexOf('[') + 1, line.indexOf(']')).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      currentInput.options = arr;
      if (!currentInput.type) currentInput.type = 'choice';
      continue;
    }
    if (/^\s*options\s*:\s*$/.test(line)) {
      currentInput.options = currentInput.options || [];
      continue;
    }
    const mOpt = line.match(/^\s*-\s*(.*)\s*$/);
    if (mOpt && Array.isArray(currentInput.options)) {
      currentInput.options.push(mOpt[1].replace(/^["']|["']$/g, ''));
      if (!currentInput.type) currentInput.type = 'choice';
      continue;
    }
  }
  if (currentInput) inputs.push(currentInput);
  return inputs;
};

export const parseGitHubRunUrl = (url: string): { owner: string; repo: string; runId: string } | null => {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('runs');
    if (parts.length >= 5 && parts[2] === 'actions' && idx > -1) {
      return { owner: parts[0], repo: parts[1], runId: parts[idx + 1] };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Map GitHub Actions run status to normalized status.
 * 
 * GitHub API returns:
 * - status: 'queued' | 'in_progress' | 'completed' | 'waiting' | 'requested' | 'pending'
 * - conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | 'neutral' | 'skipped' | 'stale' | null
 * 
 * @param status - GitHub run status
 * @param conclusion - GitHub run conclusion (only set when status is 'completed')
 * @returns Normalized status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
 */
export const mapGitHubRunStatus = (
  status: string, 
  conclusion?: string | null
): 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' => {
  const normalizedStatus = (status || '').toLowerCase();
  
  // Queued/pending states: queued, waiting, requested, pending
  const isQueued = normalizedStatus === 'queued';
  const isWaiting = normalizedStatus === 'waiting';
  const isRequested = normalizedStatus === 'requested';
  const isPending = normalizedStatus === 'pending';
  const isQueuedState = isQueued || isWaiting || isRequested || isPending;
  if (isQueuedState) return 'pending';
  
  // Running state: in_progress
  const isRunning = normalizedStatus === 'in_progress';
  if (isRunning) return 'running';
  
  // Completed status - check conclusion
  const isCompleted = normalizedStatus === 'completed';
  if (!isCompleted) {
    // Unknown status, default to pending
    return 'pending';
  }
  
  // Status is 'completed', check conclusion
  const normalizedConclusion = (conclusion || '').toLowerCase();
  
  // Cancelled conclusion
  const isCancelled = normalizedConclusion === 'cancelled';
  if (isCancelled) return 'cancelled';
  
  // Action required means workflow is waiting for manual intervention
  const isActionRequired = normalizedConclusion === 'action_required';
  if (isActionRequired) return 'pending';
  
  // Failure conclusions: failure, timed_out
  const isFailure = normalizedConclusion === 'failure';
  const isTimedOut = normalizedConclusion === 'timed_out';
  const isFailureConclusion = isFailure || isTimedOut;
  if (isFailureConclusion) return 'failed';
  
  // Success conclusions: success, neutral, skipped, stale, or empty/null
  // stale means the run is outdated but still completed
  const isSuccess = normalizedConclusion === 'success';
  const isNeutral = normalizedConclusion === 'neutral';
  const isSkipped = normalizedConclusion === 'skipped';
  const isStale = normalizedConclusion === 'stale';
  const isEmpty = normalizedConclusion === '';
  const isSuccessConclusion = isSuccess || isNeutral || isSkipped || isStale || isEmpty;
  if (isSuccessConclusion) return 'completed';
  
  // Default fallback for any unknown conclusion (treat as completed)
  return 'failed';
};

export const parseGitHubRepoUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    const u = new URL(url);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    const hasOwnerRepo = parts.length >= 2;
    if (!hasOwnerRepo) return null;
    const owner = parts[0];
    let repo = parts[1];
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }
    return { owner, repo };
  } catch {
    return null;
  }
};


