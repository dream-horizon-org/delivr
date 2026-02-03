import { Router, Request, Response, NextFunction } from 'express';
import { createProjectManagementTicketController } from '~controllers/integrations/project-management/ticket/ticket.controller';
import type { ProjectManagementTicketService } from '~services/integrations/project-management';
import type { Storage } from '~storage/storage';
import * as tenantPermissions from '~middleware/tenant-permissions';


export const createTicketRoutes = (
  service: ProjectManagementTicketService,
  storage: Storage
): Router => {
  const router = Router();
  const controller = createProjectManagementTicketController(service);

  // Create tickets (stateless - no DB storage)
  router.post(
    '/project-management/tickets/create',
    tenantPermissions.requireEditor({ storage }),
    controller.createTickets
  );

  // Check ticket status (optional helper)
  router.get(
    '/project-management/tickets/check-status',
    tenantPermissions.requireAppMembership({ storage }),
    controller.checkTicketStatus
  );

  return router;
};

