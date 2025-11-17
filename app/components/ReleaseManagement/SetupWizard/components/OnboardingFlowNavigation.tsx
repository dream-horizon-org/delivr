import { WizardStepConfig } from "../types";


interface OnboardingFlowNavigationProps {
  goToPreviousStep: () => void;
  canGoToPreviousStep: boolean;
  currentStepIndex: number;
  steps: WizardStepConfig[];
  isLastStep: boolean;
  isSetupComplete: boolean;
  goToNextStep: () => void;
  canGoToNextStep: boolean;
  currentStepConfig: WizardStepConfig;
  onSetupComplete: () => void;
  onSetupExit: () => void;
}
export const OnboardingFlowNavigation = ({ goToPreviousStep, canGoToPreviousStep, currentStepIndex, steps, isLastStep, isSetupComplete, goToNextStep, canGoToNextStep, currentStepConfig, onSetupComplete, onSetupExit }: OnboardingFlowNavigationProps) => {
    return (
        <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
  <button
              type="button"
              onClick={goToPreviousStep}
              disabled={!canGoToPreviousStep}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            <div className="text-sm text-gray-500">
              Step {currentStepIndex + 1} of {steps.length}
            </div>
            
            {isLastStep && isSetupComplete ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Complete Setup
                <svg className="ml-2 -mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={goToNextStep}
                disabled={!canGoToNextStep}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStepConfig?.canSkip && !currentStepConfig.isComplete ? 'Skip' : 'Next'}
                <svg className="ml-2 -mr-1 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
    )
}