import { useMutation } from "react-query";
import { updateReleaseDataForDeployment } from "../data/updateReleaseDataForDeployment";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast } from "~/utils/toast";
import { RELEASE_MESSAGES } from "~/constants/toast-messages";

export const useUpdateReleaseDataForDeployment = () => {
  return useMutation(updateReleaseDataForDeployment, {
    onError: (e) => {
      showErrorToast({
        title: RELEASE_MESSAGES.UPDATE_ERROR.title,
        message: handleApiError(e, RELEASE_MESSAGES.UPDATE_ERROR.message),
      });
    },
  });
};
