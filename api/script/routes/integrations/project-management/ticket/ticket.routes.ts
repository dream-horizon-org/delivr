import { Router, Request, Response, NextFunction } from 'express';
import { createProjectManagementTicketController } from '~controllers/integrations/project-management/ticket/ticket.controller';
import type { ProjectManagementTicketService } from '~services/integrations/project-management';
import type { Storage } from '~storage/storage';

/**
 * Basic authentication middleware - requires authenticated user
 */
const requireAuthentication = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const createTicketRoutes = (
  service: ProjectManagementTicketService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createProjectManagementTicketController(service);

  // Create tickets (stateless - no DB storage)
  router.post(
    '/project-management/tickets/create',
    requireAuthentication,
    controller.createTickets
  );

  // Check ticket status (optional helper)
  router.get(
    '/project-management/tickets/check-status',
    requireAuthentication,
    controller.checkTicketStatus
  );

  return router;
};

