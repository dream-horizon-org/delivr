import { Router } from 'express';
import { createProjectManagementTicketController } from '~controllers/integrations/project-management/ticket/ticket.controller';
import type { ProjectManagementTicketService } from '~services/integrations/project-management';

export const createTicketRoutes = (service: ProjectManagementTicketService): Router => {
  const router = Router();
  const controller = createProjectManagementTicketController(service);

  // Create tickets (stateless - no DB storage)
  router.post('/project-management/tickets/create', controller.createTickets);

  // Check ticket status (optional helper)
  router.get('/project-management/tickets/check-status', controller.checkTicketStatus);

  return router;
};

