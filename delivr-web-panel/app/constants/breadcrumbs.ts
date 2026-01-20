/**
 * Breadcrumb Items Constants
 * Centralized breadcrumb definitions for all routes
 * 
 * Usage:
 * import { getBreadcrumbItems } from '~/constants/breadcrumbs';
 * const breadcrumbItems = getBreadcrumbItems('releases.detail', { org, releaseVersion });
 */

import type { BreadcrumbItem } from '~/components/Common';

export type BreadcrumbKey =
  | 'releases.list'
  | 'releases.detail'
  | 'releases.create'
  | 'releases.configurations'
  | 'releases.configure'
  | 'releases.workflows.list'
  | 'releases.workflows.detail'
  | 'releases.submission.detail'
  | 'distributions.list'
  | 'distributions.detail'
  | 'integrations'
  | 'apps';

interface BreadcrumbParams {
  org: string;
  releaseVersion?: string;
  releaseId?: string;
  distributionBranch?: string;
  distributionId?: string;
  submissionId?: string;
  workflowId?: string;
  isEditMode?: boolean;
  isCloneMode?: boolean;
  appName?: string;
}

/**
 * Get breadcrumb items for a given route
 */
export function getBreadcrumbItems(
  key: BreadcrumbKey,
  params: BreadcrumbParams
): BreadcrumbItem[] {
  const { org, releaseVersion, releaseId, distributionBranch, distributionId, submissionId, workflowId, isEditMode, isCloneMode, appName } = params;

  switch (key) {
    case 'releases.list':
      return [
        { title: 'Release Management' },
      ];

    case 'releases.detail':
      return [
        { title: 'Release Management', href: `/dashboard/${org}/releases` },
        { title: releaseVersion || 'Release Details' },
      ];

    case 'releases.create':
      return [
        { title: 'Release Management', href: `/dashboard/${org}/releases` },
        { title: 'Create Release' },
      ];

    case 'releases.configurations':
      return [
        { title: 'Release Management', href: `/dashboard/${org}/releases` },
        { title: 'Configurations' },
      ];

    case 'releases.configure':
      return [
        { title: 'Release Management', href: `/dashboard/${org}/releases` },
        { title: 'Configuration', href: `/dashboard/${org}/releases/configurations` },
        { title: isEditMode ? 'Edit' : isCloneMode ? 'Clone' : 'New' },
      ];

    case 'releases.workflows.list':
      return [
        { title: 'Release Management', href: `/dashboard/${org}/releases` },
        { title: 'Workflows' },
      ];

    case 'releases.workflows.detail':
      return [
        { title: 'Release Management', href: `/dashboard/${org}/releases` },
        { title: 'Workflows', href: `/dashboard/${org}/releases/workflows` },
        { title: isEditMode ? 'Edit' : 'New' },
      ];

    case 'releases.submission.detail':
      return [
        { title: 'Release Management', href: `/dashboard/${org}/releases` },
        { title: 'Release Details', href: releaseId ? `/dashboard/${org}/releases/${releaseId}` : undefined },
        { title: 'Submission Details' },
      ];

    case 'distributions.list':
      return [
        { title: 'Distributions' },
      ];

    case 'distributions.detail':
      return [
        { title: 'Distributions', href: `/dashboard/${org}/distributions` },
        { title: distributionBranch || 'Distribution Details' },
      ];

    case 'integrations':
      return [
        { title: 'Integrations' },
      ];

    case 'apps':
      return [
        { title: 'Apps' },
      ];

    default:
      return [];
  }
}

