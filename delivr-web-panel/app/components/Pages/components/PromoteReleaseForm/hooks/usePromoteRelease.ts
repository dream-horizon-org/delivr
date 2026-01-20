import { useMutation } from "react-query";
import { promoteRelease } from "../data/promoteRelease";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast } from "~/utils/toast";
import { RELEASE_MESSAGES } from "~/constants/toast-messages";

export const usePromoteRelease = () => {
  return useMutation(promoteRelease, {
    onError: (e) => {
      showErrorToast({
        title: "Deployment Promotion Failed",
        message: handleApiError(e, "Error While promoting deployment"),
      });
    },
  });
};
