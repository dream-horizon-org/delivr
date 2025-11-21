/**
 * Project Management Ticket Validation
 */

import { isValidPlatform } from '~types/integrations/project-management';

/**
 * Validate create tickets request
 */
export const validateCreateTicketsRequest = (body: unknown): string | null => {
  if (typeof body !== 'object' || body === null) {
    return 'Request body must be an object';
  }

  const req = body as Record<string, unknown>;

  // Validate pmConfigId
  if (typeof req.pmConfigId !== 'string' || !req.pmConfigId) {
    return 'pmConfigId is required';
  }

  // Validate tickets array
  if (!Array.isArray(req.tickets)) {
    return 'tickets must be an array';
  }

  if (req.tickets.length === 0) {
    return 'At least one ticket is required';
  }

  // Validate each ticket
  for (const ticket of req.tickets) {
    if (typeof ticket !== 'object' || ticket === null) {
      return 'Each ticket must be an object';
    }

    const ticketObj = ticket as Record<string, unknown>;

    // Validate platform
    if (!isValidPlatform(ticketObj.platform)) {
      return `Invalid platform: ${ticketObj.platform}`;
    }

    // Validate title
    if (typeof ticketObj.title !== 'string' || !ticketObj.title) {
      return 'Each ticket must have a title';
    }

    // Description is optional but must be string if provided
    if (
      ticketObj.description !== undefined &&
      typeof ticketObj.description !== 'string'
    ) {
      return 'Ticket description must be a string if provided';
    }
  }

  return null;
};

/**
 * Validate check ticket status request
 */
export const validateCheckTicketStatusRequest = (query: unknown): string | null => {
  if (typeof query !== 'object' || query === null) {
    return 'Query parameters are required';
  }

  const params = query as Record<string, unknown>;

  // Validate pmConfigId
  if (typeof params.pmConfigId !== 'string' || !params.pmConfigId) {
    return 'pmConfigId query parameter is required';
  }

  // Validate platform
  if (!isValidPlatform(params.platform)) {
    return `Invalid platform: ${params.platform}`;
  }

  // Validate ticketKey
  if (typeof params.ticketKey !== 'string' || !params.ticketKey) {
    return 'ticketKey query parameter is required';
  }

  return null;
};

