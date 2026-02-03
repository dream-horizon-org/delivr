import { useMutation } from "react-query";

import { deleteOrg } from "../data/deleteOrg";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast, showSuccessToast } from "~/utils/toast";
import { PROJECT_MESSAGES } from "~/constants/toast-messages";

export const useDeleteOrg = () => {
  return useMutation(deleteOrg, {
    onSuccess: () => {
      showSuccessToast(PROJECT_MESSAGES.DELETE_SUCCESS);
    },
    onError: (e) => {
      showErrorToast({
        title: PROJECT_MESSAGES.DELETE_ERROR.title,
        message: handleApiError(e, PROJECT_MESSAGES.DELETE_ERROR.message),
      });
    },
  });
};
