import { AxiosError } from "axios";

export const handleApiError = (e: unknown, fallback: string): string => {
  try {
    const axiosError = e as AxiosError<{ message: unknown; error?: unknown }>;
    
    // Check for network errors
    if (axiosError?.code === "ECONNREFUSED") {
      return "Cannot connect to backend server. Please ensure the server is running.";
    }
    
    if (axiosError?.code === "ENOTFOUND") {
      return "Backend server not found. Please check your configuration.";
    }
    
    if (axiosError?.code === "ETIMEDOUT") {
      return "Request timed out. Please try again.";
    }
    
    // Check HTTP status codes
    const status = axiosError?.response?.status;
    
    if (status === 403) {
      return "Access denied. You don't have permission to perform this action. Please check your organization membership and role.";
    }
    
    if (status === 401) {
      return "Unauthorized. Please log in again.";
    }
    
    if (status === 404) {
      return "Resource not found.";
    }
    
    if (status === 400) {
      // For 400, try to get specific message from backend
      const message = axiosError?.response?.data?.message || axiosError?.response?.data?.error;
      if (message) {
        return typeof message === "string" ? message : JSON.stringify(message);
      }
      return "Bad request. Please check your input.";
    }
    
    // Check for response errors
    const message = axiosError?.response?.data?.message;
    const error = axiosError?.response?.data?.error;
    
    if (message) {
      if (typeof message === "object") {
        return JSON.stringify(message);
      }
      return message.toString();
    }
    
    if (error) {
      if (typeof error === "string") {
        return error;
      }
      if (typeof error === "object") {
        return JSON.stringify(error);
      }
    }
    
    // Check for generic error message
    if (axiosError?.message) {
      return axiosError.message;
    }

    return fallback;
  } catch (_er) {
    console.error("Error in handleApiError:", { originalError: e, handlingError: _er });
    return fallback;
  }
};
