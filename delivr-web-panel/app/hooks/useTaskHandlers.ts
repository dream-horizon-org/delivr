/**
 * Shared Task Handlers Hook
 * Provides common task handler functions for stage components
 */

import { useCallback } from 'react';
import { useRetryTask } from './useReleaseProcess';
import { ERROR_MESSAGES } from '~/constants/release-process-ui';
import { getApiErrorMessage } from '~/utils/api-client';
import { showErrorToast, showSuccessToast } from '~/utils/toast';

interface UseTaskHandlersOptions {
  appId: string;
  releaseId: string;
  refetch: () => unknown;
}

export function useTaskHandlers({ appId, releaseId, refetch }: UseTaskHandlersOptions) {
  const retryMutation = useRetryTask(appId, releaseId);

  const handleRetry = useCallback(
    async (taskId: string) => {
      try {
        await retryMutation.mutateAsync({ taskId });
        showSuccessToast({ message: 'Task retry initiated successfully' });
        void refetch(); // Fire and forget - refetch doesn't need to be awaited
      } catch (error) {
        const errorMessage = getApiErrorMessage(error, ERROR_MESSAGES.FAILED_TO_RETRY_TASK);
        showErrorToast({ message: errorMessage });
      }
    },
    [retryMutation, refetch]
  );

  return { handleRetry };
}

