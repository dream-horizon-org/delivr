import { useMutation } from "react-query";
import { notifications } from "@mantine/notifications";
import { createRelease } from "../data/createRelease";
import { handleApiError } from "~/utils/handleApiError";

// Enhanced error handling for CodePush release errors
const getDetailedErrorMessage = (error: any): { title: string; message: string; color: string } => {
  const status = error?.response?.status;
  const responseData = error?.response?.data;
  
  // Extract error message with multiple fallbacks
  let errorMessage = '';
  if (typeof responseData === 'string') {
    errorMessage = responseData;
  } else if (responseData?.details) {
    // Use the detailed error message from CodePush server
    errorMessage = responseData.details;
  } else if (responseData?.originalError && typeof responseData.originalError === 'string') {
    errorMessage = responseData.originalError;
  } else if (responseData?.message) {
    errorMessage = responseData.message;
  } else if (responseData?.error) {
    errorMessage = responseData.error;
  } else if (error.message) {
    errorMessage = error.message;
  } else {
    errorMessage = 'Unknown error occurred';
  }

  // Handle specific HTTP status codes and error messages
  switch (status) {
    case 400: // Bad Request - Validation Errors
      if (errorMessage?.includes('A deployment package must include a file')) {
        return {
          title: "Missing File",
          message: "Please select a directory to upload. A bundle file is required for the release.",
          color: "red"
        };
      }
      if (errorMessage?.includes('appVersion')) {
        return {
          title: "Invalid App Version",
          message: "App version is required and must be a valid semantic version (e.g., 1.0.0).",
          color: "red"
        };
      }
      if (errorMessage?.includes('Rollout value must be an integer between 1 and 100')) {
        return {
          title: "Invalid Rollout Value",
          message: "Rollout percentage must be a number between 1 and 100.",
          color: "red"
        };
      }
      if (errorMessage?.includes('validation')) {
        return {
          title: "Validation Error",
          message: `Invalid request data: ${errorMessage}`,
          color: "red"
        };
      }
      break;

    case 401: // Unauthorized
      return {
        title: "Authentication Required",
        message: "You need to log in again to create releases.",
        color: "red"
      };

    case 403: // Forbidden
      if (errorMessage?.includes('Collaborator permissions')) {
        return {
          title: "Insufficient Permissions",
          message: "You need Collaborator permissions on this app to create releases.",
          color: "red"
        };
      }
      return {
        title: "Access Denied",
        message: "You don't have permission to create releases for this app.",
        color: "red"
      };

    case 404: // Not Found
      if (errorMessage?.includes('does not exist')) {
        return {
          title: "App or Deployment Not Found",
          message: "The app or deployment you're trying to release to doesn't exist.",
          color: "red"
        };
      }
      break;

    case 409: // Conflict - Multiple specific scenarios
      if (errorMessage?.includes('update the previous release to 100% rollout')) {
        return {
          title: "Incomplete Rollout",
          message: "The previous release is still rolling out. Please update it to 100% rollout before creating a new release.",
          color: "orange"
        };
      }
      if (errorMessage?.includes('identical to the contents of the specified deployment')) {
        return {
          title: "Duplicate Release",
          message: "This bundle is identical to the current release. No update is needed.",
          color: "blue"
        };
      }
      if (errorMessage?.includes('identical to the contents of the targeted deployment')) {
        return {
          title: "Duplicate Content",
          message: "This bundle is identical to the target deployment's current release.",
          color: "blue"
        };
      }
      if (errorMessage?.includes('Cannot promote to an unfinished rollout')) {
        return {
          title: "Target Rollout Incomplete",
          message: "Cannot promote to a deployment with an unfinished rollout unless it's disabled.",
          color: "orange"
        };
      }
      break;

    case 413: // Payload Too Large
      return {
        title: "File Too Large",
        message: "The bundle file is too large. Please reduce the bundle size and try again.",
        color: "red"
      };

    case 500: // Internal Server Error
      return {
        title: "Server Error",
        message: "An internal server error occurred. Please try again later.",
        color: "red"
      };

    case 503: // Service Unavailable
      return {
        title: "Service Temporarily Unavailable",
        message: "The CodePush server is temporarily unavailable. Please try again in a few minutes.",
        color: "orange"
      };
  }

  // Default error handling - ensure we always have a message
  const fallbackMessage = errorMessage || handleApiError(error, "An unexpected error occurred while creating the release");
  
  return {
    title: "Release Failed",
    message: fallbackMessage,
    color: "red"
  };
};

export const useCreateRelease = () => {
  return useMutation(createRelease, {
    onSuccess: (data) => {
      const releaseLabel = data.package?.label || 'new release';
      notifications.show({
        color: "green",
        title: "Release Created Successfully",
        message: `Release ${releaseLabel} has been created and is now available for deployment!`,
      });
    },
    onError: (error) => {
      const { title, message, color } = getDetailedErrorMessage(error);
      
      // Ensure message is never empty
      const finalMessage = message && message.trim() ? message : "An error occurred while creating the release. Please check the console for details.";
      
      notifications.show({
        color,
        title,
        message: finalMessage,
        autoClose: color === "blue" ? 5000 : 8000, // Longer for actionable errors
      });

      // Log detailed error for debugging
      console.group('🚨 Release Creation Error: ', finalMessage);
      console.groupEnd();
    },
  });
};
