/**
 * Custom hook for managing Setup Wizard state and navigation
 * 
 * Bucket-based architecture:
 * - Top-level buckets represent major setup categories (SCM, Distribution, CI/CD, Communication)
 * - Each bucket manages its own internal steps
 * - OnboardingFlow only tracks bucket-level completion
 * - Integrations data from tenant info determines bucket state
 */

import { useState, useCallback, useMemo } from 'react';
import type { SetupBucket, SetupBucketConfig, SetupWizardData } from '~/types/setup-wizard';
import { 
  SetupStepsInfo, 
  Integration,
} from '~/.server/services/Codepush/types';
import {
  type IntegrationType,
  INTEGRATION_TYPES,
  VERIFICATION_STATUS
} from '~/constants/integrations';

interface UseSetupWizardProps {
  initialData?: SetupWizardData;
  onComplete?: (data: SetupWizardData) => void;
  setupStepsInfo?: SetupStepsInfo;
  integrations?: Integration[]; // Current integrations from tenant info
}


/**
 * Utility: Check if integrations of a specific type exist and are valid
 */
function hasValidIntegration(integrations: Integration[] | undefined, type: IntegrationType): boolean {
  console.log('integrations', integrations);
  console.log('type', type);
  if (!integrations) return false;
  return integrations.some(integration => {
    // Must match type and be active
    if (integration.type !== type) {
      return false;
    }
    
    // Check isActive flag (required for all integrations)
    if ('isActive' in integration && !integration.isActive) {
      return false;
    }
    
    // Check verification status for integrations that have it (SCM, Slack)
    if ('verificationStatus' in integration) {
      // Accept both 'VALID' (correct) and 'PENDING' (for backward compatibility)
      // Backend should always set to 'VALID' after save, but we handle 'PENDING' gracefully
      return integration.verificationStatus === VERIFICATION_STATUS.VALID || 
             integration.verificationStatus === VERIFICATION_STATUS.PENDING;
    }
    
    // For integrations without verificationStatus (pipeline, communication without it)
    // Just having the integration with isActive=true is enough
    return true;
  });
}

/**
 * Utility: Get all integrations of a specific type
 */
function getIntegrationsByType(integrations: Integration[] | undefined, type: IntegrationType): Integration[] {
  if (!integrations) return [];
  return integrations.filter(integration => integration.type === type);
}

/**
 * Determines the initial bucket based on which setup steps are already completed
 */
function determineInitialBucket(setupSteps?: SetupStepsInfo, integrations?: Integration[]): SetupBucket {
  if (!setupSteps) {
    return 'scm';
  }

  // Start from the first incomplete bucket
  // Only check for implemented integrations: SCM (GitHub) and Communication (Slack)
  
  if (!setupSteps.scmIntegration || !hasValidIntegration(integrations, 'scm')) {
    return 'scm';
  }
  
  // TODO: Uncomment when distribution platforms are implemented
  // if (!setupSteps.targetPlatforms || !hasValidIntegration(integrations, 'targetPlatform')) {
  //   return 'distribution';
  // }
  
  // TODO: Uncomment when CI/CD pipelines are implemented
  // if (!setupSteps.pipelines) {
  //   return 'cicd';
  // }
  
  if (!setupSteps.communication || !hasValidIntegration(integrations, INTEGRATION_TYPES.COMMUNICATION)) {
    return 'communication';
  }
  
  // All steps complete, go to review
  return 'review';
}

export function useSetupWizard({ setupStepsInfo, initialData, integrations, onComplete }: UseSetupWizardProps) {
  // Determine initial bucket based on completed setup steps
  const initialBucket = determineInitialBucket(setupStepsInfo, integrations);
  const [currentBucket, setCurrentBucket] = useState<SetupBucket>(initialBucket);
  const [wizardData, setWizardData] = useState<SetupWizardData>(initialData || {});

  
  
  // Define all buckets with their config
  // Currently only SCM (GitHub) and Communication (Slack) are implemented
  const buckets: SetupBucketConfig[] = useMemo(() => {
    return [
      // 1. Source Control Management (GitHub) - IMPLEMENTED
      {
        id: 'scm',
        title: 'Connect Source Control',
        description: 'Connect your GitHub repository',
        isRequired: true,
        isComplete: hasValidIntegration(integrations, INTEGRATION_TYPES.SCM),
        canSkip: false,
        integrationType: INTEGRATION_TYPES.SCM,
        icon: '📦',
      },
      
      // 2. Distribution Platforms - NOT YET IMPLEMENTED
      // TODO: Uncomment when App Store and Play Store integration is ready
      // {
      //   id: 'distribution',
      //   title: 'Distribution Platforms',
      //   description: 'Connect App Store and Play Store for distribution',
      //   isRequired: true,
      //   isComplete: hasValidIntegration(integrations, INTEGRATION_TYPES.TARGET_PLATFORM),
      //   canSkip: false,
      //   integrationType: INTEGRATION_TYPES.TARGET_PLATFORM,
      //   icon: '🚀',
      // },
      
      // 3. CI/CD Pipelines - NOT YET IMPLEMENTED
      // TODO: Uncomment when CI/CD pipeline integration is ready
      // {
      //   id: 'cicd',
      //   title: 'CI/CD Pipelines',
      //   description: 'Connect build pipelines (optional)',
      //   isRequired: false,
      //   isComplete: hasValidIntegration(integrations, INTEGRATION_TYPES.PIPELINE),
      //   canSkip: true,
      //   integrationType: INTEGRATION_TYPES.PIPELINE,
      //   icon: '⚙️',
      // },
      
      // 4. Communication Channels (Slack) - IMPLEMENTED
      {
        id: 'communication',
        title: 'Communication Channels',
        description: 'Connect Slack for release notifications (optional)',
        isRequired: false,
        isComplete: hasValidIntegration(integrations, INTEGRATION_TYPES.COMMUNICATION),
        canSkip: true,
        integrationType: INTEGRATION_TYPES.COMMUNICATION,
        icon: '💬',
      },
      
      // 5. Review & Complete
      {
        id: 'review',
        title: 'Review & Complete',
        description: 'Review your configuration and complete setup',
        isRequired: true,
        isComplete: false,
        canSkip: false,
        icon: '✅',
      },
    ];
  }, [integrations]);
  
  const currentBucketIndex = buckets.findIndex(b => b.id === currentBucket);
  const currentBucketConfig = buckets[currentBucketIndex];
  
  // Check if setup is complete (all required buckets done)
  const isSetupComplete = useMemo(() => {
    return buckets
      .filter(b => b.isRequired)
      .every(b => b.isComplete || b.id === 'review');
  }, [buckets]);
  
  // Navigation functions
  const goToNextBucket = useCallback(() => {
    if (currentBucketIndex < buckets.length - 1) {
      setCurrentBucket(buckets[currentBucketIndex + 1].id);
    } else if (isSetupComplete && onComplete) {
      onComplete(wizardData);
    }
  }, [currentBucketIndex, buckets, isSetupComplete, wizardData, onComplete]);
  
  const goToPreviousBucket = useCallback(() => {
    if (currentBucketIndex > 0) {
      setCurrentBucket(buckets[currentBucketIndex - 1].id);
    }
  }, [currentBucketIndex, buckets]);
  
  const goToBucket = useCallback((bucketId: SetupBucket) => {
    setCurrentBucket(bucketId);
  }, []);
  console.log('currentBucketConfig', currentBucketConfig);
  
  // Special case for review step: can proceed if all required steps are complete
  const canGoToNextBucket = currentBucketConfig?.id === 'review' 
    ? isSetupComplete 
    : (currentBucketConfig?.isComplete || currentBucketConfig?.canSkip || false);
  
  const canGoToPreviousBucket = currentBucketIndex > 0;
  const isLastBucket = currentBucketIndex === buckets.length - 1;
  
  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<SetupWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);

  // Get integrations for the current bucket
  const getCurrentBucketIntegrations = useCallback(() => {
    if (!currentBucketConfig?.integrationType) return [];
    return getIntegrationsByType(integrations, currentBucketConfig.integrationType);
  }, [currentBucketConfig, integrations]);
  
  return {
    // State
    currentBucket,
    currentBucketConfig,
    currentBucketIndex,
    buckets,
    wizardData,
    isSetupComplete,
    integrations: integrations || [],
    
    // Navigation
    goToNextBucket,
    goToPreviousBucket,
    goToBucket,
    canGoToNextBucket,
    canGoToPreviousBucket,
    isLastBucket,
    
    // Data management
    updateWizardData,
    getCurrentBucketIntegrations,
    
    // Legacy aliases for backward compatibility
    currentStep: currentBucket,
    currentStepConfig: currentBucketConfig,
    currentStepIndex: currentBucketIndex,
    steps: buckets,
    goToNextStep: goToNextBucket,
    goToPreviousStep: goToPreviousBucket,
    goToStep: goToBucket,
    canGoToNextStep: canGoToNextBucket,
    canGoToPreviousStep: canGoToPreviousBucket,
    isLastStep: isLastBucket,
  };
}


/**
 * Export utility functions for external use
 */
export { hasValidIntegration, getIntegrationsByType, determineInitialBucket };

