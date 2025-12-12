/**
 * useVerifyState - Manages TestFlight verification form state
 */

import { useFetcher } from '@remix-run/react';
import { useCallback, useState } from 'react';
import { VALIDATION_RULES } from '~/constants/distribution.constants';

type BuildOperationResponse = {
  success?: boolean;
  data?: { build: unknown };
  error?: { message: string };
};

export function useVerifyState() {
  const [buildNumber, setBuildNumber] = useState('');
  const [versionName, setVersionName] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    buildNumber?: string;
    versionName?: string;
  }>({});
  
  const fetcher = useFetcher<BuildOperationResponse>();
  
  const isVerifying = fetcher.state === 'submitting';
  const verifyError = fetcher.data?.error?.message ?? null;
  const verifySuccess = fetcher.data?.success === true;

  const validate = useCallback((): boolean => {
    const errors: { buildNumber?: string; versionName?: string } = {};
    
    // Validate build number
    if (!buildNumber.trim()) {
      errors.buildNumber = 'Build number is required';
    } else if (!VALIDATION_RULES.TESTFLIGHT_BUILD_NUMBER.PATTERN.test(buildNumber)) {
      errors.buildNumber = 'Build number must be numeric';
    }
    
    // Validate version name
    if (!versionName.trim()) {
      errors.versionName = 'Version name is required';
    } else if (!VALIDATION_RULES.VERSION_NAME.PATTERN.test(versionName)) {
      errors.versionName = `Version must match format ${VALIDATION_RULES.VERSION_NAME.EXAMPLE}`;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [buildNumber, versionName]);

  const clearForm = useCallback(() => {
    setBuildNumber('');
    setVersionName('');
    setValidationErrors({});
  }, []);

  return {
    buildNumber,
    setBuildNumber,
    versionName,
    setVersionName,
    validationErrors,
    isVerifying,
    verifyError,
    verifySuccess,
    fetcher,
    validate,
    clearForm,
  };
}

