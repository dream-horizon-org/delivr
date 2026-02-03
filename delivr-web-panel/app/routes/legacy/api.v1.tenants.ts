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
    
    const { data, status } = await CodepushService.getApps(user.user.id);
    return json(data, { status });
  } catch (error: any) {
    console.error('[API-Tenants] Error fetching apps:', error.message);
    return json({ error: 'Failed to fetch apps' }, { status: 500 });
  }
});

/**
 * Legacy function name - kept for backward compatibility
 * @deprecated Use createApp instead
 */
const createApp: AuthenticatedActionFunction = async ({ request, user }) => {
  try {
    console.log("=== CREATE APP REQUEST ===");
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

    console.log("Creating app with displayName:", displayName);
    console.log("User ID:", user.user.id);
    
    // Create app - pass userId for backend authentication
    const response = await CodepushService.createApp(displayName, undefined, user.user.id);
    
    console.log("App created successfully:", response.data);
    return json(response.data, { status: response.status });
  } catch (error: any) {
    console.error("Error creating app:", error);
    console.error("Error details:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      fullError: JSON.stringify(error.response?.data, null, 2)
    });
    
    // Extract error message from backend response - use backend message directly
    let errorMessage = "Failed to create app";
    const statusCode = error.response?.status || 500;
    
    if (error.response?.data) {
      const errorData = error.response.data;
      
      // Try different error message locations
      if (typeof errorData === 'string') {
        errorMessage = errorData;
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.error.message || errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.details) {
        errorMessage = typeof errorData.details === 'string' 
          ? errorData.details 
          : errorData.details.message || errorMessage;
      }
    }
    
    return json(
      { 
        error: errorMessage
      },
      { status: statusCode }
    );
  }
};

export const action = authenticateActionRequest({ POST: createApp });
