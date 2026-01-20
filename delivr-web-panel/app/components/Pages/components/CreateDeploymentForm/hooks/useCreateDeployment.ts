import { useMutation } from "react-query";
import { createDeployment } from "../data/createDeployment";
import { handleApiError } from "~/utils/handleApiError";
import { showSuccessToast, showErrorToast } from "~/utils/toast";
import { DEPLOYMENT_MESSAGES } from "~/constants/toast-messages";

export const useCreateDeployment = () => {
  return useMutation(createDeployment, {
    onSuccess: () => {
      showSuccessToast(DEPLOYMENT_MESSAGES.CREATE_SUCCESS);
    },
    onError: (e) => {
      showErrorToast({
        title: DEPLOYMENT_MESSAGES.CREATE_ERROR.title,
        message: handleApiError(e, DEPLOYMENT_MESSAGES.CREATE_ERROR.message),
      });
    },
  });
};
