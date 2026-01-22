import { useMutation } from "react-query";
import { createToken } from "../data/createToken";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast } from "~/utils/toast";
import { TOKEN_MESSAGES } from "~/constants/toast-messages";

export const useCreateToken = () => {
  return useMutation(createToken, {
    onError: (e) => {
      showErrorToast({
        title: TOKEN_MESSAGES.CREATE_ERROR.title,
        message: handleApiError(e, TOKEN_MESSAGES.CREATE_ERROR.message),
      });
    },
  });
};
