import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { CodepushService } from "~/.server/services/Codepush";
import { 
  authenticateLoaderRequest,
  authenticateActionRequest,
  AuthenticatedActionFunction,
  AuthenticatedLoaderFunction
} from "~/utils/authenticate";
import { logApiError } from '~/utils/api-route-helpers';

// GET /api/v1/tenants/:tenantId/collaborators
const getTenantCollaborators: AuthenticatedLoaderFunction = async ({ params, user }) => {
  try {
    const { tenantId } = params;
    
    if (!tenantId) {
      return json({ error: "tenantId is required" }, { status: 400 });
    }

    const response = await CodepushService.getTenantCollaborators(tenantId, user.user.id);
    return json(response.data, { status: response.status });
  } catch (error: any) {
    logApiError('[Collaborators-Get]', error);
    return json(
      { error: error.response?.data?.error || "Failed to fetch collaborators" },
      { status: error.response?.status || 500 }
    );
  }
};

export const loader = authenticateLoaderRequest(getTenantCollaborators);

// POST /api/v1/tenants/:tenantId/collaborators
const addCollaborator: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const { tenantId } = params;
    
    if (!tenantId) {
      return json({ error: "tenantId is required" }, { status: 400 });
    }

    const body = await request.json();
    const { email, permission } = body;

    if (!email) {
      return json({ error: "email is required" }, { status: 400 });
    }

    if (!permission) {
      return json({ error: "permission is required" }, { status: 400 });
    }

    const response = await CodepushService.addTenantCollaborator(
      tenantId,
      email,
      permission,
      user.user.id
    );
    
    return json(response.data, { status: response.status });
  } catch (error: any) {
    logApiError('[Collaborators-Add]', error);
    return json(
      { error: error.response?.data?.error || "Failed to add collaborator" },
      { status: error.response?.status || 500 }
    );
  }
};

// PATCH /api/v1/tenants/:tenantId/collaborators
const updateCollaborator: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const { tenantId } = params;
    
    if (!tenantId) {
      return json({ error: "tenantId is required" }, { status: 400 });
    }

    const body = await request.json();
    const { email, permission } = body;

    if (!email) {
      return json({ error: "email is required" }, { status: 400 });
    }

    if (!permission) {
      return json({ error: "permission is required" }, { status: 400 });
    }

    const response = await CodepushService.updateTenantCollaborator(
      tenantId,
      email,
      permission,
      user.user.id
    );
    
    return json(response.data, { status: response.status });
  } catch (error: any) {
    logApiError('[Collaborators-Update]', error);
    return json(
      { error: error.response?.data?.error || "Failed to update collaborator" },
      { status: error.response?.status || 500 }
    );
  }
};

// DELETE /api/v1/tenants/:tenantId/collaborators
const removeCollaborator: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const { tenantId } = params;
    
    if (!tenantId) {
      return json({ error: "tenantId is required" }, { status: 400 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return json({ error: "email is required" }, { status: 400 });
    }

    const response = await CodepushService.removeTenantCollaborator(
      tenantId,
      email,
      user.user.id
    );
    
    return json(response.data, { status: response.status });
  } catch (error: any) {
    logApiError('[Collaborators-Remove]', error);
    return json(
      { error: error.response?.data?.error || "Failed to remove collaborator" },
      { status: error.response?.status || 500 }
    );
  }
};

export const action = authenticateActionRequest({ 
  POST: addCollaborator,
  PATCH: updateCollaborator,
  DELETE: removeCollaborator
});

