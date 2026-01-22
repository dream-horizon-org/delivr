import { useMutation } from "react-query";

import { removeAppCollabarator } from "../data/removeAppCollaborator";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast } from "~/utils/toast";
import { COLLABORATOR_MESSAGES } from "~/constants/toast-messages";

export const useRemoveCollabarator = () => {
  return useMutation(removeAppCollabarator, {
    onError: (e) => {
      showErrorToast({
        title: COLLABORATOR_MESSAGES.REMOVE_ERROR.title,
        message: handleApiError(e, COLLABORATOR_MESSAGES.REMOVE_ERROR.message),
      });
    },
  });
};
