import { useMutation } from "react-query";
import { createApp } from "../data/createApp";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast } from "~/utils/toast";
import { APP_MESSAGES } from "~/constants/toast-messages";

export const useCreateApp = () => {
  return useMutation(createApp, {
    onError: (e) => {
      showErrorToast({
        title: APP_MESSAGES.CREATE_ERROR.title,
        message: handleApiError(e, APP_MESSAGES.CREATE_ERROR.message),
      });
    },
  });
};
