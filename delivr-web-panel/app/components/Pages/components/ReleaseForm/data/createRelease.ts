import axios, { AxiosResponse } from "axios";

export interface CreateReleaseRequest {
  orgName: string;
  appName: string;
  deploymentName: string;
  formData: FormData;
}

export interface CreateReleaseResponse {
  package: {
    label: string;
    appVersion: string;
    description: string;
    packageHash: string;
    blobUrl: string;
    size: number;
    rollout: number;
    isMandatory: boolean;
    isDisabled: boolean;
    uploadTime: number;
  };
}

export const createRelease = async ({
  orgName,
  appName,
  deploymentName,
  formData,
}: CreateReleaseRequest): Promise<CreateReleaseResponse> => {
  try {
    const { data } = await axios.post<CreateReleaseResponse>(
      `/api/v1/${orgName}/${appName}/deployments/${deploymentName}/release`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return data;
  } catch (error: any) {
    // Handle axios errors with better error messages
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const responseData = error.response.data;
      
      // Try to extract error message from response
      let errorMessage = 'Failed to create release';
      if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      } else if (responseData?.error) {
        errorMessage = responseData.error;
      } else if (responseData?.details) {
        errorMessage = responseData.details;
      }
      
      // Create a proper error object that matches what useCreateRelease expects
      const apiError = new Error(errorMessage);
      (apiError as any).response = {
        status,
        data: responseData,
      };
      throw apiError;
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('No response from server. Please check your connection and try again.');
    } else {
      // Something else happened
      throw new Error(error.message || 'Failed to create release');
    }
  }
};
