import type { Request, Response } from 'express';
import { HTTP_STATUS } from '~constants/http';
import type { ProjectManagementTicketService } from '~services/integrations/project-management';
import { PROJECT_MANAGEMENT_ERROR_MESSAGES, PROJECT_MANAGEMENT_SUCCESS_MESSAGES } from '~services/integrations/project-management';
import type { CreateTicketsRequest, Platform } from '~types/integrations/project-management';
import {
  errorResponse,
  getErrorStatusCode,
  successResponse,
  validationErrorResponse
} from '~utils/response.utils';
import {
  validateCheckTicketStatusRequest,
  validateCreateTicketsRequest
} from './ticket.validation';

/**
 * Create tickets (stateless)
 * POST /project-management/tickets/create
 */
const createTicketsHandler = (service: ProjectManagementTicketService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request
      const validationError = validateCreateTicketsRequest(req.body);
      if (validationError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('request', validationError)
        );
        return;
      }

      const request: CreateTicketsRequest = {
        pmConfigId: req.body.pmConfigId,
        tickets: req.body.tickets
      };

      const results = await service.createTickets(request);

      res.status(HTTP_STATUS.CREATED).json(successResponse(results));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.CREATE_TICKETS_FAILED)
      );
    }
  };

/**
 * Check ticket status (optional helper)
 * GET /project-management/tickets/check-status
 */
const checkTicketStatusHandler = (service: ProjectManagementTicketService) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate query parameters
      const validationError = validateCheckTicketStatusRequest(req.query);
      if (validationError) {
        res.status(HTTP_STATUS.BAD_REQUEST).json(
          validationErrorResponse('query', validationError)
        );
        return;
      }

      const { pmConfigId, platform, ticketKey } = req.query as {
        pmConfigId: string;
        platform: string;
        ticketKey: string;
      };

      const result = await service.checkTicketStatus(pmConfigId, platform as Platform, ticketKey);

      res.status(HTTP_STATUS.OK).json(successResponse(result));
    } catch (error) {
      const statusCode = getErrorStatusCode(error);
      res.status(statusCode).json(
        errorResponse(error, PROJECT_MANAGEMENT_ERROR_MESSAGES.CHECK_TICKET_STATUS_FAILED)
      );
    }
  };

/**
 * Create and export controller
 */
export const createProjectManagementTicketController = (
  service: ProjectManagementTicketService
) => ({
  createTickets: createTicketsHandler(service),
  checkTicketStatus: checkTicketStatusHandler(service)
});

