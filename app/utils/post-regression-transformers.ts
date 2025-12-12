/**
 * Post-Regression Data Transformers
 * Transform task data to formats expected by Pre-Release components
 */

import { ApproverRole } from '~/types/distribution.types';
import type { PMStatusResponse } from '~/types/distribution.types';
import type { Task } from '~/types/release-process.types';

/**
 * Transform Task externalData to PMStatusResponse format
 * Used to display PMApprovalStatus component inside TaskCard
 */
export function transformTaskToPMStatus(task: Task): PMStatusResponse['data'] {
  const externalData = task.externalData || {};
  
  return {
    approved: externalData.approved === true,
    hasPmIntegration: !!externalData.ticketId,
    pmTicket: externalData.ticketId
      ? {
          id: externalData.ticketId as string,
          title: (externalData.ticketTitle as string) || 'Release Ticket',
          status: (externalData.ticketStatus as string) || 'UNKNOWN',
          url: (externalData.ticketUrl as string) || '',
          lastUpdated: task.updatedAt || task.createdAt,
        }
      : null,
    approver: (externalData.approver as ApproverRole) || ApproverRole.RELEASE_LEAD,
    approvedAt: (externalData.approvedAt as string) || null,
    requiresManualApproval: !externalData.ticketId,
  };
}

