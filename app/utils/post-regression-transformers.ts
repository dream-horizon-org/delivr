/**
 * Post-Regression Data Transformers
 * Transform task data to formats expected by Pre-Release components
 */

import type { PMStatusResponse } from '~/types/distribution/distribution.types';
import { ApproverRole } from '~/types/distribution/distribution.types';
import type { Task } from '~/types/release-process.types';

/**
 * Transform Task externalData to PMStatusResponse format
 * Used to display PMApprovalStatus component inside TaskCard
 */
export function transformTaskToPMStatus(task: Task): PMStatusResponse['data'] {
  const externalData = task.externalData || {};
  
  // Build base response
  const response: PMStatusResponse['data'] = {
    approved: externalData.approved === true,
    hasPmIntegration: !!externalData.ticketId,
    approver: (externalData.approver as ApproverRole) || ApproverRole.RELEASE_LEAD,
    requiresManualApproval: !externalData.ticketId,
  };
  
  // Add pmTicket only if ticketId exists
  if (externalData.ticketId) {
    response.pmTicket = {
      id: externalData.ticketId as string,
      title: (externalData.ticketTitle as string) || 'Release Ticket',
      status: (externalData.ticketStatus as string) || 'UNKNOWN',
      url: (externalData.ticketUrl as string) || '',
      lastUpdated: task.updatedAt || task.createdAt,
    };
  }
  
  // Add approvedAt only if it exists
  if (externalData.approvedAt) {
    response.approvedAt = externalData.approvedAt as string;
  }
  
  return response;
}

