import { useMutation } from "react-query";

import { handleApiError } from "~/utils/handleApiError";
import { deleteDeployment } from "../data/deleteDeployment";
import { showErrorToast, showSuccessToast } from "~/utils/toast";
import { DEPLOYMENT_MESSAGES } from "~/constants/toast-messages";

export const useDeleteDeployment = () => {
  return useMutation(deleteDeployment, {
    onError: (e) => {
      showErrorToast({
        title: DEPLOYMENT_MESSAGES.DELETE_ERROR.title,
        message: handleApiError(e, DEPLOYMENT_MESSAGES.DELETE_ERROR.message),
      });
    },
    onSuccess: () => {
      showSuccessToast(DEPLOYMENT_MESSAGES.DELETE_SUCCESS);
    },
  });
};
