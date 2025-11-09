import { json } from "@remix-run/node";
import ReleaseManagementService from "~/.server/services/ReleaseManagement";
import {
  authenticateLoaderRequest,
  authenticateActionRequest,
  AuthenticatedActionFunction,
  AuthenticatedLoaderFunction
} from "~/utils/authenticate";

// GET /api/v1/:org/releases/:releaseId
const getReleaseDetails: AuthenticatedLoaderFunction = async ({ params, user }) => {
  try {
    const { releaseId } = params;
    
    if (!releaseId) {
      return json({ error: "releaseId is required" }, { status: 400 });
    }

    const response = await ReleaseManagementService.getReleaseDetails(releaseId);
    return json(response);
  } catch (error: any) {
    console.error("Error fetching release details:", error);
    return json(
      { error: error.message || "Failed to fetch release details" },
      { status: error.message === "Release not found" ? 404 : 500 }
    );
  }
};

export const loader = authenticateLoaderRequest(getReleaseDetails);

// PATCH /api/v1/:org/releases/:releaseId
const updateRelease: AuthenticatedActionFunction = async ({ request, params, user }) => {
  try {
    const { releaseId } = params;
    
    if (!releaseId) {
      return json({ error: "releaseId is required" }, { status: 400 });
    }

    const body = await request.json();

    const release = await ReleaseManagementService.updateRelease(releaseId, body);
    return json({ release });
  } catch (error: any) {
    console.error("Error updating release:", error);
    return json(
      { error: error.message || "Failed to update release" },
      { status: 500 }
    );
  }
};

// DELETE /api/v1/:org/releases/:releaseId
const deleteRelease: AuthenticatedActionFunction = async ({ params, user }) => {
  try {
    const { releaseId } = params;
    
    if (!releaseId) {
      return json({ error: "releaseId is required" }, { status: 400 });
    }

    await ReleaseManagementService.deleteRelease(releaseId);
    return json({ success: true });
  } catch (error: any) {
    console.error("Error deleting release:", error);
    return json(
      { error: error.message || "Failed to delete release" },
      { status: 500 }
    );
  }
};

export const action = authenticateActionRequest({
  PATCH: updateRelease,
  DELETE: deleteRelease
});

