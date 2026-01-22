import { useMutation } from "react-query";
import { handleApiError } from "~/utils/handleApiError";
import { deleteAccessToken } from "../data/deleteAccessToken";
import { showErrorToast } from "~/utils/toast";
import { TOKEN_MESSAGES } from "~/constants/toast-messages";

export const useDeleteAccessToken = () => {
  return useMutation(deleteAccessToken, {
    onError: (e) => {
      showErrorToast({
        title: TOKEN_MESSAGES.DELETE_ERROR.title,
        message: handleApiError(e, TOKEN_MESSAGES.DELETE_ERROR.message),
      });
    },
  });
};
