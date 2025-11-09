import { json } from "@remix-run/node";
import ReleaseManagementService from "~/.server/services/ReleaseManagement";
import {
  authenticateLoaderRequest,
  authenticateActionRequest,
  AuthenticatedActionFunction,
  AuthenticatedLoaderFunction
} from "~/utils/authenticate";

// GET /api/v1/:org/integrations
const getIntegrations: AuthenticatedLoaderFunction = async ({ params, user }) => {
  try {
    const { org: tenantId } = params;
    
    if (!tenantId) {
      return json({ error: "tenantId is required" }, { status: 400 });
    }

    const response = await ReleaseManagementService.getTenantIntegrations(tenantId);
    return json(response);
  } catch (error: any) {
    console.error("Error fetching integrations:", error);
    return json(
      { error: error.message || "Failed to fetch integrations" },
      { status: 500 }
    );
  }
};

export const loader = authenticateLoaderRequest(getIntegrations);

// POST /api/v1/:org/integrations
const createIntegration: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const { org: tenantId } = params;
    
    if (!tenantId) {
      return json({ error: "tenantId is required" }, { status: 400 });
    }

    const body = await request.json();

    const integration = await ReleaseManagementService.createIntegration(tenantId, body);
    return json({ integration }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating integration:", error);
    return json(
      { error: error.message || "Failed to create integration" },
      { status: 500 }
    );
  }
};

// PATCH /api/v1/:org/integrations
const updateIntegration: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const body = await request.json();
    const { integrationId, ...updates } = body;

    if (!integrationId) {
      return json({ error: "integrationId is required" }, { status: 400 });
    }

    const integration = await ReleaseManagementService.updateIntegration(integrationId, updates);
    return json({ integration });
  } catch (error: any) {
    console.error("Error updating integration:", error);
    return json(
      { error: error.message || "Failed to update integration" },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  POST: createIntegration,
  PATCH: updateIntegration
});

