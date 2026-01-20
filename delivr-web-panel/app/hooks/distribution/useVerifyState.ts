/**
 * useVerifyState - Manages TestFlight verification form state
 */

import { useFetcher } from '@remix-run/react';
import { useCallback, useState } from 'react';
import { VALIDATION_RULES } from '~/constants/distribution/distribution.constants';

type BuildOperationResponse = {
  success?: boolean;
  data?: { build: unknown };
  error?: { message: string };
};

export function useVerifyState() {
  const [buildNumber, setBuildNumber] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    buildNumber?: string;
  }>({});
  
  const fetcher = useFetcher<BuildOperationResponse>();
  
  const isVerifying = fetcher.state === 'submitting';
  const verifyError = fetcher.data?.error?.message ?? null;
  const verifySuccess = fetcher.data?.success === true;

  const validate = useCallback((): boolean => {
    const errors: { buildNumber?: string } = {};
    
    // Validate build number
    if (!buildNumber.trim()) {
      errors.buildNumber = 'Build number is required';
    } else if (!VALIDATION_RULES.TESTFLIGHT_BUILD_NUMBER.PATTERN.test(buildNumber)) {
      errors.buildNumber = 'Build number must be numeric';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [buildNumber]);

  const clearForm = useCallback(() => {
    setBuildNumber('');
    setValidationErrors({});
  }, []);

  return {
    buildNumber,
    setBuildNumber,
    validationErrors,
    isVerifying,
    verifyError,
    verifySuccess,
    fetcher,
    validate,
    clearForm,
  };
}

