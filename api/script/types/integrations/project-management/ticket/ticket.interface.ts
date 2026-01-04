import type { Platform } from '../platform.interface';

/**
 * Request to create tickets (STATELESS)
 */
export type CreateTicketsRequest = {
  pmConfigId: string;
  tickets: Array<{
    platform: Platform;
    title: string;
    description?: string;
  }>;
};

/**
 * Individual ticket creation result
 */
export type TicketCreationResult = {
  success: boolean;
  ticketKey?: string;
  ticketId?: string;
  ticketUrl?: string;
  projectKey?: string;
  completedStatus?: string;
  error?: string;
};

/**
 * Response from creating tickets (keyed by platform)
 */
export type CreateTicketsResponse = Record<Platform, TicketCreationResult>;

/**
 * Check ticket status result
 */
export type CheckTicketStatusResult = {
  ticketKey: string;
  ticketUrl: string;
  currentStatus: string;
  completedStatus: string;
  isCompleted: boolean;
  message: string;
};

// ❌ NO ProjectManagementTicket entity type - tickets are not stored!

