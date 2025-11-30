import { json } from "@remix-run/node";
import { CodepushService } from "~/.server/services/Codepush";
import { 
  authenticateLoaderRequest,
  authenticateActionRequest,
  AuthenticatedActionFunction
} from "~/utils/authenticate";

export const loader = authenticateLoaderRequest(async ({ user }) => {
  try {
    // Safety check for user object
    if (!user || !user.user || !user.user.id) {
      console.error('[API-Tenants] Invalid user object:', user);
      return json({ error: 'User not authenticated' }, { status: 401 });
    }
    
    const { data, status } = await CodepushService.getTenants(user.user.id);
    return json(data, { status });
  } catch (error: any) {
    console.error('[API-Tenants] Error fetching tenants:', error.message);
    return json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
});

const createOrganization: AuthenticatedActionFunction = async ({ request, user }) => {
  try {
    console.log("=== CREATE ORGANIZATION REQUEST ===");
    console.log("User:", user);
    
    // Safety check for user object
    if (!user || !user.user || !user.user.id) {
      console.error("Invalid user object");
      return json({ error: "User not authenticated" }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    console.log("Request body:", body);
    
    const { displayName } = body;

    if (!displayName) {
      console.error("displayName is missing");
      return json({ error: "displayName is required" }, { status: 400 });
    }

    console.log("Creating organization with displayName:", displayName);
    console.log("User ID:", user.user.id);
    
    // Create organization - pass userId for backend authentication
    const response = await CodepushService.createOrganization(displayName, user.user.id);
    
    console.log("Organization created successfully:", response.data);
    return json(response.data, { status: response.status });
  } catch (error: any) {
    console.error("Error creating organization:", error);
    console.error("Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    return json(
      { 
        error: error.response?.data?.error || error.response?.data?.message || error.message || "Failed to create organization" 
      },
      { status: error.response?.status || 500 }
    );
  }
};

export const action = authenticateActionRequest({ POST: createOrganization });
