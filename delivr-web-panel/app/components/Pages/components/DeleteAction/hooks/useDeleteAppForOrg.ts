import { useMutation } from "react-query";
import { deleteAppForOrg } from "../data/deleteAppForOrg";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast, showSuccessToast } from "~/utils/toast";
import { APP_MESSAGES } from "~/constants/toast-messages";

export const useDeleteAppForOrg = () => {
  return useMutation(deleteAppForOrg, {
    onSuccess: () => {
      showSuccessToast(APP_MESSAGES.DELETE_SUCCESS);
    },
    onError: (e) => {
      showErrorToast({
        title: APP_MESSAGES.DELETE_ERROR.title,
        message: handleApiError(e, APP_MESSAGES.DELETE_ERROR.message),
      });
    },
  });
};
