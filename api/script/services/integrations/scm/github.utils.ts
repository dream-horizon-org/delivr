import { Octokit } from 'octokit';
import { SCM_ERROR_MESSAGES } from './scm.constants';

export type OctokitClient = InstanceType<typeof Octokit>;

export const generateTagNameFromTargetsAndVersion = (
  targets?: string[],
  version?: string
): string => {
  const targetsInvalid = !Array.isArray(targets) || targets.length === 0;
  const versionInvalid = typeof version !== 'string' || version.length === 0;
  const inputsInvalid = targetsInvalid || versionInvalid;
  if (inputsInvalid) {
    throw new Error(SCM_ERROR_MESSAGES.MISSING_FINAL_TAG_INPUTS);
  }
  const toInitials = (value: string): string => {
    const parts = value.split(/[^A-Za-z0-9]+/).filter(Boolean);
    const initials = parts.map(p => p[0]).join('');
    return initials.toLowerCase();
  };
  const initials = (targets as string[]).map(toInitials).join('');
  return `${initials}_${version}`;
};

export const tryGenerateTagFromTargets = (
  parentTargets?: string[],
  baseVersion?: string
): string | null => {
  const haveTargets = Array.isArray(parentTargets) && parentTargets.length > 0;
  const haveVersion = typeof baseVersion === 'string' && baseVersion.length > 0;
  const canGenerate = haveTargets && haveVersion;
  if (!canGenerate) {
    return null;
  }
  return generateTagNameFromTargetsAndVersion(parentTargets, baseVersion);
};

export const getLatestTagName = async (
  client: OctokitClient,
  owner: string,
  repo: string
): Promise<string | null> => {
  try {
    const { data } = await client.repos.listTags({ owner, repo, per_page: 1, page: 1 });
    const hasTags = Array.isArray(data) && data.length > 0;
    if (!hasTags) return null;
    return data[0].name;
  } catch (_err) {
    return null;
  }
};

export const generateReleaseNotes = async (
  client: OctokitClient,
  owner: string,
  repo: string,
  currentTag: string,
  previousTag: string
): Promise<string> => {
  const { data } = await client.repos.compareCommits({
    owner,
    repo,
    base: previousTag,
    head: currentTag
  });

  const releaseNotes: string[] = [];
  for (const c of data.commits ?? []) {
    const message = c.commit?.message ?? '';
    const authorName = c.commit?.author?.name ?? 'Unknown';
    const firstLine = message.split('\n')[0] ?? '';
    const noteLine = `- ${firstLine}${authorName ? ` (by ${authorName})` : ''}`;
    releaseNotes.push(noteLine);
  }

  const fullChangelog = `\n\n## Full Changelog:\nhttps://github.com/${owner}/${repo}/compare/${previousTag}...${currentTag}\n`;
  return releaseNotes.join('\n') + fullChangelog;
};


