import { useMutation } from "react-query";

import { updateAppCollabarator } from "../data/updateAppCollaborator";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast } from "~/utils/toast";
import { COLLABORATOR_MESSAGES } from "~/constants/toast-messages";

export const useUpdateCollabarator = () => {
  return useMutation(updateAppCollabarator, {
    onError: (e) => {
      showErrorToast({
        title: COLLABORATOR_MESSAGES.UPDATE_ERROR.title,
        message: handleApiError(e, COLLABORATOR_MESSAGES.UPDATE_ERROR.message),
      });
    },
  });
};
