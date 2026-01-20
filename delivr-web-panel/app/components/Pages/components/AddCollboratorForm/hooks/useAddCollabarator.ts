import { useMutation } from "react-query";

import { addCollabarator } from "../data/addCollabarator";
import { handleApiError } from "~/utils/handleApiError";
import { showErrorToast } from "~/utils/toast";
import { COLLABORATOR_MESSAGES } from "~/constants/toast-messages";

export const useAddCollabarator = () => {
  return useMutation(addCollabarator, {
    onError: (e) => {
      showErrorToast({
        title: COLLABORATOR_MESSAGES.ADD_ERROR.title,
        message: handleApiError(e, COLLABORATOR_MESSAGES.ADD_ERROR.message),
      });
    },
  });
};
