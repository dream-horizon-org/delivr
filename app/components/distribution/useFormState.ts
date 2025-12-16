/**
 * useFormState - Manages submit to stores form state
 */

import { useFetcher } from '@remix-run/react';
import { useCallback, useState } from 'react';
import { Platform } from '~/types/distribution.types';

type FormState = {
  selectedPlatforms: Platform[];
  // Note: androidTrack removed - not used per API spec (submissions go directly to production)
  androidRollout: number;
  androidPriority: number;
  // Note: iosReleaseType removed - always "AFTER_APPROVAL" per API spec (non-editable)
  iosPhasedRelease: boolean;
  iosResetRating: boolean;
  releaseNotes: string;
};

type SubmitToStoresActionResponse = {
  success?: boolean;
  error?: { message: string };
};

export function useFormState(availablePlatforms: Platform[]) {
  const [formState, setFormState] = useState<FormState>({
    selectedPlatforms: [...availablePlatforms],
    // Note: androidTrack removed - not used per API spec
    androidRollout: 100,
    androidPriority: 0,  // Per API Spec: default 0
    // Note: iosReleaseType removed - always "AFTER_APPROVAL" per API spec
    iosPhasedRelease: true,
    iosResetRating: false,  // Per API Spec: default false
    releaseNotes: '',
  });

  const fetcher = useFetcher<SubmitToStoresActionResponse>();
  const isSubmitting = fetcher.state === 'submitting';
  const submitError = fetcher.data?.error?.message ?? null;
  const submitSuccess = fetcher.data?.success === true;

  const updateField = useCallback(<K extends keyof FormState>(
    field: K, 
    value: FormState[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const togglePlatform = useCallback((platform: Platform) => {
    setFormState(prev => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platform)
        ? prev.selectedPlatforms.filter(p => p !== platform)
        : [...prev.selectedPlatforms, platform],
    }));
  }, []);

  return {
    formState,
    updateField,
    togglePlatform,
    fetcher,
    isSubmitting,
    submitError,
    submitSuccess,
  };
}

