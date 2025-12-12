/**
 * Client Service: PM Approval & Extra Commits (Pre-Release Stage)
 * Calls Remix API routes (not backend directly)
 * Used by React components, loaders, and actions
 */

import type {
  ManualApprovalRequest,
  Platform
} from '~/types/distribution.types';
import { ReleaseStatus } from '~/types/distribution.types';
import { apiGet, apiPost } from '~/utils/api-client';
import { BuildsService } from './builds.service';

// Local type for blocking issues
type BlockingIssue = {
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
  resolution: {
    title: string;
    message: string;
    options: Array<{
      action: string;
      label: string;
      url?: string;
      roles?: string[];
    }>;
  };
};

export class ApprovalService {
  /**
   * Get PM approval status for a release
   */
  static async getPMStatus(releaseId: string): Promise<any> {
    return apiGet<any>(`/api/v1/releases/${releaseId}/pm-status`);
  }

  /**
   * Manually approve a release (when no PM integration)
   */
  static async manualApprove(
    releaseId: string,
    request: ManualApprovalRequest
  ): Promise<any> {
    return apiPost<any>(
      `/api/v1/releases/${releaseId}/pm-status`,
      request
    );
  }

  /**
   * Check for extra commits after last regression
   */
  static async checkExtraCommits(releaseId: string): Promise<any> {
    return apiGet<any>(`/api/v1/releases/${releaseId}/extra-commits`);
  }

  /**
   * Get all blocking issues for a release
   */
  static async getBlockingIssues(
    releaseId: string,
    currentReleaseStatus: ReleaseStatus,
    platforms: Platform[]
  ): Promise<BlockingIssue[]> {
    const issues: BlockingIssue[] = [];

    // 1. Check build readiness
    const { ready: buildsReady, missingPlatforms } =
      await BuildsService.areBuildsReady(releaseId, platforms);
    
    if (!buildsReady) {
      issues.push({
        code: 'BUILDS_NOT_READY',
        message: `Missing or unready builds for: ${missingPlatforms.join(', ')}`,
        severity: 'ERROR',
        resolution: {
          title: 'Complete Pre-Release Builds',
          message: 'All required builds must be uploaded and verified before proceeding.',
          options: [
            {
              action: 'GO_TO_PRE_RELEASE',
              label: 'Go to Pre-Release Stage',
            },
          ],
        },
      });
    }

    // 2. Check PM approval (if not already approved)
    if (currentReleaseStatus === ReleaseStatus.PRE_RELEASE) {
      const pmStatus = await this.getPMStatus(releaseId);
      
      if (pmStatus.data?.hasPmIntegration && !pmStatus.data?.approved) {
        issues.push({
          code: 'PM_APPROVAL_REQUIRED',
          message: pmStatus.data?.blockedReason || 'PM approval is required.',
          severity: 'ERROR',
          resolution: {
            title: 'Awaiting Project Management Approval',
            message: `The associated PM ticket (${pmStatus.data?.pmTicket?.id}) is not marked as DONE.`,
            options: [
              {
                action: 'VIEW_PM_TICKET',
                label: 'View PM Ticket',
                url: pmStatus.data?.pmTicket?.url,
              },
              {
                action: 'MANUAL_APPROVE',
                label: 'Manually Approve (Release Lead Only)',
                roles: ['RELEASE_LEAD', 'OWNER'],
              },
            ],
          },
        });
      } else if (
        !pmStatus.data?.hasPmIntegration &&
        pmStatus.data?.requiresManualApproval &&
        !pmStatus.data?.approved
      ) {
        issues.push({
          code: 'MANUAL_APPROVAL_REQUIRED',
          message: 'Manual approval from Release Lead is required.',
          severity: 'ERROR',
          resolution: {
            title: 'Manual Approval Needed',
            message:
              'No Project Management integration is configured. A Release Lead must manually approve this release.',
            options: [
              {
                action: 'MANUAL_APPROVE',
                label: 'Approve & Proceed',
                roles: ['RELEASE_LEAD', 'OWNER'],
              },
            ],
          },
        });
      }
    }

    // 3. Check for extra commits (warning, not blocking)
    const extraCommits = await this.checkExtraCommits(releaseId);
    
    if (extraCommits.data?.hasExtraCommits) {
      issues.push({
        code: 'UNTESTED_COMMITS',
        message: extraCommits.data?.warning?.message || 'Untested commits detected.',
        severity: 'WARNING',
        resolution: {
          title: 'Untested Code Detected',
          message:
            'New commits have been pushed since the last regression cycle. Proceed with caution or create a new regression cycle.',
          options: [
            {
              action: 'CREATE_NEW_REGRESSION',
              label: 'Create New Regression Cycle',
            },
            { action: 'PROCEED_ANYWAY', label: 'Proceed Anyway' },
          ],
        },
      });
    }

    return issues;
  }

  /**
   * Check if release can be promoted to distribution
   */
  static async canPromoteToDistribution(
    releaseId: string,
    currentReleaseStatus: ReleaseStatus,
    platforms: Platform[]
  ): Promise<{ canProceed: boolean; blockingReason: string | null }> {
    const blockingIssues = await this.getBlockingIssues(
      releaseId,
      currentReleaseStatus,
      platforms
    );
    
    const hasBlockingErrors = blockingIssues.some((issue) => issue.severity === 'ERROR');

    return {
      canProceed: !hasBlockingErrors,
      blockingReason: hasBlockingErrors
        ? blockingIssues
            .filter((issue) => issue.severity === 'ERROR')
            .map((issue) => issue.message)
            .join('; ')
        : null,
    };
  }
}
