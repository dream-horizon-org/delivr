import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { CodepushService } from "~/.server/services/Codepush";
import { 
  authenticateLoaderRequest,
  authenticateActionRequest,
  AuthenticatedActionFunction,
  AuthenticatedLoaderFunction
} from "~/utils/authenticate";
import { logApiError } from '~/utils/api-route-helpers';

// GET /api/v1/apps/:appId/collaborators
const getTenantCollaborators: AuthenticatedLoaderFunction = async ({ params, user }) => {
  try {
    const appId = params.appId;
    
    if (!appId) {
      return json({ error: "appId is required" }, { status: 400 });
    }

    const response = await CodepushService.getTenantCollaborators(appId, user.user.id);
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

// POST /api/v1/apps/:appId/collaborators
const addCollaborator: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const appId = params.appId;
    
    if (!appId) {
      return json({ error: "appId is required" }, { status: 400 });
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
      appId,
      email,
      permission,
      user.user.id
    );
    
    return json(response.data, { status: response.status });
  } catch (error: any) {
    logApiError('[Collaborators-Add]', error);
    
    // Pass through the backend error message as-is
    // Backend sends plain string for 404 errors: "Account with this email does not exist"
    const errorMessage = error.response?.data || error.message || "Failed to add collaborator";
    const statusCode = error.response?.status || 500;
    
    return json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
};

// PATCH /api/v1/apps/:appId/collaborators
const updateCollaborator: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const appId = params.appId;
    
    if (!appId) {
      return json({ error: "appId is required" }, { status: 400 });
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
      appId,
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

// DELETE /api/v1/apps/:appId/collaborators
const removeCollaborator: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const appId = params.appId;
    
    if (!appId) {
      return json({ error: "appId is required" }, { status: 400 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return json({ error: "email is required" }, { status: 400 });
    }

    const response = await CodepushService.removeTenantCollaborator(
      appId,
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

