import { json } from "@remix-run/node";
import ReleaseManagementService from "~/.server/services/ReleaseManagement";
import {
  authenticateLoaderRequest,
  authenticateActionRequest,
  AuthenticatedActionFunction,
  AuthenticatedLoaderFunction
} from "~/utils/authenticate";

// GET /api/v1/:org/releases
const getReleases: AuthenticatedLoaderFunction = async ({ params, request, user }) => {
  try {
    const { org: tenantId } = params;
    
    if (!tenantId) {
      return json({ error: "tenantId is required" }, { status: 400 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const status = url.searchParams.get("status") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const search = url.searchParams.get("search") || undefined;

    const response = await ReleaseManagementService.getReleases(
      tenantId,
      page,
      pageSize,
      { status, type, search }
    );

    return json(response);
  } catch (error: any) {
    console.error("Error fetching releases:", error);
    return json(
      { error: error.message || "Failed to fetch releases" },
      { status: 500 }
    );
  }
};

export const loader = authenticateLoaderRequest(getReleases);

// POST /api/v1/:org/releases
const createRelease: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const { org: tenantId } = params;
    
    if (!tenantId) {
      return json({ error: "tenantId is required" }, { status: 400 });
    }

    const body = await request.json();

    const release = await ReleaseManagementService.createRelease({
      tenantId,
      ...body
    });

    return json({ release }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating release:", error);
    return json(
      { error: error.message || "Failed to create release" },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({ POST: createRelease });

