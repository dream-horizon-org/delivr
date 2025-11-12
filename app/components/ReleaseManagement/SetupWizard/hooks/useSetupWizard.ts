/**
 * Custom hook for managing Setup Wizard state and navigation
 */

import { useState, useCallback, useMemo } from 'react';
import type { SetupStep, WizardStepConfig, SetupWizardData } from '../types';

interface UseSetupWizardProps {
  initialData?: SetupWizardData;
  hasSCMIntegration?: boolean; // Flag to indicate SCM is already configured
  onComplete?: (data: SetupWizardData) => void;
}

export function useSetupWizard({ initialData, hasSCMIntegration = false, onComplete }: UseSetupWizardProps = {}) {
  // Determine initial step: skip GitHub if SCM integration exists
  const initialStep = hasSCMIntegration ? 'targets' : 'github';
  const [currentStep, setCurrentStep] = useState<SetupStep>(initialStep);
  const [wizardData, setWizardData] = useState<SetupWizardData>(initialData || {});
  
  // Define all steps with their config
  const steps: WizardStepConfig[] = useMemo(() => [
    {
      id: 'github',
      title: 'Connect GitHub',
      description: 'Connect your GitHub repository',
      isRequired: true,
      // Mark as complete if SCM integration exists OR if verified through wizard
      isComplete: hasSCMIntegration || !!wizardData.github?.isVerified,
      canSkip: hasSCMIntegration, // Allow skipping if already configured
    },
    {
      id: 'targets',
      title: 'Select Targets',
      description: 'Choose deployment platforms',
      isRequired: true,
      isComplete: !!(wizardData.targets?.appStore || wizardData.targets?.playStore),
      canSkip: false,
    },
    {
      id: 'platform-credentials',
      title: 'Platform Credentials',
      description: 'Configure App Store & Play Store',
      isRequired: true,
      isComplete: validatePlatformCredentials(wizardData),
      canSkip: false,
    },
    {
      id: 'cicd',
      title: 'CI/CD Setup',
      description: 'Connect build pipelines (optional)',
      isRequired: false,
      isComplete: !!(wizardData.cicdPipelines && wizardData.cicdPipelines.length > 0),
      canSkip: true,
    },
    {
      id: 'slack',
      title: 'Slack Integration',
      description: 'Connect Slack for notifications (optional)',
      isRequired: false,
      isComplete: !!wizardData.slack?.isVerified,
      canSkip: true,
    },
    {
      id: 'review',
      title: 'Review & Complete',
      description: 'Review your configuration',
      isRequired: true,
      isComplete: false,
      canSkip: false,
    },
  ], [wizardData, hasSCMIntegration]);
  
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const currentStepConfig = steps[currentStepIndex];
  
  // Check if setup is complete (all required steps done)
  const isSetupComplete = useMemo(() => {
    return steps
      .filter(s => s.isRequired)
      .every(s => s.isComplete || s.id === 'review');
  }, [steps]);
  
  // Navigation functions
  const goToNextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    } else if (isSetupComplete && onComplete) {
      onComplete(wizardData);
    }
  }, [currentStepIndex, steps, isSetupComplete, wizardData, onComplete]);
  
  const goToPreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  }, [currentStepIndex, steps]);
  
  const goToStep = useCallback((stepId: SetupStep) => {
    setCurrentStep(stepId);
  }, []);
  
  const canGoToNextStep = currentStepConfig?.isComplete || currentStepConfig?.canSkip;
  const canGoToPreviousStep = currentStepIndex > 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  
  // Update wizard data
  const updateWizardData = useCallback((updates: Partial<SetupWizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  }, []);
  
  return {
    // State
    currentStep,
    currentStepConfig,
    currentStepIndex,
    steps,
    wizardData,
    isSetupComplete,
    
    // Navigation
    goToNextStep,
    goToPreviousStep,
    goToStep,
    canGoToNextStep,
    canGoToPreviousStep,
    isLastStep,
    
    // Data management
    updateWizardData,
  };
}

// Helper to validate platform credentials
function validatePlatformCredentials(data: SetupWizardData): boolean {
  const { targets, appStoreConnect, playStoreConnect } = data;
  
  if (!targets) return false;
  
  if (targets.appStore && !appStoreConnect?.isVerified) return false;
  if (targets.playStore && !playStoreConnect?.isVerified) return false;
  
  return true;
}

